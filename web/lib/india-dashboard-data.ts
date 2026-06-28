export type Region = "North" | "South" | "East" | "West" | "Central" | "North East";
export type TerritoryKind = "State" | "Union Territory";
export type Priority = "Critical" | "High" | "Watch" | "Stable";
export type Domain = "Constitutional" | "Service" | "Resilience" | "Evidence";

export type Territory = {
  name: string;
  aliases?: string[];
  kind: TerritoryKind;
  region: Region;
  domain: Domain;
  priority: Priority;
  cases: number;
  evidence: number;
  approval: number;
  note: string;
};

export const territories: Territory[] = [
  { name: "Andhra Pradesh", kind: "State", region: "South", domain: "Service", priority: "High", cases: 24, evidence: 73, approval: 5, note: "district service access" },
  { name: "Arunachal Pradesh", kind: "State", region: "North East", domain: "Resilience", priority: "Watch", cases: 10, evidence: 62, approval: 3, note: "border-area public assets" },
  { name: "Assam", kind: "State", region: "North East", domain: "Resilience", priority: "Critical", cases: 31, evidence: 69, approval: 8, note: "flood and relief records" },
  { name: "Bihar", kind: "State", region: "East", domain: "Service", priority: "High", cases: 29, evidence: 66, approval: 7, note: "welfare delivery gaps" },
  { name: "Chhattisgarh", kind: "State", region: "Central", domain: "Evidence", priority: "Watch", cases: 18, evidence: 64, approval: 5, note: "field evidence review" },
  { name: "Goa", kind: "State", region: "West", domain: "Evidence", priority: "Stable", cases: 7, evidence: 81, approval: 1, note: "public record sampling" },
  { name: "Gujarat", kind: "State", region: "West", domain: "Resilience", priority: "High", cases: 25, evidence: 76, approval: 4, note: "coastal resilience" },
  { name: "Haryana", kind: "State", region: "North", domain: "Constitutional", priority: "Watch", cases: 16, evidence: 70, approval: 4, note: "authority-response review" },
  { name: "Himachal Pradesh", kind: "State", region: "North", domain: "Resilience", priority: "High", cases: 21, evidence: 68, approval: 6, note: "landslide asset risk" },
  { name: "Jharkhand", kind: "State", region: "East", domain: "Service", priority: "High", cases: 23, evidence: 63, approval: 6, note: "education and welfare access" },
  { name: "Karnataka", kind: "State", region: "South", domain: "Evidence", priority: "Watch", cases: 19, evidence: 78, approval: 3, note: "open-data reconciliation" },
  { name: "Kerala", kind: "State", region: "South", domain: "Resilience", priority: "Watch", cases: 15, evidence: 82, approval: 2, note: "water and health continuity" },
  { name: "Madhya Pradesh", kind: "State", region: "Central", domain: "Service", priority: "High", cases: 27, evidence: 65, approval: 6, note: "district gap closure" },
  { name: "Maharashtra", kind: "State", region: "West", domain: "Constitutional", priority: "High", cases: 33, evidence: 79, approval: 5, note: "large-scale public records" },
  { name: "Manipur", kind: "State", region: "North East", domain: "Evidence", priority: "Critical", cases: 22, evidence: 57, approval: 9, note: "verification-gated claims" },
  { name: "Meghalaya", kind: "State", region: "North East", domain: "Resilience", priority: "Watch", cases: 11, evidence: 67, approval: 3, note: "terrain and service continuity" },
  { name: "Mizoram", kind: "State", region: "North East", domain: "Service", priority: "Watch", cases: 9, evidence: 66, approval: 2, note: "health access records" },
  { name: "Nagaland", kind: "State", region: "North East", domain: "Evidence", priority: "Watch", cases: 8, evidence: 61, approval: 3, note: "source review needed" },
  { name: "Odisha", aliases: ["Orissa"], kind: "State", region: "East", domain: "Resilience", priority: "High", cases: 26, evidence: 72, approval: 5, note: "cyclone and welfare records" },
  { name: "Punjab", kind: "State", region: "North", domain: "Service", priority: "Watch", cases: 14, evidence: 74, approval: 3, note: "public service queue" },
  { name: "Rajasthan", kind: "State", region: "North", domain: "Resilience", priority: "High", cases: 28, evidence: 71, approval: 6, note: "water and rural access" },
  { name: "Sikkim", kind: "State", region: "North East", domain: "Resilience", priority: "Watch", cases: 6, evidence: 70, approval: 1, note: "mountain asset continuity" },
  { name: "Tamil Nadu", kind: "State", region: "South", domain: "Constitutional", priority: "High", cases: 30, evidence: 80, approval: 4, note: "public authority records" },
  { name: "Telangana", aliases: ["Telengana"], kind: "State", region: "South", domain: "Evidence", priority: "Watch", cases: 17, evidence: 77, approval: 3, note: "audit-source matching" },
  { name: "Tripura", kind: "State", region: "North East", domain: "Service", priority: "Watch", cases: 8, evidence: 64, approval: 2, note: "service record review" },
  { name: "Uttar Pradesh", kind: "State", region: "North", domain: "Service", priority: "Critical", cases: 42, evidence: 67, approval: 10, note: "large district backlog" },
  { name: "Uttarakhand", aliases: ["Uttaranchal"], kind: "State", region: "North", domain: "Resilience", priority: "High", cases: 20, evidence: 69, approval: 5, note: "hill infrastructure risk" },
  { name: "West Bengal", kind: "State", region: "East", domain: "Constitutional", priority: "High", cases: 27, evidence: 73, approval: 5, note: "record contradiction review" },
  { name: "Andaman and Nicobar Islands", aliases: ["Andaman & Nicobar Island", "Andaman & Nicobar Islands"], kind: "Union Territory", region: "South", domain: "Resilience", priority: "Watch", cases: 5, evidence: 68, approval: 1, note: "island continuity" },
  { name: "Chandigarh", kind: "Union Territory", region: "North", domain: "Constitutional", priority: "Stable", cases: 4, evidence: 83, approval: 1, note: "urban record audit" },
  { name: "Dadra and Nagar Haveli and Daman and Diu", aliases: ["Dadra & Nagar Haveli", "Daman & Diu"], kind: "Union Territory", region: "West", domain: "Evidence", priority: "Stable", cases: 5, evidence: 75, approval: 1, note: "record consolidation" },
  { name: "Delhi", aliases: ["NCT of Delhi"], kind: "Union Territory", region: "North", domain: "Constitutional", priority: "High", cases: 24, evidence: 81, approval: 4, note: "authority accountability" },
  { name: "Jammu and Kashmir", aliases: ["Jammu & Kashmir"], kind: "Union Territory", region: "North", domain: "Resilience", priority: "High", cases: 18, evidence: 65, approval: 6, note: "public asset continuity" },
  { name: "Ladakh", kind: "Union Territory", region: "North", domain: "Resilience", priority: "Watch", cases: 7, evidence: 63, approval: 2, note: "remote infrastructure" },
  { name: "Lakshadweep", kind: "Union Territory", region: "South", domain: "Resilience", priority: "Watch", cases: 3, evidence: 69, approval: 1, note: "island public services" },
  { name: "Puducherry", aliases: ["Pondicherry"], kind: "Union Territory", region: "South", domain: "Service", priority: "Stable", cases: 6, evidence: 76, approval: 1, note: "health-service records" },
];

export const regions: Array<"All India" | Region> = ["All India", "North", "South", "East", "West", "Central", "North East"];
export const domains: Array<"All domains" | Domain> = ["All domains", "Constitutional", "Service", "Resilience", "Evidence"];
export const priorities: Array<"All priorities" | Priority> = ["All priorities", "Critical", "High", "Watch", "Stable"];

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
