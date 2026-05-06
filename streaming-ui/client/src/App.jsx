import { useEffect, useState, useCallback } from 'react';
import TileGrid from './components/TileGrid.jsx';
import SiteFrame from './components/SiteFrame.jsx';

// Top-level kiosk shell. Two states:
//   1. browsing -> show grouped tile grid
//   2. viewing  -> show the picked site fullscreen with a Home button
export default function App() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSite, setActiveSite] = useState(null);

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

  // Esc returns to the home grid from a fullscreen site.
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') setActiveSite(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (activeSite) {
    return <SiteFrame site={activeSite} onHome={() => setActiveSite(null)} />;
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
        <TileGrid sites={sites} onPick={setActiveSite} />
      )}
    </div>
  );
}
