import type { Metadata } from "next";

import { DishaWorkbench } from "./workbench-client";

export const metadata: Metadata = {
  title: "DISHA 6.6 Workbench",
  description: "A transparent agentic mission flow for constitutional evidence review.",
};

export default function WorkbenchPage() {
  return <DishaWorkbench />;
}
