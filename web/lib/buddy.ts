export type BuddyRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type BuddyStatName = "debugging" | "patience" | "traceability" | "safety" | "throughput";

export interface BuddyProfile {
  seed: string;
  rarity: BuddyRarity;
  species: string;
  eye: string;
  hat: string;
  shiny: boolean;
  stats: Record<BuddyStatName, number>;
}

export interface BuddySuggestion {
  id: string;
  label: string;
  prompt: string;
}

const RARITY_WEIGHTS: Array<[BuddyRarity, number]> = [
  ["common", 60],
  ["uncommon", 24],
  ["rare", 10],
  ["epic", 5],
  ["legendary", 1],
];

const RARITY_FLOOR: Record<BuddyRarity, number> = {
  common: 10,
  uncommon: 24,
  rare: 36,
  epic: 48,
  legendary: 60,
};

const SPECIES = [
  "duck",
  "goose",
  "cat",
  "dragon",
  "octopus",
  "owl",
  "penguin",
  "turtle",
  "robot",
  "rabbit",
] as const;

const EYES = ["dot", "star", "cross", "focus", "at", "wide"] as const;
const HATS = ["none", "crown", "tophat", "propeller", "halo", "wizard", "beanie"] as const;
const STAT_NAMES: BuddyStatName[] = ["debugging", "patience", "traceability", "safety", "throughput"];

export const BUDDY_STORAGE_KEY = "agclaw-buddy-seed";
export const DEFAULT_BUDDY_SEED = "agclaw-local-operator";

function mulberry32(seed: number) {
  let value = seed >>> 0;
  return function next() {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pick<T>(rng: () => number, values: readonly T[]): T {
  return values[Math.floor(rng() * values.length)] as T;
}

function rollRarity(rng: () => number): BuddyRarity {
  const total = RARITY_WEIGHTS.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = rng() * total;
  for (const [rarity, weight] of RARITY_WEIGHTS) {
    roll -= weight;
    if (roll < 0) {
      return rarity;
    }
  }
  return "common";
}

function rollStats(rng: () => number, rarity: BuddyRarity): Record<BuddyStatName, number> {
  const floor = RARITY_FLOOR[rarity];
  const peak = pick(rng, STAT_NAMES);
  let dump = pick(rng, STAT_NAMES);
  while (dump === peak) {
    dump = pick(rng, STAT_NAMES);
  }

  return Object.fromEntries(
    STAT_NAMES.map((name) => {
      if (name === peak) {
        return [name, Math.min(100, floor + 25 + Math.floor(rng() * 20))];
      }
      if (name === dump) {
        return [name, Math.max(1, floor - 8 + Math.floor(rng() * 12))];
      }
      return [name, floor + Math.floor(rng() * 24)];
    })
  ) as Record<BuddyStatName, number>;
}

export function getBuddyProfile(seed: string): BuddyProfile {
  const rng = mulberry32(hashString(`${seed}:agclaw-buddy:v1`));
  const rarity = rollRarity(rng);
  return {
    seed,
    rarity,
    species: pick(rng, SPECIES),
    eye: pick(rng, EYES),
    hat: rarity === "common" ? "none" : pick(rng, HATS),
    shiny: rng() < 0.015,
    stats: rollStats(rng, rarity),
  };
}

export function getBuddyStatSummary(profile: BuddyProfile): string {
  const topStat = Object.entries(profile.stats).sort((left, right) => right[1] - left[1])[0];
  return `${topStat[0]} ${topStat[1]}`;
}

export function getBuddyTake(profile: BuddyProfile, latestPrompt: string): string {
  const context = latestPrompt.trim() || "the current chat";
  return `${capitalize(profile.species)} buddy flags ${profile.rarity} risk handling on ${context}. Keep advice traceable and operator-safe.`;
}

export function getBuddySuggestions(profile: BuddyProfile, latestPrompt: string): BuddySuggestion[] {
  const topic = latestPrompt.trim() || "this workflow";
  const species = capitalize(profile.species);
  return [
    {
      id: "risk-check",
      label: "Risk check",
      prompt: `${species} buddy: list the top 3 operational risks for ${topic} and how to review them safely.`,
    },
    {
      id: "traceability",
      label: "Traceability",
      prompt: `${species} buddy: identify the genealogy, batch, and approval records I should verify for ${topic}.`,
    },
    {
      id: "handoff",
      label: "Handoff",
      prompt: `${species} buddy: draft a concise operator handoff note for ${topic} with human review gates.`,
    },
  ];
}

export function getBuddySeed(): string {
  if (typeof window === "undefined") {
    return DEFAULT_BUDDY_SEED;
  }

  const existing = window.localStorage.getItem(BUDDY_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const seed = `${DEFAULT_BUDDY_SEED}:${window.location.hostname || "local"}`;
  window.localStorage.setItem(BUDDY_STORAGE_KEY, seed);
  return seed;
}

export function rarityClassName(rarity: BuddyRarity): string {
  switch (rarity) {
    case "legendary":
      return "text-amber-300";
    case "epic":
      return "text-fuchsia-300";
    case "rare":
      return "text-sky-300";
    case "uncommon":
      return "text-emerald-300";
    default:
      return "text-surface-300";
  }
}

function capitalize(value: string): string {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}
