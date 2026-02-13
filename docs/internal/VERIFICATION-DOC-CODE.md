# Vérification documentation / code – Résumé des écarts

**Date** : 2026-02-13  
**Objectif** : Aligner la doc restante avec le code et la vision actuelle de l’app.

**Mises à jour effectuées** : README (4 modes), DICTIONARY-SYSTEM (misspellings + API), STRATEGIE (son/notif implémentés), GUIDE-TESTS-MANUELS (section Orb supprimée, numérotation 4–6), SHORTCUTS-SYSTEM-COMPLETE (état actuel + sections), GHOSTY-MODES-METHODOLOGY (alignement code + built-ins), DICTIONARY-QUICKSTART (exemples misspellings/update).

---

## 1. Résumé des écarts identifiés

| Doc | Écart | Gravité |
|-----|--------|--------|
| **DICTIONARY-SYSTEM.md** | `DictionaryEntry` ne mentionne pas `misspellings`. L’API `add_dictionary_entry` accepte `misspellings` (optionnel). | Moyen |
| **DICTIONARY-QUICKSTART.md** | Exemples `add_dictionary_entry` sans `misspellings`. `import_dictionary_entries` attend `entries: Vec<DictionaryEntry>` (avec `type` / `entry_type` selon sérialisation). | Faible |
| **SHORTCUTS-SYSTEM-COMPLETE.md** | Raccourcis par défaut : doc indique « Cmd+Shift+Space », « Cmd+Shift+D ». Le code a `Ctrl+Space` (PushToTalk), `Ctrl+Shift+Space` (ToggleRecording), plus Paste last, Command mode, etc. Liste des sections Settings : « Transcription », « LLM Settings » → en réalité une seule section **Models**. Actions : manquent PushToTalk, ToggleRecording, PasteLastOutput. | Moyen |
| **GHOSTY-MODES-METHODOLOGY.md** | Template mode avec `category` et `prompt` ; le code a `systemPrompt` (pas `category`). Modes built-in réels : **Direct** (light), **Shape** (medium), **Reframe** (strong), **Build** (full) – pas « Prompt Enhancer (Dense) » etc. La doc est une méthodologie (référence pour concevoir des modes), pas un reflet exact de l’UI. | Faible si clarifié |
| **STRATEGIE-IMPLEMENTATION-FONCTIONNALITES.md** | Décrit le plan pour son et notification comme « à faire ». Dans le code, `sound_on_complete` et `system_notification` sont **déjà branchés** (audio.rs, lib.rs). La stratégie est donc en grande partie implémentée. | Moyen |
| **GUIDE-TESTS-MANUELS.md** | Section « 4. Orb (si visible) » : le composant Orb n’est **jamais importé** dans l’app ; il n’y a pas d’Orb visible. Section obsolète. | Faible |
| **README (racine)** | « 5 built-in modes : Hands-off, Light edit, Shape, Reframe, Build ». Le code a **4** modes : **Direct**, Shape, Reframe, Build. « Hands-off » / « Light edit » ne correspondent pas aux noms actuels (Direct = vos mots, formatage léger). | Moyen |
| **SERVICES-CLIC-DROIT-MACOS.md** | Déjà à jour : indique que la fonctionnalité est en suspens et `ENABLE_RIGHT_CLICK_SERVICES` à `false`. | OK |
| **PRODUCTION-READINESS.md** | Cohérent avec le code (sécurité, keychain, build). | OK |
| **QUICKSTART.md** | Récemment mis à jour (clé in-app, données OpenAI, téléchargement). | OK |
| **UI-RULES.md** | Référence `uiClasses` et patterns ; toujours valide. | OK |

---

## 2. Recommandations pour aligner la documentation

### 2.1 À mettre à jour en priorité

1. **README (racine)**  
   - Remplacer la liste des 5 modes par les **4** modes réels : **Direct**, **Shape**, **Reframe**, **Build**, avec une courte description (ex. Direct = vos mots, formatage léger ; Shape = structure et polish ; etc.).

2. **SHORTCUTS-SYSTEM-COMPLETE.md**  
   - Raccourcis par défaut : indiquer ceux définis dans `shortcuts.rs` (PushToTalk Ctrl+Space, ToggleRecording Ctrl+Shift+Space, etc.) et préciser que sur macOS l’UI peut afficher Cmd selon le mapping.
   - Sections Settings : remplacer « Transcription » et « LLM Settings » par **Models** (une section).
   - Ajouter les actions manquantes : PushToTalk, ToggleRecording, PasteLastOutput.

3. **DICTIONARY-SYSTEM.md**  
   - Dans la structure `DictionaryEntry`, ajouter `misspellings: Vec<String>`.
   - Dans les paramètres de `add_dictionary_entry`, mentionner `misspellings` (optionnel).

4. **STRATEGIE-IMPLEMENTATION-FONCTIONNALITES.md**  
   - En tête ou en conclusion : préciser que **son et notification sont implémentés** (backend émet `play_completion_sound`, lecture des préfs `sound_on_complete` et `system_notification`). Le reste du doc reste utile comme référence de pattern.

5. **GUIDE-TESTS-MANUELS.md**  
   - Supprimer ou réécrire la section « 4. Orb (si visible) » (Orb n’est pas utilisé dans l’app actuelle).

### 2.2 Clarifications utiles (optionnel)

6. **GHOSTY-MODES-METHODOLOGY.md**  
   - En introduction : préciser que le doc décrit la **méthodologie** pour concevoir des modes (magic keywords, catégories) et que les **modes built-in actuels** dans l’app sont Direct, Shape, Reframe, Build (définis dans `modes.rs`). Le champ `category` du template n’existe pas dans `ModeConfig` ; le prompt décrit correspond à `systemPrompt`.

7. **DICTIONARY-QUICKSTART.md**  
   - Dans les exemples d’appel API, ajouter éventuellement `misspellings` quand pertinent (variantes d’orthographe).

---

## 3. Synthèse

- **À jour** : QUICKSTART, PRODUCTION-READINESS, SERVICES-CLIC-DROIT (avec mention « en suspens »), UI-RULES.
- **Écarts à corriger** : README (modes), SHORTCUTS-SYSTEM-COMPLETE (défauts + sections), DICTIONARY-SYSTEM (misspellings), STRATEGIE (son/notif implémentés), GUIDE-TESTS-MANUELS (Orb).
- **Clarifications recommandées** : GHOSTY-MODES-METHODOLOGY (méthodo vs built-ins réels), DICTIONARY-QUICKSTART (misspellings dans exemples).

En appliquant les mises à jour de la section 2.1, la documentation restante sera alignée avec l’état actuel du code et de la vision de l’application.
