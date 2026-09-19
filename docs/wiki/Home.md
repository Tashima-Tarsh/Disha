# disha6.6 Technical Wiki

disha6.6 is a Constitutional Evidence Operating System for governed intelligence work. This wiki explains what the system is, how the current code is organized, what is live, and where future capability must pass policy and evidence controls before becoming production behavior.

## 1. What disha6.6 is

disha6.6 is not a single OSINT script, chatbot, dashboard, or model wrapper. It is an evidence-first intelligence platform with a governed runtime.

The system is designed around this operating chain:

```text
question -> source routing -> observation -> policy -> evidence -> review -> decision
```

The important design choice is that every stage remains visible. disha6.6 should be able to explain:

- what the operator asked;
- which source or connector was used;
- what the system observed;
- what the model contributed;
- what policy decided;
- what evidence was written;
- what still needs human verification.

## 2. Current deployment topology

```text
User browser
  |
  v
https://disha6.6.thenitishkr.in
  |
  v
Cloudflare Worker route: disha6.6.thenitishkr.in/*
  |
  v
Render web origin: https://disha-v6-web.onrender.com
  |
  v
Next.js disha6.6 web/API runtime
  |
  v
Optional Python backend: https://disha-v6-brain.onrender.com
```

The Render origin remains `disha-v6-web.onrender.com` because it is the real frontend service behind the public custom domain.

## 3. Runtime boundaries

- `web/` is the active production product.
- `web/app/` contains routes, pages, and API handlers.
- `web/lib/unified/` contains policy, evidence, OSINT, source, workflow, and contract logic.
- `web/database/` contains migrations and durable state definitions.
- `disha/brain/` contains the bounded Python intelligence service.
- `legacy/` and archived docs are historical unless explicitly wired into the active runtime.

Internal names such as `DISHA_JWT_SECRET`, `DISHA_BRAIN_URL`, and the `disha/` directory are compatibility contracts. They are not blindly renamed in this branding pass because doing so would break deployments and CI.

## 4. Evidence model

disha6.6 treats evidence as a product primitive. A result should answer:

```text
What was asked?
Which source was used?
What was observed?
What did policy decide?
What was written to evidence?
What still requires review?
```

The Evidence Ledger records ordered events with hashes, previous hashes, payload state, and verification paths. Unsupported factual claims should remain marked as requiring verification.

## 5. Policy model

The Policy Gate is deny-by-default for unsafe or unsupported execution. It controls:

- active reconnaissance;
- identity enumeration;
- restricted leaked-data sources;
- secret/credential exposure;
- unsupported claims;
- unsafe connectors;
- high-risk automation.

A connector or source being listed in the catalog does not mean it is executable.

## 6. OSINT model

disha6.6 includes a governed OSINT adapter bus and a source universe covering public-source, CTI, humanitarian, geospatial, and SPACEINT categories.

Working public/passive patterns include:

- DNS and registration metadata;
- certificate transparency;
- RDAP;
- public web archives;
- GDELT/news discovery;
- CISA KEV and defensive vulnerability context;
- public GitHub repository metadata;
- SEC EDGAR / OpenAlex / Wikidata-style public records;
- configured OpenCTI and IntelOwl service connectors.

Blocked by default:

- arbitrary active scans;
- credential discovery;
- leaked private datasets;
- automated username/profile enumeration;
- private-account access;
- unreviewed SpiderFoot/Sherlock/Maigret-style execution.

## 7. Important API routes

```text
GET  /api/v1/health
POST /api/v1/mission
POST /api/v1/agentic/mission
POST /api/v1/policy/evaluate
GET  /api/v1/evidence/{missionId}
POST /api/v1/evidence/export
GET  /api/v1/osint/catalog
GET  /api/v1/osint/sources
GET  /api/v1/osint/search?q=example.org
GET  /api/v1/osint/service-connectors
GET  /api/v1/osint/restricted-sources
GET  /api/v1/production/readiness
```

## 8. Operator surfaces

| Surface | Purpose |
| --- | --- |
| `/login` | Secure entry point. |
| `/dashboard` | Evidence, governance, source, and posture command surface. |
| `/workbench` | Governed mission flow. |
| `/intelligence` | Continuous public-source intelligence mesh. |
| `/api/v1` | Versioned platform API. |

## 9. Repository rename note

The repository contents now use **disha6.6** as the public product identity. The GitHub repository object itself still requires a GitHub settings rename if the canonical repository URL should become:

```text
https://github.com/Tashima-Tarsh/disha6.6
```

The current connector can write repository files but does not expose a repository-settings mutation for renaming the GitHub repository object.
