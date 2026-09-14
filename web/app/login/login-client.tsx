"use client";

import { Fingerprint, HeartPulse, KeyRound, Loader2, ScanEye, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import styles from "./login.module.css";

type Panel = "welcome" | "biometric" | "admin";
type SubmitState = "idle" | "submitting" | "error";

const GOD_ADMIN_EMAIL = "nitish@thenitishkr.in";

export function LoginClient({ returnUrl }: { returnUrl: string }) {
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>("welcome");
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
      <section className={styles.visualPane} aria-label="DISHA 6.6 secure access artwork">
        <div className={styles.imageFrame}>
          <Image
            alt="DISHA 6.6 secure access showing iris, fingerprint and heartbeat verification"
            className={styles.hero}
            fill
            priority
            quality={100}
            sizes="(max-width: 900px) 100vw, 50vw"
            src="/disha-login-hero.webp"
            unoptimized
          />
          <button
            aria-label="Open DISHA Secure Access"
            className={styles.secureHotspot}
            onClick={() => open("biometric")}
            type="button"
          />
        </div>
      </section>

      <section className={styles.loginPane} aria-live="polite">
        <div className={styles.loginInner}>
          {panel === "welcome" ? (
            <div className={styles.welcomePanel}>
              <p className={styles.eyebrow}>DISHA 6.6</p>
              <h1>Secure identity gateway</h1>
              <p className={styles.summary}>Use the Secure Access control on the DISHA visual to begin biometric verification, or enter through the restricted God Admin path.</p>
              <button className={styles.primaryButton} onClick={() => open("biometric")} type="button">
                <ShieldCheck size={19} /> Secure Access
              </button>
              <button className={styles.secondaryButton} onClick={() => open("admin")} type="button">
                <KeyRound size={18} /> God Admin
              </button>
            </div>
          ) : null}

          {panel === "biometric" ? (
            <div className={styles.authPanel}>
              <p className={styles.eyebrow}>DISHA SECURE ACCESS</p>
              <h1>Three-factor verification</h1>
              <p className={styles.summary}>The right-side gateway activates after Secure Access is selected. Each factor remains fail-closed until its backend verifier confirms identity.</p>

              <div className={styles.factorGrid}>
                <article className={styles.factorCard}>
                  <ScanEye size={28} />
                  <div><strong>Iris</strong><span>Windows Hello / WebAuthn</span></div>
                  <small>Awaiting backend challenge</small>
                </article>
                <article className={styles.factorCard}>
                  <Fingerprint size={28} />
                  <div><strong>Fingerprint</strong><span>Windows Hello / WebAuthn</span></div>
                  <small>Awaiting backend challenge</small>
                </article>
                <article className={styles.factorCard}>
                  <HeartPulse size={28} />
                  <div><strong>Heart Beat</strong><span>Trusted hardware connector</span></div>
                  <small>Awaiting signed device result</small>
                </article>
              </div>

              <div className={styles.policyNote}>
                <ShieldCheck size={18} />
                <span>No browser-only success state is accepted. Verification must come from the corresponding trusted backend or hardware connector.</span>
              </div>

              <div className={styles.actionRow}>
                <button className={styles.secondaryButton} onClick={() => open("welcome")} type="button">Back</button>
                <button className={styles.secondaryButton} onClick={() => open("admin")} type="button"><KeyRound size={17} /> God Admin</button>
              </div>
            </div>
          ) : null}

          {panel === "admin" ? (
            <div className={styles.authPanel}>
              <p className={styles.eyebrow}>PRIVILEGED ACCESS</p>
              <h1>God Admin</h1>
              <p className={styles.summary}>Restricted to the designated DISHA administrator account.</p>
              <form className={styles.adminForm} onSubmit={signInAsGodAdmin}>
                <label>Administrator<input aria-readonly="true" readOnly type="email" value={GOD_ADMIN_EMAIL} /></label>
                <label>Password<input autoComplete="current-password" minLength={8} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} /></label>
                {error ? <p className={styles.error}>{error}</p> : null}
                <button className={styles.primaryButton} disabled={state === "submitting"} type="submit">
                  {state === "submitting" ? <Loader2 className={styles.spin} size={18} /> : <KeyRound size={18} />} Enter as God Admin
                </button>
              </form>
              <button className={styles.backLink} onClick={() => open("biometric")} type="button">Return to biometric access</button>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
