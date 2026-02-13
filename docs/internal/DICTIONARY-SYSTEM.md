# 📖 Système de Dictionnaire Ghosty

## Vue d'ensemble

Le système de dictionnaire permet d'améliorer la précision de la transcription Whisper en ajoutant des termes personnalisés (acronymes, noms propres, termes techniques) qui seront mieux reconnus lors de la dictée vocale.

## Architecture

### Backend (Rust)

#### `src-tauri/src/dictionary.rs`

Module principal de gestion du dictionnaire avec :

**Structures de données :**
```rust
pub struct DictionaryEntry {
    pub id: String,
    pub word: String,
    pub entry_type: String,
    pub pronunciation: Option<String>,
    pub misspellings: Vec<String>,  // variantes / fautes courantes pour Whisper
    pub created_at: i64,
}
```

**Fonctionnalités :**
- ✅ Persistance JSON dans `AppData/ghosty/dictionary.json`
- ✅ CRUD complet (Create, Read, Update, Delete)
- ✅ Détection des doublons
- ✅ Import/Export JSON
- ✅ Génération de prompt Whisper

**Commandes Tauri exposées :**
```rust
get_dictionary_entries() -> Vec<DictionaryEntry>
add_dictionary_entry(word, entry_type, pronunciation?, misspellings?) -> DictionaryEntry
update_dictionary_entry(id, word?, entry_type?, pronunciation?, misspellings?) -> DictionaryEntry
delete_dictionary_entry(id) -> ()
import_dictionary_entries(entries) -> Vec<DictionaryEntry>
export_dictionary_entries() -> String
```

#### Intégration Whisper

Le dictionnaire est automatiquement injecté dans les requêtes Whisper via le paramètre `prompt` :

```rust
// src-tauri/src/transcribe.rs (ligne 64)
let dict_prompt = crate::dictionary::build_whisper_prompt(app);
if !dict_prompt.is_empty() {
    form = form.text("prompt", dict_prompt);
}
```

**Format du prompt :** `"Tauri, Rust, ElevenLabs, ..."`

Cela guide l'API Whisper pour reconnaître ces mots spécifiques avec plus de précision.

### Frontend (TypeScript/React)

#### `src/components/AddWordModal.tsx`

Modal de création/ajout d'entrées avec :
- ✅ Validation des champs requis
- ✅ Types prédéfinis : Framework, Language, Service, Person, Company, Technology, Custom
- ✅ Support de la prononciation phonétique (optionnel)
- ✅ Gestion des erreurs avec feedback visuel
- ✅ Design cohérent avec le reste de l'app

#### `src/components/Dashboard.tsx` (Vue Dictionary)

Interface complète de gestion :
- ✅ Liste dynamique des entrées
- ✅ Recherche en temps réel (par mot ou type)
- ✅ Import/Export JSON
- ✅ Statistiques (nombre d'entrées)
- ✅ État vide avec CTA
- ✅ Suppression avec confirmation
- ✅ Affichage de la prononciation

**États React :**
```typescript
const [dictionaryEntries, setDictionaryEntries] = useState<DictionaryEntry[]>([]);
const [isAddWordModalOpen, setIsAddWordModalOpen] = useState(false);
const [searchQuery, setSearchQuery] = useState("");
```

## Flux de données

```
1. User clicks "Add Word"
   ↓
2. AddWordModal opens
   ↓
3. User fills form + submits
   ↓
4. invoke("add_dictionary_entry", { word, entryType, pronunciation })
   ↓
5. Rust: dictionary::add_entry() → save to dictionary.json
   ↓
6. Return DictionaryEntry to frontend
   ↓
7. Update React state → UI refreshes
   ↓
8. Next recording → Whisper API receives prompt with all dictionary words
```

## Utilisation

### Ajouter un mot

1. Aller dans l'onglet "Dictionary"
2. Cliquer sur "Add Word"
3. Remplir :
   - Word : `Tauri` (requis)
   - Type : `Framework` (requis)
   - Pronunciation : `tow-ree` (optionnel)
4. Cliquer sur "Add to Dictionary"

### Rechercher

Utiliser la barre de recherche pour filtrer par mot ou type.

### Import/Export

**Export :**
1. Cliquer sur "Export"
2. Télécharge `ghosty-dictionary-{timestamp}.json`

**Import :**
1. Cliquer sur "Import"
2. Sélectionner un fichier JSON contenant `DictionaryEntry[]`
3. Les doublons sont ignorés automatiquement

**Format JSON :**
```json
[
  {
    "id": "uuid-v4",
    "word": "Tauri",
    "type": "Framework",
    "pronunciation": "tow-ree",
    "created_at": 1738540800
  }
]
```

## Améliorations futures possibles

### Phase 2
- [ ] Édition inline des entrées
- [ ] Réorganisation par drag & drop
- [ ] Catégories personnalisées extensibles
- [ ] Statistiques d'utilisation (combien de fois un mot a été utilisé)
- [ ] Suggestions automatiques basées sur les erreurs de transcription

### Phase 3
- [ ] Synchronisation cloud (optionnelle)
- [ ] Partage de dictionnaires communautaires
- [ ] Support multi-langues avec détection automatique
- [ ] API pour importer depuis des sources externes (GitHub, documentation)
- [ ] Mode d'apprentissage automatique (ajout automatique de nouveaux termes)

### Phase 4
- [ ] Intégration avec la correction orthographique
- [ ] Contexte sémantique (phrases types associées aux mots)
- [ ] Support des abréviations avec expansion automatique
- [ ] Templates de dictionnaires par domaine (médical, juridique, technique, etc.)

## Notes techniques

### Sécurité
- ✅ Pas de SQL injection (stockage JSON)
- ✅ Validation côté backend ET frontend
- ✅ Confirmation avant suppression

### Performance
- ✅ Chargement lazy des entrées
- ✅ Recherche côté client (filtrage React)
- ✅ Pas de requête API à chaque frappe

### Limitations actuelles
- Max 1000 caractères pour le prompt Whisper (API OpenAI)
- Pas de support des homophones
- Pas de gestion des accents/diacritiques spécifiques

## Dépendances ajoutées

### Rust (Cargo.toml)
```toml
chrono = "0.4"  # Pour les timestamps created_at
uuid = { version = "1", features = ["v4"] }  # Déjà présent
```

### TypeScript
Aucune nouvelle dépendance - utilisation des bibliothèques existantes (React, Tauri).

## Tests recommandés

1. ✅ Ajouter un mot simple : "Rust" → Type: "Language"
2. ✅ Tenter d'ajouter un doublon → Erreur attendue
3. ✅ Rechercher "rust" → Doit trouver "Rust" (case insensitive)
4. ✅ Supprimer une entrée → Confirmation requise
5. ✅ Exporter → Fichier JSON téléchargé
6. ✅ Importer le fichier exporté → Doublons ignorés
7. ✅ Dicter un mot du dictionnaire → Vérifier la précision améliorée

## Support

Pour toute question ou bug, créer une issue sur le repo GitHub avec :
- Version de Ghosty
- Étapes pour reproduire
- Logs Rust (`cargo run`) et console navigateur (DevTools)
