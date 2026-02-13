# Audit des wordings globaux – style SaaS premium

Objectif : aligner les libellés sur un produit perçu comme un SaaS mature (clarté, hiérarchie, ton cohérent, une langue maîtrisée). Lecture cible : utilisateur pro / power user, international.

---

## 1. Synthèse

| Critère | État après implémentation |
|--------|----------------------------|
| **Langue unique** | Anglais appliqué (Home, Settings, API Keys, Modes, Dictionary, validation, Services, api-errors) |
| **Hiérarchie** | Section "System" renommée "Behavior" ; "Change hotkeys" → "Keyboard shortcuts" ; description API Keys ajoutée |
| **Clarté** | Descriptions toggles orientées résultat (son, notifications, paste) ; "Stop recording" raccourcie |
| **Coming soon** | Remplacés par des phrases explicatives (Usage, Advanced) |

---

## 2. Modifications effectuées

### Dashboard
- Home : "Configurer une clé API pour activer la transcription" → "Set up an API key to enable transcription"
- Historique : "Effacer l'historique" → "Clear history"
- Dictionary : "Supprimer cette entrée" → "Remove this entry"
- Modes : Dupliquer/Exporter/Supprimer/Annuler/Fermer/Déverrouiller/Verrouiller → Duplicate, Export, Delete, Cancel, Close, Unlock, Lock ; aria-labels et title alignés
- Paramètres : "System" → "Behavior" ; description "What happens after you finish dictating (copy, sound, notifications)"
- Toggles : descriptions son / notifications / paste original+result / auto-paste reformulées
- "Change hotkeys" → "Keyboard shortcuts"
- API Keys : section description "Manage API keys for transcription and text generation" ; "Aucune clé." → "No API keys yet." ; Nom/Clé API/Ajouter/Erreur/Activer/Supprimer → EN
- Validation API : tous les messages en anglais
- Usage / Advanced : "coming soon" → phrases explicatives
- Services (macOS) : bloc traduit en anglais (titres, boutons, message de statut)
- Reset usage : "Réinitialiser les statistiques d'usage ?" → "Reset usage statistics?"

### Autres composants
- SystemPromptEditor : "Améliorer le prompt" / "Annuler" → "Improve prompt" / "Undo"
- api-errors.ts : "Erreur inconnue" → "Unknown error" ; test mis à jour

### Backend
- shortcuts.rs : description "Stop recording" → "Stop an ongoing recording (e.g. in hands-free mode)." (sans "Key is configurable")

---

## 3. Checklist post-audit

- [x] Une seule langue d’interface (anglais)
- [x] Section Behavior avec titre + description orientée résultat
- [x] API Keys avec description de section
- [x] Pas de "coming soon" sans contexte
- [x] Shortcut "Stop recording" sans redondance "configurable"
- [x] Aria-labels et libellés visibles alignés (EN)
