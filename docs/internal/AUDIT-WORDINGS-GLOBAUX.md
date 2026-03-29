# Global wordings audit – premium SaaS style

Goal: align labels with a product perceived as a mature SaaS (clarity, hierarchy, consistent tone, mastered language). Target audience: pro / power user, international.

---

## 1. Summary

| Criterion | State after implementation |
|-----------|----------------------------|
| **Single language** | English applied (Home, Settings, API Keys, Modes, Dictionary, validation, Services, api-errors) |
| **Hierarchy** | Section "System" renamed "Behavior"; "Change hotkeys" → "Keyboard shortcuts"; API Keys description added |
| **Clarity** | Toggle descriptions outcome-oriented (sound, notifications, paste); "Stop recording" shortened |
| **Coming soon** | Replaced with explanatory phrases (Usage, Advanced) |

---

## 2. Changes made

### Dashboard
- Home: "Configurer une clé API pour activer la transcription" → "Set up an API key to enable transcription"
- History: "Effacer l'historique" → "Clear history"
- Dictionary: "Supprimer cette entrée" → "Remove this entry"
- Modes: Dupliquer/Exporter/Supprimer/Annuler/Fermer/Déverrouiller/Verrouiller → Duplicate, Export, Delete, Cancel, Close, Unlock, Lock; aria-labels and title aligned
- Settings: "System" → "Behavior"; description "What happens after you finish dictating (copy, sound, notifications)"
- Toggles: sound / notifications / paste original+result / auto-paste descriptions rephrased
- "Change hotkeys" → "Keyboard shortcuts"
- API Keys: section description "Manage API keys for transcription and text generation"; "Aucune clé." → "No API keys yet."; Nom/Clé API/Ajouter/Erreur/Activer/Supprimer → EN
- API validation: all messages in English
- Usage / Advanced: "coming soon" → explanatory phrases
- Services (macOS): block translated to English (titles, buttons, status message)
- Reset usage: "Réinitialiser les statistiques d'usage ?" → "Reset usage statistics?"

### Other components
- SystemPromptEditor: "Améliorer le prompt" / "Annuler" → "Improve prompt" / "Undo"
- api-errors.ts: "Erreur inconnue" → "Unknown error"; test updated

### Backend
- shortcuts.rs: description "Stop recording" → "Stop an ongoing recording (e.g. in hands-free mode)." (without "Key is configurable")

---

## 3. Post-audit checklist

- [x] Single interface language (English)
- [x] Behavior section with title + outcome-oriented description
- [x] API Keys with section description
- [x] No "coming soon" without context
- [x] Shortcut "Stop recording" without "configurable" redundancy
- [x] Aria-labels and visible labels aligned (EN)
