# DISHA Constitutional Evidence Graph

The rare USP for DISHA is not another chatbot, dashboard, or generic threat feed. It is a Constitutional Evidence Graph: a live, policy-gated intelligence architecture that ties every mission to real public sources, source availability probes, typed lenses, policy decisions, and tamper-evident evidence events.

## What It Solves

Indian public-interest analysis is fragmented across audit PDFs, budget documents, open-data APIs, local-government directories, geospatial portals, disaster resources, crime reports, and economic data warehouses. Most products either visualize stale numbers or summarize documents without preserving constitutional accountability.

DISHA's product promise is stricter:

```text
No fact without source. No action without policy. No memory without evidence.
```

## Live Source Spine

DISHA now registers real source systems only:

- Constitution of India, Legislative Department.
- India Code and BNS.
- e-Gazette of India.
- Digital Sansad Bills.
- Integrated Government Online Directory.
- National Portal ministries, departments, states, UTs, and district directory.
- CAG audit report index.
- India Budget, Ministry of Finance.
- GST Council revenue releases.
- Open Government Data Platform India.
- LGD state/local-government resources.
- Local Government Directory.
- API Setu.
- Bhuvan and Bhuvan API.
- India-WRIS.
- NDMA.
- NCRB.
- RBI DBIE.

Every source definition records owner, domain, source type, update mode, endpoints, limitations, geography level, and verification basis. A source probe records availability metadata and a provenance hash, not copied content or invented statistics.

## Operating Method

1. Register a real public source.
2. Probe whether the source is live.
3. Record the probe in the evidence ledger.
4. Pull source-specific data only through a parser with tests.
5. Mark unsupported facts as `[VERIFY REQUIRED]`.
6. Run lens analysis.
7. Apply policy before model enrichment or action.
8. Store only evidence-backed learning memory.

## No-Demo-Data Rule

The open-data connector does not return fake CAG figures, fake crime numbers, fake state rankings, or fake disaster events. Until a dataset-specific parser exists, it returns a source reference with:

- source identity,
- owner,
- URL,
- license,
- retrieval timestamp,
- provenance hash,
- `noDemoData: true`.

That is intentional. A serious civic intelligence product must prefer an explicit verification gap over attractive false certainty.

## Architecture Boundary

The model layer may advise, structure, and identify missing evidence. It may not:

- invent facts,
- bypass the policy gate,
- call controlled sources directly,
- publish unsupported claims,
- learn silently from controlled or personal data.

The graph is the product authority. The model is one governed reasoning adapter inside it.

## Constitutional Core Body

DISHA's core body is divided into seven proof-bound pillars:

- Constitutional text and amendments.
- Acts, IPC/BNS, rules, and notifications.
- Bills, pending legislation, and parliamentary status.
- President-to-panchayat institutional map.
- Budget, tax, finance, and CAG audit.
- Territory, rivers, water, disaster, and geospatial risk.
- Crime, public safety, and justice statistics.

Each pillar carries mandatory proof requirements before a fact can be used: official source, identifier, date, jurisdiction, document/table/page reference, and source-specific parser status where needed.

## What Still Requires Source-Specific Work

Each source family needs its own parser and update monitor before DISHA can publish factual statistics:

- Constitution article/amendment parser.
- India Code and BNS/IPC concordance parser.
- e-Gazette parser with ministry, date, gazette id, part, section, and PDF hash.
- Digital Sansad bill-status parser.
- Union ministry and state/UT directory importer.
- CAG PDF/report parser.
- Budget PDF/Excel reconciliation parser.
- GST Council and official release parser.
- OGD API key configuration and resource-specific schemas.
- LGD hierarchy importer.
- Bhuvan layer authorization and geometry ingestion.
- India-WRIS river/reservoir/water parser.
- NDMA incident/resource parser.
- NCRB report parser.
- RBI DBIE table/series parser.

Until those exist, DISHA should expose source readiness and verification gaps, not pretend complete national coverage.
