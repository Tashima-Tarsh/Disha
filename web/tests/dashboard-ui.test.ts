import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const dashboardClient = path.resolve(__dirname, "../app/dashboard/dashboard-client.tsx");
const dashboardPage = path.resolve(__dirname, "../app/dashboard/page.tsx");
const commandRoute = path.resolve(__dirname, "../app/api/dashboard/command/route.ts");
const claimChain = path.resolve(__dirname, "../lib/dashboard-claim-chain.ts");
const geospatialLayer = path.resolve(__dirname, "../lib/india-geospatial-layer.ts");
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

  it("uses a single backend command feed for operational data", () => {
    const source = fs.readFileSync(dashboardClient, "utf8");

    expect(source).toContain("/api/dashboard/command");
    expect(source).toContain("CommandFeed");
    expect(source).toContain("Constitutional Chain Explorer");
    expect(source).toContain("Geospatial Import Layer");
    expect(source).not.toContain("Interactive demo runtime");
  });

  it("builds the command feed from real connector and governance modules", () => {
    const route = fs.readFileSync(commandRoute, "utf8");

    expect(route).toContain("fetchCagAuditRecords");
    expect(route).toContain("fetchFinanceBudgetRecords");
    expect(route).toContain("getProductionSpineReport");
    expect(route).toContain("getGovernedExtensionControlPlane");
    expect(route).toContain("requirePrincipal");
    expect(route).toContain("buildIndiaGeospatialLayer");
    expect(route).toContain("claimChains");
  });

  it("keeps geospatial and claim-chain work provenance-first", () => {
    const geo = fs.readFileSync(geospatialLayer, "utf8");
    const claims = fs.readFileSync(claimChain, "utf8");

    expect(geo).toContain("datameet-maps");
    expect(geo).toContain("bhuvan");
    expect(geo).toContain("source_registered_requires_import");
    expect(geo).toContain("attributionRequired: true");
    expect(claims).toContain("buildCagClaimChains");
    expect(claims).toContain("buildFinanceClaimChains");
    expect(claims).toContain("sourceRecordHash");
    expect(claims).toContain("chainHash");
  });
});
