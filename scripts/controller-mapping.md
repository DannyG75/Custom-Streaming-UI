# Controller Mapping Reference

Recommended antimicrox button bindings for navigating the streaming kiosk
and embedded streaming sites with an Xbox One (or any XInput) controller.

| Controller input | antimicrox bind | Why |
|---|---|---|
| **D-pad up** | `Up` (arrow) | List navigation (works in most web players) |
| **D-pad down** | `Down` | List navigation |
| **D-pad left** | `Left` | List navigation |
| **D-pad right** | `Right` | List navigation |
| **Left stick X/Y** | Mouse X/Y | Cursor pointing — antimicrox has a "Mouse" tab on the stick |
| **A button** | `Enter` | Activate / click. The kiosk also handles A natively via the Gamepad API. |
| **B button** | `Alt+Left` | Browser back (returns from a streaming site to the kiosk) |
| **X button** | `Backspace` | Delete in text fields |
| **Y button** | `F5` | Reload page |
| **LB (left bumper)** | `Shift+Tab` | Previous focusable element |
| **RB (right bumper)** | `Tab` | Next focusable element |
| **LT (left trigger)** | Right mouse click | Context / right-click |
| **RT (right trigger)** | Left mouse click | Click whatever the cursor hovers |
| **Start** | `Alt+Home` | Jump back to kiosk home page |
| **Back / Select** | `Esc` | Cancel / close menus |
| **Xbox button** | (unbound) | Reserved — leave free so it doesn't trigger anything |

**Notes**

- Save the profile as `~/.config/antimicrox/streaming-kiosk.amgp` so the
  autostart command in `docs/setup-guide.md` § 7c finds it.
- The kiosk client (in `streaming-ui/client/src/useGamepad.js`) reads the
  Gamepad API directly, so D-pad and A button work on the home grid even
  before antimicrox is loaded. antimicrox is what makes the controller work
  on external sites (Netflix, YouTube, etc.) where we don't control the JS.
- If the controller's left stick feels twitchy as a mouse, raise the
  deadzone in antimicrox's stick settings (try 25–30%).
