# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run tauri:dev          # Dev mode (starts Vite + Tauri)
npm run tauri:dev:fresh    # Kill port 5173 first, then dev (use when Vite is already running)
npm run tauri:build        # Production build → src-tauri/target/release/bundle/
npm test                   # Vitest tests
npx vitest run src/lib/utils.test.ts  # Single test file
npx tsc --noEmit           # TypeScript type check
npm run lint               # ESLint (--max-warnings 0, zero tolerance)
```

**First run on a new machine:** `npm install` — no Rust/Cargo commands needed (Tauri CLI handles Cargo).

**macOS unsigned app:** Right-click → Open → confirm (once per download). For signing: set `signingIdentity` in `tauri.conf.json` + Apple Developer account.

## Architecture

### Two-window Tauri app

Two windows defined in `src-tauri/tauri.conf.json`:
- **`main`** (1000×650): Dashboard — full settings, history, mode management
- **`floating`** (starts 28×28, resizes dynamically): FloatingBar — transparent pill always-on-top, the actual recording interface

Routing in `src/App.tsx`: reads `getWindowLabel()` from `src/lib/tauri-window.ts`, renders `<Onboarding/>` (first run) or `<Dashboard/>` or `<FloatingBar/>`.

### Frontend patterns

All Tauri `invoke()` calls go through **`src/api/tauri.ts`** — typed wrappers organized by domain (`api.preferences`, `api.modes`, `api.apiKeys`, `api.updater`, `api.onboarding`, etc.). Never call `invoke()` directly from components.

State management: local React hooks only (no Context, Redux, Zustand). `Dashboard.tsx` owns all settings state. `FloatingBar.tsx` is fully autonomous.

Design system: `src/lib/design-tokens.ts` exports `designTokens` (spacing, colors, typography) and `uiClasses` (reusable Tailwind class strings). `src/style.css` = Tailwind v4 + floating window specifics.

### Event-driven voice pipeline (Rust → Frontend)

```
start_recording command
  → recording_started event → voiceState = "recording"
  → (user releases key)
stop_recording command
  → recording_stopped event → voiceState = "processing"
  → run_pipeline() async: transcribe → LLM transform → clipboard → paste
  → transcription_ready event → voiceState = "success" → idle after 1.5s
  → transcription_error event → voiceState = "idle"  (always emitted on failure)
```

### Rust backend modules

| File | Role |
|---|---|
| `audio.rs` | cpal recording, worker thread, WAV encoding, `run_pipeline()` |
| `transcribe.rs` | OpenAI Whisper API, 3 retries with exponential backoff |
| `llm.rs` | GPT-4o-mini streaming transformation |
| `hotkey.rs` | Thin shim → delegates to `audio::RecorderState` |
| `secrets.rs` | macOS Keychain multi-key store. Linux/Windows: `OPENAI_API_KEY` env var |
| `preferences.rs` | JSON in Tauri app data dir, partial merge via `update_preferences()` |
| `modes.rs` | User-defined transformation modes (CRUD + reorder) |
| `shortcuts.rs` | Configurable global shortcuts (stored as `shortcuts.json`) |
| `prompt_state.rs` | `ActivePromptState` — holds current mode system prompt during pipeline |

### Modes

Built-in backend IDs: `light` (Direct — no LLM, formatting only via `light_fast_path()`), `medium` (Shape), `strong` (Reframe), `full` (Build). The `light` mode skips LLM entirely. All other modes pass transcription through GPT-4o-mini with the mode's system prompt.

### Floating window mechanics

- Transparent, `pointer-events: none` by default on container; individual elements opt in via `pointer-events: auto`
- `useFloatingWindowBounds` hook in `src/hooks/useFloatingWindowBounds.ts` manages window resizing (pill ↔ menu layout)
- 120ms interval polls `focus_floating_if_cursor_inside` Rust command (macOS focus quirk)
- Click-through state toggled via `set_window_click_through` Tauri command

### API key storage

- **macOS**: `security-framework` crate, Keychain service `ai.ghosty.app`, multi-key config in `api_keys_store` account
- **Linux/Windows**: single key via `OPENAI_API_KEY` env var only — UI key management does not work

### Auto-updater

GitHub Releases endpoint in `tauri.conf.json`. `pubkey` is empty (not yet configured for signing). `check_update` and `install_update` Tauri commands. Frontend: `api.updater.check()` / `api.updater.install()`. Auto-check on Dashboard mount when `preferences.general.autoUpdate === true`.

### Onboarding

First-run flag `first_run_done` in `preferences.general`. `App.tsx` checks both `get_first_run_done` and `has_openai_key` on mount — existing users (have a key) skip onboarding automatically.
