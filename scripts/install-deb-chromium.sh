#!/usr/bin/env bash
# Replace snap Chromium with a real .deb Chromium from the saiarcot895 PPA.
#
# Why bother?
#   - Snap Chromium cold-start is 30-90s on this hardware (apparmor + mount-
#     namespace setup). The .deb version cold-starts in 1-2s.
#   - The snap sandbox disables hardware video acceleration (VAAPI). The .deb
#     can use the Haswell QuickSync hardware decoder, which drops video-CPU
#     usage from ~80% to ~10% during playback.
#   - The snap fights GNOME/mutter compositor more than the .deb does, leading
#     to occasional Wayland-style input glitches even on Xorg.
#
# Rollback: see the bottom of this file (or `sudo snap install chromium` then
# remove the .deb).
#
# Run from the repo root on the NUC:
#   sudo bash scripts/install-deb-chromium.sh

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Must run as root (use sudo)." >&2
  exit 1
fi

KIOSK_USER="${SUDO_USER:-$(logname)}"

echo "==> [1/5] Removing snap Chromium (if present)"
if snap list chromium 2>/dev/null | grep -q '^chromium'; then
  snap remove chromium
  echo "    snap Chromium removed"
else
  echo "    snap Chromium not installed, skipping"
fi

# Snap leaves behind a transition package called chromium-browser that's
# really just a shim that re-installs the snap. Remove it.
apt-get remove -y chromium-browser 2>/dev/null || true

echo "==> [2/5] Adding the saiarcot895/chromium-beta PPA"
# This PPA packages Chromium as a real .deb for current Ubuntu versions.
# Run by Sai Arcot, well-maintained, used by a lot of Ubuntu kiosk setups.
apt-get install -y software-properties-common
add-apt-repository -y ppa:saiarcot895/chromium-beta
apt-get update -y

echo "==> [3/5] Pinning the PPA so future snap-transitions can't reclaim it"
# Without this, apt might prefer the Ubuntu snap-transition package over the
# PPA. Set the PPA at priority 1001 (higher than any default).
cat > /etc/apt/preferences.d/saiarcot895-chromium <<'EOF'
Package: chromium-browser chromium-codecs-ffmpeg-extra chromium-codecs-ffmpeg
Pin: release o=LP-PPA-saiarcot895-chromium-beta
Pin-Priority: 1001
EOF

echo "==> [4/5] Installing deb Chromium + Intel VAAPI drivers"
# va-driver-all pulls in the right driver for whatever GPU is present.
# intel-media-va-driver provides VAAPI for Intel GPUs from Broadwell onward;
# the older i965-va-driver covers Haswell (which is what the NUC has).
apt-get install -y \
  chromium-browser \
  chromium-codecs-ffmpeg-extra \
  i965-va-driver \
  intel-media-va-driver \
  vainfo \
  mesa-utils

echo "==> [5/5] Verifying hardware video acceleration"
echo "    Running vainfo (as user $KIOSK_USER)..."
if sudo -u "$KIOSK_USER" vainfo 2>&1 | grep -E "(VAProfile|driver: )"; then
  echo
  echo "    ✓ VAAPI driver loaded successfully"
else
  echo
  echo "    ! vainfo did not report a working driver. Hardware acceleration"
  echo "    ! may not be available — Chromium will fall back to software"
  echo "    ! decode. Check 'vainfo' output for diagnostics."
fi

echo
echo "==> Done."
echo "    Test the new binary:"
echo "      which chromium-browser"
echo "      chromium-browser --version"
echo
echo "    Then test in-app hardware accel:"
echo "      chromium-browser chrome://gpu"
echo "    The 'Video Decode' line should say 'Hardware accelerated'."
echo
echo "    The kiosk launcher (~/.local/bin/start-streaming-kiosk.sh) needs"
echo "    updating to call 'chromium-browser' instead of 'chromium' and to"
echo "    pass VAAPI flags. See scripts/start-kiosk.sh in this repo for"
echo "    the updated version."
echo
echo "    ROLLBACK if anything is worse:"
echo "      sudo apt remove --purge chromium-browser"
echo "      sudo rm /etc/apt/preferences.d/saiarcot895-chromium"
echo "      sudo add-apt-repository --remove ppa:saiarcot895/chromium-beta"
echo "      sudo snap install chromium"
