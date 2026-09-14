"use client";

import { Fingerprint, HeartPulse, KeyRound, Loader2, ScanEye, ShieldCheck, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import styles from "./login.module.css";

type Panel = "none" | "biometric" | "admin";
type SubmitState = "idle" | "submitting" | "error";

const GOD_ADMIN_EMAIL = "nitish@thenitishkr.in";

export function LoginClient({ returnUrl }: { returnUrl: string }) {
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>("none");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<SubmitState>("idle");
  const [error, setError] = useState<string | null>(null);

  function open(next: Panel) {
    setPanel(next);
    setError(null);
    setState("idle");
  }

  async function signInAsGodAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("submitting");
    setError(null);

    try {
      const response = await fetch("/api/auth/god-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: GOD_ADMIN_EMAIL, password }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const message = payload?.error?.message ?? payload?.error ?? "God Admin authentication failed.";
        throw new Error(message);
      }
      router.replace(returnUrl);
      router.refresh();
    } catch (caught) {
      setState("error");
      setError(caught instanceof Error ? caught.message : "God Admin authentication failed.");
    }
  }

  return (
    <main className={styles.shell}>
      <section className={styles.stage} aria-label="DISHA 6.6 secure access">
        <img
          alt="DISHA 6.6 secure access showing iris, fingerprint and heartbeat verification"
          className={styles.hero}
          src="/disha-login-hero.webp"
        />

        <button
          aria-label="Secure Access"
          className={styles.secureHotspot}
          onClick={() => open("biometric")}
          type="button"
        />

        <button className={styles.godAdminTrigger} onClick={() => open("admin")} type="button">
          <KeyRound size={15} /> God Admin
        </button>

        {panel !== "none" ? <button aria-label="Close access panel" className={styles.backdrop} onClick={() => open("none")} type="button" /> : null}

        {panel === "biometric" ? (
          <section className={styles.accessPanel} aria-labelledby="biometric-title">
            <button aria-label="Close" className={styles.closeButton} onClick={() => open("none")} type="button"><X size={18} /></button>
            <p className={styles.eyebrow}>DISHA SECURE ACCESS</p>
            <h1 id="biometric-title">Three-factor biometric verification</h1>
            <p className={styles.summary}>Identity is granted only after the required biometric and trusted-hardware factors are verified by the backend.</p>

            <div className={styles.factorGrid}>
              <article className={styles.factorCard}>
                <ScanEye size={25} />
                <div><strong>Iris</strong><span>Windows Hello / WebAuthn authenticator</span></div>
                <small>Backend verification required</small>
              </article>
              <article className={styles.factorCard}>
                <Fingerprint size={25} />
                <div><strong>Fingerprint</strong><span>Windows Hello / WebAuthn authenticator</span></div>
                <small>Backend verification required</small>
              </article>
              <article className={styles.factorCard}>
                <HeartPulse size={25} />
                <div><strong>Heart Beat</strong><span>Trusted external hardware connector</span></div>
                <small>Signed connector result required</small>
              </article>
            </div>

            <div className={styles.policyNote}>
              <ShieldCheck size={18} />
              <span>DISHA will not mark a factor verified from browser UI alone. The factor must be validated by the corresponding backend verifier.</span>
            </div>
          </section>
        ) : null}

        {panel === "admin" ? (
          <section className={styles.adminPanel} aria-labelledby="admin-title">
            <button aria-label="Close" className={styles.closeButton} onClick={() => open("none")} type="button"><X size={18} /></button>
            <p className={styles.eyebrow}>PRIVILEGED ACCESS</p>
            <h1 id="admin-title">God Admin</h1>
            <p className={styles.summary}>This path is restricted to the designated DISHA administrator account.</p>
            <form className={styles.adminForm} onSubmit={signInAsGodAdmin}>
              <label>
                Administrator
                <input aria-readonly="true" readOnly type="email" value={GOD_ADMIN_EMAIL} />
              </label>
              <label>
                Password
                <input autoComplete="current-password" minLength={8} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
              </label>
              {error ? <p className={styles.error}>{error}</p> : null}
              <button disabled={state === "submitting"} type="submit">
                {state === "submitting" ? <Loader2 className={styles.spin} size={18} /> : <KeyRound size={18} />}
                Enter as God Admin
              </button>
            </form>
          </section>
        ) : null}
      </section>
    </main>
  );
}
