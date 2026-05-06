#!/bin/sh
# This file is copied to ~/.config/openbox/autostart by scripts/autostart.sh.
# Openbox runs it once when the kiosk session starts. We use it to hide the
# cursor and launch Chromium in kiosk mode.

xset s off &
xset -dpms &
xset s noblank &
unclutter -idle 1 &

# Wait until the streaming UI is ready before opening the browser.
until curl -fs http://localhost:3000/api/health >/dev/null; do sleep 1; done

exec chromium-browser \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --disable-translate \
  --disable-features=TranslateUI \
  --check-for-update-interval=31536000 \
  --no-first-run \
  --start-fullscreen \
  --app=http://localhost:3000
