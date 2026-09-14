import { hashValue } from "./hash";
import type { AdapterEvidence } from "./osint-adapter-bus";

export class TtlDedupeCache<T> {
  private readonly store = new Map<string, { value: T; expiresAt: number }>();

  constructor(private readonly ttlMs: number, private readonly maxEntries = 250) {
    if (ttlMs <= 0 || maxEntries <= 0) throw new Error("Cache limits must be positive");
  }

  key(input: unknown): string {
    return hashValue(input);
  }

  get(input: unknown): T | undefined {
    const key = this.key(input);
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (hit.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return hit.value;
  }

  set(input: unknown, value: T): void {
    const key = this.key(input);
    if (!this.store.has(key) && this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next().value as string | undefined;
      if (oldest) this.store.delete(oldest);
    }
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  clear(): void {
    this.store.clear();
  }
}

export function dedupeEvidence(items: AdapterEvidence[]): AdapterEvidence[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.provenanceHash)) return false;
    seen.add(item.provenanceHash);
    return true;
  });
}
