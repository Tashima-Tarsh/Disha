import { listSourceRegistry, type SourceDomain } from "./source-registry";

export type ConstitutionalPillar = {
  id: string;
  title: string;
  role: string;
  sourceDomains: SourceDomain[];
  requiredBeforeFactUse: string[];
};

export const constitutionalCore: ConstitutionalPillar[] = [
  {
    id: "constitutional-text",
    title: "Constitutional Text and Amendments",
    role: "Anchor all public-power analysis to the official Constitution and amendment history.",
    sourceDomains: ["constitution", "gazette", "law_code"],
    requiredBeforeFactUse: ["official publication source", "article or amendment identifier", "publication/update date"],
  },
  {
    id: "law-and-criminal-code",
    title: "Acts, IPC/BNS, Rules, Notifications",
    role: "Resolve current law, predecessor law, commencement, repeals, substitutions, and official gazette status.",
    sourceDomains: ["law_code", "gazette"],
    requiredBeforeFactUse: ["act number", "section", "commencement status", "gazette or India Code source"],
  },
  {
    id: "parliament-and-bills",
    title: "Bills, Pending Legislation, and Parliamentary Status",
    role: "Track introduced, pending, passed, lapsed, withdrawn, and enacted legislative material.",
    sourceDomains: ["parliament", "gazette"],
    requiredBeforeFactUse: ["bill number", "house", "status", "date", "official bill text"],
  },
  {
    id: "government-institution-map",
    title: "President-to-Panchayat Institutional Map",
    role: "Map Union ministries, state/UT governments, departments, districts, and local bodies to source records.",
    sourceDomains: ["institutional_directory", "state_government", "administrative_directory"],
    requiredBeforeFactUse: ["source directory id or URL", "jurisdiction", "office/department name", "retrieval date"],
  },
  {
    id: "public-finance-audit",
    title: "Budget, Tax, Finance, and CAG Audit",
    role: "Connect budget allocation, tax revenue, expenditure, audit observations, and finance accountability.",
    sourceDomains: ["finance", "tax", "audit", "macro_economy"],
    requiredBeforeFactUse: ["financial year", "source document", "table/page reference", "unit and currency"],
  },
  {
    id: "territory-water-disaster",
    title: "Territory, Rivers, Water, Disaster, and Geospatial Risk",
    role: "Bind civic and constitutional analysis to administrative geography, rivers, reservoirs, disasters, and map evidence.",
    sourceDomains: ["geospatial", "water", "disaster", "administrative_directory"],
    requiredBeforeFactUse: ["geometry/source layer", "administrative code", "time of observation", "license/access terms"],
  },
  {
    id: "crime-public-safety",
    title: "Crime, Public Safety, and Justice Statistics",
    role: "Use official NCRB and lawful public sources for crime and justice analysis without media-only promotion.",
    sourceDomains: ["crime", "law_code", "gazette"],
    requiredBeforeFactUse: ["report year", "table reference", "jurisdiction", "official report link"],
  },
];

export function getConstitutionalCore() {
  const sources = listSourceRegistry();
  return constitutionalCore.map((pillar) => ({
    ...pillar,
    sourceIds: sources
      .filter((source) => pillar.sourceDomains.includes(source.domain))
      .map((source) => source.sourceId),
  }));
}
