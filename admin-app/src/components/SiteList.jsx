export default function SiteList({
  sites,
  onEdit,
  onDelete,
  onMove,
  activeId,
  disabled,
}) {
  if (sites.length === 0) {
    return <p className="hint">No sites yet — click + New to add one.</p>;
  }

  return (
    <ul className="site-list">
      {sites.map((site, i) => (
        <li
          key={site.id}
          className={`site-row ${activeId === site.id ? 'active' : ''}`}
        >
          <div className="site-info" onClick={() => onEdit(site)}>
            <div className="site-name">{site.name}</div>
            <div className="site-url">{site.url}</div>
            <div className="site-cat">{site.category}</div>
          </div>
          <div className="site-actions">
            <button
              onClick={() => onMove(site.id, -1)}
              disabled={disabled || i === 0}
              title="Move up"
            >
              ↑
            </button>
            <button
              onClick={() => onMove(site.id, 1)}
              disabled={disabled || i === sites.length - 1}
              title="Move down"
            >
              ↓
            </button>
            <button onClick={() => onEdit(site)} disabled={disabled}>
              Edit
            </button>
            <button
              className="danger"
              onClick={() => onDelete(site.id)}
              disabled={disabled}
            >
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
