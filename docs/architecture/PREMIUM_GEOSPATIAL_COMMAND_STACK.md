# DISHA Premium Geospatial Command Architecture

Status: production architecture decision record  
Date: 2026-09-18

## Product rule

DISHA is an evidence operating system, not a decorative dashboard. Operational visuals must never imply geographic, temporal, network, source, or claim certainty that is not present in governed evidence.

The India surface must not render an artistic India silhouette as if it were geographic data. Until verified geometry is imported, the product shows an explicit geometry-readiness state.

## Recommended client stack

| Capability | Preferred technology | DISHA use |
| --- | --- | --- |
| Accessible UI primitives | Existing Radix UI + selectively borrowed shadcn/ui patterns | Dialogs, menus, tabs, forms, inspectors |
| Product motion | Existing Motion/Framer Motion | State transitions, panel choreography, evidence navigation |
| Command system | DISHA typed command registry; cmdk interaction pattern | Ctrl/Cmd+K universal governed command surface |
| 2D geographic renderer | MapLibre GL JS | Primary operational map |
| React map binding | react-map-gl/maplibre | React lifecycle and controlled view state |
| Geospatial overlays | deck.gl | incidents, clusters, heatmaps, routes, corridors, coverage, temporal layers |
| Static vector tiles | PMTiles | versioned boundary/base-layer delivery without a bespoke tile server |
| Queryable spatial data | PostgreSQL + PostGIS | radius/within/intersects, administrative joins, evidence-linked geometry |
| 3D product visuals | Three.js + React Three Fiber + Drei | cinematic non-authoritative product surfaces and prepared visual assets |
| Dedicated 3D globe/terrain | CesiumJS, only when the use case requires it | optional 3D geospatial workspace, not the default map |
| Entity/evidence graph | Cytoscape.js first; evaluate G6 for richer analyst interactions | deterministic evidence-linked graph navigation |
| Blender automation | MCP for Blender with telemetry disabled | offline cinematic assets, materials, lighting, camera and render workflows |

## India data-source hierarchy

1. **Administrative geometry truth:** Survey of India Administrative Boundary Database. Store product code/version, source URL, retrieval timestamp, CRS, geometry-validation result, source hash, and applicable terms.
2. **Administrative identity:** Local Government Directory (LGD). Bind stable government location identifiers to imported geometry. Never infer identifiers from names alone when an official code is available.
3. **Base transport/hydrography/POI:** OpenStreetMap may be used under ODbL with required attribution and data-license handling. It is a community source, not a substitute for official administrative-boundary authority.
4. **Official thematic/satellite context:** Bhuvan/NRSC or other admitted official services layer-by-layer under their published access and usage terms.
5. **Satellite imagery:** use an admitted provider such as Copernicus Sentinel or an approved Bhuvan service with attribution and timestamp metadata.

## Geometry ingestion contract

An imported map layer is not publishable until it has:

- source ID and source URL
- dataset/product ID and version or publication date
- retrieval timestamp
- source file/content hash
- declared CRS and normalized target CRS
- geometry validation/repair result
- administrative identity mapping (LGD or other official identifier where applicable)
- license/terms note and attribution text
- import job ID and audit event
- feature-level source record hash or stable dataset+feature identity

PostGIS is authoritative for queryable operational geometry. PMTiles is a delivery optimization for read-heavy versioned layers; it is not the source of truth.

## Evidence-linked map feature contract

Every consequential rendered feature should be able to resolve to:

`map feature -> geography ID -> entity/incident/claim -> source record -> evidence event/hash -> policy decision -> mission -> audit trail`

AI-generated interpretation can annotate the feature, but cannot become the feature's factual source.

## Motion and 3D boundary

Motion communicates state change, causality, selection and temporal progression. It must support reduced-motion preferences.

Three.js, R3F, Rive and Blender assets are appropriate for product identity, transition surfaces, explanatory scenes and atmospheric backgrounds. They must not create fictional geographic boundaries, incidents, evidence, infrastructure or intelligence activity.

Avoid glitch, scanline, neon HUD, fake radar sweeps, random particles around operational data, and animation that suggests live activity when no event exists.

## Command architecture

Commands are data, not arbitrary executable strings. Each command has:

- stable ID and slash trigger
- group and human-readable description
- safety class: read, governed write, or review required
- availability state
- explicit route or future governed adapter

The palette may navigate to ready product surfaces. Mutation commands remain non-executable until a typed server adapter enforces authentication, authorization, policy evaluation, evidence logging and audit persistence.

## Incremental delivery

Phase 1: remove fake India geometry; register Survey of India; add typed universal command registry and Ctrl/Cmd+K palette.

Phase 2: add MapLibre + react-map-gl, ingest a versioned authoritative India boundary artifact through a reviewed import pipeline, and render only admitted geometry.

Phase 3: add PostGIS spatial schema/indexes and governed geo APIs for state/district, radius, nearby, within and evidence-to-location queries.

Phase 4: add deck.gl evidence overlays, temporal playback, clustering, heatmaps, corridors and source coverage. Every layer must expose provenance in the inspector.

Phase 5: add Cytoscape evidence/entity graph synchronized with map and timeline selection.

Phase 6: add a separate Three.js/R3F cinematic layer and Blender-authored assets. Keep operational maps visually and architecturally independent from cinematic 3D.

Phase 7: evaluate CesiumJS for a dedicated 3D geospatial workspace only after the 2D evidence map, data licensing, performance budgets and provenance model are mature.
