# DISHA OS (x86_64 BIOS + UEFI)

This directory bootstraps a **standalone DISHA appliance OS** for **x86_64** machines that must boot on both **legacy BIOS** and **UEFI**.

Reality check (non-negotiable):
- A single OS image cannot be “everything” and still be minimal. “Word/Excel/PPT” requires a full office stack.
- The right way is to ship a **first bootable OS** (DISHA-first, secure, updateable), then add heavier user apps in controlled profiles.

## Goals (v0)

- Bootable image for x86_64, BIOS + UEFI.
- DISHA Brain + DISHA Web auto-start at boot.
- Kiosk UI option (fullscreen) and “admin mode” option (SSH enabled only when configured).
- Local-first: works offline for UI + workflows + local analysis; internet is only needed for cloud LLM calls and fetching public data.
- “No failure” rules:
  - every module has a health check
  - every decision is logged
  - every async flow has a timeout
  - features degrade gracefully

## Approach

We use **Debian Live Build** for the first OS image:
- Boots on BIOS + UEFI out of the box
- Practical for bundling Python, Node, Chromium kiosk, and LibreOffice
- Faster path to a real “desktop appliance” than Buildroot/Yocto

Buildroot/Yocto are valid later when you want a smaller, more appliance-like base.

## What’s included (planned)

- `disha-brain` (FastAPI) as a system service
- `disha-web` (Next server) as a system service
- Chromium (kiosk profile) for full-screen DISHA UI
- LibreOffice for offline document editing (Writer/Calc/Impress)
- SQLite for DISHA Brain persistence (already in `disha/brain`)
- System audit logs (journald) plus DISHA audit events

## Layout

- `os/debian-live/`: live-build config (packages, boot parameters, system services)
- `os/overlay/`: files copied into the image (systemd units, env files, kiosk scripts)

## Next implementation steps

1. Add `os/debian-live/` config + package lists.
2. Add `os/overlay/`:
   - systemd units to start Brain + Web
   - kiosk session that opens `http://127.0.0.1:3000`
3. Make web “fully local” by adding SQLite persistence for:
   - audit events
   - token cache
   - memory graph
   so Postgres/Redis are optional on the OS.

