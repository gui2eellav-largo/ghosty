# Manual testing guide (production-ready front)

## Starting the app

```bash
npm run tauri:dev
```

---

## 1. Settings / Modal

- Open settings (button or designated shortcut).
- **Escape**: Escape key closes the modal.
- **Focus**: On open, focus goes to the first focusable element; when tabbing, focus stays inside the modal (not behind it).
- **Close**: On close, focus returns to the element that opened the modal.
- **Screen reader**: The modal is announced as a dialog (title "Preferences").

## 2. Voice button (VoiceButton)

- **States**: idle → click → recording → processing → success/error.
- **Accessibility**: The button has a label that changes with state (e.g. "Start voice input", "Recording…", "Processing…").
- **Shortcut**: If a shortcut is shown (e.g. ⌥Space), it remains readable on screen.

## 3. Waveform (LiveWaveform)

- While **recording**, bars react to the microphone.
- While **processing**, a "processing" style animation (or static if "reduce motion" preference is on).
- **Reduce motion**: In system accessibility settings, enable "Reduce motion" and verify that the processing animation is reduced or static.

## 4. Modes (Dashboard)

- Change mode, create one, duplicate, reorder (arrows), import/export.
- After a mode update (or `modes-updated` event), verify the list reloads correctly.

## 5. Dictionary

- Open the add-word modal, fill it, save.
- Verify the word appears and no error like `entryType`/`pronunciation` is shown.

## 6. Build and automated tests

```bash
npm run build
npm run test
npm run lint
```

All should pass (build OK, 14 tests, 0 lint errors).
