import { NextRequest, NextResponse } from "next/server";
import type { ChatProvider, Message } from "@/lib/types";

interface RequestSettings {
  provider?: ChatProvider;
  apiUrl?: string;
  apiKey?: string;
  streamingEnabled?: boolean;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

interface ChatRequestBody {
  messages?: Pick<Message, "role" | "content">[];
  model?: string;
  stream?: boolean;
  settings?: RequestSettings;
}

const encoder = new TextEncoder();

function sseMessage(payload: unknown) {
  return encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);
}

function sseDone() {
  return encoder.encode("data: [DONE]\n\n");
}

function extractTextContent(content: Message["content"] | unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (!Array.isArray(content)) {
    return "";
  }
  return content
    .map((block) => {
      if (!block || typeof block !== "object") {
        return "";
      }
      const typedBlock = block as { type?: string; text?: string; content?: unknown };
      if (typedBlock.type === "text") {
        return typedBlock.text ?? "";
      }
      if (typedBlock.type === "tool_result") {
        return extractTextContent(typedBlock.content);
      }
      return "";
    })
    .join("");
}

function normalizeBaseUrl(baseUrl: string | undefined, fallback: string) {
  return (baseUrl?.trim() || fallback).replace(/\/+$/, "");
}

function buildConversationPayload(messages: Pick<Message, "role" | "content">[], systemPrompt?: string) {
  const systemParts = [
    systemPrompt?.trim(),
    ...messages
      .filter((message) => message.role === "system")
      .map((message) => extractTextContent(message.content).trim()),
  ].filter(Boolean) as string[];

  const upstreamMessages = messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: extractTextContent(message.content),
    }));

  return {
    system: systemParts.join("\n\n") || undefined,
    messages: upstreamMessages,
  };
}

async function readSseStream(response: Response, onData: (payload: string) => Promise<boolean> | boolean) {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Upstream response body is missing");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line.startsWith("data:")) {
          continue;
        }
        const payload = line.slice(5).trim();
        if (!payload) {
          continue;
        }
        const shouldStop = await onData(payload);
        if (shouldStop) {
          return;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function createUpstreamError(response: Response, details: string) {
  return NextResponse.json(
    {
      error: details || `Upstream request failed with ${response.status}`,
      status: response.status,
    },
    { status: response.status }
  );
}

async function proxyToBackend(req: NextRequest, body: ChatRequestBody) {
  const backendUrl = process.env.AGCLAW_BACKEND_URL?.trim();
  if (!backendUrl) {
    return null;
  }

  const response = await fetch(`${backendUrl.replace(/\/+$/, "")}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return new NextResponse(response.body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "text/event-stream",
      "Cache-Control": response.headers.get("Cache-Control") ?? "no-cache",
    },
  });
}

async function handleMockChat(body: ChatRequestBody) {
  const lastMessage = Array.isArray(body.messages) ? body.messages[body.messages.length - 1] : null;
  const prompt = extractTextContent(lastMessage?.content);

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(sseMessage({ type: "text", content: `Mock reply: ${prompt || "ready"}` }));
      controller.enqueue(sseDone());
      controller.close();
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
}

async function handleAnthropic(body: ChatRequestBody, settings: Required<RequestSettings>) {
  const apiKey = settings.apiKey || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Anthropic API key is required" }, { status: 400 });
  }

  const { system, messages } = buildConversationPayload(body.messages ?? [], settings.systemPrompt);
  const upstreamResponse = await fetch(`${normalizeBaseUrl(settings.apiUrl, "https://api.anthropic.com")}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: body.model,
      system,
      messages,
      temperature: settings.temperature,
      max_tokens: settings.maxTokens,
      stream: body.stream !== false,
    }),
  });

  if (!upstreamResponse.ok) {
    return createUpstreamError(upstreamResponse, await upstreamResponse.text());
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        await readSseStream(upstreamResponse, async (payload) => {
          if (payload === "[DONE]") {
            controller.enqueue(sseDone());
            controller.close();
            return true;
          }

          const event = JSON.parse(payload) as {
            type?: string;
            delta?: { text?: string };
            error?: { message?: string };
          };

          if (event.type === "content_block_delta" && event.delta?.text) {
            controller.enqueue(sseMessage({ type: "text", content: event.delta.text }));
          }
          if (event.type === "message_stop") {
            controller.enqueue(sseDone());
            controller.close();
            return true;
          }
          if (event.type === "error") {
            controller.enqueue(sseMessage({ type: "error", error: event.error?.message ?? "Anthropic request failed" }));
            controller.enqueue(sseDone());
            controller.close();
            return true;
          }
          return false;
        });
      } catch (error) {
        controller.enqueue(
          sseMessage({
            type: "error",
            error: error instanceof Error ? error.message : "Anthropic stream failed",
          })
        );
        controller.enqueue(sseDone());
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
}

async function handleOpenAiCompatible(body: ChatRequestBody, settings: Required<RequestSettings>) {
  const baseUrl = normalizeBaseUrl(
    settings.apiUrl,
    settings.provider === "ollama" ? "http://127.0.0.1:11434" : "http://127.0.0.1:8000"
  );
  const { system, messages } = buildConversationPayload(body.messages ?? [], settings.systemPrompt);
  const upstreamMessages = system ? [{ role: "system", content: system }, ...messages] : messages;

  const upstreamResponse = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: body.model,
      messages: upstreamMessages,
      temperature: settings.temperature,
      max_tokens: settings.maxTokens,
      stream: body.stream !== false,
    }),
  });

  if (!upstreamResponse.ok) {
    return createUpstreamError(upstreamResponse, await upstreamResponse.text());
  }

  if (body.stream === false) {
    const payload = (await upstreamResponse.json()) as {
      choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }>;
    };
    const firstChoice = payload.choices?.[0]?.message?.content;
    const content =
      typeof firstChoice === "string"
        ? firstChoice
        : Array.isArray(firstChoice)
          ? firstChoice.map((part) => part.text ?? "").join("")
          : "";

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(sseMessage({ type: "text", content }));
        controller.enqueue(sseDone());
        controller.close();
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        await readSseStream(upstreamResponse, async (payload) => {
          if (payload === "[DONE]") {
            controller.enqueue(sseDone());
            controller.close();
            return true;
          }

          const event = JSON.parse(payload) as {
            choices?: Array<{
              delta?: { content?: string | Array<{ text?: string }> };
              finish_reason?: string | null;
            }>;
            error?: { message?: string };
          };

          if (event.error?.message) {
            controller.enqueue(sseMessage({ type: "error", error: event.error.message }));
            controller.enqueue(sseDone());
            controller.close();
            return true;
          }

          const delta = event.choices?.[0]?.delta?.content;
          if (typeof delta === "string" && delta) {
            controller.enqueue(sseMessage({ type: "text", content: delta }));
          } else if (Array.isArray(delta)) {
            const combined = delta.map((part) => part.text ?? "").join("");
            if (combined) {
              controller.enqueue(sseMessage({ type: "text", content: combined }));
            }
          }

          if (event.choices?.[0]?.finish_reason) {
            controller.enqueue(sseDone());
            controller.close();
            return true;
          }
          return false;
        });
      } catch (error) {
        controller.enqueue(
          sseMessage({
            type: "error",
            error: error instanceof Error ? error.message : "Provider stream failed",
          })
        );
        controller.enqueue(sseDone());
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatRequestBody;

    if (process.env.AGCLAW_WEB_MOCK_CHAT === "1") {
      return handleMockChat(body);
    }

    const proxied = await proxyToBackend(req, body);
    if (proxied) {
      return proxied;
    }

    const settings: Required<RequestSettings> = {
      provider: body.settings?.provider ?? "anthropic",
      apiUrl: body.settings?.apiUrl ?? "",
      apiKey: body.settings?.apiKey ?? "",
      streamingEnabled: body.settings?.streamingEnabled ?? true,
      systemPrompt: body.settings?.systemPrompt ?? "",
      temperature: body.settings?.temperature ?? 1,
      maxTokens: body.settings?.maxTokens ?? 8096,
    };

    if (!body.model) {
      return NextResponse.json({ error: "model is required" }, { status: 400 });
    }

    if (settings.provider === "anthropic") {
      return handleAnthropic(body, settings);
    }

    return handleOpenAiCompatible(body, settings);
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
