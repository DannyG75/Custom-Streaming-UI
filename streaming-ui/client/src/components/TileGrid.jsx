import { useMemo } from 'react';

// Group sites by category for visual presentation but render every tile into
// a single flat ref array so gamepad navigation can step through them in
// order. tileRefs is owned by the parent so it can manage focus.
export default function TileGrid({ sites, onPick, tileRefs, focusedId }) {
  const grouped = useMemo(() => groupByCategory(sites), [sites]);

  // Build an id -> flat-index map so each Tile can claim the right ref slot
  // regardless of which category row it lives in.
  const indexById = useMemo(() => {
    const m = new Map();
    sites.forEach((s, i) => m.set(s.id, i));
    return m;
  }, [sites]);

  return (
    <div className="tile-grid">
      {grouped.map(([category, items]) => (
        <section key={category} className="row">
          <h2 className="row-title">{category}</h2>
          <div className="row-tiles">
            {items.map((site) => (
              <Tile
                key={site.id}
                site={site}
                onPick={onPick}
                refSlot={(el) => {
                  if (tileRefs) tileRefs.current[indexById.get(site.id)] = el;
                }}
                isFocused={focusedId === site.id}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Tile({ site, onPick, refSlot, isFocused }) {
  const initial = site.name?.[0]?.toUpperCase() ?? '?';
  return (
    <button
      ref={refSlot}
      className={`tile ${isFocused ? 'tile-focused' : ''}`}
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
