import { useState, useRef, useEffect } from 'react';

// Power menu — top-right of the kiosk header. Click to open, click an option
// to start a confirmation flow, confirm to actually fire the action.
//
// Each action POSTs to /api/system/* and shows a status message. For
// destructive actions (restart/shutdown) we show a 5s "are you sure"
// confirmation; for sleep we just do it.
const ACTIONS = [
  { id: 'sleep', label: 'Sleep display', icon: '☾', danger: false },
  { id: 'restart', label: 'Restart', icon: '↻', danger: true },
  { id: 'shutdown', label: 'Shut down', icon: '⏻', danger: true },
];

export default function PowerMenu() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(null); // action id awaiting confirmation
  const [status, setStatus] = useState(null); // { kind, message }
  const wrapRef = useRef(null);

  // Click outside closes the menu.
  useEffect(() => {
    function onDoc(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setPending(null);
      }
    }
    if (open) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  // Esc closes the menu / cancels pending action.
  useEffect(() => {
    function onKey(e) {
      if (e.key !== 'Escape') return;
      if (pending) setPending(null);
      else if (open) setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, pending]);

  async function fire(id) {
    try {
      setStatus({ kind: 'pending', message: `${id}…` });
      const res = await fetch(`/api/system/${id}`, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // For sleep we get a normal response; for restart/shutdown the
      // connection will drop after the response — both are "success" here.
      setStatus({
        kind: 'ok',
        message: id === 'sleep' ? 'Display off (move mouse to wake)' : `${id} initiated`,
      });
      setOpen(false);
      setPending(null);
      // Auto-clear status after a few seconds
      setTimeout(() => setStatus(null), 4000);
    } catch (err) {
      setStatus({ kind: 'error', message: err.message });
    }
  }

  function handleAction(action) {
    if (action.danger) {
      setPending(action.id);
    } else {
      fire(action.id);
    }
  }

  return (
    <div className="power-menu-wrap" ref={wrapRef}>
      <button
        className="power-btn"
        onClick={() => {
          setOpen((v) => !v);
          setPending(null);
        }}
        aria-label="Power options"
        title="Power options"
      >
        ⏻
      </button>

      {open && (
        <div className="power-menu" role="menu">
          {pending ? (
            <div className="power-confirm">
              <p>
                {pending === 'restart'
                  ? 'Restart the NUC?'
                  : 'Shut the NUC down?'}
              </p>
              <p className="power-confirm-sub">
                {pending === 'restart'
                  ? 'It will be back in ~30 seconds.'
                  : 'You will need to push the power button to turn it on again.'}
              </p>
              <div className="power-confirm-actions">
                <button
                  className="power-confirm-btn power-confirm-yes"
                  onClick={() => fire(pending)}
                >
                  Yes, {pending}
                </button>
                <button
                  className="power-confirm-btn"
                  onClick={() => setPending(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            ACTIONS.map((a) => (
              <button
                key={a.id}
                className={`power-menu-item ${a.danger ? 'danger' : ''}`}
                onClick={() => handleAction(a)}
                role="menuitem"
              >
                <span className="power-menu-icon">{a.icon}</span>
                {a.label}
              </button>
            ))
          )}
        </div>
      )}

      {status && (
        <div className={`power-toast power-toast-${status.kind}`}>
          {status.message}
        </div>
      )}
    </div>
  );
}
