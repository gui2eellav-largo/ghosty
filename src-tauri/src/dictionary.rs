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

            // Format: "Tauri, Rust, ElevenLabs, ..."
            // Whisper API uses this to guide transcription
            let mut seen = HashSet::new();
            let mut items: Vec<String> = Vec::new();

            for entry in entries {
                let word = entry.word.trim().to_string();
                if !word.is_empty() && seen.insert(word.to_lowercase()) {
                    items.push(word);
                }
                for misspelling in entry.misspellings {
                    let m = misspelling.trim().to_string();
                    if !m.is_empty() && seen.insert(m.to_lowercase()) {
                        items.push(m);
                    }
                }
            }

            items.join(", ")
        }
        Err(_) => String::new(),
    }
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
