# DISHA Research Layer

The `disha/` directory is the Sovereign Cognitive Extensions layer for DISHA 6.6.

Status:

- Research and extension layer only.
- Not part of the default production runtime.
- Enabled locally with Docker `--profile full`.

Boundary:

- Code in this directory must not directly influence production decisions, evidence records, or user-facing conclusions.
- Any capability promoted from this layer must enter through `web/lib/unified/` with a product contract, policy evaluation, evidence logging, tests, and documentation.

The active production spine lives in `web/`.
