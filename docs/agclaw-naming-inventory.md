# AG-Claw Naming Inventory

## Purpose

This document tracks branding and attribution-related names across the runnable clean-room surface and classifies each category so the migration stays deliberate.

## Classification Rules

- `rename now`: product-facing or operator-facing naming residue in the clean-room shell or backend docs
- `must keep`: functional provider or protocol names that are required for compatibility
- `reference-only`: names inside research/reference docs or the leaked runtime tree that should not be productized

## Rename Now

- `web/app/layout.tsx`
  - app title and metadata description
- `web/public/manifest.json`
  - PWA name, short name, and description
- `web/components/chat/*`
  - assistant labels and placeholder copy
- `web/components/layout/Sidebar.tsx`
  - shell product name
- `web/components/settings/*`
  - telemetry/privacy wording and generic assistant labels
- `web/hooks/useCommandRegistry.tsx`
  - local storage key
- `web/lib/notifications.ts`
  - persisted notification storage key
- `web/lib/store.ts`
  - persisted chat storage key
- `web/lib/api/conversations.ts`
  - export attribution string
- `web/lib/api/files.ts`
  - MCP client info name
- `web/lib/export/*`
  - exported document titles and attribution footer text
- `web/package.json`
  - package name
- root `package.json`
  - reference workspace package metadata and CLI alias
- `mcp-server/package.json`
  - explorer package metadata should avoid accidental publish or Claude-specific branding
- `web/app/api/files/*`
  - operator env var name should use `AGCLAW_WEB_ROOT`
- `web/app/api/chat/route.ts`
  - mock toggle should use `AGCLAW_WEB_MOCK_CHAT`
- `web/playwright.config.ts` and `web/scripts/start-e2e-server.mjs`
  - test harness should use `AGCLAW_WEB_ROOT`

## Must Keep

- `anthropic` provider identifiers in:
  - `web/lib/types.ts`
  - `web/lib/constants.ts`
  - `web/app/api/chat/route.ts`
  - `web/app/api/provider-health/route.ts`
  - `backend/agclaw_backend/providers.py`
  - `backend/agclaw_backend/contracts.py`
- `ANTHROPIC_API_KEY` and related live-test env vars in:
  - `backend/README.md`
  - `backend/tests/test_live_providers.py`
- model ids such as `claude-sonnet-*` in provider option lists and tests where they denote real upstream compatibility targets

## Reference-Only

- root `src/` leaked/transformed runtime tree
- deep-dive docs that explicitly study the reference artifact:
  - `docs/architecture.md`
  - `docs/bridge.md`
  - `docs/commands.md`
  - `docs/exploration-guide.md`
  - `docs/subsystems.md`
  - `docs/tools.md`
- these are allowed to mention Claude/Anthropic because they describe the reference artifact, not the AG-Claw product surface

## Operating Rule

No new clean-room UI, backend, export, or runbook surface should introduce `Claude Code` or `Claude` branding. Functional provider names such as `Anthropic` remain allowed where they describe an upstream adapter or credential.

## Current State

- clean-room shell branding is AG-Claw
- legacy `CLAUDE_CODE_WEB_*` fallbacks have been removed from the shell surface
- root workspace metadata now identifies the repo as an AG-Claw reference workspace
- the standalone explorer package is private by default to reduce accidental publication risk
