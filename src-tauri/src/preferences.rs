/// Préférences utilisateur persistées (settings style Vercel)
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::Manager;

const PREFERENCES_FILENAME: &str = "preferences.json";

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Preferences {
    #[serde(default)]
    pub general: GeneralPrefs,
    #[serde(default)]
    pub shortcut: ShortcutPrefs,
    #[serde(default)]
    pub recording: RecordingPrefs,
    #[serde(default)]
    pub transcription: TranscriptionPrefs,
    #[serde(default)]
    pub llm: LlmPrefs,
    #[serde(default)]
    pub behavior: BehaviorPrefs,
    #[serde(default)]
    pub appearance: AppearancePrefs,
    #[serde(default)]
    pub advanced: AdvancedPrefs,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GeneralPrefs {
    pub launch_at_login: bool,
    pub auto_update: bool,
    #[serde(default)]
    pub display_name: Option<String>,
    #[serde(default)]
    pub avatar_path: Option<String>,
    #[serde(default)]
    pub first_run_done: bool,
}

impl Default for GeneralPrefs {
    fn default() -> Self {
        Self {
            launch_at_login: false,
            auto_update: false,
            display_name: None,
            avatar_path: None,
            first_run_done: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShortcutPrefs {
    pub modifiers: Vec<String>,
    pub key: String,
}

impl Default for ShortcutPrefs {
    fn default() -> Self {
        Self {
            modifiers: vec!["Control".into(), "Shift".into()],
            key: "Space".into(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordingPrefs {
    pub max_duration_minutes: u32,
    #[serde(default)]
    pub input_device_id: Option<String>,
}

impl Default for RecordingPrefs {
    fn default() -> Self {
        Self {
            max_duration_minutes: 2,
            input_device_id: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscriptionPrefs {
    pub model: String,
    pub timeout_secs: u64,
    #[serde(default)]
    pub language: Option<String>,
    /// Transcription provider: "openai" or "groq"
    #[serde(default = "default_transcription_provider")]
    pub provider: String,
}

fn default_transcription_provider() -> String {
    "openai".into()
}

impl Default for TranscriptionPrefs {
    fn default() -> Self {
        Self {
            model: "whisper-1".into(),
            timeout_secs: 20,
            language: Some("fr".into()),
            provider: "openai".into(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LlmPrefs {
    pub model: String,
    pub temperature: f32,
    pub max_tokens: u32,
    pub timeout_secs: u64,
    /// LLM provider: "openai" or "groq"
    #[serde(default = "default_llm_provider")]
    pub provider: String,
}

fn default_llm_provider() -> String {
    "openai".into()
}

impl Default for LlmPrefs {
    fn default() -> Self {
        Self {
            model: "gpt-4o-mini".into(),
            temperature: 0.3,
            max_tokens: 1024,
            timeout_secs: 45,
            provider: "openai".into(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BehaviorPrefs {
    pub auto_copy: bool,
    pub sound_on_complete: bool,
    pub system_notification: bool,
    /// Coller automatiquement après transformation (mode texte / clic droit).
    #[serde(default = "behavior_default_true")]
    pub auto_paste_after_transform: bool,
    /// Coller Original + Result (format fixe) quand un mode avec traitement est utilisé.
    #[serde(default)]
    pub paste_input_and_output: bool,
}

fn behavior_default_true() -> bool {
    true
}

impl Default for BehaviorPrefs {
    fn default() -> Self {
        Self {
            auto_copy: true,
            sound_on_complete: true,
            system_notification: false,
            auto_paste_after_transform: true,
            paste_input_and_output: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppearancePrefs {
    pub theme: String,
    pub bar_position: String,
    pub font_size: String,
    #[serde(default = "default_true")]
    pub show_lock_in_widget: bool,
}

fn default_true() -> bool {
    true
}

impl Default for AppearancePrefs {
    fn default() -> Self {
        Self {
            theme: "system".into(),
            bar_position: "top".into(),
            font_size: "normal".into(),
            show_lock_in_widget: true,
        }
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AdvancedPrefs {
    #[serde(default)]
    pub transcription_base_url: Option<String>,
    #[serde(default)]
    pub llm_base_url: Option<String>,
}

fn preferences_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|e| e.to_string())
        .map(|p| p.join(PREFERENCES_FILENAME))
}

fn backup_path(path: &std::path::Path) -> PathBuf {
    path.with_extension("backup.json")
}

fn load_from_file(path: &std::path::Path) -> Preferences {
    match std::fs::read_to_string(path) {
        Ok(s) => match serde_json::from_str(&s) {
            Ok(prefs) => prefs,
            Err(_parse_err) => {
                // Primary file is corrupted — try loading from backup
                let bp = backup_path(path);
                eprintln!(
                    "[preferences] JSON parse failed for {:?}, trying backup {:?}",
                    path, bp
                );
                match std::fs::read_to_string(&bp) {
                    Ok(bs) => match serde_json::from_str(&bs) {
                        Ok(prefs) => {
                            eprintln!("[preferences] WARNING: loaded preferences from backup file");
                            prefs
                        }
                        Err(_) => {
                            eprintln!("[preferences] backup also corrupted, using defaults");
                            Preferences::default()
                        }
                    },
                    Err(_) => {
                        eprintln!("[preferences] no backup found, using defaults");
                        Preferences::default()
                    }
                }
            }
        },
        Err(_) => Preferences::default(),
    }
}

fn save_to_file(path: &std::path::Path, prefs: &Preferences) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    // Create backup of current file before overwriting
    if path.exists() {
        let bp = backup_path(path);
        if let Err(e) = std::fs::copy(path, &bp) {
            eprintln!("[preferences] failed to create backup: {}", e);
        }
    }
    std::fs::write(
        path,
        serde_json::to_string_pretty(prefs).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())
}

pub fn get_preferences(app: &tauri::AppHandle) -> Result<Preferences, String> {
    let path = preferences_path(app)?;
    Ok(load_from_file(&path))
}

pub fn set_preferences(app: &tauri::AppHandle, prefs: &Preferences) -> Result<(), String> {
    let path = preferences_path(app)?;
    save_to_file(&path, prefs)
}

/// Merge partial JSON into current preferences (for partial updates from frontend)
pub fn update_preferences(
    app: &tauri::AppHandle,
    partial: serde_json::Value,
) -> Result<Preferences, String> {
    let current = get_preferences(app)?;
    let current_json = serde_json::to_value(&current).map_err(|e| e.to_string())?;
    fn merge(a: &mut serde_json::Value, b: &serde_json::Value) {
        if let (Some(a_obj), Some(b_obj)) = (a.as_object_mut(), b.as_object()) {
            for (k, v) in b_obj {
                if v.is_object() {
                    if let Some(a_val) = a_obj.get_mut(k) {
                        if a_val.as_object().is_some() {
                            merge(a_val, v);
                        } else {
                            a_obj.insert(k.clone(), v.clone());
                        }
                    } else {
                        a_obj.insert(k.clone(), v.clone());
                    }
                } else {
                    a_obj.insert(k.clone(), v.clone());
                }
            }
        }
    }
    let mut merged = current_json.clone();
    merge(&mut merged, &partial);
    let prefs: Preferences = serde_json::from_value(merged).map_err(|e| e.to_string())?;
    set_preferences(app, &prefs)?;
    Ok(prefs)
}

/// Max recording samples from preferences (for audio worker)
pub fn max_recording_samples(app: &tauri::AppHandle) -> usize {
    let prefs = get_preferences(app).unwrap_or_default();
    let mins = prefs.recording.max_duration_minutes.clamp(1, 10);
    (16000 * 60 * mins) as usize
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── Default preferences ─────────────────────────────────────────

    #[test]
    fn test_default_preferences_valid() {
        let prefs = Preferences::default();
        assert_eq!(prefs.recording.max_duration_minutes, 2);
        assert_eq!(prefs.transcription.model, "whisper-1");
        assert_eq!(prefs.transcription.timeout_secs, 20);
        assert_eq!(prefs.llm.model, "gpt-4o-mini");
        assert!((prefs.llm.temperature - 0.3).abs() < f32::EPSILON);
        assert_eq!(prefs.llm.max_tokens, 1024);
    }

    #[test]
    fn test_default_general_prefs() {
        let prefs = GeneralPrefs::default();
        assert!(!prefs.launch_at_login);
        assert!(!prefs.auto_update);
        assert!(prefs.display_name.is_none());
        assert!(prefs.avatar_path.is_none());
        assert!(!prefs.first_run_done);
    }

    #[test]
    fn test_default_shortcut_prefs() {
        let prefs = ShortcutPrefs::default();
        assert_eq!(prefs.modifiers, vec!["Control", "Shift"]);
        assert_eq!(prefs.key, "Space");
    }

    #[test]
    fn test_default_behavior_prefs() {
        let prefs = BehaviorPrefs::default();
        assert!(prefs.auto_copy);
        assert!(prefs.sound_on_complete);
        assert!(!prefs.system_notification);
        assert!(prefs.auto_paste_after_transform);
        assert!(!prefs.paste_input_and_output);
    }

    #[test]
    fn test_default_appearance_prefs() {
        let prefs = AppearancePrefs::default();
        assert_eq!(prefs.theme, "system");
        assert_eq!(prefs.bar_position, "top");
        assert_eq!(prefs.font_size, "normal");
        assert!(prefs.show_lock_in_widget);
    }

    #[test]
    fn test_default_advanced_prefs() {
        let prefs = AdvancedPrefs::default();
        assert!(prefs.transcription_base_url.is_none());
        assert!(prefs.llm_base_url.is_none());
    }

    #[test]
    fn test_default_transcription_language() {
        let prefs = TranscriptionPrefs::default();
        assert_eq!(prefs.language, Some("fr".into()));
    }

    // ── Serialization / deserialization roundtrip ────────────────────

    #[test]
    fn test_preferences_serialization_roundtrip() {
        let prefs = Preferences::default();
        let json = serde_json::to_string(&prefs).unwrap();
        let deserialized: Preferences = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.llm.model, prefs.llm.model);
        assert_eq!(deserialized.recording.max_duration_minutes, prefs.recording.max_duration_minutes);
        assert_eq!(deserialized.appearance.theme, prefs.appearance.theme);
    }

    #[test]
    fn test_preferences_camel_case_keys() {
        let prefs = Preferences::default();
        let json = serde_json::to_value(&prefs).unwrap();
        // Verify camelCase field names
        assert!(json.get("general").is_some());
        let general = json.get("general").unwrap();
        assert!(general.get("launchAtLogin").is_some());
        assert!(general.get("autoUpdate").is_some());
    }

    #[test]
    fn test_deserialize_with_missing_fields_uses_defaults() {
        // Provide all required fields for GeneralPrefs, but omit other top-level sections
        let json = r#"{"general": {"launchAtLogin": true, "autoUpdate": false, "firstRunDone": false}}"#;
        let prefs: Preferences = serde_json::from_str(json).unwrap();
        assert!(prefs.general.launch_at_login);
        // Other sections should be default
        assert_eq!(prefs.llm.model, "gpt-4o-mini");
        assert_eq!(prefs.recording.max_duration_minutes, 2);
    }

    #[test]
    fn test_deserialize_empty_json_uses_all_defaults() {
        let prefs: Preferences = serde_json::from_str("{}").unwrap();
        assert_eq!(prefs.llm.model, "gpt-4o-mini");
        assert!(!prefs.general.first_run_done);
    }

    // ── Partial merge logic ─────────────────────────────────────────

    #[test]
    fn test_merge_function_updates_nested_field() {
        fn merge(a: &mut serde_json::Value, b: &serde_json::Value) {
            if let (Some(a_obj), Some(b_obj)) = (a.as_object_mut(), b.as_object()) {
                for (k, v) in b_obj {
                    if v.is_object() {
                        if let Some(a_val) = a_obj.get_mut(k) {
                            if a_val.as_object().is_some() {
                                merge(a_val, v);
                            } else {
                                a_obj.insert(k.clone(), v.clone());
                            }
                        } else {
                            a_obj.insert(k.clone(), v.clone());
                        }
                    } else {
                        a_obj.insert(k.clone(), v.clone());
                    }
                }
            }
        }

        let prefs = Preferences::default();
        let mut current = serde_json::to_value(&prefs).unwrap();
        let partial: serde_json::Value = serde_json::json!({
            "llm": { "temperature": 0.7 }
        });
        merge(&mut current, &partial);
        let merged: Preferences = serde_json::from_value(current).unwrap();
        // temperature should be updated
        assert!((merged.llm.temperature - 0.7).abs() < f32::EPSILON);
        // model should remain default
        assert_eq!(merged.llm.model, "gpt-4o-mini");
    }

    #[test]
    fn test_merge_preserves_unrelated_sections() {
        fn merge(a: &mut serde_json::Value, b: &serde_json::Value) {
            if let (Some(a_obj), Some(b_obj)) = (a.as_object_mut(), b.as_object()) {
                for (k, v) in b_obj {
                    if v.is_object() {
                        if let Some(a_val) = a_obj.get_mut(k) {
                            if a_val.as_object().is_some() {
                                merge(a_val, v);
                            } else {
                                a_obj.insert(k.clone(), v.clone());
                            }
                        } else {
                            a_obj.insert(k.clone(), v.clone());
                        }
                    } else {
                        a_obj.insert(k.clone(), v.clone());
                    }
                }
            }
        }

        let prefs = Preferences::default();
        let mut current = serde_json::to_value(&prefs).unwrap();
        let partial: serde_json::Value = serde_json::json!({
            "general": { "launchAtLogin": true }
        });
        merge(&mut current, &partial);
        let merged: Preferences = serde_json::from_value(current).unwrap();
        assert!(merged.general.launch_at_login);
        // Behavior should be unchanged
        assert!(merged.behavior.auto_copy);
        assert!(merged.behavior.sound_on_complete);
    }

    #[test]
    fn test_merge_with_empty_partial_changes_nothing() {
        fn merge(a: &mut serde_json::Value, b: &serde_json::Value) {
            if let (Some(a_obj), Some(b_obj)) = (a.as_object_mut(), b.as_object()) {
                for (k, v) in b_obj {
                    if v.is_object() {
                        if let Some(a_val) = a_obj.get_mut(k) {
                            if a_val.as_object().is_some() {
                                merge(a_val, v);
                            } else {
                                a_obj.insert(k.clone(), v.clone());
                            }
                        } else {
                            a_obj.insert(k.clone(), v.clone());
                        }
                    } else {
                        a_obj.insert(k.clone(), v.clone());
                    }
                }
            }
        }

        let prefs = Preferences::default();
        let original_json = serde_json::to_string(&prefs).unwrap();
        let mut current = serde_json::to_value(&prefs).unwrap();
        let partial: serde_json::Value = serde_json::json!({});
        merge(&mut current, &partial);
        let merged: Preferences = serde_json::from_value(current).unwrap();
        let merged_json = serde_json::to_string(&merged).unwrap();
        assert_eq!(original_json, merged_json);
    }

    #[test]
    fn test_merge_with_null_value() {
        fn merge(a: &mut serde_json::Value, b: &serde_json::Value) {
            if let (Some(a_obj), Some(b_obj)) = (a.as_object_mut(), b.as_object()) {
                for (k, v) in b_obj {
                    if v.is_object() {
                        if let Some(a_val) = a_obj.get_mut(k) {
                            if a_val.as_object().is_some() {
                                merge(a_val, v);
                            } else {
                                a_obj.insert(k.clone(), v.clone());
                            }
                        } else {
                            a_obj.insert(k.clone(), v.clone());
                        }
                    } else {
                        a_obj.insert(k.clone(), v.clone());
                    }
                }
            }
        }

        let prefs = Preferences::default();
        let mut current = serde_json::to_value(&prefs).unwrap();
        let partial: serde_json::Value = serde_json::json!({
            "general": { "displayName": null }
        });
        merge(&mut current, &partial);
        let merged: Preferences = serde_json::from_value(current).unwrap();
        assert!(merged.general.display_name.is_none());
    }

    // ── File-based load/save ────────────────────────────────────────

    #[test]
    fn test_load_from_file_missing_returns_defaults() {
        let tmp = tempfile::tempdir().unwrap();
        let path = tmp.path().join("nonexistent.json");
        let prefs = load_from_file(&path);
        assert_eq!(prefs.llm.model, "gpt-4o-mini");
    }

    #[test]
    fn test_save_and_load_roundtrip() {
        let tmp = tempfile::tempdir().unwrap();
        let path = tmp.path().join("prefs.json");
        let mut prefs = Preferences::default();
        prefs.general.launch_at_login = true;
        prefs.llm.temperature = 0.9;
        save_to_file(&path, &prefs).unwrap();
        let loaded = load_from_file(&path);
        assert!(loaded.general.launch_at_login);
        assert!((loaded.llm.temperature - 0.9).abs() < f32::EPSILON);
    }

    #[test]
    fn test_save_creates_parent_dirs() {
        let tmp = tempfile::tempdir().unwrap();
        let path = tmp.path().join("deep").join("nested").join("prefs.json");
        let result = save_to_file(&path, &Preferences::default());
        assert!(result.is_ok());
        assert!(path.exists());
    }

    #[test]
    fn test_load_from_corrupted_file_returns_defaults() {
        let tmp = tempfile::tempdir().unwrap();
        let path = tmp.path().join("corrupted.json");
        std::fs::write(&path, "not valid json!!!").unwrap();
        let prefs = load_from_file(&path);
        assert_eq!(prefs.llm.model, "gpt-4o-mini");
    }

    // ── Backup / restore ───────────────────────────────────────────

    #[test]
    fn test_save_creates_backup() {
        let tmp = tempfile::tempdir().unwrap();
        let path = tmp.path().join("prefs.json");
        let bp = backup_path(&path);

        // First save — no backup yet (no previous file)
        let prefs = Preferences::default();
        save_to_file(&path, &prefs).unwrap();
        assert!(!bp.exists(), "backup should not exist after first save");

        // Second save — backup should be created
        let mut prefs2 = Preferences::default();
        prefs2.general.launch_at_login = true;
        save_to_file(&path, &prefs2).unwrap();
        assert!(bp.exists(), "backup should exist after second save");

        // Backup should contain the FIRST save's content
        let backup_prefs = load_from_file(&bp);
        assert!(!backup_prefs.general.launch_at_login);
    }

    #[test]
    fn test_load_from_corrupted_falls_back_to_backup() {
        let tmp = tempfile::tempdir().unwrap();
        let path = tmp.path().join("prefs.json");
        let bp = backup_path(&path);

        // Write valid backup
        let mut prefs = Preferences::default();
        prefs.llm.temperature = 0.99;
        let json = serde_json::to_string_pretty(&prefs).unwrap();
        std::fs::write(&bp, &json).unwrap();

        // Write corrupted primary
        std::fs::write(&path, "CORRUPTED{{{").unwrap();

        // Load should fall back to backup
        let loaded = load_from_file(&path);
        assert!((loaded.llm.temperature - 0.99).abs() < f32::EPSILON);
    }
}
