/// Gestion des raccourcis clavier personnalisables
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::Manager;

const SHORTCUTS_FILENAME: &str = "shortcuts.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShortcutConfig {
    pub id: String,
    pub name: String,
    pub description: String,
    pub keys: Vec<String>, // e.g., ["Cmd", "Shift", "1"]
    pub action: ShortcutAction,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum ShortcutAction {
    ActivateMode {
        mode_id: String,
    },
    StartRecording,
    StopRecording,
    /// Hold key: start on press, stop on release.
    PushToTalk,
    /// Press toggles recording on/off.
    ToggleRecording,
    OpenDashboard,
    ToggleFloatingBar,
    PasteLastOutput,
}

impl ShortcutConfig {
    pub fn new(
        name: String,
        description: String,
        keys: Vec<String>,
        action: ShortcutAction,
    ) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            description,
            keys,
            action,
            enabled: true,
        }
    }

    pub fn keys_string(&self) -> String {
        self.keys.join("+")
    }
}

/// Raccourcis par défaut (alignés sur l’UI « Change hotkeys »)
pub fn default_shortcuts() -> Vec<ShortcutConfig> {
    vec![
        ShortcutConfig {
            id: "push-to-talk".to_string(),
            name: "Push to talk".to_string(),
            description: "Hold to say something short".to_string(),
            keys: vec!["Ctrl".to_string(), "Space".to_string()],
            action: ShortcutAction::PushToTalk,
            enabled: true,
        },
        ShortcutConfig {
            id: "hands-free".to_string(),
            name: "Hands-free mode".to_string(),
            description: "Press to start and stop dictation".to_string(),
            keys: vec!["Ctrl".to_string(), "Shift".to_string(), "Space".to_string()],
            action: ShortcutAction::ToggleRecording,
            enabled: true,
        },
        stop_recording_default(),
        ShortcutConfig {
            id: "command-mode".to_string(),
            name: "Command Mode".to_string(),
            description: "Select text and ask Ghosty".to_string(),
            keys: vec!["Ctrl".to_string(), "Shift".to_string(), "E".to_string()],
            action: ShortcutAction::ActivateMode {
                mode_id: "light".to_string(),
            },
            enabled: true,
        },
        ShortcutConfig {
            id: "paste-last-output".to_string(),
            name: "Paste last transcript".to_string(),
            description: "Paste the last thing you dictated".to_string(),
            keys: vec!["Ctrl".to_string(), "Cmd".to_string(), "V".to_string()],
            action: ShortcutAction::PasteLastOutput,
            enabled: true,
        },
        ShortcutConfig {
            id: "open-dashboard".to_string(),
            name: "Open Dashboard".to_string(),
            description: "Open the main dashboard".to_string(),
            keys: vec!["Cmd".to_string(), "Shift".to_string(), "D".to_string()],
            action: ShortcutAction::OpenDashboard,
            enabled: true,
        },
    ]
}

pub fn reset_shortcuts(app: &tauri::AppHandle) -> Result<Vec<ShortcutConfig>, String> {
    let path = shortcuts_path(app)?;
    let defaults = default_shortcuts();
    save_to_file(&path, &defaults)?;
    Ok(load_from_file(&path))
}

fn shortcuts_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|e| e.to_string())
        .map(|p| p.join(SHORTCUTS_FILENAME))
}

fn load_from_file(path: &std::path::Path) -> Vec<ShortcutConfig> {
    std::fs::read_to_string(path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_else(default_shortcuts)
}

fn save_to_file(path: &std::path::Path, shortcuts: &[ShortcutConfig]) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(
        path,
        serde_json::to_string_pretty(shortcuts).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())
}

fn stop_recording_default() -> ShortcutConfig {
    ShortcutConfig {
        id: "stop-recording".to_string(),
        name: "Stop recording".to_string(),
        description: "Stop an ongoing recording (e.g. in hands-free mode).".to_string(),
        keys: vec!["Escape".to_string()],
        action: ShortcutAction::StopRecording,
        enabled: true,
    }
}

pub fn get_all_shortcuts(app: &tauri::AppHandle) -> Result<Vec<ShortcutConfig>, String> {
    let path = shortcuts_path(app)?;
    let mut shortcuts = load_from_file(&path);
    if !shortcuts.iter().any(|s| s.id == "stop-recording") {
        shortcuts.push(stop_recording_default());
        let _ = save_to_file(&path, &shortcuts);
    } else if let Some(s) = shortcuts.iter_mut().find(|s| s.id == "stop-recording") {
        // Migration: Space alone steals the key when typing; default to Escape
        if s.keys == vec!["Space".to_string()] {
            s.keys = vec!["Escape".to_string()];
            let _ = save_to_file(&path, &shortcuts);
        }
    }
    Ok(shortcuts)
}

pub fn save_shortcut(
    app: &tauri::AppHandle,
    mut shortcut: ShortcutConfig,
) -> Result<Vec<ShortcutConfig>, String> {
    let path = shortcuts_path(app)?;
    let mut shortcuts = load_from_file(&path);

    if shortcut.id.is_empty() {
        shortcut.id = uuid::Uuid::new_v4().to_string();
        shortcuts.push(shortcut);
    } else if let Some(existing) = shortcuts.iter_mut().find(|s| s.id == shortcut.id) {
        *existing = shortcut;
    } else {
        shortcuts.push(shortcut);
    }

    save_to_file(&path, &shortcuts)?;
    Ok(shortcuts)
}

pub fn delete_shortcut(
    app: &tauri::AppHandle,
    shortcut_id: String,
) -> Result<Vec<ShortcutConfig>, String> {
    let path = shortcuts_path(app)?;
    let mut shortcuts = load_from_file(&path);

    shortcuts.retain(|s| s.id != shortcut_id);

    save_to_file(&path, &shortcuts)?;
    Ok(shortcuts)
}

pub fn toggle_shortcut(
    app: &tauri::AppHandle,
    shortcut_id: String,
) -> Result<Vec<ShortcutConfig>, String> {
    let path = shortcuts_path(app)?;
    let mut shortcuts = load_from_file(&path);

    if let Some(shortcut) = shortcuts.iter_mut().find(|s| s.id == shortcut_id) {
        shortcut.enabled = !shortcut.enabled;
    }

    save_to_file(&path, &shortcuts)?;
    Ok(shortcuts)
}

/// Convert keys from config (e.g. ["Ctrl", "Shift", "V"]) to global_hotkey string "control+shift+KeyV".
/// Rejette la touche Fn (non supportée pour les raccourcis globaux sur macOS).
pub fn keys_to_shortcut_string(keys: &[String]) -> Result<String, String> {
    if keys.is_empty() {
        return Err("keys empty".to_string());
    }
    for k in keys.iter() {
        if k.eq_ignore_ascii_case("Fn") {
            return Err(
                "The Fn key cannot be used for global shortcuts on this system.".to_string(),
            );
        }
    }
    let mut mods = Vec::new();
    let mut main_key: Option<String> = None;
    for k in keys {
        let u = k.to_uppercase();
        match u.as_str() {
            "CTRL" | "CONTROL" => mods.push("control"),
            "CMD" | "COMMAND" | "SUPER" | "META" => mods.push("super"),
            "SHIFT" => mods.push("shift"),
            "ALT" | "OPTION" => mods.push("alt"),
            _ => {
                if main_key.is_some() {
                    return Err("more than one main key".to_string());
                }
                let key = if k.len() == 1 { format!("Key{}", u) } else { u };
                main_key = Some(key);
            }
        }
    }
    let main_key = main_key.ok_or("no main key".to_string())?;
    let key_part = if main_key.eq_ignore_ascii_case("space") {
        "Space".to_string()
    } else if main_key.len() == 1 || main_key.starts_with("Key") {
        main_key
    } else {
        format!("Key{}", main_key)
    };
    if mods.is_empty() && key_part == "Space" {
        return Err(
            "Space alone cannot be used as a global shortcut (it would block typing everywhere). Use a combination like Ctrl+Space or Option+Space.".to_string(),
        );
    }
    let mut s = mods.join("+");
    if !s.is_empty() {
        s.push('+');
    }
    s.push_str(&key_part);
    Ok(s)
}
