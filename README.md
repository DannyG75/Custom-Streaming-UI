# Home Server & Streaming UI

A two-in-one home server stack for an Intel NUC running Ubuntu Server 24.04 LTS:

- **Streaming UI** — A Netflix-style kiosk that opens curated streaming sites in fullscreen Chromium
- **Home Media Server** — Immich (photos) + Jellyfin (videos) backed by an external HDD, reachable from anywhere via Tailscale

See [`CLAUDE.md`](./CLAUDE.md) for the full project memory, and [`docs/setup-guide.md`](./docs/setup-guide.md) for step-by-step NUC setup.

---

## Quick Start (development on any machine)

```bash
# 1. Backend
cd streaming-ui/server
npm install
npm run dev               # http://localhost:3000

# 2. Frontend (in another terminal)
cd streaming-ui/client
npm install
npm run dev               # http://localhost:5173 (proxies /api -> 3000)

# 3. Admin app (in another terminal)
cd admin-app
npm install
npm run dev               # http://localhost:5174
```

Build the kiosk client into the server's `public/` folder for production:

```bash
cd streaming-ui/client
npm run build             # outputs to ../server/public
```

Then `npm start` in `streaming-ui/server` serves the API + the built UI on port 3000.

---

## Production Deploy on the NUC

```bash
sudo bash scripts/setup.sh
```

This runs every step in `docs/setup-guide.md` non-interactively where possible. Review the script before running on a real machine.

---

## Layout

```
streaming-ui/   Express API + React kiosk UI
admin-app/      Remote site-list manager (other PC)
scripts/        NUC setup, power, mount, autostart
docs/           Setup walkthrough
docker-compose.yml  Immich + Jellyfin
```
