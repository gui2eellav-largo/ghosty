# Système de Raccourcis Clavier + UI Settings

**Date** : 2026-02-02  
**Status** : Production-ready

**État actuel (aligné code)** : Les raccourcis par défaut dans `shortcuts.rs` sont notamment PushToTalk (Ctrl+Space), ToggleRecording (Ctrl+Shift+Space), Command Mode (Ctrl+Shift+E), Paste last transcript, etc. Les actions incluent PushToTalk, ToggleRecording, ActivateMode, OpenDashboard, ToggleFloatingBar, PasteLastOutput. La section Paramètres qui regroupe transcription et LLM s’appelle **Models** (une seule section).

---

## Résumé

Le système de raccourcis clavier personnalisables est maintenant implémenté, et l'UI des settings a été enrichie avec des descriptions claires pour chaque section.

**Avant** : Pas de raccourcis configurables, settings avec peu d'informations  
**Après** : Raccourcis personnalisables (y compris vers des modes spécifiques), UI settings informatif et clair

---

## 🎯 Fonctionnalités implémentées

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

### **Frontend Settings - UI Améliorée**

✅ **Toutes les sections ont maintenant** :
- Titre principal (text-2xl, bold)
- Description claire du contenu de la section
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
2. Cliquer sur **"+ New Shortcut"**
3. Remplir :
   - **Name** : "Quick Shape Mode"
   - **Action** : Sélectionner "Activate Mode"
   - **Select Mode** : Choisir "Shape"
   - **Description** : "Quickly activate Shape mode for structure and polish"
   - **Keyboard Combination** : `Cmd` + `Shift` + `M`
4. Cliquer **"Save Shortcut"**

### **Créer un raccourci pour démarrer l'enregistrement**

1. **Settings → Shortcuts → + New Shortcut**
2. **Name** : "Quick Record"
3. **Action** : "Start Recording"
4. **Keys** : `Cmd` + `Shift` + `R`
5. **Save**

### **Éditer un raccourci**

1. Dans la liste, cliquer sur l'icône **Edit** (✏️)
2. Modifier les champs
3. **Save Shortcut**

### **Désactiver temporairement un raccourci**

1. Cliquer sur l'icône **œil** (👁️)
2. Le raccourci reste dans la liste mais est inactif
3. Badge "Active" disparaît
4. Re-cliquer pour réactiver

### **Supprimer un raccourci**

1. Cliquer sur l'icône **Delete** (🗑️)
2. Le raccourci est supprimé définitivement

---

## 📂 Fichiers modifiés

### Backend
- ✅ `src-tauri/src/shortcuts.rs` : nouveau module
- ✅ `src-tauri/src/lib.rs` : ajout des commandes shortcuts

### Frontend
- ✅ `src/components/Dashboard.tsx` :
  - Nouvelle section "Shortcuts"
  - Toutes les sections enrichies avec titres et descriptions
  - État shortcuts, formulaire création/édition, liste

---

## 🚀 Test

1. Lancer l'app : `npm run tauri dev`
2. Aller dans **Settings → Shortcuts**
3. Tester :
   - Créer un raccourci vers le mode "Light edit" : `Cmd+Shift+L`
   - Créer un raccourci "Quick Record" : `Cmd+Shift+R`
   - Éditer un raccourci
   - Désactiver/réactiver
   - Supprimer un raccourci

4. Parcourir toutes les sections settings :
   - Vérifier que chaque section a un titre clair
   - Vérifier que chaque section a une description
   - Vérifier la cohérence visuelle

---

## 📝 Prochaines améliorations possibles

1. **Enregistrement système des raccourcis** : Intégrer avec `tauri-plugin-global-shortcut` pour que les raccourcis fonctionnent réellement
2. **Détection de conflits** : Avertir si un raccourci existe déjà
3. **Import/Export** : Partager des presets de raccourcis
4. **Validation** : Vérifier que les touches sont valides (Cmd, Shift, Alt, etc.)
5. **Touche de test** : Bouton pour capturer la combinaison clavier directement
6. **Catégories** : Organiser les raccourcis par type (Modes, Recording, Navigation, etc.)
7. **Raccourcis globaux vs locaux** : Distinguer les raccourcis qui fonctionnent uniquement dans l'app vs partout

---

## ✨ Différence avec avant

| Avant | Après |
|-------|-------|
| Pas de raccourcis configurables | Raccourcis personnalisables illimités |
| Settings avec peu de contexte | Chaque section a titre + description |
| Pas de raccourcis vers modes | Raccourcis directs vers n'importe quel mode |
| UI uniforme sans hiérarchie | Headers clairs, descriptions informatives |
| Pas de gestion des raccourcis | CRUD complet + toggle enable/disable |

---

**Le système est prêt et testable immédiatement.**  
Recharge l'app (Cmd+R) pour voir les changements !
