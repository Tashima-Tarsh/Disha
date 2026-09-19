# DISHA Governed OSINT Expansion

DISHA's OSINT runtime is designed as an evidence-producing, policy-gated collection layer rather than a shell around arbitrary reconnaissance tools.

## Production adapters

The default production bus currently registers:

- Google Public DNS-over-HTTPS (passive DNS resolution)
- crt.sh Certificate Transparency (public certificate discovery)
- RDAP.org (public domain/IP registration data)
- Internet Archive Wayback CDX (historical public-web snapshots)
- Common Crawl (public web-crawl captures)
- GDELT DOC 2.0 (global public-news discovery)
- CISA Known Exploited Vulnerabilities (defensive vulnerability intelligence)
- GitHub Public Repository Metadata (upstream/repository provenance)
- SEC EDGAR Submissions (official US company filing metadata)
- OpenAlex (public scholarly graph)
- World Bank API (public macroeconomic indicators)
- Wikidata Search (public knowledge-graph entity discovery)
- DISHA Official Public Source Probe (allowlisted government/public sources)
- DISHA Dynamic Public Source adapter (allowlisted source-registry endpoints)

Every adapter declares purpose, authentication type, legal/blocked uses, timeouts, retry limits, and an execution class. The default bus fails closed for active reconnaissance, identity enumeration, and prohibited execution classes.

## Universal Search

`GET /api/v1/osint/search?q=<target>` provides a single governed entry point over the production adapter bus. It does not bypass adapter policy.

The planner classifies the target and chooses only relevant passive/public adapters:

| Target | Default routing |
| --- | --- |
| Domain / website | DNS, certificate transparency, RDAP, Wayback, Common Crawl, GDELT |
| IP address | RDAP, GDELT |
| CVE | CISA KEV, GDELT |
| GitHub repository | GitHub public repository metadata, GDELT |
| `CIK <number>` | SEC EDGAR, GDELT |
| Person, company, organisation or topic | Wikidata, OpenAlex, GDELT |
| Email, phone or `@username` | Public reporting only; cross-site identity enumeration stays disabled |

The response exposes the detected target type, normalized target, adapters executed, per-adapter status and duration, source-linked evidence, provenance hashes, evidence class, warnings, and explicit execution boundaries.

The authenticated Intelligence workspace uses the same planner, so the visual query surface and the standalone API cannot drift into different collection behavior.

## API

- `GET /api/v1/osint/catalog` lists production adapters, adapter health, and reviewed GitHub upstream projects.
- `GET /api/v1/osint/search?q=<target>` performs governed universal public-source search.
- `POST /api/v1/osint/run` executes one governed adapter for a mission and writes the result into Evidence Ledger v2.
- `GET /api/v1/osint/watches` and `POST /api/v1/osint/watches` manage continuous governed watches.
- `POST /api/v1/osint/watch-bundles` creates approved multi-source watch bundles.

Example single-adapter request body:

```json
{
  "missionId": "mission-123",
  "adapterId": "public-rdap",
  "purpose": "defensive infrastructure ownership verification",
  "input": { "query": "example.org", "kind": "domain" }
}
```

Example Universal Search request:

```text
GET /api/v1/osint/search?q=example.org
```

## GitHub upstream rule

GitHub OSINT projects are **cataloged, not blindly vendored**. Projects such as SpiderFoot, theHarvester, IntelOwl, Recon-ng, OWASP Amass, Photon, Sherlock, Maigret, and Holehe have materially different network behavior, privacy implications, licenses, and dependency chains.

Promotion into DISHA production requires all of the following:

1. A module-level capability review.
2. A compatible license and recorded upstream repository.
3. A governed adapter contract.
4. Passive/public-source behavior by default.
5. Policy evaluation before execution.
6. Bounded timeouts, retries, and result sizes.
7. Evidence/provenance output for every successful collection.
8. No credential harvesting, secret discovery, exploit delivery, authentication bypass, or private-account access.

Active-recon and identity-enumeration projects remain blocked by default. They are not executable merely because they are open source.

## Next production promotions

The next useful promotions are service-backed or dataset-backed connectors that preserve this same contract rather than bypassing it. Candidates include OpenSanctions entity screening and configured OpenCTI/IntelOwl services, followed by carefully selected passive modules from mature upstream projects.

SpiderFoot, Maigret, Sherlock, Amass and similar projects must not be exposed as arbitrary command execution. A production connector should select a reviewed passive profile, enforce target/purpose policy, bound runtime and result volume, and convert every accepted observation into DISHA evidence/provenance records.
