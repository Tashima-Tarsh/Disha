import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ACCESS_COOKIE_NAME, principalFromAccessToken } from "@/lib/server/auth";
import { IntelligenceClient } from "./intelligence-client";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "DISHA Live Intelligence",
  description: "Continuous intelligence change-impact and analyst review surface.",
};

export default async function IntelligencePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
  if (!token) redirect("/login?mode=password&returnUrl=%2Fintelligence");
  try {
    const principal = principalFromAccessToken(token);
    return <IntelligenceClient principal={{ email: principal.email, roles: principal.roles }} />;
  } catch {
    redirect("/login?mode=password&returnUrl=%2Fintelligence");
  }
}
