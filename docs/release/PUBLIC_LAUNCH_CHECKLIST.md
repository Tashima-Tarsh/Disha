# Public Launch Checklist

This checklist keeps DISHA's public release focused on credibility, verification, and contributor readiness. It is not a marketing playbook.

## Release Readiness

- Product CI is passing.
- CodeQL is passing.
- Dependabot has no open alerts.
- `npm.cmd --prefix web run type-check:full` passes.
- `npm.cmd --prefix web test` passes.
- `npm.cmd --prefix web run build` passes.
- `/workbench` runs locally and demonstrates the full evidence flow.
- Public documentation page deploys successfully.

## Repository Trust

- README has a working quickstart.
- `SECURITY.md` explains private vulnerability reporting.
- `CONTRIBUTING.md` explains evidence, source, and policy boundaries.
- Issue templates do not ask users to disclose private data.
- PR template requires evidence and policy checks.
- GitHub Discussions are enabled.
- Repository topics match the actual product.

## Legal And Licensing

- Replace the placeholder `LICENSE` with a maintainer-approved standard license before broad open-source promotion.
- Recommended options to review: Apache-2.0 or MIT.
- Do not imply reuse rights until the final license is selected.

## Visual Assets

- Add a current `/workbench` screenshot after a mission run.
- Add an architecture diagram showing:

```text
mission -> DishaSignal -> lenses -> fusion -> policy gate -> evidence ledger -> reviewable output
```

- Add a short demo GIF or video showing the evidence chain forming.
- Upload a custom GitHub social preview image.

## Good First Issues

Create small, reviewable issues such as:

1. Add keyboard navigation test coverage for `/workbench`.
2. Create parser fixture for CERT-In vulnerability notes.
3. Add source registry fixture for one official state open-data portal.
4. Improve Evidence Ledger Explorer visual affordances.
5. Add README screenshot for the agentic workbench.
6. Document one deployment path with PostgreSQL and OIDC.
7. Add claim-level provenance example for CAG audit reports.
8. Add accessibility audit checklist for public docs.

## Public Claims Boundary

- No unsupported government statistics.
- No invented incident counts.
- No operational intelligence claims.
- No leaked, credential, token, private-key, hacked, or exfiltrated material.
- Unsupported claims must be marked `[VERIFY REQUIRED]`.

## Launch Go / No-Go

Go only when:

- checks are green,
- quickstart works from a fresh clone,
- license is finalized,
- public page is live,
- maintainer is available to respond to issues,
- the first public message explains evidence, restraint, and accountability rather than hype.
