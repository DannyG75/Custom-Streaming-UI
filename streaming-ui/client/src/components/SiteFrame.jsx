// Fullscreen view for a picked streaming site. Uses a plain iframe — most
// streaming sites detect the kiosk Chromium just fine. Sites that block
// embedding (X-Frame-Options) will show a Chrome error inside the iframe;
// for those, swap this for `window.location.href = site.url` style nav and
// add a top-bar Home button that's always visible.
//
// We keep a floating Home button overlay so the kiosk user can always get
// back to the grid even if the embedded site swallows keystrokes.
export default function SiteFrame({ site, onHome }) {
  return (
    <div className="site-frame">
      <button className="home-btn" onClick={onHome} aria-label="Home">
        ← Home
      </button>
      <iframe
        title={site.name}
        src={site.url}
        className="site-iframe"
        // sandbox left off intentionally — these are user-curated trusted
        // sites running on a private LAN kiosk, not arbitrary user input.
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
      />
    </div>
  );
}
