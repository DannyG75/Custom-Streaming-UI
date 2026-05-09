// Power-control endpoints for the kiosk.
//
//   POST /api/system/sleep    -> turn the display off (DPMS), kiosk + services keep running
//   POST /api/system/wake     -> turn the display back on
//   POST /api/system/restart  -> sudo reboot
//   POST /api/system/shutdown -> sudo poweroff
//
// Restart and shutdown require a sudoers entry — see scripts/sudoers-streaming-ui.
// Sleep/wake require DISPLAY + XAUTHORITY env vars on the systemd service so
// `xset` can talk to the user's X session.

import express from 'express';
import { spawn } from 'node:child_process';

const router = express.Router();

// Run a command detached from this process so the response can flush before
// the system shuts down. Errors are logged but don't fail the request — the
// client just gets an "ok" then loses connection on shutdown, which is fine.
function fireAndForget(cmd, args, delayMs = 500) {
  setTimeout(() => {
    try {
      const proc = spawn(cmd, args, {
        detached: true,
        stdio: 'ignore',
        // Inherit env (so DISPLAY/XAUTHORITY from systemd unit reach xset)
      });
      proc.on('error', (err) => console.error(`[system] ${cmd} error:`, err));
      proc.unref();
    } catch (err) {
      console.error(`[system] failed to spawn ${cmd}:`, err);
    }
  }, delayMs);
}

router.post('/sleep', (_req, res) => {
  // DPMS off — display goes dark, system keeps running. Mouse/key wakes it.
  fireAndForget('xset', ['dpms', 'force', 'off'], 100);
  res.json({ ok: true, action: 'sleep' });
});

router.post('/wake', (_req, res) => {
  fireAndForget('xset', ['dpms', 'force', 'on'], 100);
  res.json({ ok: true, action: 'wake' });
});

router.post('/restart', (_req, res) => {
  res.json({ ok: true, action: 'restart' });
  fireAndForget('sudo', ['-n', '/usr/sbin/reboot']);
});

router.post('/shutdown', (_req, res) => {
  res.json({ ok: true, action: 'shutdown' });
  fireAndForget('sudo', ['-n', '/usr/sbin/poweroff']);
});

export default router;
