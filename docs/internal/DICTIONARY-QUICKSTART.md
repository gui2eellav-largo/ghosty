# 🚀 Dictionary System - Quick Start

## Full installation

The dictionary system is now integrated into Ghosty. Here is what was added:

### Backend (Rust)
- ✅ `src-tauri/src/dictionary.rs` - Full management module
- ✅ 6 new Tauri commands exposed
- ✅ Automatic integration with Whisper API
- ✅ JSON persistence in AppData

### Frontend (React/TypeScript)
- ✅ `src/components/AddWordModal.tsx` - Add-word modal
- ✅ Dictionary view refactored in `Dashboard.tsx`
- ✅ Search, import/export, delete

### Added dependency
```bash
# In src-tauri/Cargo.toml
chrono = "0.4"  # For timestamps
```

## Build and test

### 1. Install Rust if needed
```bash
# If you get "rustup could not choose a version"
rustup default stable
```

### 2. Build the backend
```bash
cd src-tauri
cargo build
```

### 3. Launch the application
```bash
cd ..
npm run tauri dev
```

## Quick usage

### Add your first word

1. **Open the Ghosty app**
2. **Go to "Dictionary"** (sidebar)
3. **Click "Add Word"**
4. Fill in:
   - Word: `Tauri`
   - Type: `Framework`
   - Pronunciation: `tow-ree` (optional)
5. **Click "Add to Dictionary"**

### Test improved transcription

1. **Dictate:**
   - Before: "I'm using Tory for my app" ❌
   - After: "I'm using Tauri for my app" ✅

2. **Verify the word is passed to Whisper:**
   - Open Rust DevTools (`cargo run` in console)
   - Find the Whisper request log
   - The `prompt` parameter should contain your words

## Usage examples

### Rust developer
```typescript
await invoke("add_dictionary_entry", {
  word: "tokio",
  entryType: "Framework",
  pronunciation: "toh-kee-oh",
  misspellings: ["tokyo"]  // optional
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
1. Click "Export" in Dictionary
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

// Add an entry
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

## Troubleshooting

### L'app ne compile pas
```bash
# Verify Rust is installed
rustup --version

# Installer stable si besoin
rustup default stable

# Nettoyer et recompiler
cd src-tauri
cargo clean
cargo build
```

### Les mots ne sont pas mieux transcrits
1. Verify the word is in the dictionary
2. Tester avec un mot très différent phonétiquement
3. Add a phonetic pronunciation
4. Check Rust logs to see the prompt sent

### Le fichier dictionary.json
```bash
# macOS
~/Library/Application Support/com.ghosty.app/dictionary.json

# Windows
%APPDATA%/com.ghosty.app/dictionary.json

# Linux
~/.config/com.ghosty.app/dictionary.json
```

## Verify that additions affect results

1. **Before**: Dictate a sentence with the word (e.g. "Guillaume part en meeting") and note what Whisper transcribes.
2. **Add** the word to the dictionary (e.g. "Guillaume").
3. **After**: Dictate the same sentence again and compare the result in history (Home).
4. If the word is still misrecognized: add **variants** (alternative spellings) or check that the transcription language matches your voice.

## Edge cases and trade-offs

- **Prompt size**: Whisper limits `prompt` length. Many words → only the first are used. Prioritize the most useful terms.
- **Language**: The dictionary helps most when the transcription language (Settings) matches your voice. An English word in a French sentence may be recognized less well.
- **Proper nouns vs common words**: Names (e.g. Guillaume, Tauri, Figma) benefit most. Words already well recognized by Whisper change little.
- **No "btw → by the way" style aliases**: Ghosty sends a list of terms to *bias* recognition, not replacement→expansion pairs. For an abbreviation, add both as separate entries if needed (e.g. "btw" and "by the way").
- **Local data**: The dictionary is stored locally (AppData). No built-in team sharing; use Export/Import to share the JSON.

## Next steps

1. **Add your frequent terms** (frameworks, company names, etc.)
2. **Test transcription** with these words
3. **Export and share** with your team
4. **See DICTIONARY-SYSTEM.md** for technical details
