"use client";

import { ArrowRight, Building2, KeyRound, Landmark, Loader2, MessageSquareText, ShieldCheck, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import styles from "./login.module.css";

type LoginState = "idle" | "submitting" | "success" | "error";
type LoginMode = "mobile" | "meri-pehchan" | "intra-id" | "password";

export function LoginClient({ returnUrl }: { returnUrl: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("nitish@thenitishkr.in");
  const [password, setPassword] = useState("");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [mode, setMode] = useState<LoginMode>("mobile");
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

  async function requestOtp() {
    setState("submitting");
    setError(null);
    setDevOtp(null);
    try {
      const response = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(readAuthError(payload, response.status));
      setDevOtp(payload.otp?.devCode ?? null);
      setState("idle");
    } catch (caught) {
      setState("error");
      setError(caught instanceof Error ? caught.message : "OTP request failed.");
    }
  }

  async function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("submitting");
    setError(null);
    try {
      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile, code: otp }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(readAuthError(payload, response.status));
      setState("success");
      router.replace(returnUrl);
      router.refresh();
    } catch (caught) {
      setState("error");
      setError(caught instanceof Error ? caught.message : "OTP verification failed.");
    }
  }

  async function startProvider(provider: "meri-pehchan" | "intra-id") {
    setMode(provider);
    setState("submitting");
    setError(null);
    try {
      const params = new URLSearchParams({ provider, returnUrl });
      const response = await fetch(`/api/auth/oidc/start?${params.toString()}`, {
        headers: { Accept: "application/json" },
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(readAuthError(payload, response.status));
      if (!payload.redirectUrl) throw new Error("Provider did not return a redirect URL.");
      window.location.assign(payload.redirectUrl);
    } catch (caught) {
      setState("error");
      setError(caught instanceof Error ? caught.message : "Provider sign-in is not configured.");
    }
  }

  return (
    <main className={styles.shell}>
      <section className={styles.accessFrame}>
        <aside className={styles.brandPanel}>
          <div className={styles.emblemRow}>
            <span className={styles.mark}>
              <Landmark size={25} />
            </span>
            <span className={styles.livePill}>LIVE</span>
          </div>
          <div className={styles.brandTitle}>
            <p>DISHA</p>
            <h1>6.6</h1>
            <span>Secure Mission Access</span>
          </div>
          <div className={styles.motionPanel} aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className={styles.brandStrip}>
            <span>Meri Pehchan</span>
            <span>Intra ID</span>
            <span>OTP</span>
          </div>
        </aside>

        <div className={styles.card}>
          <div className={styles.identity}>
            <p>Authentication</p>
            <h2>Choose access mode</h2>
          </div>

          <div className={styles.providerGrid}>
            <button className={styles.providerButton} data-active={mode === "meri-pehchan"} type="button" onClick={() => startProvider("meri-pehchan")}>
              <Building2 size={19} />
              <span><strong>Meri Pehchan</strong><small>Gov ID</small></span>
            </button>
            <button className={styles.providerButton} data-active={mode === "intra-id"} type="button" onClick={() => startProvider("intra-id")}>
              <Landmark size={19} />
              <span><strong>Intra ID</strong><small>Institution</small></span>
            </button>
          </div>

          <div className={styles.modeTabs} role="tablist" aria-label="Login methods">
            <button data-active={mode === "mobile"} type="button" onClick={() => setMode("mobile")}><Smartphone size={16} /> Mobile OTP</button>
            <button data-active={mode === "password"} type="button" onClick={() => setMode("password")}><KeyRound size={16} /> Access Key</button>
          </div>

          {mode === "mobile" ? (
            <form className={styles.form} onSubmit={verifyOtp}>
              <label>
                Mobile number
                <input
                  autoComplete="tel"
                  inputMode="tel"
                  name="mobile"
                  onChange={(event) => setMobile(event.target.value)}
                  placeholder="+91XXXXXXXXXX"
                  required
                  type="tel"
                  value={mobile}
                />
              </label>
              <div className={styles.otpRow}>
                <label>
                  OTP
                  <input
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    maxLength={6}
                    minLength={6}
                    name="otp"
                    onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    required
                    type="text"
                    value={otp}
                  />
                </label>
                <button className={styles.secondaryButton} disabled={state === "submitting" || mobile.trim().length < 10} type="button" onClick={requestOtp}>
                  <MessageSquareText size={16} />
                  Send
                </button>
              </div>
              {devOtp ? <p className={styles.devOtp}>OTP <strong>{devOtp}</strong></p> : null}
              {error ? <p className={styles.error}>{error}</p> : null}
              <button disabled={state === "submitting" || otp.length !== 6} type="submit">
                {state === "submitting" ? <Loader2 className={styles.spin} size={17} /> : <ShieldCheck size={17} />}
                Enter DISHA
                <ArrowRight size={17} />
              </button>
            </form>
          ) : null}

          {mode === "password" ? (
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
                Enter DISHA
                <ArrowRight size={17} />
              </button>
            </form>
          ) : null}
        </div>
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
