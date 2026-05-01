# System Overview

DISHA OS is a purpose-built OS for:
- secure AI execution (policy-gated tools and workflows)
- security monitoring (telemetry, anomaly detection, explainable alerts)
- evidence-grade audit (who did what, when, why, and what data changed)

## Core runtimes

- **DISHA Web** (`web/`): operator console and assistant API surface (auth/RBAC/CSRF/rate limiting/audit).
- **DISHA Brain** (`disha/brain/`): local intelligence core (decisioning, memory, SQLite store, module adapters).
- **DISHA OS image** (`os/`): bootable ISO build system (x86_64 BIOS+UEFI) plus systemd service overlay.

## What works offline vs online

Offline:
- UI, workflow execution (non-network nodes), audit/event capture, evidence packaging.

Online:
- Cloud model calls (OpenAI Responses API) and any workflow node fetching public sources.

