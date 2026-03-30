# Keyboard Shortcuts

Global shortcuts, user scenarios, and developer reference.

---

## Overview

| Shortcut (default) | Action | Type |
|-------------------|--------|------|
| `Ctrl+Space` | Push to talk | Hold |
| `Ctrl+Shift+Space` | Hands-free mode | Toggle |
| `Escape` | Stop recording | Press |
| `Ctrl+Shift+E` | Command Mode | Press |
| `Ctrl+Cmd+V` | Paste last transcript | Press |
| `Cmd+Shift+D` | Open Dashboard | Press |

Stored in `app_data_dir()/shortcuts.json`. Each shortcut can be enabled/disabled, edited, or reset from **Settings > Shortcuts**.

---

## Shortcuts by action

### 1. Push to talk

- **ID**: `push-to-talk`
- **Default**: `Ctrl+Space`
- **Behavior**: Hold the key combination to record; release to stop and transcribe.

| Scenario | Steps | Expected result |
|----------|-------|-----------------|
| Short dictation | Hold Ctrl+Space, speak a sentence, release | Recording starts on press, stops on release, transcription + output (copy/paste per preferences). |
| Cancel | Hold Ctrl+Space, release without speaking | No useful transcription; no error. |
| Conflict with another app | Same shortcut used elsewhere | Risk of conflict; user can change the key in Settings > Shortcuts. |

**Dev**: `ShortcutAction::PushToTalk`; on `Pressed` → `recording_started` + `hotkey::on_recording_start`; on `Released` → if recording → `on_recording_stop` + `recording_stopped`.

---

### 2. Hands-free mode

- **ID**: `hands-free`
- **Default**: `Ctrl+Shift+Space`
- **Behavior**: First press starts recording; second press stops and transcribes.

| Scenario | Steps | Expected result |
|----------|-------|-----------------|
| Long dictation | Ctrl+Shift+Space, speak, Ctrl+Shift+Space | Starts on first press, stops + transcribes on second. |
| Forgot to stop | Start then don't touch keyboard | Recording continues until Stop (e.g., Escape) or timeout if configured. |
| Combined with Push to talk | Use both depending on context | Both can be active; user chooses based on passage length. |

**Dev**: `ShortcutAction::ToggleRecording`; on each `Pressed`: if recording → stop, else → start.

---

### 3. Stop recording

- **ID**: `stop-recording`
- **Default**: `Escape`
- **Behavior**: Stops a recording in progress (hands-free or other). No effect if not recording.

| Scenario | Steps | Expected result |
|----------|-------|-----------------|
| Clean stop in hands-free | Start with Ctrl+Shift+Space, speak, press Escape | Recording stops, transcription starts. |
| No active recording | Press Escape without recording | No effect (no error). |
| Custom shortcut | Change Escape to another key (e.g., F12) | Same behavior with new key. |

**Dev**: `ShortcutAction::StopRecording`; on `Pressed`: if `RecorderState::is_capturing()` → stop + `recording_stopped`. `Space` alone is forbidden by default.

---

### 4. Command Mode

- **ID**: `command-mode`
- **Default**: `Ctrl+Shift+E`
- **Behavior**: Opens the Dashboard, brings it to front, and activates Direct mode.

| Scenario | Steps | Expected result |
|----------|-------|-----------------|
| From another app | Working in an editor, Ctrl+Shift+E | Ghosty window opens / comes to front, ready for action. |
| Selection + transformation | Ctrl+Shift+E, select text elsewhere, use Direct mode | User can chain with right-click Services or Dashboard. |
| Custom mode shortcut | Create a shortcut for a different mode (e.g., Shape) | Same principle: open + focus, different target mode. |

**Dev**: `ShortcutAction::ActivateMode { mode_id: "light" }`; emits `activate-mode` with the `mode_id`, then `show` + `set_focus` on the `main` window.

---

### 5. Paste last transcript

- **ID**: `paste-last-output`
- **Default**: `Ctrl+Cmd+V`
- **Behavior**: Copies the last transcription output to clipboard and pastes into the focused app (simulates Cmd+V).

| Scenario | Steps | Expected result |
|----------|-------|-----------------|
| Paste last dictation | Dictate (push-to-talk or hands-free), then Ctrl+Cmd+V in a text field | Transcribed text is pasted at cursor position. |
| No recent dictation | Ctrl+Cmd+V without having dictated | Error toast: "Nothing to paste yet." |
| Multiple dictations | Dictate A, dictate B, Ctrl+Cmd+V | Last output (B) is pasted. |

**Dev**: `ShortcutAction::PasteLastOutput`; calls `paste_last_output`: reads `LastOutputState`, copies to clipboard, then `clipboard::send_paste_keystroke()`.

---

### 6. Open Dashboard

- **ID**: `open-dashboard`
- **Default**: `Cmd+Shift+D`
- **Behavior**: Shows the main window, unminimizes if needed, and gives it focus.

| Scenario | Steps | Expected result |
|----------|-------|-----------------|
| Quick access to settings | From any app, Cmd+Shift+D | Ghosty Dashboard visible and focused. |
| Minimized window | Minimize Dashboard, then Cmd+Shift+D | Window comes back to front. |
| From floating widget | Use Cmd+Shift+D from the widget | Same behavior: single "main" window. |

**Dev**: `ShortcutAction::OpenDashboard`; on `main`: `show()`, `unminimize()`, `set_focus()`.

---

## Technical constraints

- **Fn key**: Not supported for global shortcuts (macOS limitation).
- **Space alone**: Rejected (would block typing everywhere); use at least one modifier (e.g., `Ctrl+Space`, `Option+Space`).
- **Uniqueness**: Same key combination cannot be assigned to two actions (checked in frontend + `check_shortcut_available` on save).
- **Registration**: On app startup and after each change (save/toggle/reset), shortcuts are re-registered via `reregister_shortcuts`; in-memory mapping is `ShortcutMappingState(id -> ShortcutConfig)`.

Key files:

- Backend: `src-tauri/src/shortcuts.rs` (defaults, load/save, `keys_to_shortcut_string`), `src-tauri/src/lib.rs` (`run_shortcut_action`, plugin registration).
- Frontend: Settings Shortcuts section, types in `types/index.ts` (`ShortcutConfig`, `ShortcutAction`).

---

## Default configuration

```
Push to talk       Ctrl+Space
Hands-free         Ctrl+Shift+Space
Stop recording     Escape
Command Mode       Ctrl+Shift+E
Paste last         Ctrl+Cmd+V
Open Dashboard     Cmd+Shift+D
```

**Avoid conflicts with your editor** (e.g., VS Code): replace `Ctrl+Shift+E` (Command Mode) with `Ctrl+Alt+E` or `Cmd+Shift+E`.

---

## Backend action reference

| Action | Event / effect |
|--------|----------------|
| `PushToTalk` | Pressed → start recording; Released → stop if recording |
| `ToggleRecording` | Pressed → toggle start/stop |
| `StartRecording` | Pressed → start (not used in defaults) |
| `StopRecording` | Pressed → stop if recording |
| `PasteLastOutput` | Pressed → copy + auto-paste last output |
| `OpenDashboard` | Pressed → show + focus main window |
| `ActivateMode { mode_id }` | Pressed → emit `activate-mode`, show + focus main |
| `ToggleFloatingBar` | Pressed → emit `toggle-floating-bar` (not in default UI) |
