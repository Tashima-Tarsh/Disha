import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { NextRequest, NextResponse } from "next/server";

import { requirePrincipal } from "@/lib/server/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DASHBOARD_FILE = "disha66-command-centre-v3.html";
const DASHBOARD_PATH = fileURLToPath(new URL(`./${DASHBOARD_FILE}`, import.meta.url));

export async function GET(req: NextRequest) {
  try {
    requirePrincipal(req);
  } catch {
    return NextResponse.redirect(new URL("/login?mode=password&returnUrl=%2Fdashboard", req.nextUrl.origin), 303);
  }

  const html = await readDashboardHtml();
  return new NextResponse(bindDashboardToRuntime(html), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

async function readDashboardHtml() {
  return readFile(DASHBOARD_PATH, "utf8");
}

function bindDashboardToRuntime(html: string) {
  return html
    .replace('class="dot demo" id="runtimeDot"', 'class="dot online" id="runtimeDot"')
    .replace("Interactive demo runtime", "Connected DISHA runtime")
    .replace(
      "apiBase=storage.get('dishaApiBase'),runtimeConnected=false",
      "apiBase=storage.get('dishaApiBase')||window.location.origin,runtimeConnected=true",
    );
}
