import { useState } from 'react';

export default function SiteForm({ site, onSave, onCancel, busy }) {
  const [name, setName] = useState(site.name || '');
  const [url, setUrl] = useState(site.url || '');
  const [category, setCategory] = useState(site.category || '');
  const [posterUrl, setPosterUrl] = useState(site.posterUrl || '');
  const [error, setError] = useState(null);

  function submit(e) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError('Name is required.');
    if (!/^https?:\/\//i.test(url)) {
      return setError('URL must start with http:// or https://');
    }
    onSave({
      name: name.trim(),
      url: url.trim(),
      category: category.trim(),
      posterUrl: posterUrl.trim() || null,
    });
  }

  return (
    <form className="site-form" onSubmit={submit}>
      <h2>{site.id ? 'Edit site' : 'New site'}</h2>

      <label>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} required />
      </label>

      <label>
        URL
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://"
          required
        />
      </label>

      <label>
        Category
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Streaming, Video, Local…"
        />
      </label>

      <label>
        Poster URL (optional)
        <input
          value={posterUrl}
          onChange={(e) => setPosterUrl(e.target.value)}
          placeholder="https://…/poster.jpg"
        />
      </label>

      {error && <p className="error">{error}</p>}

      <div className="form-actions">
        <button type="submit" className="primary" disabled={busy}>
          {site.id ? 'Save' : 'Create'}
        </button>
        <button type="button" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      </div>
    </form>
  );
}
