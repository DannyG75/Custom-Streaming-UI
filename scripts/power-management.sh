#!/usr/bin/env bash
# Disable suspend/sleep, set the CPU governor to powersave, configure HDD
# spin-down. Idempotent — safe to re-run.
#
# Usage (on the NUC):
#   sudo bash scripts/power-management.sh

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Must run as root (use sudo)." >&2
  exit 1
fi

echo "==> Disabling suspend, hibernate, and idle targets…"
systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target

echo "==> Disabling logind idle actions…"
LOGIND=/etc/systemd/logind.conf
sed -i \
  -e 's/^#\?HandleLidSwitch=.*/HandleLidSwitch=ignore/' \
  -e 's/^#\?HandleLidSwitchExternalPower=.*/HandleLidSwitchExternalPower=ignore/' \
  -e 's/^#\?HandleLidSwitchDocked=.*/HandleLidSwitchDocked=ignore/' \
  -e 's/^#\?IdleAction=.*/IdleAction=ignore/' \
  "$LOGIND"
systemctl restart systemd-logind

echo "==> Installing cpufrequtils for CPU governor control…"
apt-get update -y
apt-get install -y cpufrequtils hdparm

echo "==> Setting CPU governor to powersave…"
echo 'GOVERNOR="powersave"' > /etc/default/cpufrequtils
systemctl restart cpufrequtils

echo "==> Configuring HDD spin-down (10 min idle) for /mnt/media…"
# spindown_time=120 -> 10 minutes (units of 5s).
# Wrap in `|| true` so a flaky/USB-bridge HDD that doesn't support hdparm
# doesn't fail the whole script.
DEV=$(findmnt -no SOURCE /mnt/media 2>/dev/null || true)
if [[ -n "${DEV}" ]]; then
  hdparm -B 127 -S 120 "$DEV" || echo "(hdparm not supported on $DEV, skipping)"
else
  echo "(no device mounted at /mnt/media yet — re-run after mount-hdd.sh)"
fi

echo "==> Done. Current governor:"
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor || true
