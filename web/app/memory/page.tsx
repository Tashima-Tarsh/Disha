import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ACCESS_COOKIE_NAME, principalFromAccessToken } from "@/lib/server/auth";

import { MemoryGraphConsole } from "./memory-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DISHA 6.6 Memory Graph",
  description: "Watch the agentic reasoning loop grow a governed memory graph, pass by pass.",
};

export default async function MemoryPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

  if (!token) {
    redirect("/login?mode=password&returnUrl=%2Fmemory");
  }

  try {
    const principal = principalFromAccessToken(token);
    return <MemoryGraphConsole principal={{ email: principal.email, roles: principal.roles }} />;
  } catch {
    redirect("/login?mode=password&returnUrl=%2Fmemory");
  }
}
