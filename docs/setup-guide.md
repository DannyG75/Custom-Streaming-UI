# NUC Setup Guide

Step-by-step walkthrough for turning a fresh Intel NUC D54250WYK into the home server described in `CLAUDE.md`. Estimated time: ~1 hour active, plus background download time.

---

## 0. Before you start

You'll need:

- The NUC with an empty (or recently flashed) SSD
- A USB stick with the **Ubuntu Server 24.04 LTS** ISO
- The external HDD that will hold photos and videos
- A keyboard + monitor for first-time install (after that, everything is remote/SSH)
- A second PC on the same LAN for the admin app
- A free Tailscale account (for remote access)

---

## 1. Install Ubuntu Server 24.04 LTS

Boot from the USB and pick the minimal server install. When asked, install the OpenSSH server. Skip Snap-based extras. Once it reboots:

```bash
sudo apt update && sudo apt -y upgrade
```

Confirm SSH works from another machine, then unplug the keyboard and monitor — the rest of this guide assumes SSH access.

---

## 2. Clone this repo on the NUC

```bash
sudo apt install -y git
git clone <your-repo-url> ~/home-server
cd ~/home-server
```

(If you don't have a remote yet, copy the repo over with `scp -r` or `rsync`.)

---

## 3. Run the master setup script (or each step manually)

The fast path:

```bash
sudo bash scripts/setup.sh
```

That script runs every step below in order. If you'd rather do them one at a time:

### 3a. Power management

```bash
sudo bash scripts/power-management.sh
```

Disables suspend/hibernate, sets the CPU governor to `powersave`, and configures the HDD to spin down after 10 minutes of idle.

### 3b. Mount the external HDD

```bash
sudo bash scripts/mount-hdd.sh
```

Auto-detects the largest unmounted partition and mounts it at `/mnt/media` via UUID in `/etc/fstab`. **This will reformat the disk if it isn't already ext4** — the script asks for confirmation first.

After mount, the layout is:

```
/mnt/media/
├── photos/
├── videos/
└── backups/
```

### 3c. Docker + Docker Compose

`setup.sh` installs the official Docker apt repo and adds your user to the `docker` group. Log out and back in for the group change to take effect.

### 3d. Immich + Jellyfin

```bash
cp .env.example .env
$EDITOR .env          # set DB_PASSWORD, TYPESENSE_API_KEY at minimum
docker compose up -d
```

Wait a couple of minutes the first time so images download. Then:

- Immich: `http://<nuc-ip>:2283` — create the admin account
- Jellyfin: `http://<nuc-ip>:8096` — point libraries at `/media/videos`

### 3e. Tailscale

```bash
sudo tailscale up
tailscale ip -4               # note this Tailscale IP — you'll use it on the phone
```

Follow the URL `tailscale up` prints to authenticate. Install the Tailscale app on your phone and sign in with the same account.

#### Configuring the Immich app for both home WiFi and remote Tailscale

The Immich mobile app supports a "preferred WiFi" feature that swaps the server URL automatically. Set it up so the app uses the LAN IP on your home WiFi (fast, direct) and the Tailscale IP everywhere else (works on cellular).

1. In the Immich app: **Settings → Networking** (the wording is slightly different across versions — the option is sometimes called *Server endpoint* or *Advanced networking*).
2. **Primary server URL:** `http://<nuc-lan-ip>:2283` — used when the phone is on your home WiFi (the SSID you mark as "preferred").
3. **External server URL:** `http://<nuc-tailscale-ip>:2283` — used when off the preferred WiFi. Tailscale must be on (or always-on) for this to reach the NUC.
4. **Preferred WiFi:** select your home network's SSID.
5. Save. Toggle WiFi off and on to confirm the app reconnects on each network without manual sign-in.

If the option doesn't appear, just sign in using the Tailscale URL only — Tailscale's network-aware routing will keep that IP reachable on both WiFi and cellular as long as Tailscale is on.

### 3f. Streaming UI + kiosk autostart

```bash
sudo bash scripts/autostart.sh
```

Installs Openbox, Chromium, Node.js (if missing), builds the React UI, and registers two systemd units:

- `streaming-ui.service` — Express server on `:3000`
- `kiosk.service` — X server + Openbox + Chromium fullscreen

Reboot:

```bash
sudo reboot
```

When the NUC comes back, the monitor shows the Netflix-style grid.

---

## 4. Set up the admin app on the other PC

On a second PC on the same LAN:

```bash
git clone <your-repo-url>
cd <repo>/admin-app
cp .env.example .env
$EDITOR .env          # set VITE_API_BASE to http://<nuc-lan-ip>:3000
npm install
npm run dev           # http://localhost:5174
```

Add, edit, reorder, and delete sites. The kiosk auto-refreshes its list every 30 seconds, so changes appear shortly without restarting anything.

For a more permanent admin install:

```bash
npm run build
npx serve dist        # or any static host
```

---

## 5. Verifying everything

| Check | Command / URL |
|---|---|
| Express health | `curl http://<nuc-ip>:3000/api/health` |
| Sites API | `curl http://<nuc-ip>:3000/api/sites` |
| Streaming UI | open `http://<nuc-ip>:3000` from any LAN device |
| Immich | `http://<nuc-ip>:2283` |
| Jellyfin | `http://<nuc-ip>:8096` |
| Tailscale remote | `http://<nuc-tailscale-ip>:2283` from your phone |
| Kiosk display | the NUC's monitor itself |
| systemd units | `systemctl status streaming-ui kiosk` |

---

## 6. Common follow-ups

- **Custom posters:** drop poster images into `/mnt/media/photos/_posters/`, expose them with a tiny static route, and paste those URLs into the admin app.
- **HTTPS on the LAN:** put Caddy in front (Tailscale's MagicDNS + Caddy gives you free certs over HTTPS without exposing the NUC).
- **Backups:** `restic` to a cheap S3-compatible bucket, scheduled in `/etc/systemd/system/*.timer`.
- **More streaming sites:** add via the admin app — no restart required.

---

## 6.4 Replace snap Chromium with deb Chromium (recommended for performance)

Ubuntu 24.04 ships Chromium only as a snap. The snap has two big drawbacks for kiosk use:

1. **Cold-start time of 30-90 seconds** due to apparmor + snap-confine + mount-namespace setup on every launch. The kiosk's autostart script ends up polling for the window for almost a full minute before mutter can fullscreen it.
2. **Hardware video acceleration is disabled** inside the snap sandbox. The Haswell GPU on the NUC has a perfectly capable QuickSync decoder for h.264 at 1080p, but the snap can't reach it — video decode falls back to software, which on this CPU is ~80% CPU usage during playback.

The fix is a real `.deb` Chromium from the `saiarcot895/chromium-beta` PPA (well-maintained, used by many Ubuntu kiosk builds).

```bash
sudo bash scripts/install-deb-chromium.sh
```

What this script does:

- Removes the snap and the `chromium-browser` snap-transition apt package
- Adds the PPA and pins it at priority 1001 so future apt updates can't replace it
- Installs `chromium-browser` (real deb), `chromium-codecs-ffmpeg-extra`, Intel VAAPI drivers (`i965-va-driver` for Haswell, `intel-media-va-driver` for newer Intel), and `vainfo` for diagnostics
- Runs `vainfo` at the end to confirm a hardware driver loaded

After it finishes, install the updated kiosk launcher (it calls `chromium-browser` instead of `chromium` and adds the VAAPI flags):

```bash
cp scripts/start-kiosk.sh ~/.local/bin/start-streaming-kiosk.sh
chmod +x ~/.local/bin/start-streaming-kiosk.sh
```

Reboot to test. The kiosk should now come up in ~5-10 seconds instead of ~60. Cross-check hardware video acceleration is actually working:

```bash
chromium-browser chrome://gpu &
# Look at the "Video Decode" line — should say "Hardware accelerated"
```

Then play any Netflix/YouTube video and check CPU usage with `top` — should sit under 15% on the i5-4250U during 1080p playback, vs ~80% before.

**Rollback if anything goes wrong**:

```bash
sudo apt remove --purge chromium-browser
sudo rm /etc/apt/preferences.d/saiarcot895-chromium
sudo add-apt-repository --remove ppa:saiarcot895/chromium-beta
sudo snap install chromium
# Restore the snap-era kiosk launcher from git if needed:
git checkout main -- scripts/start-kiosk.sh
cp scripts/start-kiosk.sh ~/.local/bin/start-streaming-kiosk.sh
```

---

## 6.5 Power controls (optional but recommended)

Adds Sleep / Restart / Shutdown buttons to the kiosk header so the family can put the screen to sleep or shut down the NUC without finding a keyboard.

```bash
sudo bash scripts/install-power-control.sh
```

What this does:

- Installs `/etc/sudoers.d/streaming-ui` so the kiosk user can run `reboot` and `poweroff` without a password (validated with `visudo` before install)
- Updates the `streaming-ui.service` systemd unit with the right `DISPLAY` and `XAUTHORITY` env vars so the **Sleep display** action can call `xset` against your Xorg session
- Restarts the streaming-ui service so changes take effect

After install, refresh the kiosk in the browser. Top-right corner now has a ⏻ icon next to the reload button. Click → menu opens → pick:

- **Sleep display** — turns the monitor off via DPMS. Immich/Jellyfin keep running so phones can still back up. Move the mouse / press a key / press the controller's Xbox button to wake.
- **Restart** — confirms, then `sudo reboot`. NUC comes back in ~30s, kiosk autostarts.
- **Shut down** — confirms, then `sudo poweroff`. Press the NUC's physical power button to turn it back on.

**Note about the `XAUTHORITY` path**: the install script auto-detects whether you're on a GDM auto-login session (`/run/user/1000/gdm/Xauthority`) or a user-launched X session (`/home/<user>/.Xauthority`) and writes the right one into the systemd unit. If sleep doesn't work after install, check:

```bash
systemctl show streaming-ui --property=Environment
sudo -u $USER xset -display :0 dpms force off    # manual test
```

If the manual `xset` works but the API doesn't, fix the `XAUTHORITY` path in `/etc/systemd/system/streaming-ui.service` and `sudo systemctl daemon-reload && sudo systemctl restart streaming-ui`.

---

## 7. Controller navigation (optional)

Goal: navigate the kiosk grid and embedded streaming sites with a game controller (any XInput-compatible pad — Xbox One, Xbox Series, generic clones). Two layers:

1. **System-level controller-to-keyboard mapping** via `antimicrox` — works in any application, including external streaming sites.
2. **Native Gamepad API support in the kiosk client** — gives the home grid a console-like UX with visible focus and snappy navigation. (See `streaming-ui/client/src/useGamepad.js`.)

### 7a. Pair the controller

For an Xbox One controller, USB is plug-and-play (the `xpad` kernel module is built into Ubuntu). Bluetooth requires the `xpadneo` driver:

```bash
# USB: just plug it in, then verify
ls /dev/input/js0          # should exist
sudo apt install -y joystick
jstest /dev/input/js0      # press buttons, watch values change. Ctrl+C to exit.

# Bluetooth (optional — skip if using USB)
sudo apt install -y dkms linux-headers-$(uname -r)
sudo apt install -y xpadneo-dkms
# Then in GNOME: Settings → Bluetooth → put controller in pairing mode
# (hold Xbox button + sync button) → pair
```

### 7b. Install antimicrox and bind the buttons

```bash
sudo apt install -y antimicrox
```

Open **antimicrox** from the app launcher with the controller plugged in. The window shows a controller diagram on the left and your physical controller on the right. For each button you want to bind:

1. Click the button on the diagram (e.g., "A").
2. In the dialog that opens, click **Slot 1**, then press the key/key-combo on your keyboard you want that button to send (e.g., `Enter`).
3. Click **Apply** → **Close**.

Use the table below as your binding cheat sheet. Once everything's bound, **File → Save Profile As → `~/.config/antimicrox/streaming-kiosk.amgp`** so you can reload it later.

Recommended button layout:

| Controller | Maps to | Used for |
|------------|---------|----------|
| Left stick | Mouse movement | Pointing |
| D-pad ↑/↓/←/→ | Arrow keys | List/menu navigation |
| LB / RB | `Shift+Tab` / `Tab` | Cycle focus on the kiosk grid |
| A | `Enter` | Activate (clicks the focused tile) |
| B | `Alt+Left` | Browser back (return to kiosk from a site) |
| Y | `F5` | Reload page |
| X | `Backspace` | Text delete (search boxes) |
| Start | `Alt+Home` | Jump to kiosk home |
| Right trigger | Left mouse click | Click whatever the cursor is over |

### 7c. Autostart antimicrox

So the controller works from the moment the NUC boots:

```bash
mkdir -p ~/.config/autostart
cat > ~/.config/autostart/antimicrox.desktop <<'EOF'
[Desktop Entry]
Type=Application
Name=AntiMicroX
Exec=antimicrox --hidden --profile /home/REPLACE_ME/.config/antimicrox/streaming-kiosk.amgp
X-GNOME-Autostart-enabled=true
NoDisplay=false
Terminal=false
EOF
sed -i "s|REPLACE_ME|$USER|" ~/.config/autostart/antimicrox.desktop
```

Reboot. The controller should drive the kiosk and any site Chromium loads.

---

## 8. Tearing down a service

| Action | Command |
|---|---|
| Stop the kiosk | `sudo systemctl stop kiosk` |
| Stop the API | `sudo systemctl stop streaming-ui` |
| Stop Immich/Jellyfin | `docker compose down` |
| Re-enable suspend (don't, but…) | `sudo systemctl unmask sleep.target suspend.target hibernate.target` |
