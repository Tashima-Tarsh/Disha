import { getDbPool } from "../server/db";
import { embedText, localHashEmbedding } from "./embedding-provider";
import { hashValue } from "./hash";
import { emitRuntimeEvent } from "./runtime-event-bus";

export type SearchDocumentKind = "entity" | "claim" | "hypothesis" | "event" | "source_record" | "activation";
export type SearchDocument = {
  docId: string;
  docKind: SearchDocumentKind;
  refId: string;
  subject?: string;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  sourceHashes: string[];
  entityIds: string[];
  embeddingModel: string;
  embedding: number[];
  observedAt: string;
  provenanceHash: string;
};
export type HybridSearchHit = Omit<SearchDocument, "embedding"> & {
  lexicalScore: number;
  vectorScore: number;
  fusionScore: number;
  graphBoost: number;
};
export type GraphNeighbor = { entityId: string; displayName: string; entityType: string; relationType: string; depth: number; confidence: number };
export type HybridRetrievalResult = {
  query: string;
  hits: HybridSearchHit[];
  graphNeighborhood: GraphNeighbor[];
  embeddingModel: string;
  generatedAt: string;
  provenanceHash: string;
};

const memoryDocs = new Map<string, SearchDocument>();

export async function indexSearchDocument(input: {
  docKind: SearchDocumentKind;
  refId: string;
  subject?: string;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
  sourceHashes?: string[];
  entityIds?: string[];
  observedAt?: string;
}): Promise<SearchDocument> {
  const embedding = await embedText(`${input.title}\n${input.subject ?? ""}\n${input.content}`);
  const observedAt = input.observedAt ?? new Date().toISOString();
  const base = {
    docId: `search-${hashValue({ kind: input.docKind, refId: input.refId }).slice(0, 24)}`,
    docKind: input.docKind,
    refId: input.refId,
    subject: input.subject?.trim() || undefined,
    title: input.title.trim().slice(0, 500),
    content: input.content.trim().slice(0, 50_000),
    metadata: input.metadata ?? {},
    sourceHashes: unique(input.sourceHashes ?? [], 100),
    entityIds: unique(input.entityIds ?? [], 100),
    embeddingModel: embedding.model,
    embedding: embedding.vector,
    observedAt,
  };
  const document: SearchDocument = { ...base, provenanceHash: hashValue({ ...base, embedding: undefined }) };
  const pool = getDbPool();
  if (!pool) memoryDocs.set(document.docId, document);
  else {
    await pool.query(
      `insert into intelligence_search_documents
        (doc_id,doc_kind,ref_id,subject,title,content,metadata,source_hashes,entity_ids,embedding_model,embedding,observed_at,provenance_hash,updated_at)
       values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11::vector,$12,$13,now())
       on conflict (doc_kind,ref_id) do update set subject=excluded.subject,title=excluded.title,content=excluded.content,
         metadata=excluded.metadata,source_hashes=excluded.source_hashes,entity_ids=excluded.entity_ids,embedding_model=excluded.embedding_model,
         embedding=excluded.embedding,observed_at=excluded.observed_at,provenance_hash=excluded.provenance_hash,updated_at=now()`,
      [document.docId, document.docKind, document.refId, document.subject ?? null, document.title, document.content, JSON.stringify(document.metadata), document.sourceHashes, document.entityIds, document.embeddingModel, vectorLiteral(document.embedding), document.observedAt, document.provenanceHash],
    );
  }
  return document;
}

export async function hybridRetrieve(query: string, options: { limit?: number; graphDepth?: number; kinds?: SearchDocumentKind[] } = {}): Promise<HybridRetrievalResult> {
  const cleanQuery = query.trim().slice(0, 4000);
  const limit = Math.max(1, Math.min(50, Math.trunc(options.limit ?? 12)));
  const graphDepth = Math.max(0, Math.min(3, Math.trunc(options.graphDepth ?? 2)));
  const embedding = await embedText(cleanQuery);
  const pool = getDbPool();
  let hits: HybridSearchHit[];
  if (!pool) hits = memoryHybridSearch(cleanQuery, embedding.vector, limit, options.kinds);
  else hits = await postgresHybridSearch(cleanQuery, embedding.vector, limit, options.kinds);
  const seedEntityIds = unique(hits.flatMap((hit) => hit.entityIds), 100);
  const graphNeighborhood = graphDepth > 0 ? await expandGraph(seedEntityIds, graphDepth, 100) : [];
  const neighborIds = new Set(graphNeighborhood.map((row) => row.entityId));
  hits = hits.map((hit) => {
    const graphBoost = hit.entityIds.some((id) => neighborIds.has(id)) ? 0.04 : 0;
    return { ...hit, graphBoost, fusionScore: round6(hit.fusionScore + graphBoost) };
  }).sort((a, b) => b.fusionScore - a.fusionScore).slice(0, limit);
  const base = { query: cleanQuery, hits, graphNeighborhood, embeddingModel: embedding.model, generatedAt: new Date().toISOString() };
  const result = { ...base, provenanceHash: hashValue(base) };
  await emitRuntimeEvent("retrieval.hybrid_completed", { queryHash: hashValue(cleanQuery), hitCount: hits.length, graphNeighborCount: graphNeighborhood.length, embeddingModel: embedding.model }, hashValue(cleanQuery).slice(0, 24));
  return result;
}

async function postgresHybridSearch(query: string, vector: number[], limit: number, kinds?: SearchDocumentKind[]): Promise<HybridSearchHit[]> {
  const pool = getDbPool();
  if (!pool) return [];
  const candidateLimit = Math.min(200, Math.max(30, limit * 5));
  const kindFilter = kinds?.length ? kinds : null;
  const [lexical, semantic] = await Promise.all([
    pool.query(
      `select *, ts_rank_cd(search_tsv, websearch_to_tsquery('simple',$1)) as score
       from intelligence_search_documents
       where search_tsv @@ websearch_to_tsquery('simple',$1) and ($2::text[] is null or doc_kind = any($2::text[]))
       order by score desc, observed_at desc limit $3`, [query, kindFilter, candidateLimit],
    ),
    pool.query(
      `select *, 1 - (embedding <=> $1::vector) as score
       from intelligence_search_documents
       where ($2::text[] is null or doc_kind = any($2::text[]))
       order by embedding <=> $1::vector limit $3`, [vectorLiteral(vector), kindFilter, candidateLimit],
    ),
  ]);
  return fuseRankedRows(lexical.rows, semantic.rows, limit);
}

function memoryHybridSearch(query: string, vector: number[], limit: number, kinds?: SearchDocumentKind[]): HybridSearchHit[] {
  const wanted = kinds?.length ? new Set(kinds) : null;
  const queryTokens = new Set(normalize(query).split(" ").filter(Boolean));
  return [...memoryDocs.values()]
    .filter((doc) => !wanted || wanted.has(doc.docKind))
    .map((doc) => {
      const docTokens = new Set(normalize(`${doc.title} ${doc.subject ?? ""} ${doc.content}`).split(" ").filter(Boolean));
      const overlap = [...queryTokens].filter((token) => docTokens.has(token)).length;
      const lexicalScore = queryTokens.size ? overlap / queryTokens.size : 0;
      const vectorScore = cosine(vector, doc.embedding.length ? doc.embedding : localHashEmbedding(doc.content));
      return toHit(doc, lexicalScore, vectorScore, round6(lexicalScore * 0.45 + Math.max(0, vectorScore) * 0.55));
    })
    .sort((a, b) => b.fusionScore - a.fusionScore)
    .slice(0, limit);
}

function fuseRankedRows(lexicalRows: Array<Record<string, unknown>>, semanticRows: Array<Record<string, unknown>>, limit: number): HybridSearchHit[] {
  const byId = new Map<string, { row: Record<string, unknown>; lexicalRank?: number; vectorRank?: number; lexicalScore: number; vectorScore: number }>();
  lexicalRows.forEach((row, index) => byId.set(String(row.doc_id), { row, lexicalRank: index + 1, lexicalScore: Number(row.score ?? 0), vectorScore: 0 }));
  semanticRows.forEach((row, index) => {
    const id = String(row.doc_id); const existing = byId.get(id);
    if (existing) { existing.vectorRank = index + 1; existing.vectorScore = Number(row.score ?? 0); }
    else byId.set(id, { row, vectorRank: index + 1, lexicalScore: 0, vectorScore: Number(row.score ?? 0) });
  });
  return [...byId.values()].map((item) => {
    const rrf = (item.lexicalRank ? 1 / (60 + item.lexicalRank) : 0) + (item.vectorRank ? 1 / (60 + item.vectorRank) : 0);
    const doc = rowToDocument(item.row);
    return toHit(doc, item.lexicalScore, item.vectorScore, round6(rrf));
  }).sort((a, b) => b.fusionScore - a.fusionScore).slice(0, limit);
}

async function expandGraph(seedEntityIds: string[], depth: number, limit: number): Promise<GraphNeighbor[]> {
  if (!seedEntityIds.length) return [];
  const pool = getDbPool();
  if (!pool) return [];
  const result = await pool.query(
    `with recursive walk(entity_id, relation_type, confidence, depth, path) as (
       select case when e.from_entity_id = any($1::text[]) then e.to_entity_id else e.from_entity_id end,
              e.relation_type, e.confidence, 1, array[e.from_entity_id,e.to_entity_id]
       from intelligence_edges e where e.from_entity_id = any($1::text[]) or e.to_entity_id = any($1::text[])
       union all
       select case when e.from_entity_id=w.entity_id then e.to_entity_id else e.from_entity_id end,
              e.relation_type, least(w.confidence,e.confidence), w.depth+1, w.path || case when e.from_entity_id=w.entity_id then e.to_entity_id else e.from_entity_id end
       from walk w join intelligence_edges e on e.from_entity_id=w.entity_id or e.to_entity_id=w.entity_id
       where w.depth < $2 and not (case when e.from_entity_id=w.entity_id then e.to_entity_id else e.from_entity_id end = any(w.path))
     )
     select distinct on (w.entity_id) w.entity_id, i.display_name, i.entity_type, w.relation_type, w.depth, w.confidence
     from walk w join intelligence_entities i on i.entity_id=w.entity_id
     order by w.entity_id,w.depth asc,w.confidence desc limit $3`, [seedEntityIds, depth, limit],
  );
  return result.rows.map((row: Record<string, unknown>) => ({ entityId: String(row.entity_id), displayName: String(row.display_name), entityType: String(row.entity_type), relationType: String(row.relation_type), depth: Number(row.depth), confidence: Number(row.confidence) }));
}

function rowToDocument(row: Record<string, unknown>): SearchDocument {
  return {
    docId: String(row.doc_id), docKind: String(row.doc_kind) as SearchDocumentKind, refId: String(row.ref_id), subject: row.subject ? String(row.subject) : undefined,
    title: String(row.title), content: String(row.content), metadata: typeof row.metadata === "object" && row.metadata ? row.metadata as Record<string, unknown> : {},
    sourceHashes: Array.isArray(row.source_hashes) ? row.source_hashes.map(String) : [], entityIds: Array.isArray(row.entity_ids) ? row.entity_ids.map(String) : [],
    embeddingModel: String(row.embedding_model), embedding: [], observedAt: new Date(String(row.observed_at)).toISOString(), provenanceHash: String(row.provenance_hash),
  };
}
function toHit(doc: SearchDocument, lexicalScore: number, vectorScore: number, fusionScore: number): HybridSearchHit { const { embedding: _embedding, ...rest } = doc; return { ...rest, lexicalScore: round6(lexicalScore), vectorScore: round6(vectorScore), fusionScore, graphBoost: 0 }; }
function vectorLiteral(vector: number[]): string { return `[${vector.map((value) => Number.isFinite(value) ? value.toFixed(8) : "0").join(",")}]`; }
function cosine(a: number[], b: number[]): number { let dot=0,aa=0,bb=0; const n=Math.min(a.length,b.length); for(let i=0;i<n;i+=1){dot+=a[i]!*b[i]!;aa+=a[i]!*a[i]!;bb+=b[i]!*b[i]!;} return aa&&bb?dot/(Math.sqrt(aa)*Math.sqrt(bb)):0; }
function normalize(value: string): string { return value.normalize("NFKC").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/g," ").trim(); }
function unique(values: string[], limit: number): string[] { return [...new Set(values.filter(Boolean))].slice(0, limit); }
function round6(value: number): number { return Math.round(value * 1_000_000) / 1_000_000; }
export function clearHybridRetrievalForTests(): void { memoryDocs.clear(); }
