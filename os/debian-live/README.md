# Debian Live Build (DISHA OS)

This folder contains **live-build** configuration for building a bootable x86_64 ISO that supports **BIOS + UEFI**.

## Prereqs (build host)

Build on Debian/Ubuntu (WSL is fine):
- `live-build`
- `debootstrap`
- `xorriso`

## Build

From the repo root:

```bash
./os/debian-live/build.sh
```

Artifacts:
- `os/out/disha-os-amd64.iso`

## Runtime services

DISHA services are installed via overlay:
- `disha-brain.service`
- `disha-web.service`

Health checks:
- Brain: `http://127.0.0.1:8080/api/v1/health`
- Web: `http://127.0.0.1:3000/`

