# System Overview

## What DISHA Is

DISHA is a monorepo for AI-assisted reasoning systems, secure operator interfaces, and experimental defense-oriented services.

## Primary Production Path

The clearest production-oriented path today is:

- `web/` for authenticated HTTP workflows
- `src/` for CLI/runtime hardening
- `docker/` for local infrastructure orchestration

## Legacy And Experimental Areas

- `backend/` is a legacy FastAPI backend
- `disha/` contains AI core, models, apps, prompts, and integrations
- `disha-agi-brain/` is an AI platform prototype backend

## Key Problem The Repo Solves

DISHA attempts to combine:

- AI-driven reasoning
- secure operator workflows
- auditability and policy enforcement
- modular experimentation across multiple AI surfaces
