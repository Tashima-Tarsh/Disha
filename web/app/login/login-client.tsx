"use client";

import { ArrowRight, Landmark, Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import styles from "./login.module.css";

type LoginState = "idle" | "submitting" | "success" | "error";

export function LoginClient({ returnUrl }: { returnUrl: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("nitish@thenitishkr.in");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<LoginState>("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("submitting");
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(readAuthError(payload, response.status));
      setState("success");
      router.replace(returnUrl);
      router.refresh();
    } catch (caught) {
      setState("error");
      setError(caught instanceof Error ? caught.message : "Sign in failed.");
    }
  }

  return (
    <main className={styles.shell}>
      <section className={styles.card}>
        <div className={styles.identity}>
          <span className={styles.mark}>
            <Landmark size={24} />
          </span>
          <p>DISHA 6.6</p>
          <h1>Sign in to the governed workbench</h1>
          <p className={styles.summary}>
            Local development uses the configured DISHA dev password and creates a signed session cookie for API access.
          </p>
        </div>

        <form className={styles.form} onSubmit={onSubmit}>
          <label>
            Email
            <input
              autoComplete="email"
              inputMode="email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <label>
            Password
            <input
              autoComplete="current-password"
              minLength={12}
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>

          {error ? <p className={styles.error}>{error}</p> : null}

          <button disabled={state === "submitting"} type="submit">
            {state === "submitting" ? <Loader2 className={styles.spin} size={17} /> : <ShieldCheck size={17} />}
            Sign in
            <ArrowRight size={17} />
          </button>
        </form>

        <p className={styles.note}>
          Returning to <code>{returnUrl}</code> after authentication.
        </p>
      </section>
    </main>
  );
}

function readAuthError(payload: unknown, status: number) {
  if (payload && typeof payload === "object" && "error" in payload) {
    const error = (payload as { error?: { message?: string } }).error;
    if (error?.message) return error.message;
  }
  return status === 401 ? "Invalid email or password." : `Sign in failed with status ${status}.`;
}
