# Production readiness guide

This guide describes everything needed to make Ghosty ready for production use, with a focus on **security** and **best practices** for a first launch.

---

## 1. Security

### 1.1 API keys (OpenAI)

**Principle**: API keys must **never** be hardcoded or sent to any server other than OpenAI.

- **Storage**: Keys are stored on the backend (Rust) in a secure local store (e.g. keyring / credential store per OS). Verify in code:
  - No keys in plain text in the repo (no `OPENAI_API_KEY="sk-..."` in a versioned file).
  - Keys entered by the user are persisted via the Tauri API (e.g. `secrets`, `add_api_key_entry`) and never logged.
- **In production**:
  - Each user uses **their own** OpenAI key (personal or business account). The app does not provide a shared key.
  - Remind users not to share their key and to revoke it if leaked (OpenAI Dashboard).
- **Billing**: Calls (Whisper, GPT-4o-mini) are billed to the OpenAI account tied to the key. The user must have an up-to-date OpenAI account.

**Checklist**:
- [ ] No keys hardcoded in code or in a versioned `.env` (`.env` in `.gitignore`).
- [ ] No `console.log` / `println!` that print keys or tokens.
- [ ] User documentation: where to enter the key, how to revoke it.

### 1.2 User data

- **Data stored locally**: Preferences, custom modes, dictionary, shortcuts. They stay on the user's machine.
- **Data sent externally**:
  - **OpenAI**: Audio (Whisper) and text (LLM). Check [OpenAI privacy policy](https://openai.com/policies/privacy) and state in one sentence in the doc or app (e.g. "Recordings and text are sent to OpenAI for transcription and transformation").
- **No other servers**: No analytics, no telemetry, unless you add them explicitly (and then: consent, privacy policy).

**Checklist**:
- [ ] Clearly list what data is sent to OpenAI.
- [ ] If you add analytics/crash reporting: user consent + privacy policy.

### 1.3 App permissions

Ghosty needs:
- **Microphone**: For voice recording.
- **Global keyboard shortcuts**: For the hotkey (e.g. Ctrl+Shift+Space) even when the app is in the background.
- **Clipboard**: To copy the result and optionally paste.

**In production**:
- On macOS, the user must allow microphone and accessibility (for shortcuts) in System Settings. Include a sentence in the doc or a first-run screen explaining "Ghosty needs the microphone and keyboard shortcuts to work".
- Request only what is strictly necessary.

---

## 2. Build and distribution

### 2.1 Release build

```bash
npm run build          # compile frontend (TypeScript + Vite)
npm run tauri build    # produce .app (macOS) and/or binaries
```

Artifacts are in `src-tauri/target/release/` (or equivalent for the target).

### 2.2 Signature and notarization (macOS)

So users can open the app without "unidentified developer" warnings:

1. **App signature**:
   - In `tauri.conf.json`, under `bundle.macOS`:
     - `signingIdentity`: set your Apple developer certificate identity (e.g. `"Developer ID Application: Your Name (TEAM_ID)"`).
   - Without an Apple certificate, the app can still be distributed but macOS will show a warning (workaround: right-click → Open).

2. **Notarization** (recommended for distribution outside the App Store):
   - Avoids Gatekeeper blocking.
   - Tauri can integrate notarization; see [Tauri docs (macOS)](https://v2.tauri.app/start/build/sidecar/).
   - Prerequisites: Apple Developer account (paid), `notarytool` or `altool`.

3. **Bundle identifier**:
   - Currently `com.ghosty.app`. Apple advises against ending with `.app` (conflict with bundle extension). Prefer e.g. `com.ghosty.desktop` or `app.ghosty` going forward.

**Checklist**:
- [ ] Release build runs without error.
- [ ] Decide: signature + notarization (Apple account) or "manual" distribution with instructions to work around the warning.
- [ ] Change bundle identifier if following Apple's recommendation.

### 2.3 Automatic updates (optional)

Tauri provides an updater plugin: the app can check a URL (or server) for a new version. Useful after first install to ship fixes without a full re-download. Configure later if needed.

---

## 3. External accounts and services

### 3.1 OpenAI

- **Account**: Each user must have an OpenAI account and an API key.
- **Costs**: Whisper + GPT-4o-mini ≈ $0.0015 per command. Costs are charged to the account holder (the key).
- **Limits**: Respect OpenAI rate limits; if exceeded, the app can show a clear error (partially handled in code).
- **Best practices**:
  - Never expose the key (no "shared" key for all app users).
  - Document how to create a key and where to set it in Ghosty.

### 3.2 Other accounts

- No other account required for the app (no central "Ghosty" account). Everything is local + OpenAI.

---

## 4. Pre-launch checklist

To validate before considering the first "production" version.

### Code and config
- [ ] `ENABLE_RIGHT_CLICK_SERVICES` and any "pending" features left at `false` (or documented).
- [ ] No secrets (API key, token) in the repo or build artifacts.
- [ ] Debug logs removed or disabled in release build (no sensitive logs).
- [ ] `.env` and key files in `.gitignore`.

### Build
- [ ] `npm run tauri build` succeeds.
- [ ] App launches correctly from the `.app` (not only in `tauri:dev`).
- [ ] Global shortcut and microphone tested on a "clean" machine.

### User
- [ ] Up-to-date Quick Start or equivalent (e.g. `docs/QUICKSTART.md`): install, API key, first use.
- [ ] One sentence on data sent to OpenAI (transcription + text) and link to OpenAI policy if needed.
- [ ] If distributing outside the Mac App Store: a note on opening an unsigned app (right-click → Open) if you are not notarizing yet.

### Legal / product (recommendations)
- [ ] Clear project license (e.g. MIT).
- [ ] If you collect personal data elsewhere than OpenAI: privacy policy + consent.
- [ ] Version and build number visible (e.g. in About or tauri.conf.json).

---

## 5. After launch

- **Monitoring**: Initially, no dedicated infra; rely on user feedback and errors shown in the app. If you add a crash reporter or anonymous metrics later, do it with consent and transparency.
- **Updates**: Plan a channel (site, GitHub Releases, or Tauri updater) to ship fixes.
- **Security**: If a key leak is reported, remind the user to revoke the key in OpenAI and create a new one.

---

## Summary

| Topic | Main action |
|-------|-------------|
| API keys | Never hardcoded; secure local storage; each user their own key. |
| Data | Clarify what is sent to OpenAI; no unnecessary sending. |
| Permissions | Microphone + shortcuts + clipboard; document why. |
| Build | `npm run tauri build`; macOS signature/notarization for wide distribution. |
| OpenAI | Account + key per user; costs and limits on them. |
| Before release | Code/config, build, user doc, license checklist. |

This guide can be extended over time (e.g. step-by-step notarization, updater config, sample privacy policy).
