import { NextRequest } from "next/server";
import { proxyBackendJson } from "../../_backendProxy";

export async function POST(request: NextRequest) {
  return proxyBackendJson(request, "/api/mes/interpret-screen");
}
