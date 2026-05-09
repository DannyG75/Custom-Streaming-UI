#!/usr/bin/env bash
# Wires up everything the kiosk needs to power-control the NUC:
#   1. Sudoers entry for reboot/poweroff (no password)
#   2. Updated streaming-ui.service with DISPLAY + XAUTHORITY env vars
#       so xset can talk to the user's running X session
#
# Run from the repo root on the NUC:
#   sudo bash scripts/install-power-control.sh

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Must run as root (use sudo)." >&2
  exit 1
fi

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
KIOSK_USER="${SUDO_USER:-$(logname)}"
USER_UID=$(id -u "$KIOSK_USER")

echo "==> Configuring power control for user: $KIOSK_USER"

# --- 1. Sudoers entry ---------------------------------------------------------
SUDOERS_TMP=$(mktemp)
sed "s|__KIOSK_USER__|$KIOSK_USER|g" \
  "$REPO_DIR/scripts/sudoers-streaming-ui" > "$SUDOERS_TMP"

# Validate before installing — a broken sudoers file can lock you out
if ! visudo -cf "$SUDOERS_TMP"; then
  echo "ERROR: sudoers snippet failed validation. Aborting." >&2
  rm -f "$SUDOERS_TMP"
  exit 1
fi

install -m 0440 "$SUDOERS_TMP" /etc/sudoers.d/streaming-ui
rm -f "$SUDOERS_TMP"
echo "==> Installed /etc/sudoers.d/streaming-ui"

# --- 2. Detect the right XAUTHORITY path -------------------------------------
# Common locations:
#   GDM auto-login on Ubuntu Desktop:  /run/user/UID/gdm/Xauthority
#   user-launched X session:           /home/USER/.Xauthority
XAUTH=""
for candidate in \
    "/run/user/$USER_UID/gdm/Xauthority" \
    "/run/user/$USER_UID/.mutter-Xauth" \
    "/home/$KIOSK_USER/.Xauthority"; do
  if [[ -f "$candidate" ]]; then
    XAUTH="$candidate"
    break
  fi
done

if [[ -z "$XAUTH" ]]; then
  echo "WARNING: could not locate an XAUTHORITY file."
  echo "         Sleep/wake will not work until you set one manually."
  echo "         Defaulting to /home/$KIOSK_USER/.Xauthority — edit"
  echo "         /etc/systemd/system/streaming-ui.service if it's wrong."
  XAUTH="/home/$KIOSK_USER/.Xauthority"
else
  echo "==> Detected XAUTHORITY: $XAUTH"
fi

# --- 3. Reinstall streaming-ui.service with env vars filled in ---------------
install -m 644 \
  "$REPO_DIR/scripts/systemd/streaming-ui.service" \
  /etc/systemd/system/streaming-ui.service
sed -i \
  -e "s|__REPO_DIR__|$REPO_DIR|g" \
  -e "s|__KIOSK_USER__|$KIOSK_USER|g" \
  -e "s|__XAUTHORITY_PATH__|$XAUTH|g" \
  /etc/systemd/system/streaming-ui.service

systemctl daemon-reload
systemctl restart streaming-ui

echo "==> Restarted streaming-ui.service"
echo
echo "Test it (from any device on the LAN):"
echo "  curl -X POST http://$(hostname -I | awk '{print $1}'):3000/api/system/sleep"
echo "  curl -X POST http://$(hostname -I | awk '{print $1}'):3000/api/system/wake"
echo "  curl -X POST http://$(hostname -I | awk '{print $1}'):3000/api/system/restart"
echo "  curl -X POST http://$(hostname -I | awk '{print $1}'):3000/api/system/shutdown"
