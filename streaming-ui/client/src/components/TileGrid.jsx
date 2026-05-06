import { useMemo } from 'react';

// Group sites by category and render each category as a horizontal row of
// tiles, Netflix-style.
export default function TileGrid({ sites, onPick }) {
  const grouped = useMemo(() => groupByCategory(sites), [sites]);

  return (
    <div className="tile-grid">
      {grouped.map(([category, items]) => (
        <section key={category} className="row">
          <h2 className="row-title">{category}</h2>
          <div className="row-tiles">
            {items.map((site) => (
              <Tile key={site.id} site={site} onPick={onPick} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Tile({ site, onPick }) {
  const initial = site.name?.[0]?.toUpperCase() ?? '?';
  return (
    <button
      className="tile"
      onClick={() => onPick(site)}
      aria-label={`Open ${site.name}`}
    >
      {site.posterUrl ? (
        <img src={site.posterUrl} alt="" className="tile-poster" />
      ) : (
        <div className="tile-fallback" data-letter={initial}>
          {initial}
        </div>
      )}
      <div className="tile-label">{site.name}</div>
    </button>
  );
}

function groupByCategory(sites) {
  const map = new Map();
  for (const site of sites) {
    const cat = site.category || 'Uncategorized';
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat).push(site);
  }
  return Array.from(map.entries());
}
