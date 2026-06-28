# Open And Controlled Data Governance

DISHA separates open public sources from controlled sources. This distinction is part of the product contract, not a UI label.

## Open Source Registry

The current registry is implemented in `web/lib/unified/data-integration.ts` and includes source entries for:

- Comptroller and Auditor General of India audit reports.
- Ministry of Finance / India Budget documents.
- Data.gov.in public datasets.
- Local Government Directory.
- Bhuvan geospatial data.

The registry stores source identity, owner, access method, update cadence, sensitivity, URL, license notes, and verification status.

## What Open Data Responses Mean

Open-data API responses provide source records and provenance. They do not invent extracted figures. If a number has not been parsed and verified from a source document, it must not be presented as fact.

## Controlled Data Model

Controlled data is any source requiring authorization, operational clearance, private credentials, or a non-public purpose limitation. The current connector is intentionally deny-by-default.

Before a controlled source can be enabled, it needs:

- a source-specific authorization adapter,
- source terms and legal basis,
- minimization and redaction rules,
- purpose binding to a mission,
- evidence logging,
- tests for denial, redaction, and successful authorized reads.

## Future Connectors

Future CAG, finance, disaster, infrastructure, ministry, state, district, police-station, and panchayat connectors should follow the same pattern:

1. register source metadata,
2. fetch source manifests,
3. parse records with provenance,
4. hash raw evidence,
5. expose normalized records,
6. mark unverifiable fields as `[VERIFY REQUIRED]`.
