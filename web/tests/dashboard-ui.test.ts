import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const dashboardClient = path.resolve(__dirname, "../app/dashboard/dashboard-client.tsx");
const dashboardPage = path.resolve(__dirname, "../app/dashboard/page.tsx");
const legacyRoute = path.resolve(__dirname, "../app/dashboard/route.ts");
const legacyHtml = path.resolve(__dirname, "../app/dashboard/disha66-command-centre-v3.html");

describe("DISHA command dashboard", () => {
  it("is a protected Next.js dashboard instead of a static HTML file", () => {
    const page = fs.readFileSync(dashboardPage, "utf8");

    expect(page).toContain("principalFromAccessToken");
    expect(page).toContain("returnUrl=%2Fdashboard");
    expect(fs.existsSync(legacyRoute)).toBe(false);
    expect(fs.existsSync(legacyHtml)).toBe(false);
  });

  it("uses live DISHA runtime APIs for operational data", () => {
    const source = fs.readFileSync(dashboardClient, "utf8");

    expect(source).toContain("/api/v1/health");
    expect(source).toContain("/api/dashboard/national");
    expect(source).toContain("/api/dashboard/india");
    expect(source).toContain("/api/dashboard/connectors");
    expect(source).toContain("/api/v1/production/readiness");
    expect(source).toContain("/api/v1/extensions/control-plane");
    expect(source).not.toContain("Interactive demo runtime");
  });
});
