# Raccourcis clavier Ghosty

Audit des raccourcis globaux, scénarios utilisateur et guide pour les devs.

---

## Vue d’ensemble

| Raccourci (défaut) | Action | Type |
|-------------------|--------|------|
| `Ctrl+Space` | Push to talk | Maintenu |
| `Ctrl+Shift+Space` | Hands-free mode | Toggle |
| `Escape` | Stop recording | Press |
| `Ctrl+Shift+E` | Command Mode | Press |
| `Ctrl+Cmd+V` | Paste last transcript | Press |
| `Cmd+Shift+D` | Open Dashboard | Press |

Stockage : `app_data_dir()/shortcuts.json`. Chaque raccourci peut être activé/désactivé, modifié ou réinitialisé depuis **Settings > Shortcuts**.

---

## Audit par action

### 1. Push to talk

- **ID** : `push-to-talk`
- **Défaut** : `Ctrl+Space`
- **Comportement** : Maintenir la combinaison = enregistrement ; relâcher = arrêt + transcription.

**Scénarios utilisateur**

| Scénario | Étapes | Résultat attendu |
|----------|--------|-------------------|
| Dictée courte | Maintenir Ctrl+Space, parler une phrase, relâcher | Enregistrement démarre au press, s’arrête au release, transcription puis sortie (copie/notification selon préférences). |
| Annulation | Maintenir Ctrl+Space, relâcher sans parler | Pas de transcription utile ; pas d’erreur. |
| Conflit avec autre app | Même raccourci utilisé ailleurs | Risque de conflit ; l’utilisateur peut changer la combinaison dans Settings > Shortcuts. |

**Côté dev** : `ShortcutAction::PushToTalk` ; sur `Pressed` → `recording_started` + `hotkey::on_recording_start` ; sur `Released` → si en cours → `on_recording_stop` + `recording_stopped`.

---

### 2. Hands-free mode

- **ID** : `hands-free`
- **Défaut** : `Ctrl+Shift+Space`
- **Comportement** : Une pression = démarre l’enregistrement ; une seconde pression = arrête + transcription.

**Scénarios utilisateur**

| Scénario | Étapes | Résultat attendu |
|----------|--------|-------------------|
| Dictée longue | Ctrl+Shift+Space, parler, Ctrl+Shift+Space | Démarrage au 1er appui, arrêt + transcription au 2e. |
| Oubli d’arrêt | Lancer puis ne plus toucher au clavier | Enregistrement continue jusqu’à Stop recording (ex. Escape) ou timeout si configuré. |
| Utilisation avec Push to talk | Utiliser les deux selon le contexte | Les deux peuvent être actifs ; l’utilisateur choisit selon la longueur du passage. |

**Côté dev** : `ShortcutAction::ToggleRecording` ; à chaque `Pressed` : si en cours → stop, sinon → start.

---

### 3. Stop recording

- **ID** : `stop-recording`
- **Défaut** : `Escape`
- **Comportement** : Arrête un enregistrement en cours (Hands-free ou autre). N’a pas d’effet si aucun enregistrement.

**Scénarios utilisateur**

| Scénario | Étapes | Résultat attendu |
|----------|--------|-------------------|
| Arrêt propre en hands-free | Démarrer avec Ctrl+Shift+Space, parler, appuyer sur Escape | Enregistrement s’arrête, transcription lancée. |
| Pas d’enregistrement | Appuyer sur Escape sans avoir démarré | Aucun effet (pas d’erreur). |
| Raccourci personnalisé | Changer Escape pour une autre touche (ex. F12) | Même comportement avec la nouvelle touche. |

**Côté dev** : `ShortcutAction::StopRecording` ; sur `Pressed` : si `RecorderState::is_capturing()` → stop + `recording_stopped`. Touche `Space` seule interdite par défaut (migration vers `Escape` si ancienne config).

---

### 4. Command Mode

- **ID** : `command-mode`
- **Défaut** : `Ctrl+Shift+E`
- **Comportement** : Ouvre la fenêtre principale (Dashboard), la met au premier plan et associe le mode « Direct » (sélection de texte + demande à Ghosty).

**Scénarios utilisateur**

| Scénario | Étapes | Résultat attendu |
|----------|--------|-------------------|
| Depuis une autre app | Travailler dans un éditeur, Ctrl+Shift+E | Fenêtre Ghosty s’ouvre / passe au premier plan, prête pour sélection + action. |
| Workflow « sélection + transformation » | Ctrl+Shift+E, sélectionner du texte ailleurs, utiliser le mode Direct | L’utilisateur peut enchaîner avec le flux clic droit / Services ou le Dashboard. |
| Raccourci dédié à un autre mode | Créer un raccourci « Activate Mode » vers un autre mode (ex. Shape) | Même principe : ouverture + focus, mode cible différent. |

**Côté dev** : `ShortcutAction::ActivateMode { mode_id: "light" }` ; émet `activate-mode` avec le `mode_id`, puis `show` + `set_focus` sur la fenêtre `main`.

---

### 5. Paste last transcript

- **ID** : `paste-last-output`
- **Défaut** : `Ctrl+Cmd+V`
- **Comportement** : Copie la dernière sortie de transcription dans le presse-papier et déclenche un collage dans l’application focalisée (simulation Cmd+V).

**Scénarios utilisateur**

| Scénario | Étapes | Résultat attendu |
|----------|--------|-------------------|
| Coller la dernière dictée | Dicter (push-to-talk ou hands-free), puis Ctrl+Cmd+V dans un champ | Le texte transcrit est collé à la position du curseur. |
| Aucune dictée récente | Ctrl+Cmd+V sans avoir dicté | Aucun effet (pas de crash). |
| Plusieurs dictées | Dicter A, dicter B, Ctrl+Cmd+V | C’est la dernière (B) qui est collée. |

**Côté dev** : `ShortcutAction::PasteLastOutput` ; appelle `paste_last_output` : lit `LastOutputState`, copie dans le presse-papier, puis `clipboard::auto_paste()` (injection du collage).

---

### 6. Open Dashboard

- **ID** : `open-dashboard`
- **Défaut** : `Cmd+Shift+D`
- **Comportement** : Affiche la fenêtre principale, la déminimise si besoin et lui donne le focus.

**Scénarios utilisateur**

| Scénario | Étapes | Résultat attendu |
|----------|--------|-------------------|
| Accès rapide aux réglages | Depuis n’importe quelle app, Cmd+Shift+D | Dashboard Ghosty visible et focalisé. |
| Fenêtre minimisée | Minimiser le Dashboard, puis Cmd+Shift+D | Fenêtre revient au premier plan. |
| Depuis la barre flottante | Utiliser Cmd+Shift+D depuis le widget | Même comportement : une fenêtre unique « main ». |

**Côté dev** : `ShortcutAction::OpenDashboard` ; sur `main` : `show()`, `unminimize()`, `set_focus()`.

---

## Contraintes techniques (dev)

- **Touche Fn** : Non supportée pour les raccourcis globaux (macOS).
- **Space seule** : Refusée (bloquerait la frappe partout) ; utiliser au minimum une combinaison (ex. `Ctrl+Space`, `Option+Space`).
- **Unicité** : Une même combinaison ne peut pas être assignée à deux actions (vérification côté front + `check_shortcut_available` au save).
- **Enregistrement** : Au démarrage de l’app et après chaque modification (save/toggle/reset), les raccourcis sont re-enregistrés via `reregister_shortcuts` ; le mapping en mémoire est `ShortcutMappingState(id -> ShortcutConfig)`.

Fichiers principaux :

- Backend : `src-tauri/src/shortcuts.rs` (défauts, load/save, `keys_to_shortcut_string`), `src-tauri/src/lib.rs` (`run_shortcut_action`, enregistrement du plugin).
- Frontend : Settings Shortcuts dans `Dashboard.tsx` (liste, édition, toggle, reset), types dans `types/index.ts` (`ShortcutConfig`, `ShortcutAction`).

---

## Exemples de configuration

**Raccourcis laissés par défaut** (recommandé pour la plupart des utilisateurs) :

```
Push to talk       Ctrl+Space
Hands-free         Ctrl+Shift+Space
Stop recording     Escape
Command Mode       Ctrl+Shift+E
Paste last         Ctrl+Cmd+V
Open Dashboard     Cmd+Shift+D
```

**Éviter les conflits avec l’éditeur** (ex. VS Code) : remplacer `Ctrl+Shift+E` (Command Mode) par `Ctrl+Alt+E` ou `Cmd+Shift+E` si tu préfères tout en Cmd.

**Workflow « tout en Cmd »** (macOS) : par exemple Push to talk en `Cmd+Space` (attention possible conflit avec Spotlight) ou `Option+Space`.

---

## Référence rapide des actions backend

| Action | Event / effet |
|--------|----------------|
| `PushToTalk` | Pressed → start recording ; Released → stop si en cours |
| `ToggleRecording` | Pressed → toggle start/stop |
| `StartRecording` | Pressed → start (non utilisé dans les défauts) |
| `StopRecording` | Pressed → stop si en cours |
| `PasteLastOutput` | Pressed → copie + auto-paste dernière sortie |
| `OpenDashboard` | Pressed → show + focus fenêtre main |
| `ActivateMode { mode_id }` | Pressed → emit `activate-mode`, show + focus main |
| `ToggleFloatingBar` | Pressed → emit `toggle-floating-bar` (pas dans les défauts UI) |

Ce document peut être mis à jour à chaque ajout ou modification d’action dans `ShortcutAction` ou dans l’UI Shortcuts.
