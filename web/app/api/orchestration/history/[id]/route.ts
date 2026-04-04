import { proxyBackendGet } from "../../../_backendProxy";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  return proxyBackendGet(`/api/orchestration/history/${encodeURIComponent(params.id)}`);
}
