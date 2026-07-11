import type { Metadata } from "next";

import { LoginClient } from "./login-client";

export const metadata: Metadata = {
  title: "Sign in | DISHA 6.6",
  description: "Sign in to the DISHA governed workbench.",
};

type LoginPageProps = {
  searchParams?: Promise<{ mode?: string | string[]; returnUrl?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const requested = Array.isArray(params?.returnUrl) ? params?.returnUrl[0] : params?.returnUrl;
  const requestedMode = Array.isArray(params?.mode) ? params?.mode[0] : params?.mode;
  return <LoginClient initialMode={requestedMode === "password" ? "password" : "mobile"} returnUrl={sanitizeReturnUrl(requested)} />;
}

function sanitizeReturnUrl(requested?: string) {
  if (!requested || !requested.startsWith("/") || requested.startsWith("//")) return "/dashboard";
  if (requested === "/workbench") return "/dashboard";
  return requested;
}
