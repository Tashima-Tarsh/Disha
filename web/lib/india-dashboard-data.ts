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
  { name: "Andhra Pradesh", kind: "State", region: "South", domain: "Evidence", priority: "Watch", cases: 0, evidence: 0, approval: 1, note: "Official source coverage pending." },
  { name: "Arunachal Pradesh", kind: "State", region: "North East", domain: "Evidence", priority: "Watch", cases: 0, evidence: 0, approval: 1, note: "Official source coverage pending." },
  { name: "Assam", kind: "State", region: "North East", domain: "Evidence", priority: "Watch", cases: 0, evidence: 0, approval: 1, note: "Official source coverage pending." },
  { name: "Bihar", kind: "State", region: "East", domain: "Evidence", priority: "Watch", cases: 0, evidence: 0, approval: 1, note: "Official source coverage pending." },
  { name: "Chhattisgarh", kind: "State", region: "Central", domain: "Evidence", priority: "Watch", cases: 0, evidence: 0, approval: 1, note: "Official source coverage pending." },
  { name: "Goa", kind: "State", region: "West", domain: "Evidence", priority: "Watch", cases: 0, evidence: 0, approval: 1, note: "Official source coverage pending." },
  { name: "Gujarat", kind: "State", region: "West", domain: "Evidence", priority: "Watch", cases: 0, evidence: 0, approval: 1, note: "Official source coverage pending." },
  { name: "Haryana", kind: "State", region: "North", domain: "Evidence", priority: "Watch", cases: 0, evidence: 0, approval: 1, note: "Official source coverage pending." },
  { name: "Himachal Pradesh", kind: "State", region: "North", domain: "Evidence", priority: "Watch", cases: 0, evidence: 0, approval: 1, note: "Official source coverage pending." },
  { name: "Jharkhand", kind: "State", region: "East", domain: "Evidence", priority: "Watch", cases: 0, evidence: 0, approval: 1, note: "Official source coverage pending." },
  { name: "Karnataka", kind: "State", region: "South", domain: "Evidence", priority: "Watch", cases: 0, evidence: 0, approval: 1, note: "Official source coverage pending." },
  { name: "Kerala", kind: "State", region: "South", domain: "Evidence", priority: "Watch", cases: 0, evidence: 0, approval: 1, note: "Official source coverage pending." },
  { name: "Madhya Pradesh", kind: "State", region: "Central", domain: "Evidence", priority: "Watch", cases: 0, evidence: 0, approval: 1, note: "Official source coverage pending." },
  { name: "Maharashtra", kind: "State", region: "West", domain: "Evidence", priority: "Watch", cases: 0, evidence: 0, approval: 1, note: "Official source coverage pending." },
  { name: "Manipur", kind: "State", region: "North East", domain: "Evidence", priority: "Watch", cases: 0, evidence: 0, approval: 1, note: "Official source coverage pending." },
  { name: "Meghalaya", kind: "State", region: "North East", domain: "Evidence", priority: "Watch", cases: 0, evidence: 0, approval: 1, note: "Official source coverage pending." },
  { name: "Mizoram", kind: "State", region: "North East", domain: "Evidence", priority: "Watch", cases: 0, evidence: 0, approval: 1, note: "Official source coverage pending." },
  { name: "Nagaland", kind: "State", region: "North East", domain: "Evidence", priority: "Watch", cases: 0, evidence: 0, approval: 1, note: "Official source coverage pending." },
  { name: "Odisha", aliases: ["Orissa"], kind: "State", region: "East", domain: "Evidence", priority: "Watch", cases: 0, evidence: 0, approval: 1, note: "Official source coverage pending." },
  { name: "Punjab", kind: "State", region: "North", domain: "Evidence", priority: "Watch", cases: 0, evidence: 0, approval: 1, note: "Official source coverage pending." },
  { name: "Rajasthan", kind: "State", region: "North", domain: "Evidence", priority: "Watch", cases: 0, evidence: 0, approval: 1, note: "Official source coverage pending." },
  { name: "Sikkim", kind: "State", region: "North East", domain: "Evidence", priority: "Watch", cases: 0, evidence: 0, approval: 1, note: "Official source coverage pending." },
  { name: "Tamil Nadu", kind: "State", region: "South", domain: "Evidence", priority: "Watch", cases: 0, evidence: 0, approval: 1, note: "Official source coverage pending." },
  { name: "Telangana", aliases: ["Telengana"], kind: "State", region: "South", domain: "Evidence", priority: "Watch", cases: 0, evidence: 0, approval: 1, note: "Official source coverage pending." },
  { name: "Tripura", kind: "State", region: "North East", domain: "Evidence", priority: "Watch", cases: 0, evidence: 0, approval: 1, note: "Official source coverage pending." },
  { name: "Uttar Pradesh", kind: "State", region: "North", domain: "Evidence", priority: "Watch", cases: 0, evidence: 0, approval: 1, note: "Official source coverage pending." },
  { name: "Uttarakhand", aliases: ["Uttaranchal"], kind: "State", region: "North", domain: "Evidence", priority: "Watch", cases: 0, evidence: 0, approval: 1, note: "Official source coverage pending." },
  { name: "West Bengal", kind: "State", region: "East", domain: "Evidence", priority: "Watch", cases: 0, evidence: 0, approval: 1, note: "Official source coverage pending." },
  { name: "Andaman and Nicobar Islands", aliases: ["Andaman & Nicobar Island", "Andaman & Nicobar Islands"], kind: "Union Territory", region: "South", domain: "Evidence", priority: "Watch", cases: 0, evidence: 0, approval: 1, note: "Official source coverage pending." },
  { name: "Chandigarh", kind: "Union Territory", region: "North", domain: "Evidence", priority: "Watch", cases: 0, evidence: 0, approval: 1, note: "Official source coverage pending." },
  { name: "Dadra and Nagar Haveli and Daman and Diu", aliases: ["Dadra & Nagar Haveli", "Daman & Diu"], kind: "Union Territory", region: "West", domain: "Evidence", priority: "Watch", cases: 0, evidence: 0, approval: 1, note: "Official source coverage pending." },
  { name: "Delhi", aliases: ["NCT of Delhi"], kind: "Union Territory", region: "North", domain: "Evidence", priority: "Watch", cases: 0, evidence: 0, approval: 1, note: "Official source coverage pending." },
  { name: "Jammu and Kashmir", aliases: ["Jammu & Kashmir"], kind: "Union Territory", region: "North", domain: "Evidence", priority: "Watch", cases: 0, evidence: 0, approval: 1, note: "Official source coverage pending." },
  { name: "Ladakh", kind: "Union Territory", region: "North", domain: "Evidence", priority: "Watch", cases: 0, evidence: 0, approval: 1, note: "Official source coverage pending." },
  { name: "Lakshadweep", kind: "Union Territory", region: "South", domain: "Evidence", priority: "Watch", cases: 0, evidence: 0, approval: 1, note: "Official source coverage pending." },
  { name: "Puducherry", aliases: ["Pondicherry"], kind: "Union Territory", region: "South", domain: "Evidence", priority: "Watch", cases: 0, evidence: 0, approval: 1, note: "Official source coverage pending." },
];

export const regions: Array<"All India" | Region> = ["All India", "North", "South", "East", "West", "Central", "North East"];
export const domains: Array<"All domains" | Domain> = ["All domains", "Constitutional", "Service", "Resilience", "Evidence"];
export const priorities: Array<"All priorities" | Priority> = ["All priorities", "Critical", "High", "Watch", "Stable"];

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
