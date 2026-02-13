# 🚀 Dictionary System - Quick Start

## Installation complète

Le système de dictionnaire est maintenant intégré à Ghosty. Voici ce qui a été ajouté :

### Backend (Rust)
- ✅ `src-tauri/src/dictionary.rs` - Module complet de gestion
- ✅ 6 nouvelles commandes Tauri exposées
- ✅ Intégration automatique avec l'API Whisper
- ✅ Persistance JSON dans AppData

### Frontend (React/TypeScript)
- ✅ `src/components/AddWordModal.tsx` - Modal d'ajout
- ✅ Vue Dictionary refactorisée dans `Dashboard.tsx`
- ✅ Recherche, import/export, suppression

### Dépendance ajoutée
```bash
# Dans src-tauri/Cargo.toml
chrono = "0.4"  # Pour les timestamps
```

## Compiler et tester

### 1. Installer Rust si besoin
```bash
# Si vous avez l'erreur "rustup could not choose a version"
rustup default stable
```

### 2. Compiler le backend
```bash
cd src-tauri
cargo build
```

### 3. Lancer l'application
```bash
cd ..
npm run tauri dev
```

## Utilisation rapide

### Ajouter votre premier mot

1. **Ouvrir l'app Ghosty**
2. **Aller dans "Dictionary"** (sidebar)
3. **Cliquer "Add Word"**
4. Remplir :
   - Word: `Tauri`
   - Type: `Framework`
   - Pronunciation: `tow-ree` (optionnel)
5. **Cliquer "Add to Dictionary"**

### Tester la transcription améliorée

1. **Dicter vocalement :**
   - Avant : "I'm using Tory for my app" ❌
   - Après : "I'm using Tauri for my app" ✅

2. **Vérifier que le mot est bien passé à Whisper :**
   - Ouvrir les DevTools Rust (`cargo run` en console)
   - Chercher le log de la requête Whisper
   - Le paramètre `prompt` devrait contenir vos mots

## Exemples d'utilisation

### Développeur Rust
```typescript
await invoke("add_dictionary_entry", {
  word: "tokio",
  entryType: "Framework",
  pronunciation: "toh-kee-oh",
  misspellings: ["tokyo"]  // optionnel
});

await invoke("update_dictionary_entry", { id, word, entryType, pronunciation?, misspellings? });

await invoke("add_dictionary_entry", {
  word: "actix",
  entryType: "Framework"
});
```

### Designer UI/UX
```typescript
await invoke("add_dictionary_entry", {
  word: "Figma",
  entryType: "Service"
});

await invoke("add_dictionary_entry", {
  word: "shadcn",
  entryType: "Framework",
  pronunciation: "shad-see-en"
});
```

### Entreprise
```typescript
await invoke("add_dictionary_entry", {
  word: "Acme Corp",
  entryType: "Company"
});

await invoke("add_dictionary_entry", {
  word: "Guillaume",
  entryType: "Person",
  pronunciation: "ghee-yohm"
});
```

## Import/Export

### Exporter votre dictionnaire
```bash
1. Cliquer "Export" dans Dictionary
2. Fichier téléchargé : ghosty-dictionary-{timestamp}.json
```

### Partager avec l'équipe
```bash
# Envoyer le JSON par email/Slack
# Chaque membre clique "Import" dans Ghosty
# → Dictionnaire synchronisé !
```

## Commandes API disponibles

```typescript
// Lire toutes les entrées
const entries = await invoke<DictionaryEntry[]>("get_dictionary_entries");

// Ajouter une entrée
const entry = await invoke<DictionaryEntry>("add_dictionary_entry", {
  word: "React",
  entryType: "Framework",
  pronunciation: "ree-act"
});

// Mettre à jour
const updated = await invoke<DictionaryEntry>("update_dictionary_entry", {
  id: "uuid-here",
  word: "ReactJS",
  entryType: "Framework"
});

// Supprimer
await invoke("delete_dictionary_entry", { id: "uuid-here" });

// Export JSON
const json = await invoke<string>("export_dictionary_entries");

// Import
const updated = await invoke<DictionaryEntry[]>("import_dictionary_entries", {
  entries: [
    { id: "", word: "Vue", type: "Framework", created_at: Date.now() }
  ]
});
```

## Dépannage

### L'app ne compile pas
```bash
# Vérifier que Rust est installé
rustup --version

# Installer stable si besoin
rustup default stable

# Nettoyer et recompiler
cd src-tauri
cargo clean
cargo build
```

### Les mots ne sont pas mieux transcrits
1. Vérifier que le mot est bien dans le dictionnaire
2. Tester avec un mot très différent phonétiquement
3. Ajouter une prononciation phonétique
4. Vérifier les logs Rust pour voir le prompt envoyé

### Le fichier dictionary.json
```bash
# macOS
~/Library/Application Support/com.ghosty.app/dictionary.json

# Windows
%APPDATA%/com.ghosty.app/dictionary.json

# Linux
~/.config/com.ghosty.app/dictionary.json
```

## Vérifier que les ajouts influencent les réponses

1. **Avant** : dicte une phrase avec le mot (ex. « Guillaume part en meeting ») et note ce que Whisper transcrit.
2. **Ajoute** le mot au dictionnaire (ex. « Guillaume »).
3. **Après** : redicte la même phrase et compare le résultat dans l’historique (Home).
4. Si le mot reste mal reconnu : ajoute des **variantes** (orthographes alternatives) ou vérifie que la langue de transcription correspond à ta voix.

## Cas limites et compromis

- **Taille du prompt** : Whisper limite la longueur du `prompt`. Beaucoup de mots → seuls les premiers sont pris en compte. Priorise les termes les plus utiles.
- **Langue** : le dictionnaire aide surtout si la langue de transcription (Settings) est cohérente avec ta voix. Un mot en anglais dans une phrase en français peut être moins bien reconnu.
- **Noms propres vs mots communs** : les noms (Guillaume, Tauri, Figma) profitent le plus. Les mots déjà bien reconnus par Whisper ne changent guère.
- **Pas d’alias type « btw → by the way »** : Ghosty envoie une liste de termes pour *biaiser* la reconnaissance, pas des paires remplacement → expansion. Pour une abréviation, ajoute les deux comme entrées séparées si besoin (ex. « btw » et « by the way »).
- **Données locales** : le dictionnaire est stocké en local (AppData). Pas de partage d’équipe intégré ; utilise Export/Import pour partager le JSON.

## Prochaines étapes

1. **Ajouter vos termes fréquents** (frameworks, noms d'entreprise, etc.)
2. **Tester la transcription** avec ces mots
3. **Exporter et partager** avec votre équipe
4. **Consulter DICTIONARY-SYSTEM.md** pour les détails techniques
