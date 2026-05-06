# Home Server & Streaming UI — Project Memory

## Project Overview

This project turns an **Intel NUC D54250WYK** running **Ubuntu Server 24.04 LTS** into a
dual-purpose home server:

1. **Streaming UI** — A Netflix-style kiosk interface that displays a curated list of
   streaming websites (no logins required). Websites are managed remotely via a separate
   admin app on another PC on the same local network.

2. **Home Media Server** — Always-on server hosting photos and videos from an external
   hard drive, accessible both inside and outside the home network via Tailscale VPN.

---

## Hardware

- **Device:** Intel NUC D54250WYK
- **OS:** Ubuntu Server 24.04 LTS (minimal install, no desktop environment)
- **Storage:** External HDD mounted at `/mnt/media` (ext4, auto-mounted via fstab)
- **Display:** Runs headless except for the kiosk display output

---

## Full Software Stack

| Purpose              | Software                        |
|----------------------|---------------------------------|
| OS                   | Ubuntu Server 24.04 LTS         |
| Window manager       | Openbox (minimal, kiosk only)   |
| Browser (kiosk)      | Chromium in `--kiosk` mode      |
| Streaming UI backend | Node.js + Express               |
| Streaming UI frontend| React (Vite, served by Express) |
| Photo management     | Immich (Docker)                 |
| Video library        | Jellyfin (Docker)               |
| Containers           | Docker + Docker Compose         |
| Remote access        | Tailscale (free personal tier)  |
| Admin app (other PC) | React (Vite) — manages the streaming site list |

---

## Architecture

```
[ Intel NUC - Always On, Ubuntu Server 24.04 ]
┌──────────────────────────────────────────────────┐
│  Chromium (Kiosk Mode)  →  localhost:3000         │
│  Node.js/Express        →  Streaming UI + API     │
│  Immich (Docker)        →  Photo/video backup     │
│  Jellyfin (Docker)      →  Video streaming        │
│  Tailscale              →  Remote VPN access      │
│  External HDD           →  /mnt/media             │
└──────────────────────────────────────────────────┘
         ▲                          ▲
    Local WiFi                 Outside Home
  (Admin app,               (Tailscale VPN →
   fast access)              Phone/remote)

[ Admin PC ]  →  REST API  →  NUC  (pushes site list updates)
[ Phone ]     →  Tailscale →  NUC  (Immich app, Jellyfin app)
```

---

## Streaming UI — How It Works

- The NUC runs a **Node.js + Express** server on port `3000`
- Express serves a **React frontend** (built with Vite) styled like Netflix
- The site list is stored in a **local JSON file** (`streaming-ui/server/data/sites.json`)
- Chromium launches in `--kiosk` mode pointing to `http://localhost:3000` on boot
- Selecting a tile opens the streaming site full-screen in the same Chromium window
- A back/home button returns to the UI

### Admin App (Remote Site Management)

- Runs on a **separate PC on the same local network**
- Communicates with the NUC via a **simple REST API** (Express endpoints)
- Can add, edit, reorder, and delete streaming site entries
- No authentication required (local network only)
- Site entry fields: `id`, `name`, `url`, `category`, `posterUrl` (optional), `order`

### REST API surface

```
GET    /api/sites              # list all sites
POST   /api/sites              # create a site
PUT    /api/sites/:id          # update a site
DELETE /api/sites/:id          # remove a site
PUT    /api/sites/reorder      # reorder by id list
GET    /api/health             # liveness probe
```

---

## Power Management Rules

- **Suspend/sleep is fully disabled** — NUC never powers off automatically
- **CPU governor:** `powersave` — clocks down when idle, never sleeps
- **HDD spin-down:** configured via `hdparm` — parks after idle period
- **No screensaver** — Chromium kiosk stays live or displays a standby screen
- Target idle power draw: ~5–10W

---

## External Hard Drive

- **Mount point:** `/mnt/media`
- **Format:** ext4
- **Auto-mount:** configured in `/etc/fstab` using UUID (not device name)
- **Subdirectory structure:**
  ```
  /mnt/media/
  ├── photos/       # Immich library
  ├── videos/       # Jellyfin library
  └── backups/      # Optional misc backups
  ```

---

## Networking

- **Local access:** All services accessible by IP on home WiFi
- **Remote access:** Tailscale VPN — no port forwarding, no exposed public IP
- **Tailscale is installed on:** NUC + owner's phone (and any other trusted devices)
- **Admin app:** Communicates over local network only (no internet exposure needed)

---

## Repo Structure

```
/
├── CLAUDE.md                  # This file
├── README.md                  # Quick-start
├── docker-compose.yml         # Immich + Jellyfin
├── .env.example               # Sample env vars for compose
├── streaming-ui/
│   ├── server/                # Node.js + Express backend
│   │   ├── index.js
│   │   ├── package.json
│   │   ├── routes/sites.js
│   │   └── data/sites.json
│   └── client/                # React frontend (Vite)
│       ├── index.html
│       ├── package.json
│       ├── vite.config.js
│       └── src/
├── admin-app/                 # Remote management app (other PC)
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
├── scripts/
│   ├── setup.sh               # Full NUC setup script
│   ├── power-management.sh    # Disable suspend, set powersave
│   ├── mount-hdd.sh           # fstab + mount helper
│   ├── autostart.sh           # Systemd + kiosk launch
│   └── systemd/
│       ├── streaming-ui.service
│       └── kiosk.service
└── docs/
    └── setup-guide.md
```

---

## Development Conventions

- **Node.js** for the streaming UI backend (Express)
- **React + Vite** for the streaming UI frontend and the admin app
- **Docker Compose** for Immich and Jellyfin — never install these bare-metal
- **Bash scripts** for all system-level setup (power, mounting, autostart)
- **Systemd services** for autostarting the Node server and Chromium kiosk on boot
- Keep the streaming UI backend and frontend in separate folders under `streaming-ui/`
- All secrets (if any arise) go in `.env` files, never hardcoded

---

## Setup Order (Reference)

1. Install Ubuntu Server 24.04 LTS on NUC
2. Run `scripts/power-management.sh` — disable suspend, set CPU governor
3. Install Docker + Docker Compose
4. Format and mount external HDD → `scripts/mount-hdd.sh`
5. Deploy Immich via `docker-compose.yml`
6. Deploy Jellyfin via `docker-compose.yml`
7. Install and configure Tailscale
8. Build and deploy streaming UI (`streaming-ui/`)
9. Configure Chromium kiosk autostart → `scripts/autostart.sh`
10. Build and deploy admin app (`admin-app/`) on separate PC

See `docs/setup-guide.md` for the full walkthrough.

---

## Key Decisions Already Made

- Ubuntu Server 24.04 LTS chosen over Debian/Fedora for broad hardware support and LTS stability
- Tailscale chosen over port-forwarding for remote access (safer, free, no dynamic DNS needed)
- Immich chosen for photos (Google Photos alternative with mobile app backup)
- Jellyfin chosen for video library (optional, complements Immich)
- React + Vite chosen for streaming UI frontend (smoother animations, fast dev server)
- Local network only for admin app (avoids need for any paid server or auth system)
- External HDD formatted as ext4 (best Linux native performance/reliability)
