import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ status: "ok", service: "disha-web", version: "1.0.0" }, { status: 200 });
}

