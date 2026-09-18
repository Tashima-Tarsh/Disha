# DISHA Governed OSINT Expansion

DISHA's OSINT runtime is designed as an evidence-producing, policy-gated collection layer rather than a shell around arbitrary reconnaissance tools.

## Production adapters

The default production bus currently registers:

- Google Public DNS-over-HTTPS (passive DNS resolution)
- crt.sh Certificate Transparency (public certificate discovery)
- RDAP.org (public domain/IP registration data)
- Internet Archive Wayback CDX (historical public-web snapshots)
- GDELT DOC 2.0 (global public-news discovery)
- CISA Known Exploited Vulnerabilities (defensive vulnerability intelligence)
- GitHub Public Repository Metadata (upstream/repository provenance)
- DISHA Official Public Source Probe (allowlisted government/public sources)

Every adapter declares purpose, authentication type, legal/blocked uses, timeouts, retry limits, and an execution class. The default bus fails closed for active reconnaissance, identity enumeration, and prohibited execution classes.

## API

- `GET /api/v1/osint/catalog` lists production adapters, adapter health, and reviewed GitHub upstream projects.
- `POST /api/v1/osint/run` executes a governed adapter for a mission and writes the result into Evidence Ledger v2.

Example request body:

```json
{
  "missionId": "mission-123",
  "adapterId": "public-rdap",
  "purpose": "defensive infrastructure ownership verification",
  "input": { "query": "example.org", "kind": "domain" }
}
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

Recommended next additions are API-key-backed public datasets (for example, commercial/public threat-intelligence and internet-measurement providers) behind server-only secrets and provider-specific terms-of-use checks, followed by sandboxed service integrations for selected passive modules from mature upstream projects.
