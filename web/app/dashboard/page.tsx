import { getDashboardBuilderPayload } from "@/lib/dashboard-builder-feed";

import DashboardClient from "./dashboard-client";

export default function DashboardPage() {
  return <DashboardClient initialPayload={getDashboardBuilderPayload()} />;
}
