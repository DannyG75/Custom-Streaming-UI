import { useEffect, useState, useCallback, useRef } from 'react';
import TileGrid from './components/TileGrid.jsx';
import { useGamepad } from './useGamepad.js';

// Top-level kiosk shell. Shows the tile grid; clicking a tile (or pressing A
// on a connected gamepad) navigates the whole window to the site. Iframe
// embedding doesn't work for most major streaming sites because they send
// X-Frame-Options: DENY, so we navigate fully.
//
// To get back to the kiosk: Alt+Left (browser back), or B / Start on a
// connected gamepad once antimicrox maps those to Alt+Left.
export default function App() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const tileRefs = useRef([]);

  const loadSites = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sites');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const list = await res.json();
      setSites(list);
      setFocusedIndex((i) => Math.min(i, Math.max(list.length - 1, 0)));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSites();
  }, [loadSites]);

  useEffect(() => {
    const id = setInterval(loadSites, 30_000);
    return () => clearInterval(id);
  }, [loadSites]);

  function openSite(site) {
    if (site) window.location.href = site.url;
  }

  // Move keyboard focus to the gamepad-focused tile so the existing
  // :focus styling doubles as the gamepad selection indicator.
  useEffect(() => {
    const el = tileRefs.current[focusedIndex];
    if (el) el.focus({ preventScroll: false });
  }, [focusedIndex, sites]);

  useGamepad({
    onNavigate: (dir) => {
      // Linear navigation across the flat tile array. The category groupings
      // are visual only — one big focusable list underneath.
      setFocusedIndex((i) => {
        if (sites.length === 0) return 0;
        if (dir === 'right' || dir === 'down') {
          return Math.min(i + 1, sites.length - 1);
        }
        if (dir === 'left' || dir === 'up') {
          return Math.max(i - 1, 0);
        }
        return i;
      });
    },
    onSelect: () => openSite(sites[focusedIndex]),
    onBack: () => window.history.back(),
    onReload: loadSites,
  });

  return (
    <div className="kiosk">
      <header className="kiosk-header">
        <h1>Home Streaming</h1>
        <button className="reload-btn" onClick={loadSites} aria-label="Reload">
          ⟳
        </button>
      </header>

      {loading && <p className="status">Loading…</p>}
      {error && (
        <p className="status error">
          Could not reach the streaming server: {error}
        </p>
      )}
      {!loading && !error && sites.length === 0 && (
        <p className="status">
          No sites configured yet. Add some from the admin app.
        </p>
      )}
      {!loading && !error && sites.length > 0 && (
        <TileGrid
          sites={sites}
          onPick={openSite}
          tileRefs={tileRefs}
          focusedId={sites[focusedIndex]?.id}
        />
      )}

      <footer className="kiosk-footer">
        Press <kbd>Alt</kbd> + <kbd>←</kbd> or controller <kbd>B</kbd> to come
        back home from any site.
      </footer>
    </div>
  );
}
