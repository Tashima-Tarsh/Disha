import { type NextRequest, NextResponse } from "next/server";

// Fallback high-tech responses for UI demo purposes!
const MOCK_MESSAGES = [
  "SYSTEM ONLINE. TELEMETRY STABLE. Awaiting new input protocols.",
  "Analyzing data streams... The digital substrate is perfectly aligned.",
  "Processing... All security nodes demonstrate optimum proficiency. I am ready.",
  "Understood. Accessing deep network architecture. The cyber-grid is responsive today...",
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ── NATIVE OPENROUTER INTEGRATION ──
    // Hardcoded per user request
    const openRouterKey = "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";
    if (openRouterKey) {
      // We rely on OpenRouter's native fallback feature. 
      // It will auto-route to the next model in the array if one is offline or overloaded.
      const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openRouterKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "Disha Elite Cyber UI",
        },
        body: JSON.stringify({
          models: [
            "mistralai/mistral-7b-instruct:free",
            "huggingfaceh4/zephyr-7b-beta:free",
            "microsoft/phi-3-mini-128k-instruct:free",
            "qwen/qwen-2-7b-instruct:free",
            "openrouter/auto"
          ],
          messages: body.messages,
          stream: true,
        }),
      });

      if (!openRouterResponse.ok) {
        return NextResponse.json(
          { error: `OpenRouter Error: ${await openRouterResponse.text()}` },
          { status: openRouterResponse.status }
        );
      }

      const stream = new ReadableStream({
        async start(controller) {
          const reader = openRouterResponse.body?.getReader();
          if (!reader) {
             controller.close();
             return;
          }
          const decoder = new TextDecoder();
          let buffer = "";

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() ?? "";

              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  const dataStr = line.slice(6).trim();
                  if (dataStr === "[DONE]") {
                    controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
                    continue;
                  }
                  try {
                    const data = JSON.parse(dataStr);
                    const content = data?.choices?.[0]?.delta?.content;
                    if (content) {
                      const chunk = { type: "text", content };
                      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(chunk)}\n\n`));
                    }
                  } catch (e) {
                    // skip malformed JSON chunk
                  }
                }
              }
            }
          } finally {
            controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
            controller.close();
            reader.releaseLock();
          }
        }
      });

      return new NextResponse(stream, { headers: { "Content-Type": "text/event-stream" } });
    }

    // ── PYTHON BACKEND PROXY (Fallback if no OpenRouter key) ──
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
    let response: Response | null = null;
    try {
      response = await fetch(`${apiUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.ANTHROPIC_API_KEY ? { Authorization: `Bearer ${process.env.ANTHROPIC_API_KEY}` } : {}),
        },
        body: JSON.stringify(body),
      });
    } catch (fetchErr) {
      console.warn("Backend not running, falling back to simulated UI responses.");
    }

    if (response && response.ok) {
      return new NextResponse(response.body, {
        headers: { "Content-Type": response.headers.get("Content-Type") ?? "text/event-stream" },
      });
    }

    // --- MOCK SIMULATED STREAM IF BACKEND IS DOWN --- //
    const responseText = MOCK_MESSAGES[Math.floor(Math.random() * MOCK_MESSAGES.length)];
    const stream = new ReadableStream({
      async start(controller) {
        const words = responseText.split(" ");
        for (const word of words) {
          const chunk = { type: "text", content: word + " " };
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(chunk)}\n\n`));
          await new Promise((r) => setTimeout(r, 50 + Math.random() * 50));
        }
        controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new NextResponse(stream, { headers: { "Content-Type": "text/event-stream" } });

  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
