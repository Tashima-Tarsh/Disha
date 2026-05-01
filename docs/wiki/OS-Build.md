# OS Build (x86_64 BIOS + UEFI)

DISHA OS currently builds a bootable ISO using Debian live-build.

## Output artifacts

- `os/out/disha-os-amd64.iso` (BIOS + UEFI hybrid ISO)

## Build (Linux host / WSL)

Install prerequisites:
- `live-build`, `debootstrap`, `xorriso`

Build:

```bash
./os/debian-live/build.sh
```

## Boot behavior

Services:
- Brain: `disha-brain.service` -> `http://127.0.0.1:8080/api/v1/health`
- Web: `disha-web.service` -> `http://127.0.0.1:3000/`
- Kiosk: `disha-kiosk.service` -> Chromium fullscreen (optional enable)

## OS identity

- `/etc/os-release` is set to `DISHA OS`.
- `/etc/motd` prints local service endpoints.

