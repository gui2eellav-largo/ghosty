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
}

impl Default for GeneralPrefs {
    fn default() -> Self {
        Self {
            launch_at_login: false,
            auto_update: true,
            display_name: None,
            avatar_path: None,
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
}

impl Default for TranscriptionPrefs {
    fn default() -> Self {
        Self {
            model: "whisper-1".into(),
            timeout_secs: 30,
            language: None,
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
}

impl Default for LlmPrefs {
    fn default() -> Self {
        Self {
            model: "gpt-4o-mini".into(),
            temperature: 0.7,
            max_tokens: 1024,
            timeout_secs: 45,
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

fn load_from_file(path: &std::path::Path) -> Preferences {
    std::fs::read_to_string(path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_to_file(path: &std::path::Path, prefs: &Preferences) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
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
