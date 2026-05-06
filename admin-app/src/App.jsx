import { useEffect, useState, useCallback } from 'react';
import { api } from './api.js';
import SiteForm from './components/SiteForm.jsx';
import SiteList from './components/SiteList.jsx';

// Two-pane layout: left is the editable list with up/down/delete controls,
// right is a form for creating or editing a single site.
export default function App() {
  const [sites, setSites] = useState([]);
  const [editing, setEditing] = useState(null); // site object or null
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setSites(await api.list());
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave(payload) {
    setBusy(true);
    setError(null);
    try {
      if (editing?.id) {
        await api.update(editing.id, payload);
      } else {
        await api.create(payload);
      }
      setEditing(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this site?')) return;
    setBusy(true);
    try {
      await api.remove(id);
      if (editing?.id === id) setEditing(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleMove(id, dir) {
    const idx = sites.findIndex((s) => s.id === id);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= sites.length) return;
    const next = [...sites];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setSites(next); // optimistic
    try {
      await api.reorder(next.map((s) => s.id));
    } catch (err) {
      setError(err.message);
      load(); // resync
    }
  }

  return (
    <div className="admin">
      <header>
        <h1>Streaming UI — Admin</h1>
        <button onClick={load} disabled={busy}>
          Refresh
        </button>
      </header>

      {error && <p className="error">Error: {error}</p>}

      <main>
        <section className="list-pane">
          <div className="list-header">
            <h2>Sites ({sites.length})</h2>
            <button
              className="primary"
              onClick={() => setEditing({})}
              disabled={busy}
            >
              + New
            </button>
          </div>
          <SiteList
            sites={sites}
            onEdit={setEditing}
            onDelete={handleDelete}
            onMove={handleMove}
            activeId={editing?.id}
            disabled={busy}
          />
        </section>

        <section className="form-pane">
          {editing ? (
            <SiteForm
              key={editing.id || 'new'}
              site={editing}
              onSave={handleSave}
              onCancel={() => setEditing(null)}
              busy={busy}
            />
          ) : (
            <p className="hint">Pick a site to edit, or click + New.</p>
          )}
        </section>
      </main>
    </div>
  );
}
