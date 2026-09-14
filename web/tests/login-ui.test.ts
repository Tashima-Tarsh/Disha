import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const loginClient = path.resolve(__dirname, "../app/login/login-client.tsx");
const loginStyles = path.resolve(__dirname, "../app/login/login.module.css");

describe("DISHA secure login UI", () => {
  it("keeps the DISHA artwork on the left and opens authentication on the right", () => {
    const source = fs.readFileSync(loginClient, "utf8");
    const css = fs.readFileSync(loginStyles, "utf8");

    expect(source).toContain('className={styles.visualPane}');
    expect(source).toContain('className={styles.loginPane}');
    expect(source).toContain('onClick={() => open("biometric")}');
    expect(source).toContain('src="/disha-login-hero.webp"');
    expect(source).toContain("quality={100}");
    expect(css).toContain("grid-template-columns: minmax(0, 1fr) minmax(420px, 1fr)");
    expect(css).toContain("object-fit: contain");
    expect(css).not.toContain("backdrop-filter: blur(7px)");
  });

  it("keeps the privileged God Admin path on the authentication side", () => {
    const source = fs.readFileSync(loginClient, "utf8");

    expect(source).toContain('const GOD_ADMIN_EMAIL = "nitish@thenitishkr.in"');
    expect(source).toContain('/api/auth/god-admin');
    expect(source).toContain("God Admin");
  });
});
