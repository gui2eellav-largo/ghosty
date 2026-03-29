use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DictionaryEntry {
    pub id: String,
    pub word: String,
    #[serde(rename = "type")]
    pub entry_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pronunciation: Option<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub misspellings: Vec<String>,
    pub created_at: i64,
}

#[derive(Debug, Default, Serialize, Deserialize)]
struct DictionaryStore {
    entries: Vec<DictionaryEntry>,
}

fn get_dictionary_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    fs::create_dir_all(&app_dir).map_err(|e| format!("Failed to create app dir: {}", e))?;
    Ok(app_dir.join("dictionary.json"))
}

fn load_dictionary(app: &tauri::AppHandle) -> Result<DictionaryStore, String> {
    let path = get_dictionary_path(app)?;

    if !path.exists() {
        return Ok(DictionaryStore::default());
    }

    let content =
        fs::read_to_string(&path).map_err(|e| format!("Failed to read dictionary: {}", e))?;

    serde_json::from_str(&content).map_err(|e| format!("Failed to parse dictionary: {}", e))
}

fn save_dictionary(app: &tauri::AppHandle, store: &DictionaryStore) -> Result<(), String> {
    let path = get_dictionary_path(app)?;
    let content = serde_json::to_string_pretty(store)
        .map_err(|e| format!("Failed to serialize dictionary: {}", e))?;

    fs::write(&path, content).map_err(|e| format!("Failed to write dictionary: {}", e))
}

pub fn get_all_entries(app: &tauri::AppHandle) -> Result<Vec<DictionaryEntry>, String> {
    let store = load_dictionary(app)?;
    Ok(store.entries)
}

pub fn add_entry(
    app: &tauri::AppHandle,
    word: String,
    entry_type: String,
    pronunciation: Option<String>,
    misspellings: Option<Vec<String>>,
) -> Result<DictionaryEntry, String> {
    if word.trim().is_empty() {
        return Err("Word cannot be empty".to_string());
    }

    let mut store = load_dictionary(app)?;

    // Check for duplicates
    if store
        .entries
        .iter()
        .any(|e| e.word.to_lowercase() == word.trim().to_lowercase())
    {
        return Err(format!("'{}' already exists in dictionary", word.trim()));
    }

    let entry = DictionaryEntry {
        id: uuid::Uuid::new_v4().to_string(),
        word: word.trim().to_string(),
        entry_type: entry_type.trim().to_string(),
        pronunciation,
        misspellings: normalize_misspellings(misspellings.unwrap_or_default()),
        created_at: chrono::Utc::now().timestamp(),
    };

    store.entries.push(entry.clone());
    save_dictionary(app, &store)?;

    Ok(entry)
}

pub fn update_entry(
    app: &tauri::AppHandle,
    id: String,
    word: Option<String>,
    entry_type: Option<String>,
    pronunciation: Option<String>,
    misspellings: Option<Vec<String>>,
) -> Result<DictionaryEntry, String> {
    let mut store = load_dictionary(app)?;

    let entry = store
        .entries
        .iter_mut()
        .find(|e| e.id == id)
        .ok_or_else(|| "Entry not found".to_string())?;

    if let Some(w) = word {
        if w.trim().is_empty() {
            return Err("Word cannot be empty".to_string());
        }
        entry.word = w.trim().to_string();
    }

    if let Some(t) = entry_type {
        entry.entry_type = t.trim().to_string();
    }

    if pronunciation.is_some() {
        entry.pronunciation = pronunciation;
    }

    if let Some(misspellings) = misspellings {
        entry.misspellings = normalize_misspellings(misspellings);
    }

    let updated = entry.clone();
    save_dictionary(app, &store)?;

    Ok(updated)
}

pub fn delete_entry(app: &tauri::AppHandle, id: String) -> Result<(), String> {
    let mut store = load_dictionary(app)?;

    let initial_len = store.entries.len();
    store.entries.retain(|e| e.id != id);

    if store.entries.len() == initial_len {
        return Err("Entry not found".to_string());
    }

    save_dictionary(app, &store)?;
    Ok(())
}

pub fn build_whisper_prompt(app: &tauri::AppHandle) -> String {
    match get_all_entries(app) {
        Ok(entries) => {
            if entries.is_empty() {
                return String::new();
            }

            // Only send correct target spellings — never misspellings.
            // Misspellings in the prompt teach Whisper to *produce* them.
            // Format as a French sentence for stronger decoder conditioning.
            let mut seen = HashSet::new();
            let mut words: Vec<String> = Vec::new();

            for entry in entries {
                let word = entry.word.trim().to_string();
                if !word.is_empty() && seen.insert(word.to_lowercase()) {
                    words.push(word);
                }
            }

            if words.is_empty() {
                return String::new();
            }

            // French context sentence: much stronger than a bare comma list
            format!("Mots-clés utilisés : {}.", words.join(", "))
        }
        Err(_) => String::new(),
    }
}

/// Apply dictionary-based corrections to transcribed text.
/// Replaces known misspellings with the correct word (case-insensitive).
pub fn apply_corrections(app: &tauri::AppHandle, text: &str) -> String {
    let entries = match get_all_entries(app) {
        Ok(e) => e,
        Err(_) => return text.to_string(),
    };

    let mut result = text.to_string();
    for entry in &entries {
        for misspelling in &entry.misspellings {
            let m = misspelling.trim();
            if m.is_empty() {
                continue;
            }
            // Case-insensitive whole-word replacement
            // Use word boundary logic: check chars before/after the match
            let lower_result = result.to_lowercase();
            let lower_m = m.to_lowercase();
            let mut new_result = String::with_capacity(result.len());
            let mut search_start = 0;

            while let Some(pos) = lower_result[search_start..].find(&lower_m) {
                let abs_pos = search_start + pos;
                let end_pos = abs_pos + m.len();

                // Check word boundaries
                let before_ok = abs_pos == 0
                    || !result.as_bytes()[abs_pos - 1].is_ascii_alphanumeric();
                let after_ok = end_pos >= result.len()
                    || !result.as_bytes()[end_pos].is_ascii_alphanumeric();

                new_result.push_str(&result[search_start..abs_pos]);
                if before_ok && after_ok {
                    new_result.push_str(&entry.word);
                } else {
                    new_result.push_str(&result[abs_pos..end_pos]);
                }
                search_start = end_pos;
            }
            new_result.push_str(&result[search_start..]);
            result = new_result;
        }
    }
    result
}

fn normalize_misspellings(items: Vec<String>) -> Vec<String> {
    let mut seen = HashSet::new();
    let mut out = Vec::new();

    for item in items {
        let trimmed = item.trim().to_string();
        if trimmed.is_empty() {
            continue;
        }
        let key = trimmed.to_lowercase();
        if seen.insert(key) {
            out.push(trimmed);
        }
    }

    out
}

pub fn import_entries(
    app: &tauri::AppHandle,
    entries: Vec<DictionaryEntry>,
) -> Result<Vec<DictionaryEntry>, String> {
    let mut store = load_dictionary(app)?;

    for entry in entries {
        // Skip duplicates
        if store
            .entries
            .iter()
            .any(|e| e.word.to_lowercase() == entry.word.to_lowercase())
        {
            continue;
        }
        store.entries.push(entry);
    }

    save_dictionary(app, &store)?;
    Ok(store.entries)
}

pub fn export_entries(app: &tauri::AppHandle) -> Result<String, String> {
    let store = load_dictionary(app)?;
    serde_json::to_string_pretty(&store.entries).map_err(|e| format!("Failed to export: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── normalize_misspellings ──────────────────────────────────────

    #[test]
    fn test_normalize_misspellings_removes_empty() {
        let input = vec!["hello".to_string(), "".to_string(), "  ".to_string(), "world".to_string()];
        let result = normalize_misspellings(input);
        assert_eq!(result, vec!["hello", "world"]);
    }

    #[test]
    fn test_normalize_misspellings_deduplicates_case_insensitive() {
        let input = vec!["Hello".to_string(), "hello".to_string(), "HELLO".to_string()];
        let result = normalize_misspellings(input);
        assert_eq!(result.len(), 1);
        assert_eq!(result[0], "Hello"); // preserves first occurrence's casing
    }

    #[test]
    fn test_normalize_misspellings_trims() {
        let input = vec!["  hello  ".to_string(), "  world  ".to_string()];
        let result = normalize_misspellings(input);
        assert_eq!(result, vec!["hello", "world"]);
    }

    #[test]
    fn test_normalize_misspellings_empty_input() {
        let result = normalize_misspellings(vec![]);
        assert!(result.is_empty());
    }

    // ── DictionaryEntry serialization ───────────────────────────────

    #[test]
    fn test_dictionary_entry_serialization_roundtrip() {
        let entry = DictionaryEntry {
            id: "test-id".to_string(),
            word: "Kubernetes".to_string(),
            entry_type: "technology".to_string(),
            pronunciation: Some("koo-ber-NET-eez".to_string()),
            misspellings: vec!["kubernetis".to_string(), "kubernets".to_string()],
            created_at: 1234567890,
        };
        let json = serde_json::to_string(&entry).unwrap();
        let deserialized: DictionaryEntry = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.id, entry.id);
        assert_eq!(deserialized.word, entry.word);
        assert_eq!(deserialized.entry_type, entry.entry_type);
        assert_eq!(deserialized.pronunciation, entry.pronunciation);
        assert_eq!(deserialized.misspellings, entry.misspellings);
    }

    #[test]
    fn test_dictionary_entry_optional_fields() {
        // pronunciation is optional, misspellings default to empty
        let json = r#"{"id":"1","word":"test","type":"noun","created_at":0}"#;
        let entry: DictionaryEntry = serde_json::from_str(json).unwrap();
        assert!(entry.pronunciation.is_none());
        assert!(entry.misspellings.is_empty());
    }

    #[test]
    fn test_dictionary_entry_type_renamed() {
        let entry = DictionaryEntry {
            id: "1".to_string(),
            word: "test".to_string(),
            entry_type: "noun".to_string(),
            pronunciation: None,
            misspellings: vec![],
            created_at: 0,
        };
        let json = serde_json::to_value(&entry).unwrap();
        // Should serialize as "type" not "entry_type"
        assert!(json.get("type").is_some());
        assert!(json.get("entry_type").is_none());
    }

    // ── DictionaryStore serialization ───────────────────────────────

    #[test]
    fn test_dictionary_store_default_empty() {
        let store = DictionaryStore::default();
        assert!(store.entries.is_empty());
    }

    #[test]
    fn test_dictionary_store_roundtrip() {
        let store = DictionaryStore {
            entries: vec![DictionaryEntry {
                id: "1".to_string(),
                word: "Tauri".to_string(),
                entry_type: "technology".to_string(),
                pronunciation: None,
                misspellings: vec!["tori".to_string()],
                created_at: 100,
            }],
        };
        let json = serde_json::to_string(&store).unwrap();
        let loaded: DictionaryStore = serde_json::from_str(&json).unwrap();
        assert_eq!(loaded.entries.len(), 1);
        assert_eq!(loaded.entries[0].word, "Tauri");
    }
}
