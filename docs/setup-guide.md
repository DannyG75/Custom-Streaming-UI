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
```

Follow the URL it prints to authenticate. Install the Tailscale app on your phone and sign in with the same account so you can hit `http://<nuc-tailscale-ip>:2283` from anywhere.

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

## 7. Tearing down a service

| Action | Command |
|---|---|
| Stop the kiosk | `sudo systemctl stop kiosk` |
| Stop the API | `sudo systemctl stop streaming-ui` |
| Stop Immich/Jellyfin | `docker compose down` |
| Re-enable suspend (don't, but…) | `sudo systemctl unmask sleep.target suspend.target hibernate.target` |
