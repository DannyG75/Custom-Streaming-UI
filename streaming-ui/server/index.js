// Streaming UI server.
// Serves the built React kiosk client from ./public and exposes a small REST
// API for managing the curated site list. Designed to run on the NUC under a
// systemd unit, but works fine on any dev machine with `npm run dev`.

import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

import sitesRouter from './routes/sites.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, 'public');

const app = express();

// CORS so the admin app on a different PC (and Vite dev server on :5173)
// can hit the API. Local network only — no auth.
app.use(cors());
app.use(express.json({ limit: '256kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

app.use('/api/sites', sitesRouter);

// Serve the built React app if it exists. During development you'll usually
// run Vite separately on :5173, so this block is a no-op until you build.
if (existsSync(PUBLIC_DIR)) {
  app.use(express.static(PUBLIC_DIR));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.type('text/plain').send(
      'Streaming UI server is running.\n' +
        'No built client found at ./public — run `npm run build` in ../client.\n' +
        'API is live at /api/sites and /api/health.\n',
    );
  });
}

app.listen(PORT, () => {
  console.log(`[streaming-ui] listening on http://localhost:${PORT}`);
});
