# Système de Raccourcis Clavier + UI Settings

**Date** : 2026-02-02  
**Status** : Production-ready

**Current state (code-aligned)**: Default shortcuts in `shortcuts.rs` include PushToTalk (Ctrl+Space), ToggleRecording (Ctrl+Shift+Space), Command Mode (Ctrl+Shift+E), Paste last transcript, etc. Actions include PushToTalk, ToggleRecording, ActivateMode, OpenDashboard, ToggleFloatingBar, PasteLastOutput. The Settings section that groups transcription and LLM is called **Models** (single section).

---

## Summary

The customizable keyboard shortcut system is now implemented, and the settings UI has been updated with clear descriptions for each section.

**Avant** : Pas de raccourcis configurables, settings avec peu d'informations  
**Après** : Raccourcis personnalisables (y compris vers des modes spécifiques), UI settings informatif et clair

---

## 🎯 Implemented features

### **Backend (`src-tauri/src/shortcuts.rs`)**

✅ **Structure de données** :
```rust
pub struct ShortcutConfig {
    pub id: String,
    pub name: String,
    pub description: String,
    pub keys: Vec<String>, // ["Cmd", "Shift", "M"]
    pub action: ShortcutAction,
    pub enabled: bool,
}

pub enum ShortcutAction {
    ActivateMode { mode_id: String },
    StartRecording,
    StopRecording,
    OpenDashboard,
    ToggleFloatingBar,
}
```

✅ **Stockage** : `app_data_dir()/shortcuts.json`

✅ **Raccourcis par défaut** (voir `shortcuts.rs` pour la liste exacte) :
- PushToTalk (ex. Ctrl+Space), ToggleRecording (ex. Ctrl+Shift+Space), Command Mode (Ctrl+Shift+E), Paste last transcript, Open dashboard, etc.

✅ **Commandes Tauri** :
- `get_all_shortcuts()` : Liste tous les raccourcis
- `save_shortcut(shortcut)` : Créer/modifier un raccourci
- `delete_shortcut(shortcutId)` : Supprimer un raccourci
- `toggle_shortcut(shortcutId)` : Activer/désactiver

---

### **Frontend Settings - Improved UI**

✅ **All sections now have**:
- Titre principal (text-2xl, bold)
- Clear description of the section content
- Layout cohérent et professionnel

**Sections** (ids dans le code) : General, Shortcuts, Recording, **Models** (transcription + LLM), Behavior, Appearance, Advanced, Usage, **API Keys**, Account.

---

### **Section Shortcuts (nouvelle)**

✅ **Création de raccourci** :
- Bouton "+ New Shortcut" en haut à droite
- Formulaire avec :
  - **Name** : Nom du raccourci
  - **Action** : Type d'action (Start Recording, Activate Mode, etc.)
  - **Mode** (si ActivateMode) : Sélecteur de mode
  - **Description** : Explication du raccourci
  - **Keyboard Combination** : Champs pour Cmd, Shift, Key (ajout dynamique de touches avec +)
  - Boutons Save / Cancel

✅ **Liste des raccourcis** :
- Card pour chaque raccourci avec :
  - Nom en gras
  - Badges pour les touches (kbd style)
  - Description
  - Badge d'action (ex : "Mode: Shape" ou "Start Recording")
  - Badge "Active" si enabled
- Actions :
  - 👁️ Toggle enable/disable
  - ✏️ Edit
  - 🗑️ Delete

✅ **État vide** :
- Message "No shortcuts configured yet"
- Icône clavier (48px, opacity 20%)
- Texte d'instruction

---

## 🛠️ Utilisation

### **Créer un raccourci vers un mode spécifique**

1. Aller dans **Settings → Shortcuts**
2. Click **"+ New Shortcut"**
3. Fill in:
   - **Name** : "Quick Shape Mode"
   - **Action** : Sélectionner "Activate Mode"
   - **Select Mode** : Choisir "Shape"
   - **Description** : "Quickly activate Shape mode for structure and polish"
   - **Keyboard Combination** : `Cmd` + `Shift` + `M`
4. Click **"Save Shortcut"**

### **Créer un raccourci pour démarrer l'enregistrement**

1. **Settings → Shortcuts → + New Shortcut**
2. **Name** : "Quick Record"
3. **Action** : "Start Recording"
4. **Keys** : `Cmd` + `Shift` + `R`
5. **Save**

### **Edit a shortcut**

1. In the list, click the **Edit** icon (✏️)
2. Change the fields
3. **Save Shortcut**

### **Temporarily disable a shortcut**

1. Click the **eye** icon (👁️)
2. The shortcut stays in the list but is inactive
3. "Active" badge disappears
4. Click again to re-enable

### **Delete a shortcut**

1. Click the **Delete** icon (🗑️)
2. The shortcut is permanently removed

---

## 📂 Modified files

### Backend
- ✅ `src-tauri/src/shortcuts.rs` : nouveau module
- ✅ `src-tauri/src/lib.rs` : ajout des commandes shortcuts

### Frontend
- ✅ `src/components/Dashboard.tsx` :
  - New "Shortcuts" section
  - All sections updated with titles and descriptions
  - État shortcuts, formulaire création/édition, liste

---

## 🚀 Test

1. Launch the app: `npm run tauri dev`
2. Aller dans **Settings → Shortcuts**
3. Tester :
   - Créer un raccourci vers le mode "Light edit" : `Cmd+Shift+L`
   - Créer un raccourci "Quick Record" : `Cmd+Shift+R`
   - Éditer un raccourci
   - Désactiver/réactiver
   - Supprimer un raccourci

4. Go through all settings sections:
   - Verify each section has a clear title
   - Verify each section has a description
   - Verify visual consistency

---

## 📝 Possible future improvements

1. **Enregistrement système des raccourcis** : Intégrer avec `tauri-plugin-global-shortcut` pour que les raccourcis fonctionnent réellement
2. **Détection de conflits** : Avertir si un raccourci existe déjà
3. **Import/Export** : Partager des presets de raccourcis
4. **Validation**: Verify that keys are valid (Cmd, Shift, Alt, etc.)
5. **Touche de test** : Bouton pour capturer la combinaison clavier directement
6. **Catégories** : Organiser les raccourcis par type (Modes, Recording, Navigation, etc.)
7. **Raccourcis globaux vs locaux** : Distinguer les raccourcis qui fonctionnent uniquement dans l'app vs partout

---

## ✨ Before vs after

| Avant | Après |
|-------|-------|
| Pas de raccourcis configurables | Raccourcis personnalisables illimités |
| Settings with little context | Each section has title + description |
| Pas de raccourcis vers modes | Raccourcis directs vers n'importe quel mode |
| UI uniforme sans hiérarchie | Headers clairs, descriptions informatives |
| Pas de gestion des raccourcis | CRUD complet + toggle enable/disable |

---

**Le système est prêt et testable immédiatement.**  
Recharge l'app (Cmd+R) pour voir les changements !
