import { proxyBackendGet } from "../../_backendProxy";

export async function GET() {
  return proxyBackendGet("/api/mes/datasets");
}
