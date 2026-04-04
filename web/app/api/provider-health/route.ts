import { NextRequest, NextResponse } from "next/server";
import type { ChatProvider } from "@/lib/types";

const DEFAULT_URLS: Record<ChatProvider, string> = {
  anthropic: "https://api.anthropic.com",
  "openai-compatible": "http://127.0.0.1:8000",
  ollama: "http://127.0.0.1:11434",
  vllm: "http://127.0.0.1:8000",
};

interface Probe {
  url: string;
  headers: Record<string, string>;
}

function normalizeBaseUrl(baseUrl: string | null, provider: ChatProvider) {
  return (baseUrl?.trim() || DEFAULT_URLS[provider]).replace(/\/+$/, "");
}

function bearerHeaders(apiKey: string): Record<string, string> {
  return apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
}

async function proxyToBackend(request: NextRequest) {
  const backendUrl = process.env.AGCLAW_BACKEND_URL?.trim();
  if (!backendUrl) {
    return null;
  }

  const target = `${backendUrl.replace(/\/+$/, "")}/api/provider-health?${request.nextUrl.searchParams.toString()}`;
  const response = await fetch(target, { cache: "no-store" });
  const payload = await response.text();
  return new NextResponse(payload, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "application/json",
    },
  });
}

export async function GET(request: NextRequest) {
  const proxied = await proxyToBackend(request);
  if (proxied) {
    return proxied;
  }

  const provider = (request.nextUrl.searchParams.get("provider") as ChatProvider | null) ?? "anthropic";
  const apiUrl = normalizeBaseUrl(request.nextUrl.searchParams.get("apiUrl"), provider);
  const apiKey = request.nextUrl.searchParams.get("apiKey") ?? "";

  try {
    const probes: Probe[] = provider === "anthropic"
      ? [{ url: `${apiUrl}/v1/models`, headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" } }]
      : provider === "ollama"
        ? [
            { url: `${apiUrl}/api/tags`, headers: {} },
            { url: `${apiUrl}/v1/models`, headers: bearerHeaders(apiKey) },
          ]
        : [
            { url: `${apiUrl}/health`, headers: bearerHeaders(apiKey) },
            { url: `${apiUrl}/v1/models`, headers: bearerHeaders(apiKey) },
          ];

    let lastStatus = 500;
    let lastError = "Connection failed";

    for (const probe of probes) {
      const response = await fetch(probe.url, {
        method: "GET",
        headers: probe.headers,
        cache: "no-store",
      });

      lastStatus = response.status;
      if (response.ok) {
        return NextResponse.json({ ok: true, provider, apiUrl, probe: probe.url });
      }

      lastError = await response.text();
    }

    return NextResponse.json(
      { ok: false, provider, apiUrl, error: lastError || "Probe failed" },
      { status: lastStatus }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        provider,
        apiUrl,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
