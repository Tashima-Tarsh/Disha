import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const loginClient = path.resolve(__dirname, "../app/login/login-client.tsx");
const loginStyles = path.resolve(__dirname, "../app/login/login.module.css");

describe("DISHA secure login UI", () => {
  it("renders a real backend-connected login instead of a flattened screenshot", () => {
    const source = fs.readFileSync(loginClient, "utf8");

    expect(source).toContain('fetch(endpoint');
    expect(source).toContain('"/api/auth/god-admin"');
    expect(source).toContain('"/api/auth/login"');
    expect(source).toContain('/api/auth/oidc/start?');
    expect(source).toContain('type={showPassword ? "text" : "password"}');
    expect(source).toContain('disabled={!formValid || state === "submitting"}');
    expect(source).not.toContain("localStorage");
  });

  it("loads the supplied bright artwork without reusing the old low-resolution hero", () => {
    const source = fs.readFileSync(loginClient, "utf8");

    expect(source).toContain('"/login-artwork/part00.txt"');
    expect(source).toContain('"/login-artwork/part05.txt"');
    expect(source).toContain('data:image/avif;base64,');
    expect(source).not.toContain('/disha-login-hero.webp');
  });

  it("keeps the complete desktop composition fixed to the viewport without page scrolling or cover-cropping", () => {
    const css = fs.readFileSync(loginStyles, "utf8");

    expect(css).toContain("height: 100dvh");
    expect(css).toContain("position: fixed");
    expect(css).toContain("overflow: hidden");
    expect(css).toContain("object-fit: contain");
    expect(css).not.toContain("overflow: auto");
  });

  it("keeps God Admin restricted to the existing designated identity", () => {
    const source = fs.readFileSync(loginClient, "utf8");

    expect(source).toContain('const GOD_ADMIN_EMAIL = "nitish@thenitishkr.in"');
    expect(source).toContain("useGodAdmin");
    expect(source).toContain("God Admin");
  });

  it("does not advertise unsupported password reset or registration actions", () => {
    const source = fs.readFileSync(loginClient, "utf8");

    expect(source).not.toContain('href="/forgot-password"');
    expect(source).not.toContain('href="/register"');
    expect(source).toContain("does not currently provide a production password-lifecycle/email service");
  });
});
