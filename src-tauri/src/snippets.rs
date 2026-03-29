/// Voice Snippets: user-defined trigger phrases that expand to text blocks.
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::Manager;

const SNIPPETS_FILENAME: &str = "snippets.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Snippet {
    pub id: String,
    pub trigger: String,
    pub expansion: String,
    pub enabled: bool,
    pub order: u32,
}

fn snippets_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|e| e.to_string())
        .map(|p| p.join(SNIPPETS_FILENAME))
}

fn load_from_file(path: &std::path::Path) -> Vec<Snippet> {
    std::fs::read_to_string(path)
        .ok()
        .and_then(|s| serde_json::from_str::<Vec<Snippet>>(&s).ok())
        .unwrap_or_default()
}

fn save_to_file(path: &std::path::Path, snippets: &[Snippet]) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(
        path,
        serde_json::to_string_pretty(snippets).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())
}

pub fn get_all_snippets(app: &tauri::AppHandle) -> Result<Vec<Snippet>, String> {
    let path = snippets_path(app)?;
    let mut snippets = load_from_file(&path);
    snippets.sort_by_key(|s| s.order);
    Ok(snippets)
}

pub fn save_snippet(app: &tauri::AppHandle, mut snippet: Snippet) -> Result<Vec<Snippet>, String> {
    let path = snippets_path(app)?;
    let mut snippets = load_from_file(&path);

    if snippet.id.is_empty() {
        snippet.id = uuid::Uuid::new_v4().to_string();
        snippets.push(snippet);
    } else if let Some(existing) = snippets.iter_mut().find(|s| s.id == snippet.id) {
        *existing = snippet;
    } else {
        snippets.push(snippet);
    }

    save_to_file(&path, &snippets)?;
    snippets.sort_by_key(|s| s.order);
    Ok(snippets)
}

pub fn delete_snippet(app: &tauri::AppHandle, snippet_id: String) -> Result<Vec<Snippet>, String> {
    let path = snippets_path(app)?;
    let snippets: Vec<Snippet> = load_from_file(&path)
        .into_iter()
        .filter(|s| s.id != snippet_id)
        .collect();
    save_to_file(&path, &snippets)?;
    Ok(snippets)
}

pub fn reorder_snippets(
    app: &tauri::AppHandle,
    snippet_ids: Vec<String>,
) -> Result<Vec<Snippet>, String> {
    let path = snippets_path(app)?;
    let mut snippets = load_from_file(&path);

    for (index, id) in snippet_ids.iter().enumerate() {
        if let Some(snippet) = snippets.iter_mut().find(|s| &s.id == id) {
            snippet.order = index as u32;
        }
    }

    snippets.sort_by_key(|s| s.order);
    save_to_file(&path, &snippets)?;
    Ok(snippets)
}

/// Returns true if the character at the given byte position is a word boundary
/// (start/end of string, or adjacent to a non-alphanumeric character).
fn is_word_boundary(text: &str, byte_pos: usize) -> bool {
    if byte_pos == 0 || byte_pos >= text.len() {
        return true;
    }
    let ch = text[byte_pos..].chars().next();
    let prev_ch = text[..byte_pos].chars().next_back();
    match (prev_ch, ch) {
        (Some(p), _) if !p.is_alphanumeric() => true,
        (_, Some(c)) if !c.is_alphanumeric() => true,
        _ => false,
    }
}

/// Scans text for trigger phrases (case-insensitive, whole-word) and replaces
/// them with their expansion. Only enabled snippets are considered.
pub fn process_snippets(text: &str, app: &tauri::AppHandle) -> String {
    let snippets = match get_all_snippets(app) {
        Ok(s) => s,
        Err(_) => return text.to_string(),
    };

    let enabled: Vec<&Snippet> = snippets.iter().filter(|s| s.enabled && !s.trigger.is_empty()).collect();
    if enabled.is_empty() {
        return text.to_string();
    }

    let mut result = text.to_string();
    let text_lower = text.to_lowercase();

    // Process snippets longest-trigger-first to avoid partial matches
    let mut sorted = enabled;
    sorted.sort_by(|a, b| b.trigger.len().cmp(&a.trigger.len()));

    for snippet in &sorted {
        let trigger_lower = snippet.trigger.to_lowercase();
        let mut search_from = 0;
        let mut new_result = String::new();
        let result_lower = result.to_lowercase();

        while let Some(pos) = result_lower[search_from..].find(&trigger_lower) {
            let abs_pos = search_from + pos;
            let end_pos = abs_pos + trigger_lower.len();

            if is_word_boundary(&result, abs_pos) && is_word_boundary(&result, end_pos) {
                new_result.push_str(&result[search_from..abs_pos]);
                new_result.push_str(&snippet.expansion);
                search_from = end_pos;
            } else {
                new_result.push_str(&result[search_from..end_pos]);
                search_from = end_pos;
            }
        }
        new_result.push_str(&result[search_from..]);
        result = new_result;
    }

    let _ = text_lower; // suppress unused warning
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_word_boundary_start() {
        assert!(is_word_boundary("hello", 0));
    }

    #[test]
    fn test_is_word_boundary_end() {
        assert!(is_word_boundary("hello", 5));
    }

    #[test]
    fn test_is_word_boundary_space() {
        assert!(is_word_boundary("hello world", 5));
        assert!(is_word_boundary("hello world", 6));
    }

    #[test]
    fn test_is_word_boundary_mid_word() {
        assert!(!is_word_boundary("hello", 2));
    }

    #[test]
    fn test_snippet_serialization_roundtrip() {
        let snippet = Snippet {
            id: "test-id".to_string(),
            trigger: "brb".to_string(),
            expansion: "be right back".to_string(),
            enabled: true,
            order: 0,
        };
        let json = serde_json::to_string(&snippet).unwrap();
        let deserialized: Snippet = serde_json::from_str(&json).unwrap();
        assert_eq!(snippet.id, deserialized.id);
        assert_eq!(snippet.trigger, deserialized.trigger);
        assert_eq!(snippet.expansion, deserialized.expansion);
    }

    #[test]
    fn test_snippet_camel_case_serialization() {
        let snippet = Snippet {
            id: "test".to_string(),
            trigger: "t".to_string(),
            expansion: "e".to_string(),
            enabled: true,
            order: 0,
        };
        let json = serde_json::to_value(&snippet).unwrap();
        // All fields are single words so camelCase doesn't change them,
        // but verify the struct serializes correctly
        assert!(json.get("id").is_some());
        assert!(json.get("enabled").is_some());
    }

    #[test]
    fn test_load_from_file_missing_returns_empty() {
        let tmp = tempfile::tempdir().unwrap();
        let path = tmp.path().join("nonexistent.json");
        let snippets = load_from_file(&path);
        assert!(snippets.is_empty());
    }

    #[test]
    fn test_save_and_load_roundtrip() {
        let tmp = tempfile::tempdir().unwrap();
        let path = tmp.path().join("snippets.json");
        let snippets = vec![Snippet {
            id: "1".to_string(),
            trigger: "brb".to_string(),
            expansion: "be right back".to_string(),
            enabled: true,
            order: 0,
        }];
        save_to_file(&path, &snippets).unwrap();
        let loaded = load_from_file(&path);
        assert_eq!(loaded.len(), 1);
        assert_eq!(loaded[0].trigger, "brb");
    }

    #[test]
    fn test_save_creates_parent_directories() {
        let tmp = tempfile::tempdir().unwrap();
        let path = tmp.path().join("a").join("b").join("snippets.json");
        let result = save_to_file(&path, &[]);
        assert!(result.is_ok());
        assert!(path.exists());
    }
}
