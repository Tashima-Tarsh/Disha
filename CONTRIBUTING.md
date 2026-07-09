# Contributing to DISHA

DISHA is an evidence-first governance and intelligence project. Contributions should strengthen public-interest accountability, not add spectacle.

## Contribution Standard

Every meaningful change must preserve the product rule:

```text
source -> signal -> lens -> policy -> evidence -> reviewable output
```

Do not add claims, statistics, legal conclusions, government references, incident names, or data-source assertions unless the repository contains a verifiable source path. If verification is incomplete, mark the claim as `[VERIFY REQUIRED]`.

## What Belongs

- Stronger contracts for `DishaSignal`, lenses, policy decisions, evidence events, and source records.
- Tests for policy-gate behavior, evidence-chain integrity, source provenance, and controlled-data boundaries.
- Public documentation that is precise, restrained, and useful to researchers, journalists, policymakers, and developers.
- Connectors that register source provenance without copying private, controlled, or unlawful data into the repo.
- Security hardening, logging, migration tooling, deployment checks, and observability.

## What Does Not Belong

- Offensive cyber capability.
- Unverified intelligence claims.
- Scraped private or controlled records.
- Model output promoted as fact.
- Decorative dashboards that do not improve evidence review.
- Generic AI branding, exaggerated marketing, or unsupported authority claims.

## Development Workflow

Create a focused branch:

```bash
git checkout -b feat/evidence-ledger-migration
```

Run the product-spine checks from `web/`:

```bash
npm.cmd run type-check:full
npm.cmd test
```

For repository-wide verification, use the root scripts when available:

```bash
npm.cmd run verify
```

## Pull Request Checklist

- The change is scoped and does not rewrite unrelated legacy surfaces.
- Public claims are sourced or marked `[VERIFY REQUIRED]`.
- Any new data source includes license/status, retrieval path, and provenance notes.
- Any new API route has authentication, rate limiting, validation, and error handling.
- Any model/agent path remains policy-gated and evidence-logged.
- Tests cover the new behavior.
- No secrets, local databases, private evidence, or credentials are committed.

## Review Principle

Review should be strict because DISHA's credibility depends on restraint. A smaller verified feature is better than a larger unverifiable one.
