#!/usr/bin/env bash
# End-to-end NUC setup. Runs every other script in the right order.
#
# Read it before running on a real machine — it formats disks and installs
# system packages.
#
# Usage:
#   sudo bash scripts/setup.sh

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Must run as root (use sudo)." >&2
  exit 1
fi

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_DIR"

echo "==> [1/6] Power management"
bash scripts/power-management.sh

echo "==> [2/6] External HDD"
bash scripts/mount-hdd.sh

echo "==> [3/6] Docker + Docker Compose"
if ! command -v docker >/dev/null; then
  apt-get update -y
  apt-get install -y ca-certificates curl gnupg
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
fi
usermod -aG docker "${SUDO_USER:-root}" || true

echo "==> [4/6] Immich + Jellyfin"
if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "    Created .env from .env.example — edit it before re-running compose."
fi
docker compose pull
docker compose up -d

echo "==> [5/6] Tailscale"
if ! command -v tailscale >/dev/null; then
  curl -fsSL https://tailscale.com/install.sh | sh
fi
echo "    Run 'sudo tailscale up' manually to authenticate this NUC."

echo "==> [6/6] Streaming UI + kiosk autostart"
bash scripts/autostart.sh

echo
echo "All done. Reboot to bring up the kiosk display:"
echo "  sudo reboot"
