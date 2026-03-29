# Documentation / code verification – Gap summary

**Date**: 2026-02-13  
**Goal**: Align remaining docs with current code and app vision.

**Updates applied**: README (4 modes), DICTIONARY-SYSTEM (misspellings + API), STRATEGIE (sound/notif implemented), MANUAL-TESTING-GUIDE (sections 4–6), SHORTCUTS-SYSTEM-COMPLETE (current state + sections), GHOSTY-MODES-METHODOLOGY (code alignment + built-ins), DICTIONARY-QUICKSTART (misspellings/update examples).

---

## 1. Identified gaps

| Doc | Gap | Severity |
|-----|-----|----------|
| **DICTIONARY-SYSTEM.md** | `DictionaryEntry` does not mention `misspellings`. API `add_dictionary_entry` accepts `misspellings` (optional). | Medium |
| **DICTIONARY-QUICKSTART.md** | `add_dictionary_entry` examples without `misspellings`. `import_dictionary_entries` expects `entries: Vec<DictionaryEntry>` (with `type` / `entry_type` per serialization). | Low |
| **SHORTCUTS-SYSTEM-COMPLETE.md** | Default shortcuts: doc says "Cmd+Shift+Space", "Cmd+Shift+D". Code has `Ctrl+Space` (PushToTalk), `Ctrl+Shift+Space` (ToggleRecording), plus Paste last, Command mode, etc. Settings sections: "Transcription", "LLM Settings" → in reality a single **Models** section. Missing actions: PushToTalk, ToggleRecording, PasteLastOutput. | Medium |
| **GHOSTY-MODES-METHODOLOGY.md** | Mode template with `category` and `prompt`; code has `systemPrompt` (no `category`). Actual built-in modes: **Direct** (light), **Shape** (medium), **Reframe** (strong), **Build** (full) – not "Prompt Enhancer (Dense)" etc. Doc is methodology (reference for designing modes), not an exact UI reflection. | Low if clarified |
| **STRATEGIE-IMPLEMENTATION-FONCTIONNALITES.md** | Describes sound and notification plan as "to do". In code, `sound_on_complete` and `system_notification` are **already wired** (audio.rs, lib.rs). Strategy is largely implemented. | Medium |
| **README (root)** | "5 built-in modes: Hands-off, Light edit, Shape, Reframe, Build". Code has **4** modes: **Direct**, Shape, Reframe, Build. "Hands-off" / "Light edit" do not match current names (Direct = your words, light formatting). | Medium |
| **SERVICES-CLIC-DROIT-MACOS.md** | Already up to date: states feature is pending and `ENABLE_RIGHT_CLICK_SERVICES` is `false`. | OK |
| **PRODUCTION-READINESS.md** | Consistent with code (security, keychain, build). | OK |
| **QUICKSTART.md** | Recently updated (in-app key, OpenAI data, download). | OK |
| **UI-RULES.md** | References `uiClasses` and patterns; still valid. | OK |

---

## 2. Recommendations to align documentation

### 2.1 Priority updates

1. **README (root)**  
   - Replace the list of 5 modes with the **4** actual modes: **Direct**, **Shape**, **Reframe**, **Build**, with a short description (e.g. Direct = your words, light formatting; Shape = structure and polish; etc.).

2. **SHORTCUTS-SYSTEM-COMPLETE.md**  
   - Default shortcuts: document those defined in `shortcuts.rs` (PushToTalk Ctrl+Space, ToggleRecording Ctrl+Shift+Space, etc.) and note that on macOS the UI may show Cmd per mapping.
   - Settings sections: replace "Transcription" and "LLM Settings" with **Models** (one section).
   - Add missing actions: PushToTalk, ToggleRecording, PasteLastOutput.

3. **DICTIONARY-SYSTEM.md**  
   - In `DictionaryEntry` structure, add `misspellings: Vec<String>`.
   - In `add_dictionary_entry` parameters, mention `misspellings` (optional).

4. **STRATEGIE-IMPLEMENTATION-FONCTIONNALITES.md**  
   - At the top or in conclusion: state that **sound and notification are implemented** (backend emits `play_completion_sound`, reads prefs `sound_on_complete` and `system_notification`). Rest of doc remains useful as a pattern reference.

### 2.2 Useful clarifications (optional)

6. **GHOSTY-MODES-METHODOLOGY.md**  
   - In introduction: state that the doc describes the **methodology** for designing modes (magic keywords, categories) and that **current built-in modes** in the app are Direct, Shape, Reframe, Build (defined in `modes.rs`). The template's `category` field does not exist in `ModeConfig`; the described prompt corresponds to `systemPrompt`.

7. **DICTIONARY-QUICKSTART.md**  
   - In API call examples, optionally add `misspellings` when relevant (spelling variants).

---

## 3. Summary

- **Up to date**: QUICKSTART, PRODUCTION-READINESS, SERVICES-CLIC-DROIT (with "pending" note), UI-RULES.
- **Gaps to fix**: README (modes), SHORTCUTS-SYSTEM-COMPLETE (defaults + sections), DICTIONARY-SYSTEM (misspellings), STRATEGIE (sound/notif implemented).
- **Recommended clarifications**: GHOSTY-MODES-METHODOLOGY (methodology vs actual built-ins), DICTIONARY-QUICKSTART (misspellings in examples).

Applying the updates in section 2.1 will align the remaining documentation with the current code and application vision.
