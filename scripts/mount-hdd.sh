#!/usr/bin/env bash
# Mount the external HDD at /mnt/media using its UUID in /etc/fstab.
# Detects the largest non-system block device and uses that — assumes the
# external HDD is the only large extra disk on the NUC.
#
# Usage:
#   sudo bash scripts/mount-hdd.sh           # auto-detect
#   sudo bash scripts/mount-hdd.sh /dev/sdb1 # explicit partition

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Must run as root (use sudo)." >&2
  exit 1
fi

MOUNT=/mnt/media
DEV="${1:-}"

if [[ -z "$DEV" ]]; then
  # Pick the largest non-mounted block device that isn't the boot disk.
  ROOT_DEV=$(findmnt -no SOURCE / | sed 's/[0-9]*$//')
  DEV=$(lsblk -lnpo NAME,SIZE,TYPE,MOUNTPOINT \
        | awk -v root="$ROOT_DEV" '$3=="part" && $4=="" && $1 !~ root {print $1, $2}' \
        | sort -hk2 | tail -n1 | awk '{print $1}')
fi

if [[ -z "$DEV" || ! -b "$DEV" ]]; then
  echo "Could not find an unmounted partition. Pass the device path explicitly." >&2
  echo "  Available block devices:" >&2
  lsblk -p
  exit 1
fi

echo "==> Using device: $DEV"

# Ask before formatting, because this is destructive.
FSTYPE=$(blkid -o value -s TYPE "$DEV" || true)
if [[ "$FSTYPE" != "ext4" ]]; then
  echo "Device $DEV is currently '$FSTYPE'. Reformat to ext4? This WILL DELETE all data on the disk."
  read -rp "Type YES to format, anything else to abort: " confirm
  if [[ "$confirm" != "YES" ]]; then
    echo "Aborting."
    exit 1
  fi
  mkfs.ext4 -L media "$DEV"
fi

UUID=$(blkid -o value -s UUID "$DEV")
echo "==> UUID: $UUID"

mkdir -p "$MOUNT"

# Add to fstab if not already present.
if ! grep -q "$UUID" /etc/fstab; then
  echo "UUID=$UUID  $MOUNT  ext4  defaults,nofail,noatime  0  2" >> /etc/fstab
  echo "==> Added entry to /etc/fstab"
fi

mount -a
echo "==> Mounted. Layout:"
df -h "$MOUNT"

# Create the standard layout if missing.
mkdir -p "$MOUNT/photos" "$MOUNT/videos" "$MOUNT/backups"
chown -R "${SUDO_USER:-$USER}:${SUDO_USER:-$USER}" "$MOUNT"

echo "==> Done."
