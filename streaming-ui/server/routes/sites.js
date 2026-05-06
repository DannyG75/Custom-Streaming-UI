// REST routes for the curated streaming-site list.
// Storage: a single JSON file. Good enough for ~hundreds of entries; swap for
// SQLite if it ever grows beyond that.

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promises as fs } from 'node:fs';
import { randomUUID } from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = process.env.SITES_FILE
  ? path.resolve(process.env.SITES_FILE)
  : path.join(__dirname, '..', 'data', 'sites.json');

const router = express.Router();

async function readSites() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('sites.json must be an array');
    return parsed;
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function writeSites(sites) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  // Atomic-ish write: write to temp file then rename, to avoid corrupting the
  // file if the process is killed mid-write (the kiosk-NUC use case).
  const tmp = `${DATA_FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(sites, null, 2), 'utf8');
  await fs.rename(tmp, DATA_FILE);
}

function validateSite(body) {
  const errors = [];
  if (typeof body?.name !== 'string' || body.name.trim() === '') {
    errors.push('name is required');
  }
  if (typeof body?.url !== 'string' || !/^https?:\/\//i.test(body.url)) {
    errors.push('url must start with http:// or https://');
  }
  if (body?.category != null && typeof body.category !== 'string') {
    errors.push('category must be a string');
  }
  if (body?.posterUrl != null && typeof body.posterUrl !== 'string') {
    errors.push('posterUrl must be a string');
  }
  return errors;
}

router.get('/', async (_req, res, next) => {
  try {
    const sites = await readSites();
    sites.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    res.json(sites);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const errors = validateSite(req.body);
    if (errors.length) return res.status(400).json({ errors });

    const sites = await readSites();
    const newSite = {
      id: randomUUID(),
      name: req.body.name.trim(),
      url: req.body.url.trim(),
      category: req.body.category?.trim() || 'Uncategorized',
      posterUrl: req.body.posterUrl?.trim() || null,
      order: sites.length,
    };
    sites.push(newSite);
    await writeSites(sites);
    res.status(201).json(newSite);
  } catch (err) {
    next(err);
  }
});

router.put('/reorder', async (req, res, next) => {
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: 'body must be { ids: string[] }' });
    }
    const sites = await readSites();
    const byId = new Map(sites.map((s) => [s.id, s]));
    const reordered = [];
    ids.forEach((id, idx) => {
      const site = byId.get(id);
      if (site) {
        site.order = idx;
        reordered.push(site);
        byId.delete(id);
      }
    });
    // Append any sites the client forgot, preserving their relative order.
    for (const leftover of byId.values()) {
      leftover.order = reordered.length;
      reordered.push(leftover);
    }
    await writeSites(reordered);
    res.json(reordered);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const errors = validateSite(req.body);
    if (errors.length) return res.status(400).json({ errors });

    const sites = await readSites();
    const idx = sites.findIndex((s) => s.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'not found' });

    sites[idx] = {
      ...sites[idx],
      name: req.body.name.trim(),
      url: req.body.url.trim(),
      category: req.body.category?.trim() || 'Uncategorized',
      posterUrl: req.body.posterUrl?.trim() || null,
    };
    await writeSites(sites);
    res.json(sites[idx]);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const sites = await readSites();
    const next_ = sites.filter((s) => s.id !== req.params.id);
    if (next_.length === sites.length) {
      return res.status(404).json({ error: 'not found' });
    }
    // Re-densify the order field so reordering UIs stay sane.
    next_.forEach((s, i) => (s.order = i));
    await writeSites(next_);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
