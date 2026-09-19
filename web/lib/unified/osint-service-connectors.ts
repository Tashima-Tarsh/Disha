import { safePublicFetch } from "../server/safe-public-fetch";

export type OsintServiceConnectorId = "opencti" | "intelowl" | "spiderfoot" | "sherlock" | "maigret";
export type OsintServiceConnectorFamily = "cti_platform" | "osint_engine" | "identity_enumeration";
export type OsintServiceConnectorState = "configured_live" | "needs_configuration" | "blocked_by_policy";

export type OsintServiceConnectorDefinition = {
  id: OsintServiceConnectorId;
  name: string;
  family: OsintServiceConnectorFamily;
  upstream: string;
  license: string;
  executionState: OsintServiceConnectorState;
  env: string[];
  liveCapabilities: string[];
  blockedCapabilities: string[];
  policy: string;
};

export type OsintServiceConnectorPosture = OsintServiceConnectorDefinition & {
  configured: boolean;
  missingEnv: string[];
  canProbe: boolean;
  canRunTargetSearch: boolean;
};

export type OsintServiceProbeResult = {
  connectorId: OsintServiceConnectorId;
  status: "skipped" | "ok" | "failed" | "blocked";
  httpStatus?: number;
  detail: string;
};

const connectorDefinitions: OsintServiceConnectorDefinition[] = [
  {
    id: "opencti",
    name: "OpenCTI",
    family: "cti_platform",
    upstream: "https://github.com/OpenCTI-Platform/opencti",
    license: "Apache-2.0 Community Edition; Enterprise components separately licensed",
    executionState: "configured_live",
    env: ["OPENCTI_BASE_URL", "OPENCTI_TOKEN"],
    liveCapabilities: ["configured CTI graph probe", "indicator/entity lookup boundary", "source-linked CTI enrichment"],
    blockedCapabilities: ["unreviewed connector execution", "bulk export of private CTI tenants", "secret/token exposure"],
    policy: "Live only when OPENCTI_BASE_URL and OPENCTI_TOKEN are configured. DISHA treats OpenCTI as a service-backed CTI graph, not as a source bypass.",
  },
  {
    id: "intelowl",
    name: "IntelOwl",
    family: "cti_platform",
    upstream: "https://github.com/intelowlproject/IntelOwl",
    license: "AGPL-3.0",
    executionState: "configured_live",
    env: ["INTELOWL_BASE_URL", "INTELOWL_API_KEY"],
    liveCapabilities: ["configured enrichment-service probe", "IOC enrichment boundary", "analyzer result normalization"],
    blockedCapabilities: ["malware detonation by default", "unreviewed analyzer packs", "submission of private files without approval"],
    policy: "Live only when INTELOWL_BASE_URL and INTELOWL_API_KEY are configured. Analyzer selection must be allowlisted before operational enrichment.",
  },
  {
    id: "spiderfoot",
    name: "SpiderFoot",
    family: "osint_engine",
    upstream: "https://github.com/smicallef/spiderfoot",
    license: "MIT",
    executionState: "blocked_by_policy",
    env: ["SPIDERFOOT_BASE_URL", "SPIDERFOOT_API_KEY", "DISHA_SPIDERFOOT_PASSIVE_PROFILE_APPROVED"],
    liveCapabilities: ["future passive-profile service connector after module allowlist"],
    blockedCapabilities: ["arbitrary module execution", "active target probing", "credential or secret discovery", "unbounded scans"],
    policy: "Catalogued and configurable for future passive-only profiles, but not executable until a reviewed module allowlist exists.",
  },
  {
    id: "sherlock",
    name: "Sherlock",
    family: "identity_enumeration",
    upstream: "https://github.com/sherlock-project/sherlock",
    license: "MIT",
    executionState: "blocked_by_policy",
    env: ["DISHA_IDENTITY_ENUMERATION_APPROVED"],
    liveCapabilities: [],
    blockedCapabilities: ["cross-site username enumeration", "profile correlation", "personal account discovery"],
    policy: "Identity enumeration is not executable in the default DISHA runtime. Use only a separately reviewed, consented workflow if one is created later.",
  },
  {
    id: "maigret",
    name: "Maigret",
    family: "identity_enumeration",
    upstream: "https://github.com/soxoj/maigret",
    license: "MIT",
    executionState: "blocked_by_policy",
    env: ["DISHA_IDENTITY_ENUMERATION_APPROVED"],
    liveCapabilities: [],
    blockedCapabilities: ["cross-site username enumeration", "profile correlation", "personal account discovery"],
    policy: "Identity enumeration is not executable in the default DISHA runtime. Use only a separately reviewed, consented workflow if one is created later.",
  },
];

export function listOsintServiceConnectors(): OsintServiceConnectorPosture[] {
  return connectorDefinitions.map((definition) => {
    const missingEnv = definition.env.filter((name) => !process.env[name]);
    const configured = missingEnv.length === 0;
    return {
      ...definition,
      env: [...definition.env],
      liveCapabilities: [...definition.liveCapabilities],
      blockedCapabilities: [...definition.blockedCapabilities],
      configured,
      missingEnv,
      canProbe: configured && definition.executionState === "configured_live",
      canRunTargetSearch: configured && definition.executionState === "configured_live" && ["opencti", "intelowl"].includes(definition.id),
    };
  });
}

export function getOsintServiceConnectorSummary() {
  const connectors = listOsintServiceConnectors();
  return {
    total: connectors.length,
    configuredLive: connectors.filter((connector) => connector.executionState === "configured_live" && connector.configured).length,
    needsConfiguration: connectors.filter((connector) => connector.executionState === "configured_live" && !connector.configured).length,
    blockedByPolicy: connectors.filter((connector) => connector.executionState === "blocked_by_policy").length,
    rule: "OpenCTI and IntelOwl are service-backed live connectors when configured. SpiderFoot, Sherlock and Maigret stay policy-blocked unless a future reviewed safe profile is added.",
  };
}

export async function probeOsintServiceConnector(
  connectorId: OsintServiceConnectorId,
  fetcher: typeof safePublicFetch = safePublicFetch,
): Promise<OsintServiceProbeResult> {
  const posture = listOsintServiceConnectors().find((connector) => connector.id === connectorId);
  if (!posture) throw new Error(`unknown_osint_service_connector:${connectorId}`);
  if (posture.executionState === "blocked_by_policy") {
    return { connectorId, status: "blocked", detail: posture.policy };
  }
  if (!posture.configured) {
    return { connectorId, status: "skipped", detail: `Missing configuration: ${posture.missingEnv.join(", ")}` };
  }
  if (connectorId === "opencti") return probeOpenCti(fetcher);
  if (connectorId === "intelowl") return probeIntelOwl(fetcher);
  return { connectorId, status: "blocked", detail: "Connector is not executable in the current DISHA runtime." };
}

export async function probeConfiguredOsintServices(fetcher: typeof safePublicFetch = safePublicFetch): Promise<OsintServiceProbeResult[]> {
  return Promise.all(["opencti", "intelowl", "spiderfoot", "sherlock", "maigret"].map((id) =>
    probeOsintServiceConnector(id as OsintServiceConnectorId, fetcher),
  ));
}

async function probeOpenCti(fetcher: typeof safePublicFetch): Promise<OsintServiceProbeResult> {
  const baseUrl = requireEnv("OPENCTI_BASE_URL").replace(/\/+$/, "");
  const token = requireEnv("OPENCTI_TOKEN");
  const response = await fetcher(`${baseUrl}/graphql`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query: "query DishaOpenCtiHealth { about { version } }" }),
  });
  return {
    connectorId: "opencti",
    status: response.ok ? "ok" : "failed",
    httpStatus: response.status,
    detail: response.ok ? "OpenCTI GraphQL endpoint responded." : `OpenCTI probe returned HTTP ${response.status}.`,
  };
}

async function probeIntelOwl(fetcher: typeof safePublicFetch): Promise<OsintServiceProbeResult> {
  const baseUrl = requireEnv("INTELOWL_BASE_URL").replace(/\/+$/, "");
  const apiKey = requireEnv("INTELOWL_API_KEY");
  const response = await fetcher(`${baseUrl}/api/healthcheck`, {
    method: "GET",
    headers: {
      authorization: `Token ${apiKey}`,
      accept: "application/json",
    },
  });
  return {
    connectorId: "intelowl",
    status: response.ok ? "ok" : "failed",
    httpStatus: response.status,
    detail: response.ok ? "IntelOwl health endpoint responded." : `IntelOwl probe returned HTTP ${response.status}.`,
  };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`missing_env:${name}`);
  return value;
}
