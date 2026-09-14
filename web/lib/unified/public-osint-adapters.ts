import { buildAdapterEvidence, type AdapterContext, type GovernedOsintAdapter } from "./osint-adapter-bus";
import { sourceRegistry } from "./source-registry";

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type DnsLookupInput = { domain: string; recordType?: "A" | "AAAA" | "MX" | "NS" | "TXT" | "CNAME" };
export type DnsLookupOutput = { domain: string; recordType: string; answers: Array<{ name?: string; type?: number; TTL?: number; data?: string }> };

export type CertificateLookupInput = { domain: string };
export type CertificateLookupOutput = { domain: string; certificates: Array<{ issuerName?: string; commonName?: string; nameValue?: string; notBefore?: string; notAfter?: string; serialNumber?: string }> };

export type PublicSourceProbeInput = { sourceId: string };
export type PublicSourceProbeOutput = { sourceId: string; sourceName: string; owner: string; domain: string; url: string; ok: boolean; status: number; contentType?: string | null; lastModified?: string | null };

function normalizeDomain(value: string): string {
  const domain = value.trim().toLowerCase().replace(/\.$/, "");
  if (!domain || domain.length > 253 || !/^(?=.{1,253}$)(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$/i.test(domain)) {
    throw new Error("invalid_domain");
  }
  return domain;
}

function ensurePublicPurpose(context: AdapterContext): void {
  if (!context.purpose.trim()) throw new Error("purpose_required");
}

export function createPassiveDnsAdapter(fetcher: FetchLike = fetch): GovernedOsintAdapter<DnsLookupInput, DnsLookupOutput> {
  return {
    metadata: {
      id: "public-dns-google",
      name: "Google Public DNS-over-HTTPS",
      version: "1.0.0",
      capability: "passive_domain_dns_resolution",
      auth: "none",
      legalUse: ["Public DNS resolution", "Infrastructure relationship analysis", "Defensive exposure review"],
      blockedUse: ["Credential attacks", "Unauthorized active scanning", "Covert tracking"],
      rateLimitPerMinute: 60,
      timeoutMs: 5000,
      maxRetries: 1,
    },
    async health() {
      return { status: "healthy" as const, detail: "Public passive DNS endpoint configured" };
    },
    async execute(input, context) {
      ensurePublicPurpose(context);
      const domain = normalizeDomain(input.domain);
      const recordType = input.recordType ?? "A";
      const url = `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${recordType}`;
      const response = await fetcher(url, { headers: { accept: "application/dns-json" }, signal: context.signal });
      if (!response.ok) throw new Error(`dns_http_${response.status}`);
      const body = await response.json() as { Answer?: DnsLookupOutput["answers"] };
      const answers = body.Answer ?? [];
      return {
        data: { domain, recordType, answers },
        evidence: [buildAdapterEvidence({ sourceId: "dns.google", sourceName: "Google Public DNS", sourceUrl: url, summary: `${recordType} lookup returned ${answers.length} public DNS answer(s) for ${domain}.` })],
        warnings: answers.length ? [] : ["No DNS answers returned"],
      };
    },
  };
}

export function createCertificateTransparencyAdapter(fetcher: FetchLike = fetch): GovernedOsintAdapter<CertificateLookupInput, CertificateLookupOutput> {
  return {
    metadata: {
      id: "public-certificate-transparency",
      name: "crt.sh Certificate Transparency",
      version: "1.0.0",
      capability: "public_certificate_transparency",
      auth: "none",
      legalUse: ["Public certificate discovery", "Defensive domain relationship analysis"],
      blockedUse: ["Private key acquisition", "Credential attacks", "Unauthorized exploitation"],
      rateLimitPerMinute: 20,
      timeoutMs: 8000,
      maxRetries: 1,
    },
    async health() {
      return { status: "healthy" as const, detail: "Public CT query endpoint configured" };
    },
    async execute(input, context) {
      ensurePublicPurpose(context);
      const domain = normalizeDomain(input.domain);
      const url = `https://crt.sh/?q=${encodeURIComponent(`%.${domain}`)}&output=json`;
      const response = await fetcher(url, { headers: { accept: "application/json" }, signal: context.signal });
      if (!response.ok) throw new Error(`ct_http_${response.status}`);
      const raw = await response.json() as Array<Record<string, unknown>>;
      const seen = new Set<string>();
      const certificates = raw.slice(0, 500).flatMap((item) => {
        const serialNumber = typeof item.serial_number === "string" ? item.serial_number : undefined;
        const key = `${serialNumber ?? ""}|${String(item.name_value ?? "")}|${String(item.not_before ?? "")}`;
        if (seen.has(key)) return [];
        seen.add(key);
        return [{
          issuerName: typeof item.issuer_name === "string" ? item.issuer_name : undefined,
          commonName: typeof item.common_name === "string" ? item.common_name : undefined,
          nameValue: typeof item.name_value === "string" ? item.name_value : undefined,
          notBefore: typeof item.not_before === "string" ? item.not_before : undefined,
          notAfter: typeof item.not_after === "string" ? item.not_after : undefined,
          serialNumber,
        }];
      });
      return {
        data: { domain, certificates },
        evidence: [buildAdapterEvidence({ sourceId: "crt.sh", sourceName: "crt.sh Certificate Transparency", sourceUrl: url, summary: `Public CT query returned ${certificates.length} deduplicated certificate record(s) for ${domain}.` })],
        warnings: certificates.length ? [] : ["No certificate transparency records returned"],
      };
    },
  };
}

export function createOfficialPublicSourceProbeAdapter(fetcher: FetchLike = fetch): GovernedOsintAdapter<PublicSourceProbeInput, PublicSourceProbeOutput> {
  return {
    metadata: {
      id: "official-public-source-probe",
      name: "DISHA Official Public Source Probe",
      version: "1.0.0",
      capability: "official_public_source_availability",
      auth: "none",
      legalUse: ["Availability checks against allowlisted public government sources", "Source provenance verification"],
      blockedUse: ["Arbitrary URL fetching", "Private-network access", "Credentialed source access"],
      rateLimitPerMinute: 30,
      timeoutMs: 6000,
      maxRetries: 1,
    },
    async health() {
      return { status: "healthy" as const, detail: "Government source allowlist loaded" };
    },
    async execute(input, context) {
      ensurePublicPurpose(context);
      const source = sourceRegistry.find((item) => item.sourceId === input.sourceId);
      if (!source) throw new Error("unknown_public_source");
      const endpoint = source.endpoints.find((item) => !item.requiresAuth && item.method === "GET");
      if (!endpoint) throw new Error("no_unauthenticated_get_endpoint");
      const response = await fetcher(endpoint.url, { method: "GET", redirect: "follow", signal: context.signal });
      const data: PublicSourceProbeOutput = {
        sourceId: source.sourceId,
        sourceName: source.sourceName,
        owner: source.owner,
        domain: source.domain,
        url: endpoint.url,
        ok: response.ok,
        status: response.status,
        contentType: response.headers.get("content-type"),
        lastModified: response.headers.get("last-modified"),
      };
      return {
        data,
        evidence: [buildAdapterEvidence({ sourceId: source.sourceId, sourceName: source.sourceName, sourceUrl: endpoint.url, summary: `Official public source availability probe returned HTTP ${response.status}.` })],
        warnings: response.ok ? [] : [`Official source returned HTTP ${response.status}`],
      };
    },
  };
}
