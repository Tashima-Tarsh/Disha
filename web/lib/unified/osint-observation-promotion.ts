import { recordEvidenceLineageNode } from "./evidence-lineage";
import { hashValue } from "./hash";
import { indexSearchDocument } from "./hybrid-retrieval";
import {
  linkIntelligenceEntities,
  recordIntelligenceEvent,
  upsertIntelligenceEntity,
  type IntelligenceEntity,
} from "./intelligence-graph";
import type { AdapterEvidence } from "./osint-adapter-bus";
import { emitRuntimeEvent } from "./runtime-event-bus";

export type OsintObservationPromotion = {
  adapterId: string;
  outputHash: string;
  entityIds: string[];
  eventIds: string[];
  lineageNodeIds: string[];
  warnings: string[];
  provenanceHash: string;
};

export async function promoteOsintObservation(input: {
  adapterId: string;
  data: unknown;
  evidence: AdapterEvidence[];
  outputHash: string;
  observedAt: string;
  watchId?: string;
}): Promise<OsintObservationPromotion> {
  const sourceHashes = unique([input.outputHash, ...input.evidence.map((item) => item.provenanceHash)]);
  const lineageNodeIds: string[] = [];
  for (const evidence of input.evidence.slice(0, 100)) {
    const node = await recordEvidenceLineageNode({
      nodeKind: "observation",
      sourceId: evidence.sourceId,
      sourceHash: input.outputHash,
      contentHash: hashValue({ outputHash: input.outputHash, evidence }),
      sourceUrl: evidence.sourceUrl,
      observedAt: input.observedAt,
      title: evidence.sourceName,
      metadata: {
        adapterId: input.adapterId,
        watchId: input.watchId,
        evidenceId: evidence.id,
        evidenceProvenanceHash: evidence.provenanceHash,
      },
    });
    lineageNodeIds.push(node.nodeId);
  }

  const row = asRecord(input.data);
  const entities: IntelligenceEntity[] = [];
  const eventIds: string[] = [];
  const warnings: string[] = [];

  const addEntity = async (entityInput: Parameters<typeof upsertIntelligenceEntity>[0]) => {
    const entity = await upsertIntelligenceEntity({ ...entityInput, observedAt: input.observedAt });
    entities.push(entity);
    return entity;
  };
  const addEvent = async (eventType: string, summary: string, attributes: Record<string, unknown>, entityIds: string[] = []) => {
    const event = await recordIntelligenceEvent({
      eventType,
      summary,
      observedAt: input.observedAt,
      attributes: {
        ...attributes,
        adapterId: input.adapterId,
        watchId: input.watchId,
        verificationState: verificationState(input.adapterId),
      },
      sourceHashes,
      entities: entityIds.map((entityId) => ({ entityId, role: "subject", confidence: 1 })),
    });
    eventIds.push(event.eventId);
    return event;
  };

  switch (input.adapterId) {
    case "public-dns-google": {
      const domain = text(row.domain);
      if (!domain) break;
      const domainEntity = await addEntity({
        entityType: "domain",
        displayName: domain,
        identifiers: [{ namespace: "dns.domain", value: domain, sourceHash: input.outputHash }],
        attributes: { observationSource: "Google Public DNS" },
      });
      const answers = records(row.answers).slice(0, 100);
      await addEvent("dns.observation", `Passive DNS observation for ${domain} returned ${answers.length} answer(s).`, {
        domain,
        recordType: text(row.recordType),
        answerCount: answers.length,
        answers: answers.map((answer) => pick(answer, ["name", "type", "TTL", "data"])),
      }, [domainEntity.entityId]);
      break;
    }
    case "public-certificate-transparency": {
      const domain = text(row.domain);
      if (!domain) break;
      const domainEntity = await addEntity({
        entityType: "domain",
        displayName: domain,
        identifiers: [{ namespace: "dns.domain", value: domain, sourceHash: input.outputHash }],
        attributes: { observationSource: "Certificate Transparency" },
      });
      const certificates = records(row.certificates).slice(0, 100);
      await addEvent("certificate_transparency.observation", `Certificate Transparency returned ${certificates.length} certificate record(s) for ${domain}.`, {
        domain,
        certificateCount: certificates.length,
        certificates: certificates.map((certificate) => pick(certificate, ["issuerName", "commonName", "nameValue", "notBefore", "notAfter", "serialNumber"])),
      }, [domainEntity.entityId]);
      break;
    }
    case "public-rdap": {
      const query = text(row.query);
      if (!query) break;
      const kind = text(row.kind) === "ip" ? "ip_address" : "domain";
      const entity = await addEntity({
        entityType: kind,
        displayName: text(row.name) || query,
        identifiers: [{ namespace: kind === "domain" ? "rdap.domain" : "rdap.ip", value: query, sourceHash: input.outputHash }],
        attributes: { handle: text(row.handle), rdapStatus: strings(row.status).slice(0, 25) },
      });
      await addEvent("rdap.registration_observed", `Public RDAP registration metadata observed for ${query}.`, {
        query,
        kind: text(row.kind),
        handle: text(row.handle),
        status: strings(row.status).slice(0, 25),
        events: records(row.events).slice(0, 50).map((event) => pick(event, ["action", "date"])),
      }, [entity.entityId]);
      break;
    }
    case "public-wayback-cdx": {
      const domain = text(row.domain);
      if (!domain) break;
      const entity = await addEntity({
        entityType: "domain",
        displayName: domain,
        identifiers: [{ namespace: "dns.domain", value: domain, sourceHash: input.outputHash }],
        attributes: { archiveSource: "Internet Archive Wayback Machine" },
      });
      const snapshots = records(row.snapshots).slice(0, 100);
      await addEvent("web_archive.snapshots_observed", `Wayback CDX returned ${snapshots.length} public snapshot record(s) for ${domain}.`, {
        domain,
        snapshotCount: snapshots.length,
        newestSnapshot: snapshots[0] ? pick(snapshots[0], ["timestamp", "original", "statusCode", "mimeType", "digest"]) : null,
      }, [entity.entityId]);
      break;
    }
    case "public-gdelt-news": {
      const query = text(row.query) || "public-news query";
      const articles = records(row.articles).slice(0, 100);
      await addEvent("public_news.discovery", `GDELT returned ${articles.length} public article metadata record(s) for the governed query.`, {
        queryHash: hashValue(query),
        articleCount: articles.length,
        articles: articles.map((article) => pick(article, ["title", "url", "domain", "language", "sourceCountry", "seenDate"])),
        claimRule: "Discovery metadata only; source-page verification is required before article claims become facts.",
      });
      break;
    }
    case "public-cisa-kev": {
      const matched = records(row.matched).slice(0, 200);
      for (const vulnerability of matched) {
        const cve = text(vulnerability.cveID);
        if (!cve) continue;
        const entity = await addEntity({
          entityType: "vulnerability",
          displayName: cve,
          aliases: text(vulnerability.vulnerabilityName) ? [text(vulnerability.vulnerabilityName)!] : [],
          identifiers: [{ namespace: "cve", value: cve, sourceHash: input.outputHash }],
          attributes: {
            vendor: text(vulnerability.vendorProject),
            product: text(vulnerability.product),
            knownExploited: true,
          },
        });
        await addEvent("vulnerability.known_exploited", `${cve} is present in the public CISA Known Exploited Vulnerabilities catalog.`, {
          cve,
          vendor: text(vulnerability.vendorProject),
          product: text(vulnerability.product),
          dateAdded: text(vulnerability.dateAdded),
          dueDate: text(vulnerability.dueDate),
          requiredAction: text(vulnerability.requiredAction),
          ransomwareUse: text(vulnerability.knownRansomwareCampaignUse),
          defensiveOnly: true,
        }, [entity.entityId]);
      }
      break;
    }
    case "public-github-repository": {
      const repository = text(row.fullName) || text(row.repository);
      if (!repository) break;
      const entity = await addEntity({
        entityType: "software_repository",
        displayName: repository,
        identifiers: [{ namespace: "github.repository", value: repository, sourceHash: input.outputHash }],
        attributes: {
          archived: booleanOrNull(row.archived),
          disabled: booleanOrNull(row.disabled),
          license: text(row.license),
        },
      });
      await addEvent("repository.metadata_observed", `Public GitHub repository metadata observed for ${repository}.`, {
        repository,
        pushedAt: text(row.pushedAt),
        updatedAt: text(row.updatedAt),
        stars: numberOrNull(row.stars),
        forks: numberOrNull(row.forks),
        openIssues: numberOrNull(row.openIssues),
        license: text(row.license),
        topics: strings(row.topics).slice(0, 100),
      }, [entity.entityId]);
      break;
    }
    case "public-common-crawl": {
      const domain = text(row.domain);
      if (!domain) break;
      const entity = await addEntity({
        entityType: "domain",
        displayName: domain,
        identifiers: [{ namespace: "dns.domain", value: domain, sourceHash: input.outputHash }],
        attributes: { crawlIndex: text(row.indexId) },
      });
      const captures = records(row.captures).slice(0, 100);
      await addEvent("web_archive.captures_observed", `Common Crawl returned ${captures.length} public capture record(s) for ${domain}.`, {
        domain,
        indexId: text(row.indexId),
        captureCount: captures.length,
        captures: captures.map((capture) => pick(capture, ["url", "timestamp", "status", "mime", "digest"])),
      }, [entity.entityId]);
      break;
    }
    case "public-sec-edgar": {
      const cik = text(row.cik);
      if (!cik) break;
      const name = text(row.name) || `SEC CIK ${cik}`;
      const entity = await addEntity({
        entityType: "company",
        displayName: name,
        aliases: strings(row.tickers),
        identifiers: [{ namespace: "sec.cik", value: cik, sourceHash: input.outputHash }],
        attributes: {
          tickers: strings(row.tickers).slice(0, 50),
          exchanges: strings(row.exchanges).slice(0, 50),
          sic: text(row.sic),
          stateOfIncorporation: text(row.stateOfIncorporation),
        },
      });
      const filings = records(row.filings).slice(0, 100);
      await addEvent("sec.filings_observed", `SEC EDGAR returned ${filings.length} recent filing metadata record(s) for ${name}.`, {
        cik,
        filingCount: filings.length,
        filings: filings.map((filing) => pick(filing, ["accessionNumber", "filingDate", "reportDate", "form", "primaryDocument"])),
      }, [entity.entityId]);
      break;
    }
    case "public-openalex": {
      const works = records(row.works).slice(0, 100);
      const workEntityIds: string[] = [];
      for (const work of works) {
        const title = text(work.title);
        const openalexId = text(work.id);
        if (!title && !openalexId) continue;
        const identifiers = [
          ...(openalexId ? [{ namespace: "openalex.work", value: openalexId, sourceHash: input.outputHash }] : []),
          ...(text(work.doi) ? [{ namespace: "doi", value: text(work.doi)!, sourceHash: input.outputHash }] : []),
        ];
        const entity = await addEntity({
          entityType: "scholarly_work",
          displayName: title || openalexId!,
          identifiers,
          attributes: {
            publicationYear: numberOrNull(work.publicationYear),
            citedByCount: numberOrNull(work.citedByCount),
            workType: text(work.type),
            primaryLocation: text(work.primaryLocation),
            verificationState: "enrichment_only",
          },
          canonicalDiscriminator: openalexId || text(work.doi) || undefined,
        });
        workEntityIds.push(entity.entityId);
      }
      await addEvent("scholarly_graph.discovery", `OpenAlex returned ${works.length} scholarly work record(s).`, {
        queryHash: hashValue(text(row.query) || ""),
        workCount: works.length,
        claimRule: "Scholarly graph metadata is enrichment; consequential scientific claims require primary-paper verification.",
      }, workEntityIds.slice(0, 100));
      break;
    }
    case "public-world-bank": {
      const country = text(row.country);
      const indicator = text(row.indicator);
      if (!country || !indicator) break;
      const entity = await addEntity({
        entityType: "country_indicator_series",
        displayName: `${country} · ${indicator}`,
        identifiers: [{ namespace: "worldbank.indicator_series", value: `${country}:${indicator}`, sourceHash: input.outputHash }],
        attributes: { country, indicator, authority: "World Bank" },
      });
      const observations = records(row.observations).slice(0, 200);
      await addEvent("macro.indicator_observed", `World Bank returned ${observations.length} observation(s) for ${country}/${indicator}.`, {
        country,
        indicator,
        observationCount: observations.length,
        observations: observations.map((observation) => pick(observation, ["date", "value", "country", "indicator"])),
        claimRule: "Retain World Bank indicator metadata, revisions, units and estimation status before consequential use.",
      }, [entity.entityId]);
      break;
    }
    case "public-wikidata-search": {
      const candidates = records(row.entities).slice(0, 50);
      const candidateEntityIds: string[] = [];
      for (const candidate of candidates) {
        const id = text(candidate.id);
        const label = text(candidate.label);
        if (!id || !label) continue;
        const entity = await addEntity({
          entityType: "wikidata_candidate",
          displayName: label,
          identifiers: [{ namespace: "wikidata", value: id, sourceHash: input.outputHash }],
          attributes: {
            description: text(candidate.description),
            conceptUri: text(candidate.conceptUri),
            verificationState: "enrichment_only",
          },
          canonicalDiscriminator: id,
        });
        candidateEntityIds.push(entity.entityId);
      }
      await addEvent("knowledge_graph.entity_candidates", `Wikidata returned ${candidates.length} public entity candidate(s).`, {
        queryHash: hashValue(text(row.query) || ""),
        candidateCount: candidates.length,
        claimRule: "Wikidata is enrichment only; consequential identity and factual claims require authoritative verification.",
      }, candidateEntityIds);
      break;
    }
    case "official-public-source-probe": {
      await addEvent("source.availability_observed", `Official/public source availability probe completed for ${text(row.sourceId) || "registered source"}.`, {
        sourceId: text(row.sourceId),
        sourceName: text(row.sourceName),
        owner: text(row.owner),
        domain: text(row.domain),
        url: text(row.url),
        ok: booleanOrNull(row.ok),
        status: numberOrNull(row.status),
        contentType: text(row.contentType),
        lastModified: text(row.lastModified),
      });
      break;
    }
    case "dynamic-public-source": {
      await addEvent("dynamic_public_source.observation", `Runtime-registered public source returned ${Array.isArray(row.records) ? row.records.length : 0} record(s).`, {
        sourceId: text(row.sourceId),
        sourceName: text(row.sourceName),
        url: text(row.url),
        contentHash: text(row.contentHash),
        recordCount: Array.isArray(row.records) ? row.records.length : 0,
        claimRule: "Dynamic records are observations until a reviewed semantic parser promotes specific fields into claims.",
      });
      break;
    }
    default:
      warnings.push("No adapter-specific promotion profile; output retained as evidence/run state only.");
  }

  const uniqueEntities = unique(entities.map((entity) => entity.entityId));
  if (eventIds.length) {
    try {
      await indexSearchDocument({
        docKind: "event",
        refId: `osint-promotion-${input.outputHash.slice(0, 24)}`,
        subject: input.adapterId,
        title: `Continuous OSINT · ${input.adapterId}`,
        content: `Governed public-source observation promoted from adapter ${input.adapterId}. Event IDs: ${eventIds.join(", ")}.`,
        sourceHashes,
        entityIds: uniqueEntities,
        metadata: { adapterId: input.adapterId, watchId: input.watchId, outputHash: input.outputHash, eventCount: eventIds.length },
        observedAt: input.observedAt,
      });
    } catch {
      warnings.push("Hybrid retrieval projection failed; event/graph persistence remains authoritative and replayable.");
    }
  }

  const base = {
    adapterId: input.adapterId,
    outputHash: input.outputHash,
    entityIds: uniqueEntities,
    eventIds: unique(eventIds),
    lineageNodeIds: unique(lineageNodeIds),
    warnings,
  };
  const promotion: OsintObservationPromotion = { ...base, provenanceHash: hashValue(base) };
  await emitRuntimeEvent("osint.observation_promoted", {
    adapterId: input.adapterId,
    watchId: input.watchId,
    entityCount: promotion.entityIds.length,
    eventCount: promotion.eventIds.length,
    lineageNodeCount: promotion.lineageNodeIds.length,
    outputHash: input.outputHash,
  }, input.watchId ?? input.outputHash);
  return promotion;
}

function verificationState(adapterId: string): "authoritative_observation" | "public_observation" | "enrichment_only" {
  if (["public-cisa-kev", "public-sec-edgar", "public-world-bank", "official-public-source-probe"].includes(adapterId)) return "authoritative_observation";
  if (["public-openalex", "public-wikidata-search", "public-gdelt-news"].includes(adapterId)) return "enrichment_only";
  return "public_observation";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function records(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : [];
}
function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim()) : [];
}
function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function booleanOrNull(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}
function pick(row: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  return Object.fromEntries(keys.filter((key) => row[key] !== undefined).map((key) => [key, row[key]]));
}
function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}
