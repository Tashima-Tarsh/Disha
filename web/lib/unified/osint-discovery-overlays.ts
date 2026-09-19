import {
  listOsintSourceUniverse,
  type OsintSourceCategory,
  type OsintSourceUniverseEntry,
} from "./osint-source-universe";

export const osintDiscoveryOverlayEntries: OsintSourceUniverseEntry[] = [
  {
    id: "osint-framework-github",
    name: "OSINT Framework GitHub repository",
    category: "master_directory",
    homeUrl: "https://github.com/lockfale/OSINT-Framework",
    mode: "reference_only",
    auth: "none",
    risk: "low",
    capabilities: ["source tree", "tool metadata", "pricing/status/passive-active review", "live-site provenance"],
    notes: "Canonical source repository for osintframework.com. Use metadata to filter dead, paid/freemium, active, passive, or registration-required tools before promotion into DISHA.",
  },
  {
    id: "awesome-osint-jivoi",
    name: "Awesome OSINT by jivoi",
    category: "master_directory",
    homeUrl: "https://github.com/jivoi/awesome-osint",
    mode: "reference_only",
    auth: "none",
    risk: "low",
    capabilities: ["large OSINT source index", "tool discovery", "category review"],
    notes: "Large general OSINT awesome list. Catalog only; every linked source still needs license, terms, safety and freshness review.",
  },
  {
    id: "awesome-osint-list-astrosp",
    name: "Awesome OSINT List by Astrosp",
    category: "master_directory",
    homeUrl: "https://github.com/Astrosp/Awesome-OSINT-List",
    mode: "reference_only",
    auth: "none",
    risk: "moderate",
    capabilities: ["security-focused OSINT list", "AI tooling references", "red-team/recon discovery"],
    notes: "Broad security-oriented list. Keep as discovery metadata; do not turn recon tools into execution without module review.",
  },
  {
    id: "osint-bible-frangelbarrera",
    name: "OSINT Bible 2026",
    category: "master_directory",
    homeUrl: "https://github.com/frangelbarrera/OSINT-BIBLE",
    mode: "reference_only",
    auth: "none",
    risk: "moderate",
    capabilities: ["OSINT guide", "AI workflows", "tool discovery", "methodology reference"],
    notes: "2026 guide-style repository with hundreds of tools and AI-related workflows. Treat as human research guidance, not an automated source connector.",
  },
  {
    id: "cipher387-osintmap",
    name: "cipher387 OSINT Map",
    category: "master_directory",
    homeUrl: "https://cipher387.github.io/osintmap/",
    mode: "reference_only",
    auth: "none",
    risk: "moderate",
    capabilities: ["online OSINT map", "tool discovery", "multi-category source navigation"],
    notes: "Discovery map for several hundred online OSINT tools. Individual tools need separate safety, legal, license and availability review.",
  },
  {
    id: "github-topic-osint",
    name: "GitHub topic: osint",
    category: "master_directory",
    homeUrl: "https://github.com/topics/osint",
    mode: "reference_only",
    auth: "none",
    risk: "moderate",
    capabilities: ["new repository discovery", "trend monitoring", "upstream candidate sourcing"],
    notes: "Use to discover new OSINT repositories. Topic membership does not imply quality, safety, legality or production readiness.",
  },
  {
    id: "github-topic-threat-intelligence",
    name: "GitHub topic: threat-intelligence",
    category: "master_directory",
    homeUrl: "https://github.com/topics/threat-intelligence",
    mode: "reference_only",
    auth: "none",
    risk: "moderate",
    capabilities: ["CTI repository discovery", "IOC/feed tooling discovery", "upstream candidate sourcing"],
    notes: "Use to discover CTI projects. Promote only through governed adapters with data licensing and operational-safety review.",
  },
  {
    id: "github-topic-satellite-tracking",
    name: "GitHub topic: satellite-tracking",
    category: "master_directory",
    homeUrl: "https://github.com/topics/satellite-tracking",
    mode: "reference_only",
    auth: "none",
    risk: "low",
    capabilities: ["SPACEINT repository discovery", "orbital tooling discovery", "upstream candidate sourcing"],
    notes: "Use to discover satellite-tracking projects for SPACEINT. Validate orbital data sources, licenses and accuracy before use.",
  },
  {
    id: "github-topic-tle-parsing",
    name: "GitHub topic: tle-parsing",
    category: "master_directory",
    homeUrl: "https://github.com/topics/tle-parsing",
    mode: "reference_only",
    auth: "none",
    risk: "low",
    capabilities: ["TLE parser discovery", "orbital mechanics tooling", "upstream candidate sourcing"],
    notes: "Use to discover TLE parsing libraries. Treat as engineering dependency discovery, not as an authoritative orbital data feed.",
  },
];

export function listOsintDiscoveryOverlayEntries(): OsintSourceUniverseEntry[] {
  return osintDiscoveryOverlayEntries.map((entry) => ({ ...entry, capabilities: [...entry.capabilities] }));
}

export function listOsintSourceUniverseWithDiscoveryOverlays(): OsintSourceUniverseEntry[] {
  return dedupeSourceEntries([...listOsintSourceUniverse(), ...listOsintDiscoveryOverlayEntries()]);
}

export function searchOsintSourceUniverseWithDiscoveryOverlays(
  query = "",
  category?: OsintSourceCategory,
): OsintSourceUniverseEntry[] {
  const normalized = query.trim().toLowerCase();
  return listOsintSourceUniverseWithDiscoveryOverlays().filter((entry) => {
    if (category && entry.category !== category) return false;
    if (!normalized) return true;
    return [entry.id, entry.name, entry.homeUrl, entry.notes, entry.category, ...entry.capabilities]
      .join(" ")
      .toLowerCase()
      .includes(normalized);
  });
}

export function getOsintSourceUniverseSummaryWithDiscoveryOverlays() {
  const entries = listOsintSourceUniverseWithDiscoveryOverlays();
  const byCategory = Object.fromEntries(
    [...new Set(entries.map((entry) => entry.category))]
      .map((category) => [category, entries.filter((entry) => entry.category === category).length]),
  );
  return {
    total: entries.length,
    builtin: entries.filter((entry) => entry.mode === "builtin").length,
    connectorReady: entries.filter((entry) => entry.mode === "connector_ready").length,
    requiresConfiguration: entries.filter((entry) => entry.mode === "requires_configuration").length,
    referenceOnly: entries.filter((entry) => entry.mode === "reference_only").length,
    blockedByDefault: entries.filter((entry) => entry.mode === "blocked_by_default").length,
    discoveryOverlays: osintDiscoveryOverlayEntries.length,
    byCategory,
    rule: "The source universe includes reviewed built-ins plus discovery overlays for master directories and GitHub topics. Discovery overlays are reference-only and never imply execution.",
  };
}

function dedupeSourceEntries(entries: OsintSourceUniverseEntry[]): OsintSourceUniverseEntry[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    if (seen.has(entry.id)) return false;
    seen.add(entry.id);
    return true;
  });
}
