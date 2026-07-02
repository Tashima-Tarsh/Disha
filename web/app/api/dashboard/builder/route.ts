import { NextResponse } from "next/server";

import { getDashboardBuilderPayload } from "@/lib/dashboard-builder-feed";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(getDashboardBuilderPayload());
}
