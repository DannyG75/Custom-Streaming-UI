import { useEffect, useState, useCallback } from 'react';
import TileGrid from './components/TileGrid.jsx';

// Top-level kiosk shell. Shows the tile grid; clicking a tile navigates the
// whole window to the site (iframe embedding doesn't work for most major
// streaming sites because they send X-Frame-Options: DENY).
//
// To get back to the kiosk: Alt+Left (browser back), or Alt+Home if Chromium
// has the kiosk URL set as its homepage (see scripts/openbox-autostart.sh /
// the Desktop autostart .desktop file).
export default function App() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadSites = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sites');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSites(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSites();
  }, [loadSites]);

  // Refresh the list every 30s so the admin app's edits show up without
  // needing to restart the kiosk.
  useEffect(() => {
    const id = setInterval(loadSites, 30_000);
    return () => clearInterval(id);
  }, [loadSites]);

  function openSite(site) {
    // Full-window navigation. The browser handles back/forward natively.
    window.location.href = site.url;
  }

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
        <TileGrid sites={sites} onPick={openSite} />
      )}

      <footer className="kiosk-footer">
        Press <kbd>Alt</kbd> + <kbd>←</kbd> to come back home from any site.
      </footer>
    </div>
  );
}
