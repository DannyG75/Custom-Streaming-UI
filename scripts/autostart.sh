#!/usr/bin/env bash
# Install systemd units that launch the Express server and Chromium kiosk
# on boot. Designed for a single-user NUC where the kiosk user is the same
# Linux user that owns this repo.
#
# Usage:
#   sudo bash scripts/autostart.sh

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Must run as root (use sudo)." >&2
  exit 1
fi

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
KIOSK_USER="${SUDO_USER:-$(logname)}"

echo "==> Installing kiosk dependencies (Openbox, Chromium, X server)…"
apt-get update -y
apt-get install -y openbox chromium-browser xserver-xorg xinit unclutter \
  || apt-get install -y openbox chromium xserver-xorg xinit unclutter

echo "==> Installing Node.js 20 LTS via NodeSource (if missing)…"
if ! command -v node >/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

echo "==> Building the streaming UI for production…"
sudo -u "$KIOSK_USER" bash -c "
  set -e
  cd '$REPO_DIR/streaming-ui/server' && npm install --omit=dev
  cd '$REPO_DIR/streaming-ui/client' && npm install && npm run build
"

echo "==> Installing Openbox autostart for the kiosk user…"
USER_HOME=$(eval echo "~$KIOSK_USER")
install -d -m 755 -o "$KIOSK_USER" -g "$KIOSK_USER" \
  "$USER_HOME/.config/openbox"
install -m 755 -o "$KIOSK_USER" -g "$KIOSK_USER" \
  "$REPO_DIR/scripts/openbox-autostart.sh" \
  "$USER_HOME/.config/openbox/autostart"

echo "==> Installing systemd units…"
install -m 644 \
  "$REPO_DIR/scripts/systemd/streaming-ui.service" \
  /etc/systemd/system/streaming-ui.service
install -m 644 \
  "$REPO_DIR/scripts/systemd/kiosk.service" \
  /etc/systemd/system/kiosk.service

# Substitute the placeholders for the real user + repo path.
sed -i \
  -e "s|__REPO_DIR__|$REPO_DIR|g" \
  -e "s|__KIOSK_USER__|$KIOSK_USER|g" \
  /etc/systemd/system/streaming-ui.service \
  /etc/systemd/system/kiosk.service

echo "==> Enabling units…"
systemctl daemon-reload
systemctl enable --now streaming-ui.service
systemctl enable kiosk.service   # starts on next graphical reboot

echo "==> Done."
echo "    streaming-ui:  systemctl status streaming-ui"
echo "    kiosk:         systemctl status kiosk"
echo "    Reboot to launch the kiosk display."
