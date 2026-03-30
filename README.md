# Ghosty

**Voice-to-text optimizer for AI interactions.** Record your voice, let Ghosty transcribe and sharpen your words, paste the result anywhere.

Ghosty is not a chatbot. It's a meta-tool that transforms vague voice input into precise, well-structured text — ready to paste into ChatGPT, Claude, Slack, email, or any app.

## How it works

```
Hold shortcut → Speak → Release → Optimized text pasted into your active app
```

1. **Hold** your shortcut (default: `Ctrl+Shift+Space`) anywhere on your Mac
2. **Speak** your idea — as rough and unstructured as you want
3. **Release** — Ghosty transcribes, transforms based on your selected mode, and pastes the result

The whole pipeline takes **0.5–3 seconds** depending on your provider and mode.

## Modes

Each mode defines how Ghosty transforms your voice:

| Mode | What it does | When to use it |
|------|-------------|----------------|
| **Direct** | Clean transcription only — filler words removed, punctuation added | Quick notes, messages, dictation |
| **Shape** | Organize and tighten — same intent, fewer words, higher signal | AI prompts, requests, professional writing |
| **Reframe** | Rephrase strategically — identify the real goal, add context | Complex questions, strategic requests |
| **Build** | Expand into a complete request — infer domain, structure, methodology | Detailed briefs, project scoping |

You can also create **custom modes** with your own instructions.

## Providers

Ghosty supports multiple AI providers for transcription and text transformation:

| | Transcription | Text transformation |
|---|---|---|
| **OpenAI** | Whisper ($0.006/min) | GPT-4o-mini (best quality) |
| **Groq** | Whisper Large v3 Turbo (10x faster, $0.0007/min) | Llama 3 (fastest, lower quality) |

**Recommended setup:** Groq for transcription (speed), OpenAI for transformation (quality).

You can switch providers anytime in Settings > Models.

## Install

### Download

Download the latest `.dmg` from [Releases](https://github.com/gui2eellav-largo/ghosty/releases).

**First launch on macOS:** Right-click the app → Open → Confirm (required once for unsigned apps).

### Build from source

```bash
# Prerequisites: Rust toolchain + Node.js 18+
npm install
npm run tauri:build
# Output: src-tauri/target/release/bundle/dmg/Ghosty_0.1.0_aarch64.dmg
```

### Development

```bash
npm install
npm run tauri:dev          # Dev mode (Vite + Tauri hot reload)
npm test                   # Frontend tests (Vitest)
cd src-tauri && cargo test # Rust tests
```

## Setup

1. Launch Ghosty — the onboarding walks you through API key setup
2. Get an API key from [OpenAI](https://platform.openai.com/api-keys) or [Groq](https://console.groq.com/keys)
3. Choose your transcription provider (Groq recommended for speed)
4. Hold `Ctrl+Shift+Space` to record your first command

## Architecture

```
src/                          # Frontend (React 19 + TypeScript)
├── components/
│   ├── Dashboard.tsx         # Main window shell
│   ├── FloatingBar.tsx       # Always-on-top recording widget
│   ├── Onboarding.tsx        # First-run setup
│   └── dashboard/            # Sub-views (Home, Modes, Dictionary, Settings)
├── hooks/                    # useApiKeys, useShortcuts, useDictionary, useModes, etc.
├── api/tauri.ts              # Typed Tauri command wrappers
└── lib/strings.ts            # Centralized UI strings

src-tauri/src/                # Backend (Rust + Tauri 2)
├── audio.rs                  # Recording (cpal), WAV encoding, pipeline orchestrator
├── transcribe.rs             # Whisper API (OpenAI + Groq, retry + fallback)
├── llm.rs                    # LLM streaming (OpenAI + Groq, retry + fallback)
├── secrets.rs                # API key management (macOS Keychain)
├── modes.rs                  # Built-in + custom mode management
├── preferences.rs            # User preferences (JSON, atomic writes)
├── clipboard.rs              # Clipboard + auto-paste (Accessibility API)
└── shortcuts.rs              # Global keyboard shortcuts
```

**Two windows:** Main dashboard (1000x650) + floating widget (28x28, always-on-top, transparent).

## Features

- **Global hotkey** — Record from any app, result pasted back instantly
- **4 built-in modes** + unlimited custom modes with your own instructions
- **Groq support** — Near-instant transcription with automatic OpenAI fallback
- **Dictionary** — Custom words and acronyms to improve transcription accuracy
- **Auto-paste** — Result pasted directly into the active text field
- **Floating widget** — Minimal, always-on-top pill with mode selection
- **macOS Services** — Right-click context menu integration
- **Multi-key management** — Store multiple API keys, switch providers per feature
- **Dark mode** — System-aware theme

## Platform support

| | macOS | Linux / Windows |
|---|---|---|
| Recording + transcription | Full | Full |
| API key management | Keychain (multi-key) | Env var only (`OPENAI_API_KEY`) |
| Auto-paste | Full (Accessibility API) | Limited |
| Services (right-click) | Full | Not available |

## Cost

| Provider | Transcription (5s audio) | Transformation | Total per command |
|----------|-------------------------|----------------|-------------------|
| OpenAI | $0.0005 | $0.0010 | ~$0.0015 |
| Groq | $0.00006 | $0.00013 | ~$0.0002 |

Typical usage (50 commands/day): **$0.30–$2.25/month** depending on provider.

## Documentation

- [Quick Start](docs/QUICKSTART.md)
- [Keyboard Shortcuts](docs/KEYBOARD-SHORTCUTS.md)
- [Production Readiness](docs/PRODUCTION-READINESS.md)
- [Creating a Release](docs/CREATING-A-RELEASE.md)

## License

[MIT](LICENSE)

---

**Version:** 0.1.0 (beta)
