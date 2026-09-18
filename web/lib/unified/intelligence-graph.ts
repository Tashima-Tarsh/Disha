import { getDbPool } from "../server/db";
import { hashValue } from "./hash";
import { emitRuntimeEvent } from "./runtime-event-bus";
import { indexSearchDocument } from "./hybrid-retrieval";

export type EntityIdentifier = {
  namespace: string;
  value: string;
  confidence?: number;
  sourceHash?: string;
};

export type IntelligenceEntity = {
  entityId: string;
  entityType: string;
  canonicalKey: string;
  displayName: string;
  aliases: string[];
  attributes: Record<string, unknown>;
  firstSeenAt: string;
  lastSeenAt: string;
  provenanceHash: string;
};

export type IntelligenceEvent = {
  eventId: string;
  eventType: string;
  occurredAt?: string;
  observedAt: string;
  summary: string;
  attributes: Record<string, unknown>;
  sourceHashes: string[];
  provenanceHash: string;
};

export type IntelligenceEdge = {
  edgeId: string;
  fromEntityId: string;
  toEntityId: string;
  relationType: string;
  validFrom?: string;
  validTo?: string;
  confidence: number;
  sourceHashes: string[];
  provenanceHash: string;
};

const memoryEntities = new Map<string, IntelligenceEntity>();
const memoryEntitiesById = new Map<string, IntelligenceEntity>();
const memoryEvents = new Map<string, IntelligenceEvent>();
const memoryEdges = new Map<string, IntelligenceEdge>();
const memoryIdentifiers = new Map<string, Array<EntityIdentifier & { entityId: string; normalizedValue: string }>>();

export async function upsertIntelligenceEntity(input: {
  entityType: string;
  displayName: string;
  aliases?: string[];
  attributes?: Record<string, unknown>;
  identifiers?: EntityIdentifier[];
  observedAt?: string;
  canonicalDiscriminator?: string;
}): Promise<IntelligenceEntity> {
  const observedAt = input.observedAt ?? new Date().toISOString();
  const baseCanonicalKey = canonicalEntityKey(input.entityType, input.displayName);
  const canonicalKey = input.canonicalDiscriminator ? `${baseCanonicalKey}#${normalizeToken(input.canonicalDiscriminator)}` : baseCanonicalKey;
  const aliases = uniqueAliases([input.displayName, ...(input.aliases ?? [])]);
  const entityId = `entity-${hashValue(canonicalKey).slice(0, 24)}`;
  const existing = await getEntityByCanonicalKey(canonicalKey);
  const base = {
    entityId: existing?.entityId ?? entityId,
    entityType: normalizeToken(input.entityType),
    canonicalKey: existing?.canonicalKey ?? canonicalKey,
    displayName: input.displayName.trim(),
    aliases: uniqueAliases([...(existing?.aliases ?? []), ...aliases]),
    attributes: { ...(existing?.attributes ?? {}), ...(input.attributes ?? {}) },
    firstSeenAt: existing?.firstSeenAt ?? observedAt,
    lastSeenAt: observedAt,
  };
  const entity: IntelligenceEntity = { ...base, provenanceHash: hashValue(base) };
  await persistEntity(entity);
  if (input.identifiers?.length) await addEntityIdentifiers(entity.entityId, input.identifiers, observedAt);
  await emitRuntimeEvent("graph.entity_upserted", { entityId: entity.entityId, entityType: entity.entityType, provenanceHash: entity.provenanceHash }, entity.entityId);
  return entity;
}

export async function enrichIntelligenceEntity(entityId: string, input: {
  displayName?: string;
  aliases?: string[];
  attributes?: Record<string, unknown>;
  identifiers?: EntityIdentifier[];
  observedAt?: string;
}): Promise<IntelligenceEntity | null> {
  const existing = await getIntelligenceEntity(entityId);
  if (!existing) return null;
  const observedAt = input.observedAt ?? new Date().toISOString();
  const base = {
    ...existing,
    displayName: input.displayName?.trim() || existing.displayName,
    aliases: uniqueAliases([existing.displayName, ...existing.aliases, ...(input.aliases ?? []), ...(input.displayName ? [input.displayName] : [])]),
    attributes: { ...existing.attributes, ...(input.attributes ?? {}) },
    lastSeenAt: observedAt,
  };
  const { provenanceHash: _ignored, ...hashBase } = base;
  const entity: IntelligenceEntity = { ...base, provenanceHash: hashValue(hashBase) };
  await persistEntity(entity);
  if (input.identifiers?.length) await addEntityIdentifiers(entity.entityId, input.identifiers, observedAt);
  await emitRuntimeEvent("graph.entity_enriched", { entityId, provenanceHash: entity.provenanceHash }, entityId);
  return entity;
}

export async function getIntelligenceEntity(entityId: string): Promise<IntelligenceEntity | null> {
  const pool = getDbPool();
  if (!pool) return memoryEntitiesById.get(entityId) ?? null;
  const result = await pool.query(`select * from intelligence_entities where entity_id=$1`, [entityId]);
  return result.rowCount ? rowToEntity(result.rows[0] as Record<string, unknown>) : null;
}

export async function listIntelligenceEntitiesByType(entityType: string, limit = 250): Promise<IntelligenceEntity[]> {
  const normalizedType = normalizeToken(entityType);
  const pool = getDbPool();
  if (!pool) return [...memoryEntitiesById.values()].filter((item) => item.entityType === normalizedType).slice(0, limit);
  const result = await pool.query(
    `select * from intelligence_entities where entity_type=$1 order by last_seen_at desc limit $2`,
    [normalizedType, Math.max(1, Math.min(limit, 1000))],
  );
  return result.rows.map((row: Record<string, unknown>) => rowToEntity(row as Record<string, unknown>));
}

export async function addEntityIdentifiers(entityId: string, identifiers: EntityIdentifier[], observedAt = new Date().toISOString()): Promise<void> {
  const normalized = dedupeIdentifiers(identifiers);
  if (!normalized.length) return;
  const pool = getDbPool();
  if (!pool) {
    for (const identifier of normalized) {
      const key = identifierKey(identifier.namespace, identifier.value);
      const rows = memoryIdentifiers.get(key) ?? [];
      const existing = rows.find((row) => row.entityId === entityId);
      if (existing) {
        existing.confidence = Math.max(existing.confidence ?? 0, identifier.confidence ?? 1);
        existing.sourceHash = identifier.sourceHash ?? existing.sourceHash;
      } else {
        rows.push({ ...identifier, entityId, normalizedValue: normalizeIdentifierValue(identifier.value) });
      }
      memoryIdentifiers.set(key, rows);
    }
    return;
  }
  for (const identifier of normalized) {
    await pool.query(
      `insert into intelligence_entity_identifiers (entity_id,namespace,normalized_value,raw_value,confidence,source_hash,first_seen_at,last_seen_at)
       values ($1,$2,$3,$4,$5,$6,$7,$7)
       on conflict (entity_id,namespace,normalized_value) do update set
         raw_value=excluded.raw_value,
         confidence=greatest(intelligence_entity_identifiers.confidence, excluded.confidence),
         source_hash=coalesce(excluded.source_hash, intelligence_entity_identifiers.source_hash),
         last_seen_at=excluded.last_seen_at`,
      [entityId, normalizeToken(identifier.namespace), normalizeIdentifierValue(identifier.value), identifier.value.trim(), clamp01(identifier.confidence ?? 1), identifier.sourceHash ?? null, observedAt],
    );
  }
}

export async function findEntitiesByIdentifier(namespace: string, value: string): Promise<IntelligenceEntity[]> {
  const ns = normalizeToken(namespace);
  const normalizedValue = normalizeIdentifierValue(value);
  const pool = getDbPool();
  if (!pool) {
    const matches = memoryIdentifiers.get(`${ns}:${normalizedValue}`) ?? [];
    return matches.map((row) => memoryEntitiesById.get(row.entityId)).filter((row): row is IntelligenceEntity => Boolean(row));
  }
  const result = await pool.query(
    `select e.* from intelligence_entity_identifiers i
     join intelligence_entities e on e.entity_id=i.entity_id
     where i.namespace=$1 and i.normalized_value=$2
     order by i.confidence desc, e.last_seen_at desc`,
    [ns, normalizedValue],
  );
  return result.rows.map((row: Record<string, unknown>) => rowToEntity(row as Record<string, unknown>));
}

export async function listEntityIdentifiers(entityId: string): Promise<EntityIdentifier[]> {
  const pool = getDbPool();
  if (!pool) {
    return [...memoryIdentifiers.values()].flat().filter((row) => row.entityId === entityId).map((row) => ({ namespace: row.namespace, value: row.value, confidence: row.confidence, sourceHash: row.sourceHash }));
  }
  const result = await pool.query(
    `select namespace,raw_value,confidence,source_hash from intelligence_entity_identifiers where entity_id=$1 order by namespace,normalized_value`,
    [entityId],
  );
  return result.rows.map((row: Record<string, unknown>) => ({ namespace: String(row.namespace), value: String(row.raw_value), confidence: Number(row.confidence), sourceHash: row.source_hash ? String(row.source_hash) : undefined }));
}

export async function recordIntelligenceEvent(input: {
  eventType: string;
  summary: string;
  occurredAt?: string;
  observedAt?: string;
  attributes?: Record<string, unknown>;
  sourceHashes?: string[];
  entities?: Array<{ entityId: string; role: string; confidence?: number }>;
}): Promise<IntelligenceEvent> {
  const observedAt = input.observedAt ?? new Date().toISOString();
  const sourceHashes = [...new Set(input.sourceHashes ?? [])].slice(0, 100);
  const eventId = `ievent-${hashValue({ eventType: input.eventType, summary: input.summary, occurredAt: input.occurredAt, observedAt, sourceHashes }).slice(0, 24)}`;
  const base = { eventId, eventType: normalizeToken(input.eventType), occurredAt: input.occurredAt, observedAt, summary: input.summary.trim(), attributes: input.attributes ?? {}, sourceHashes };
  const event: IntelligenceEvent = { ...base, provenanceHash: hashValue(base) };
  const pool = getDbPool();
  if (!pool) memoryEvents.set(event.eventId, event);
  else {
    await pool.query(
      `insert into intelligence_events (event_id,event_type,occurred_at,observed_at,summary,attributes,source_hashes,provenance_hash)
       values ($1,$2,$3,$4,$5,$6::jsonb,$7,$8) on conflict (event_id) do nothing`,
      [event.eventId, event.eventType, event.occurredAt ?? null, event.observedAt, event.summary, JSON.stringify(event.attributes), event.sourceHashes, event.provenanceHash],
    );
    for (const relation of input.entities ?? []) {
      await pool.query(
        `insert into intelligence_event_entities (event_id,entity_id,role,confidence) values ($1,$2,$3,$4)
         on conflict (event_id,entity_id,role) do update set confidence=excluded.confidence`,
        [event.eventId, relation.entityId, normalizeToken(relation.role), clamp01(relation.confidence ?? 1)],
      );
    }
  }
  try {
    await indexSearchDocument({
      docKind: "event",
      refId: event.eventId,
      subject: event.eventType,
      title: `${event.eventType}: ${event.summary.slice(0, 220)}`,
      content: `${event.summary} Attributes: ${JSON.stringify(event.attributes).slice(0, 12_000)}`,
      sourceHashes: event.sourceHashes,
      entityIds: [...new Set((input.entities ?? []).map((relation) => relation.entityId))],
      metadata: { eventType: event.eventType, occurredAt: event.occurredAt },
      observedAt: event.observedAt,
    });
  } catch { /* retrieval projection is replayable */ }
  await emitRuntimeEvent("graph.event_recorded", { eventId: event.eventId, eventType: event.eventType, provenanceHash: event.provenanceHash }, event.eventId);
  return event;
}

export async function linkIntelligenceEntities(input: {
  fromEntityId: string;
  toEntityId: string;
  relationType: string;
  validFrom?: string;
  validTo?: string;
  confidence?: number;
  sourceHashes?: string[];
}): Promise<IntelligenceEdge> {
  const sourceHashes = [...new Set(input.sourceHashes ?? [])].slice(0, 100);
  const base = {
    edgeId: `edge-${hashValue({ ...input, sourceHashes }).slice(0, 24)}`,
    fromEntityId: input.fromEntityId,
    toEntityId: input.toEntityId,
    relationType: normalizeToken(input.relationType),
    validFrom: input.validFrom,
    validTo: input.validTo,
    confidence: clamp01(input.confidence ?? 0.5),
    sourceHashes,
  };
  const edge: IntelligenceEdge = { ...base, provenanceHash: hashValue(base) };
  const pool = getDbPool();
  if (!pool) memoryEdges.set(edge.edgeId, edge);
  else await pool.query(
    `insert into intelligence_edges (edge_id,from_entity_id,to_entity_id,relation_type,valid_from,valid_to,confidence,source_hashes,provenance_hash)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     on conflict (edge_id) do update set confidence=excluded.confidence, source_hashes=excluded.source_hashes, provenance_hash=excluded.provenance_hash, updated_at=now()`,
    [edge.edgeId, edge.fromEntityId, edge.toEntityId, edge.relationType, edge.validFrom ?? null, edge.validTo ?? null, edge.confidence, edge.sourceHashes, edge.provenanceHash],
  );
  return edge;
}

export async function getEntityNeighborhood(entityId: string, limit = 100): Promise<{ entity: IntelligenceEntity | null; edges: IntelligenceEdge[]; identifiers: EntityIdentifier[] }> {
  const pool = getDbPool();
  if (!pool) {
    const entity = memoryEntitiesById.get(entityId) ?? null;
    const edges = [...memoryEdges.values()].filter((edge) => edge.fromEntityId === entityId || edge.toEntityId === entityId).slice(0, limit);
    return { entity, edges, identifiers: entity ? await listEntityIdentifiers(entityId) : [] };
  }
  const entityResult = await pool.query(`select * from intelligence_entities where entity_id=$1`, [entityId]);
  const edgeResult = await pool.query(`select * from intelligence_edges where from_entity_id=$1 or to_entity_id=$1 order by updated_at desc limit $2`, [entityId, limit]);
  return {
    entity: entityResult.rowCount ? rowToEntity(entityResult.rows[0] as Record<string, unknown>) : null,
    edges: edgeResult.rows.map((row: Record<string, unknown>) => rowToEdge(row as Record<string, unknown>)),
    identifiers: await listEntityIdentifiers(entityId),
  };
}

async function persistEntity(entity: IntelligenceEntity): Promise<void> {
  const pool = getDbPool();
  if (!pool) {
    memoryEntities.set(entity.canonicalKey, entity);
    memoryEntitiesById.set(entity.entityId, entity);
    try { await indexSearchDocument({ docKind: "entity", refId: entity.entityId, subject: entity.displayName, title: entity.displayName, content: `${entity.displayName}. Type ${entity.entityType}. Aliases: ${entity.aliases.join(", ")}. Attributes: ${JSON.stringify(entity.attributes).slice(0, 12000)}`, entityIds: [entity.entityId], metadata: { entityType: entity.entityType, canonicalKey: entity.canonicalKey }, observedAt: entity.lastSeenAt }); } catch { /* replayable */ }
    return;
  }
  await pool.query(
    `insert into intelligence_entities (entity_id, entity_type, canonical_key, display_name, aliases, attributes, first_seen_at, last_seen_at, provenance_hash, updated_at)
     values ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8,$9,now())
     on conflict (entity_id) do update set display_name=excluded.display_name, aliases=excluded.aliases,
       attributes=excluded.attributes, last_seen_at=excluded.last_seen_at, provenance_hash=excluded.provenance_hash, updated_at=now()`,
    [entity.entityId, entity.entityType, entity.canonicalKey, entity.displayName, JSON.stringify(entity.aliases), JSON.stringify(entity.attributes), entity.firstSeenAt, entity.lastSeenAt, entity.provenanceHash],
  );
  try {
    await indexSearchDocument({ docKind: "entity", refId: entity.entityId, subject: entity.displayName, title: entity.displayName, content: `${entity.displayName}. Type ${entity.entityType}. Aliases: ${entity.aliases.join(", ")}. Attributes: ${JSON.stringify(entity.attributes).slice(0, 12000)}`, entityIds: [entity.entityId], metadata: { entityType: entity.entityType, canonicalKey: entity.canonicalKey }, observedAt: entity.lastSeenAt });
  } catch { /* search projection is replayable */ }
}

async function getEntityByCanonicalKey(canonicalKey: string): Promise<IntelligenceEntity | null> {
  const pool = getDbPool();
  if (!pool) return memoryEntities.get(canonicalKey) ?? null;
  const result = await pool.query(`select * from intelligence_entities where canonical_key=$1`, [canonicalKey]);
  return result.rowCount ? rowToEntity(result.rows[0] as Record<string, unknown>) : null;
}

function rowToEntity(row: Record<string, unknown>): IntelligenceEntity {
  return {
    entityId: String(row.entity_id), entityType: String(row.entity_type), canonicalKey: String(row.canonical_key), displayName: String(row.display_name),
    aliases: Array.isArray(row.aliases) ? row.aliases.map(String) : [], attributes: typeof row.attributes === "object" && row.attributes ? row.attributes as Record<string, unknown> : {},
    firstSeenAt: new Date(String(row.first_seen_at)).toISOString(), lastSeenAt: new Date(String(row.last_seen_at)).toISOString(), provenanceHash: String(row.provenance_hash),
  };
}

function rowToEdge(row: Record<string, unknown>): IntelligenceEdge {
  return {
    edgeId: String(row.edge_id), fromEntityId: String(row.from_entity_id), toEntityId: String(row.to_entity_id), relationType: String(row.relation_type),
    validFrom: row.valid_from ? new Date(String(row.valid_from)).toISOString() : undefined, validTo: row.valid_to ? new Date(String(row.valid_to)).toISOString() : undefined,
    confidence: Number(row.confidence), sourceHashes: Array.isArray(row.source_hashes) ? row.source_hashes.map(String) : [], provenanceHash: String(row.provenance_hash),
  };
}

export function canonicalEntityKey(entityType: string, displayName: string): string { return `${normalizeToken(entityType)}:${normalizeEntityName(displayName)}`; }
export function normalizeEntityName(value: string): string { return value.normalize("NFKC").trim().toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim(); }
export function normalizeIdentifierValue(value: string): string { return value.normalize("NFKC").trim().toLocaleLowerCase().replace(/\s+/g, ""); }
export function normalizeEntityType(value: string): string { return normalizeToken(value); }
function normalizeToken(value: string): string { return value.trim().toLowerCase().replace(/[^a-z0-9_.:-]+/g, "_").slice(0, 120); }
function uniqueAliases(values: string[]): string[] { return [...new Set(values.map((item) => item.trim()).filter(Boolean))].slice(0, 100); }
function clamp01(value: number): number { return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0)); }
function identifierKey(namespace: string, value: string): string { return `${normalizeToken(namespace)}:${normalizeIdentifierValue(value)}`; }
function dedupeIdentifiers(values: EntityIdentifier[]): EntityIdentifier[] {
  const seen = new Set<string>();
  const output: EntityIdentifier[] = [];
  for (const value of values) {
    if (!value.namespace.trim() || !value.value.trim()) continue;
    const key = identifierKey(value.namespace, value.value);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push({ ...value, namespace: normalizeToken(value.namespace), value: value.value.trim(), confidence: clamp01(value.confidence ?? 1) });
  }
  return output.slice(0, 100);
}
