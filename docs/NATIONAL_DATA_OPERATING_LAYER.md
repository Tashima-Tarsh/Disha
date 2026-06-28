# DISHA National Data Operating Layer

DISHA must not pretend that all India data is already present.

The correct production model is:

- source registry in repo
- connectors in repo
- schemas in repo
- small verified snapshots in repo
- large generated datasets as versioned artifacts
- every public claim attached to source, timestamp, and verification status

## Required Layers

1. Constitutional offices: President, Parliament, Supreme Court, Union executive.
2. Union government: ministries, departments, attached offices, public authorities.
3. State government: state departments, district administration, local directories.
4. Local government: LGD state, district, subdistrict, block, panchayat, village.
5. Panchayat governance: panchayat planning and public records.
6. Audit: CAG reports and extracted findings.
7. Crime and cybercrime: NCRB official reports, official cybercrime advisories.
8. Disaster: NDMA public disaster and resilience resources.
9. Geospatial: Bhuvan/NRSC map services and official public layers.
10. Police stations: official open datasets or state police sources, marked incomplete until verified.

## Repo Rule

The repo should contain the operating system, not unverifiable claims.

Allowed in repo:

- source manifests
- schemas
- connectors
- checksums
- official URLs
- normalized small records
- generated snapshots with provenance

Not allowed:

- invented office holders
- invented ministry lists
- guessed 2026 crime totals
- fake police-station coverage
- personal surveillance data
- village-level people tracking

## Current Implementation

The national source registry lives in:

- `web/lib/national-data-registry.ts`
- `web/app/api/dashboard/national/route.ts`

The India scan feed lives in:

- `web/app/api/dashboard/india/route.ts`

The dashboard must read these sources and show missing layers as missing, not as finished.
