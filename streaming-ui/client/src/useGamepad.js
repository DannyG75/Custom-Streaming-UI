// Polls the Gamepad API for connected controllers and emits high-level
// "navigate" / "select" / "back" / "reload" events. Designed for an Xbox One
// pad but works with any XInput-compatible controller. Standard mapping per
// https://www.w3.org/TR/gamepad/#remapping:
//
//   buttons[0] = A     buttons[1] = B    buttons[2] = X    buttons[3] = Y
//   buttons[4] = LB    buttons[5] = RB
//   buttons[6] = LT    buttons[7] = RT
//   buttons[8] = Back  buttons[9] = Start
//   buttons[12..15]    = D-pad up/down/left/right
//   axes[0/1]          = left stick X/Y
//   axes[2/3]          = right stick X/Y
//
// Focus management is intentionally external — this hook reports input,
// the component decides what to do with it.

import { useEffect, useRef } from 'react';

const REPEAT_INITIAL_MS = 350; // delay before key auto-repeats
const REPEAT_INTERVAL_MS = 140; // repeat cadence after that
const STICK_DEADZONE = 0.4;

export function useGamepad({ onNavigate, onSelect, onBack, onReload }) {
  // Stash callbacks in a ref so the polling loop always sees the latest
  // versions without restarting the rAF loop on every render.
  const handlers = useRef({ onNavigate, onSelect, onBack, onReload });
  handlers.current = { onNavigate, onSelect, onBack, onReload };

  useEffect(() => {
    let raf;
    const buttonState = new Map(); // button index -> { down, repeatAt }
    const directionState = { dir: null, repeatAt: 0 };

    function readDirection(gp) {
      // D-pad ONLY for tile navigation. Analog sticks are reserved for
      // mouse control (handled by antimicrox at the system level), so we
      // intentionally ignore axes[0..3] here — otherwise moving the cursor
      // would also scroll the tile focus.
      let x = 0;
      let y = 0;
      if (gp.buttons[14]?.pressed) x = -1;
      if (gp.buttons[15]?.pressed) x = 1;
      if (gp.buttons[12]?.pressed) y = -1;
      if (gp.buttons[13]?.pressed) y = 1;
      if (Math.abs(x) > Math.abs(y)) {
        if (x > 0) return 'right';
        if (x < 0) return 'left';
      } else {
        if (y > 0) return 'down';
        if (y < 0) return 'up';
      }
      return null;
    }

    function pulseButton(gp, idx, action) {
      const pressed = !!gp.buttons[idx]?.pressed;
      const prev = buttonState.get(idx) || { down: false };
      if (pressed && !prev.down) {
        action();
      }
      buttonState.set(idx, { down: pressed });
    }

    function poll(now) {
      const pads = navigator.getGamepads();
      for (const gp of pads) {
        if (!gp || !gp.connected) continue;

        // Direction with initial press + auto-repeat.
        const dir = readDirection(gp);
        if (dir) {
          if (dir !== directionState.dir) {
            handlers.current.onNavigate?.(dir);
            directionState.dir = dir;
            directionState.repeatAt = now + REPEAT_INITIAL_MS;
          } else if (now >= directionState.repeatAt) {
            handlers.current.onNavigate?.(dir);
            directionState.repeatAt = now + REPEAT_INTERVAL_MS;
          }
        } else {
          directionState.dir = null;
        }

        // Single-press actions (no auto-repeat — feels wrong for "select").
        pulseButton(gp, 0, () => handlers.current.onSelect?.());
        pulseButton(gp, 1, () => handlers.current.onBack?.());
        pulseButton(gp, 3, () => handlers.current.onReload?.());
        pulseButton(gp, 9, () => handlers.current.onBack?.()); // Start = home
      }
      raf = requestAnimationFrame(poll);
    }

    raf = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(raf);
  }, []);
}
