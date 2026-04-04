import { NextRequest, NextResponse } from "next/server";

function getBackendBaseUrl() {
  const backendUrl = process.env.AGCLAW_BACKEND_URL?.trim();
  return backendUrl ? backendUrl.replace(/\/+$/, "") : null;
}

export async function proxyBackendJson(request: NextRequest, path: string) {
  const backendBaseUrl = getBackendBaseUrl();
  if (!backendBaseUrl) {
    return NextResponse.json(
      {
        error: "AG-Claw backend is not configured",
        detail: "Set AGCLAW_BACKEND_URL to enable clean-room research services.",
      },
      { status: 503 }
    );
  }

  const rawBody = await request.text();
  const response = await fetch(`${backendBaseUrl}${path}`, {
    method: request.method,
    headers: {
      "Content-Type": request.headers.get("Content-Type") ?? "application/json",
    },
    body: rawBody || undefined,
    cache: "no-store",
  });

  return new NextResponse(response.body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "application/json",
    },
  });
}

export async function proxyBackendGet(pathWithQuery: string) {
  const backendBaseUrl = getBackendBaseUrl();
  if (!backendBaseUrl) {
    return NextResponse.json(
      {
        error: "AG-Claw backend is not configured",
        detail: "Set AGCLAW_BACKEND_URL to enable clean-room research services.",
      },
      { status: 503 }
    );
  }

  const response = await fetch(`${backendBaseUrl}${pathWithQuery}`, { cache: "no-store" });
  return new NextResponse(response.body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "application/json",
    },
  });
}
