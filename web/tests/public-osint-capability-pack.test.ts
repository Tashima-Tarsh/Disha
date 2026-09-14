import { describe, expect, it } from "vitest";

import { OsintAdapterBus } from "../lib/unified/osint-adapter-bus";
import { createCertificateTransparencyAdapter, createOfficialPublicSourceProbeAdapter, createPassiveDnsAdapter } from "../lib/unified/public-osint-adapters";
import { dedupeEvidence, TtlDedupeCache } from "../lib/unified/public-osint-cache";

describe("public OSINT capability pack", () => {
  it("resolves passive DNS through the governed adapter bus", async () => {
    const fetcher = async () => new Response(JSON.stringify({ Answer: [{ name: "example.org.", type: 1, TTL: 300, data: "93.184.216.34" }] }), { status: 200 });
    const bus = new OsintAdapterBus();
    bus.register(createPassiveDnsAdapter(fetcher));

    const result = await bus.run("public-dns-google", { domain: "example.org", recordType: "A" }, { missionId: "m1", userId: "u1", purpose: "defensive infrastructure review" });

    expect(result.status).toBe("completed");
    expect(result.data?.answers).toHaveLength(1);
    expect(result.evidence[0].provenanceHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects malformed domains before any network request", async () => {
    let called = false;
    const fetcher = async () => {
      called = true;
      return new Response("{}", { status: 200 });
    };
    const bus = new OsintAdapterBus();
    bus.register(createPassiveDnsAdapter(fetcher));
    const result = await bus.run("public-dns-google", { domain: "http://127.0.0.1/admin" }, { missionId: "m1", userId: "u1", purpose: "test" });
    expect(result.status).toBe("failed");
    expect(result.error).toBe("invalid_domain");
    expect(called).toBe(false);
  });

  it("deduplicates certificate transparency results", async () => {
    const rows = [
      { issuer_name: "CA", common_name: "a.example.org", name_value: "a.example.org", not_before: "2026-01-01", not_after: "2027-01-01", serial_number: "1" },
      { issuer_name: "CA", common_name: "a.example.org", name_value: "a.example.org", not_before: "2026-01-01", not_after: "2027-01-01", serial_number: "1" },
    ];
    const fetcher = async () => new Response(JSON.stringify(rows), { status: 200 });
    const bus = new OsintAdapterBus();
    bus.register(createCertificateTransparencyAdapter(fetcher));
    const result = await bus.run("public-certificate-transparency", { domain: "example.org" }, { missionId: "m1", userId: "u1", purpose: "certificate review" });
    expect(result.status).toBe("completed");
    expect(result.data?.certificates).toHaveLength(1);
  });

  it("only probes allowlisted official public sources", async () => {
    const fetcher = async () => new Response("ok", { status: 200, headers: { "content-type": "text/html", "last-modified": "Tue, 15 Sep 2026 00:00:00 GMT" } });
    const bus = new OsintAdapterBus();
    bus.register(createOfficialPublicSourceProbeAdapter(fetcher));
    const result = await bus.run("official-public-source-probe", { sourceId: "cag-audit-index" }, { missionId: "m1", userId: "u1", purpose: "source verification" });
    expect(result.status).toBe("completed");
    expect(result.data?.sourceId).toBe("cag-audit-index");
    expect(result.evidence[0].sourceId).toBe("cag-audit-index");
  });

  it("fails closed for unknown public source IDs", async () => {
    const bus = new OsintAdapterBus();
    bus.register(createOfficialPublicSourceProbeAdapter(async () => new Response("ok", { status: 200 })));
    const result = await bus.run("official-public-source-probe", { sourceId: "http://127.0.0.1" }, { missionId: "m1", userId: "u1", purpose: "test" });
    expect(result.status).toBe("failed");
    expect(result.error).toBe("unknown_public_source");
  });

  it("provides bounded cache and provenance-based evidence dedupe", () => {
    const cache = new TtlDedupeCache<number>(1000, 2);
    cache.set({ q: "a" }, 1);
    expect(cache.get({ q: "a" })).toBe(1);
    const evidence = [{ id: "1", sourceId: "s", sourceName: "x", summary: "x", retrievedAt: new Date().toISOString(), provenanceHash: "a".repeat(64) }];
    expect(dedupeEvidence([...evidence, ...evidence])).toHaveLength(1);
  });
});
