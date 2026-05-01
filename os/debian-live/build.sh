#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT_DIR="${ROOT_DIR}/os/out"
WORK_DIR="${ROOT_DIR}/os/.work/live-build"

mkdir -p "${OUT_DIR}"
rm -rf "${WORK_DIR}"
mkdir -p "${WORK_DIR}"

cd "${WORK_DIR}"

# Minimal, practical base for DISHA OS.
# - amd64 supports x86_64
# - live image supports BIOS + UEFI
lb config \
  --mode debian \
  --distribution bookworm \
  --architectures amd64 \
  --binary-images iso-hybrid \
  --debian-installer false \
  --archive-areas "main contrib non-free-firmware" \
  --bootappend-live "boot=live components quiet splash" \
  --bootloaders "syslinux grub-efi"

mkdir -p config/package-lists
cp -f "${ROOT_DIR}/os/debian-live/packages.list.chroot" config/package-lists/disha.list.chroot

mkdir -p config/includes.chroot
rsync -a "${ROOT_DIR}/os/overlay/" config/includes.chroot/

# Hooks (run inside the image build chroot)
mkdir -p config/hooks/normal
rsync -a "${ROOT_DIR}/os/debian-live/hooks/" config/hooks/normal/

# Copy the repo code into /opt/disha so the OS can run DISHA services offline.
mkdir -p config/includes.chroot/opt/disha
rsync -a --delete \
  --exclude ".git" \
  --exclude "node_modules" \
  --exclude "web/node_modules" \
  --exclude "os/.work" \
  --exclude "os/out" \
  "${ROOT_DIR}/" \
  "config/includes.chroot/opt/disha/"

# Pre-install web deps and build in chroot at first boot would be too slow. For now we
# ship the source and rely on `npm install` in provisioning. Next step is to build
# web as standalone and include the build output in the image.

lb build

ISO="$(ls -1 *.iso | head -n 1)"
cp -f "${ISO}" "${OUT_DIR}/disha-os-amd64.iso"
echo "Built: ${OUT_DIR}/disha-os-amd64.iso"
