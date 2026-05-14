#!/usr/bin/env bash
# Start the kiosk: wait for server, launch Chromium, force fullscreen.
#
# This is the deb-Chromium version. Differences from the earlier snap-only
# launcher:
#   - Calls `chromium-browser` (the .deb binary name) instead of `chromium`
#   - Polls for the window for 30s instead of 120s — .deb cold-start is
#     1-2s, not 30-90s like the snap was
#   - Adds VAAPI flags so hardware video decode actually works
#   - Drops --ozone-platform=x11 because deb chromium auto-detects correctly
#
# Install on the NUC:
#   cp scripts/start-kiosk.sh ~/.local/bin/start-streaming-kiosk.sh
#   chmod +x ~/.local/bin/start-streaming-kiosk.sh

# Truncate the log each boot so it doesn't grow unbounded.
exec >/tmp/kiosk-start.log 2>&1
set -ux

echo "===== start at $(date) ====="
echo "DISPLAY=${DISPLAY:-UNSET}  XAUTHORITY=${XAUTHORITY:-UNSET}"

# 1. Wait for the streaming server.
for n in $(seq 1 60); do
  if curl -fs http://localhost:3000/api/health >/dev/null 2>&1; then
    echo "server ready after ${n}s"
    break
  fi
  sleep 1
done

# 2. Launch Chromium in the background.
#
# Flags worth knowing about:
#   --kiosk                                  Fullscreen, no chrome UI
#   --noerrdialogs                           No crash recovery dialogs
#   --disable-infobars                       Hide "Chrome is being controlled..."
#   --no-first-run                           Skip the welcome flow
#   --check-for-update-interval=31536000     Don't check for updates every 5min
#   --enable-features=VaapiVideoDecoder,...  Turn on hardware video decode
#   --ignore-gpu-blocklist                   Force GPU accel on older hardware
#                                            (Haswell is on Chromium's old-GPU
#                                            list — bypass it)
#   --use-gl=desktop                         Use system OpenGL stack instead of
#                                            ANGLE/SwiftShader
chromium-browser \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --disable-translate \
  --disable-features=TranslateUI \
  --enable-features=VaapiVideoDecoder,VaapiVideoEncoder,VaapiIgnoreDriverChecks \
  --ignore-gpu-blocklist \
  --use-gl=desktop \
  --check-for-update-interval=31536000 \
  --no-first-run \
  --start-fullscreen \
  http://localhost:3000 &
CHROME_PID=$!
echo "chromium launched, pid=$CHROME_PID"

# 3. Poll for the window. deb Chromium is fast — 30s is way more than enough.
for i in $(seq 1 30); do
  WID=$(xdotool search --name "Home Streaming" 2>/dev/null | head -1)
  if [ -n "${WID:-}" ]; then
    echo "found window $WID after ${i}s"
    # Give mutter a moment to settle before requesting fullscreen.
    sleep 1
    xdotool windowactivate "$WID" 2>/dev/null || true
    wmctrl -i -r "$WID" -b add,fullscreen
    sleep 1
    xdotool key --window "$WID" F11
    echo "fullscreen requested"
    exit 0
  fi
  sleep 1
done

echo "ERROR: window never appeared after 30s"
exit 1
