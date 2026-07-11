import type { Metadata } from "next";

import { LoginClient } from "./login-client";

export const metadata: Metadata = {
  title: "Sign in | DISHA 6.6",
  description: "Sign in to the DISHA governed workbench.",
};

type LoginPageProps = {
  searchParams?: Promise<{ returnUrl?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const requested = Array.isArray(params?.returnUrl) ? params?.returnUrl[0] : params?.returnUrl;
  return <LoginClient returnUrl={sanitizeReturnUrl(requested)} />;
}

function sanitizeReturnUrl(requested?: string) {
  if (!requested || !requested.startsWith("/") || requested.startsWith("//")) return "/workbench";
  return requested;
}
