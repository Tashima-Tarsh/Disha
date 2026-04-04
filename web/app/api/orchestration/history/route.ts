import { proxyBackendGet } from "../../_backendProxy";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = url.searchParams.get("limit") ?? "10";
  return proxyBackendGet(`/api/orchestration/history?limit=${encodeURIComponent(limit)}`);
}
