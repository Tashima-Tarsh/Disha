# AG-Claw Backend Split Decision

## Current Decision

- Python is the default backend language for orchestration, retrieval, prompt pipelines, and experimentation.
- Rust is deferred until there is a measured need for:
  - low-latency file watching
  - local transport
  - host-level performance-sensitive services

## Why

- Python gives faster iteration for research workflows, model adapters, and orchestration logic.
- The current legal and architectural risk is in the runtime boundary, not in Python performance.
- Premature Rust migration would slow clean-room replacement without reducing the main legal risk.

## Trigger For Rust Extraction

Introduce a Rust service only after benchmarks show Python cannot satisfy a concrete requirement such as:

- workspace indexing latency target
- file watch throughput target
- local transport CPU/memory ceiling

## Interface Rule

Rust services must sit behind explicit contracts. They do not import or embed leaked runtime code.
