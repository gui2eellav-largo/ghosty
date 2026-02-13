/// Fonctionnalité « Mode texte / clic droit / Services macOS ».
const ENABLE_RIGHT_CLICK_SERVICES: bool = true;

mod accessibility;
mod audio;
mod clipboard;
mod dictionary;
mod errors;
mod hotkey;
mod http_client;
mod llm;
mod modes;
mod preferences;
mod prompt_state;
mod secrets;
mod services_installer;
mod shortcuts;
mod transcribe;
mod usage;

use std::collections::HashMap;
use std::sync::Mutex;
use std::time::Instant;
use tauri::Emitter;
use tauri::Manager;
use tauri_plugin_global_shortcut::{Shortcut, ShortcutState};
use tokio_util::sync::CancellationToken;

/// Token d'annulation du pipeline en cours. La commande cancel_transcription le déclenche.
pub struct PipelineCancel(pub Mutex<Option<CancellationToken>>);

impl PipelineCancel {
    fn guard(&self) -> std::sync::MutexGuard<'_, Option<CancellationToken>> {
        self.0
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
    }
    pub fn set(&self, token: CancellationToken) {
        *self.guard() = Some(token);
    }
    pub fn take_and_cancel(&self) {
        if let Some(t) = self.guard().take() {
            t.cancel();
        }
    }
    pub fn clear(&self) {
        *self.guard() = None;
    }
}

/// Instant de première entrée du curseur dans les bounds (pour focus après survol soutenu).
pub struct CursorInsideSince(pub Mutex<Option<Instant>>);

/// Dernière sortie (transcription + LLM) pour "Paste last output" dans le menu tray.
pub struct LastOutputState(pub Mutex<Option<String>>);

/// Mapping shortcut id -> config pour le handler des raccourcis globaux (chargé depuis shortcuts.json).
pub struct ShortcutMappingState(pub Mutex<HashMap<u32, shortcuts::ShortcutConfig>>);

/// Items de menu à coche (micro et langues) du tray, pour mettre à jour les coches après clic.
#[cfg(target_os = "macos")]
pub struct TrayCheckItems {
    pub mic_items: Vec<tauri::menu::CheckMenuItem<tauri::Wry>>,
    pub lang_items: Vec<tauri::menu::CheckMenuItem<tauri::Wry>>,
}

#[cfg(target_os = "macos")]
impl TrayCheckItems {
    fn set_mic_checked(&self, selected_id: &str) {
        for item in &self.mic_items {
            let _ = item.set_checked(item.id().0.as_str() == selected_id);
        }
    }
    fn set_lang_checked(&self, selected_id: &str) {
        for item in &self.lang_items {
            let _ = item.set_checked(item.id().0.as_str() == selected_id);
        }
    }
}

/// URLs used by tray menu items. Update for your repo/support.
const TRAY_URL_HELP: &str = "https://github.com/gui2eellav-largo/ghosty#readme";
const TRAY_URL_SUPPORT: &str = "mailto:support@ghosty.app";
const TRAY_URL_FEEDBACK: &str = "https://github.com/gui2eellav-largo/ghosty/issues";
const TRAY_URL_CHECK_UPDATES: &str = "https://github.com/gui2eellav-largo/ghosty/releases";

#[cfg(target_os = "macos")]
fn open_url(url: &str) -> Result<(), String> {
    std::process::Command::new("open")
        .arg(url)
        .status()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(not(target_os = "macos"))]
fn open_url(_url: &str) -> Result<(), String> {
    Ok(())
}

/// Liste les noms des workflows Ghosty actuellement installés dans ~/Library/Services/ (pour comparer avec les modes activés).
#[tauri::command]
fn list_installed_ghosty_services() -> Result<Vec<String>, String> {
    #[cfg(target_os = "macos")]
    {
        let home = std::env::var("HOME").map_err(|e| e.to_string())?;
        let services_dir = std::path::Path::new(&home).join("Library/Services");
        if !services_dir.exists() {
            return Ok(Vec::new());
        }
        let mut names = Vec::new();
        for entry in std::fs::read_dir(&services_dir).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let path = entry.path();
            if path.is_dir() {
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    if name.starts_with("Ghosty – ") && name.ends_with(".workflow") {
                        names.push(name.to_string());
                    }
                }
            }
        }
        names.sort();
        Ok(names)
    }
    #[cfg(not(target_os = "macos"))]
    {
        Ok(Vec::new())
    }
}

/// Ouvre le dossier Services macOS dans le Finder (pour y déposer les workflows Ghosty – clic droit).
#[tauri::command]
fn open_services_folder() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let home = std::env::var("HOME").map_err(|e| e.to_string())?;
        let path = std::path::Path::new(&home).join("Library/Services");
        if !path.exists() {
            std::fs::create_dir_all(&path).map_err(|e| e.to_string())?;
        }
        std::process::Command::new("open")
            .arg(&path)
            .status()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = ();
    }
    Ok(())
}

/// Installe les workflows Services macOS (clic droit) pour tous les modes actifs. Connexion directe aux modes actuels (built-in + customs).
#[tauri::command]
fn install_ghosty_services(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    #[cfg(target_os = "macos")]
    {
        let modes = modes::get_all_modes(&app)?;
        let enabled: Vec<_> = modes.into_iter().filter(|m| m.enabled).collect();
        if enabled.is_empty() {
            return Err("Aucun mode activé".to_string());
        }
        let home = std::env::var("HOME").map_err(|e| e.to_string())?;
        let services_dir = std::path::Path::new(&home).join("Library/Services");
        std::fs::create_dir_all(&services_dir).map_err(|e| e.to_string())?;
        let mut installed = Vec::with_capacity(enabled.len());
        for mode in &enabled {
            services_installer::write_workflow_for_mode(&services_dir, mode)?;
            installed.push(format!(
                "Ghosty – {}",
                mode.name.replace('/', "-").replace(':', " ")
            ));
        }
        Ok(installed)
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = app;
        Err("Services (clic droit) disponibles uniquement sur macOS".to_string())
    }
}

/// Extrait le mode depuis une URL ghosty://transform?mode=XXX
fn parse_ghosty_transform_mode(url: &str) -> Option<String> {
    let url = url.trim();
    if !url.starts_with("ghosty://transform") {
        return None;
    }
    let query = url
        .strip_prefix("ghosty://transform")?
        .trim_start_matches('?');
    for part in query.split('&') {
        if let Some(value) = part.strip_prefix("mode=") {
            let mode = value.split('&').next().unwrap_or(value).trim();
            if !mode.is_empty() {
                return Some(mode.to_string());
            }
            return None;
        }
    }
    None
}

#[tauri::command]
fn get_last_output(state: tauri::State<LastOutputState>) -> Result<Option<String>, String> {
    let guard = state.0.lock().map_err(|e| e.to_string())?;
    Ok(guard.clone())
}

#[tauri::command]
fn paste_last_output(app: tauri::AppHandle) -> Result<(), String> {
    let state = app
        .try_state::<LastOutputState>()
        .ok_or_else(|| "LastOutputState not found".to_string())?;
    let text = {
        let guard = state.0.lock().map_err(|e| e.to_string())?;
        guard.clone()
    };
    let Some(text) = text else {
        return Ok(());
    };
    crate::clipboard::copy_to_clipboard(&text, &app)?;
    crate::clipboard::auto_paste(&app)?;
    Ok(())
}

#[tauri::command]
fn cancel_transcription(state: tauri::State<PipelineCancel>) -> Result<(), String> {
    state.take_and_cancel();
    Ok(())
}

/// Transforme le texte du presse-papier avec le mode donné (LLM), met le résultat au presse-papier et optionnellement colle.
/// Utilisé par le flux clic droit (Services) : le système a déjà mis la sélection dans le presse-papier.
pub async fn run_transform_selection(app: tauri::AppHandle, mode_id: String) -> Result<(), String> {
    let text = clipboard::get_clipboard_text(&app)?;
    if text.trim().is_empty() {
        return Err("Aucune sélection".to_string());
    }
    let prompt = modes::get_mode_prompt(&app, &mode_id)?;
    let cancel = tokio_util::sync::CancellationToken::new();
    let result = if prompt.is_empty() {
        Ok(text.clone())
    } else {
        crate::llm::transform_text_streaming(&text, &prompt, &app, cancel).await
    };
    let full = result.map_err(|e| e.to_string())?;
    let output = if full.contains("---REFLECTION---") {
        full.splitn(2, "---REFLECTION---")
            .next()
            .unwrap_or("")
            .trim()
            .to_string()
    } else {
        full
    };
    let prefs = preferences::get_preferences(&app).unwrap_or_default();
    let text_to_copy = if prefs.behavior.paste_input_and_output && !prompt.is_empty() {
        format!("Original\n\n{}\n\nResult\n\n{}", text, output)
    } else {
        output.clone()
    };
    clipboard::copy_to_clipboard(&text_to_copy, &app)?;
    if prefs.behavior.auto_paste_after_transform {
        let app_main = app.clone();
        let _ = app.run_on_main_thread(move || {
            let _ = clipboard::auto_paste(&app_main);
        });
    }
    if let Some(state) = app.try_state::<LastOutputState>() {
        if let Ok(mut guard) = state.0.lock() {
            *guard = Some(output.clone());
        }
    }
    let _ = app.emit("transformation_ready", output);
    if prefs.behavior.sound_on_complete {
        let _ = app.emit_to("main", "play_completion_sound", ());
    }
    if prefs.behavior.system_notification {
        let _ = app.emit_to("main", "show_completion_notification", "Transformation ready");
    }
    Ok(())
}

#[tauri::command]
async fn transform_selection(app: tauri::AppHandle, mode_id: String) -> Result<(), String> {
    run_transform_selection(app, mode_id).await
}

#[tauri::command]
fn set_active_prompt(
    app: tauri::AppHandle,
    prompt: Option<String>,
    mode: Option<String>,
    state: tauri::State<prompt_state::ActivePromptState>,
) -> Result<(), String> {
    let resolved = if let Some(ref mode_id) = mode {
        if modes::is_builtin_mode(mode_id) {
            Some(modes::get_mode_prompt(&app, mode_id)?)
        } else {
            prompt.clone()
        }
    } else {
        prompt.clone()
    };
    state.set(resolved)?;
    state.set_mode(mode.clone())?;
    if let Some(mode_id) = mode {
        let _ = app.emit("active-mode-changed", &mode_id);
    }
    Ok(())
}

#[tauri::command]
async fn improve_system_prompt(app: tauri::AppHandle, prompt: String) -> Result<String, String> {
    crate::llm::improve_system_prompt(&prompt, &app).await
}

#[tauri::command]
fn set_window_click_through(window: tauri::Window, ignore: bool) -> Result<(), String> {
    window
        .set_ignore_cursor_events(ignore)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn resize_floating_window(window: tauri::Window, width: f64, height: f64) -> Result<(), String> {
    use tauri::LogicalSize;
    window
        .set_size(LogicalSize::new(width, height))
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn set_window_position(window: tauri::Window, x: f64, y: f64) -> Result<(), String> {
    use tauri::LogicalPosition;
    window
        .set_position(LogicalPosition::new(x, y))
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn set_floating_window_bounds(
    window: tauri::Window,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
) -> Result<(), String> {
    use tauri::{LogicalPosition, LogicalSize};
    #[cfg(debug_assertions)]
    write_menu_bounds_log(&format!(
        "RUST set_floating_window_bounds ENTER x={} y={} width={} height={}",
        x, y, width, height
    ));
    let _ = window.set_ignore_cursor_events(false);
    // Pas de hide/show : ça déclenche tauri://blur et le listener ferme le menu immédiatement.
    // Ordre position puis size : sur macOS set_size préserve le centre, donc size puis position
    // faisait sauter la fenêtre à gauche puis à droite ; position d'abord garde le bord gauche fixe.
    window
        .set_position(LogicalPosition::new(x, y))
        .map_err(|e| e.to_string())?;
    #[cfg(debug_assertions)]
    write_menu_bounds_log("RUST after set_position");
    window
        .set_size(LogicalSize::new(width, height))
        .map_err(|e| e.to_string())?;
    #[cfg(debug_assertions)]
    write_menu_bounds_log("RUST after set_size");
    // Focus uniquement à l'agrandissement (menu) pour réduire l'effet transparent 1 frame.
    if width > 100.0 {
        let _ = window.set_focus();
    }
    Ok(())
}

const CURSOR_INSIDE_FOCUS_DELAY_MS: u64 = 300;

/// Donne le focus à la fenêtre flottante si le curseur est resté dans ses bounds au moins 300 ms.
/// Évite de voler le focus au navigateur lors d'un simple passage du curseur.
#[tauri::command]
fn focus_floating_if_cursor_inside(
    app: tauri::AppHandle,
    state: tauri::State<CursorInsideSince>,
) -> Result<(), String> {
    let window = app
        .get_webview_window("floating")
        .ok_or_else(|| "floating window not found".to_string())?;

    let pos = window.outer_position().map_err(|e| e.to_string())?;
    let size = window.outer_size().map_err(|e| e.to_string())?;
    let pos = (pos.x as f64, pos.y as f64);
    let size = (size.width as f64, size.height as f64);

    let (mx, my) = match mouse_position::mouse_position::Mouse::get_mouse_position() {
        mouse_position::mouse_position::Mouse::Position { x, y } => (x as f64, y as f64),
        _ => return Ok(()),
    };

    let inside = {
        #[cfg(target_os = "macos")]
        {
            let mon = match window.current_monitor() {
                Ok(Some(m)) => m,
                _ => return Ok(()),
            };
            let scale = window.scale_factor().unwrap_or(1.0);
            let mon_pos = mon.position();
            let mon_x = mon_pos.x as f64;
            let mon_y = mon_pos.y as f64;
            let win_in_mon_x = (pos.0 - mon_x) / scale;
            let win_in_mon_y = (pos.1 - mon_y) / scale;
            let size_x = size.0 / scale;
            let size_y = size.1 / scale;
            mx >= win_in_mon_x
                && mx < win_in_mon_x + size_x
                && my >= win_in_mon_y
                && my < win_in_mon_y + size_y
        }
        #[cfg(not(target_os = "macos"))]
        {
            mx >= pos.0 && mx < pos.0 + size.0 && my >= pos.1 && my < pos.1 + size.1
        }
    };

    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    if inside {
        let now = Instant::now();
        let do_focus = match *guard {
            Some(since) => {
                now.duration_since(since).as_millis() >= CURSOR_INSIDE_FOCUS_DELAY_MS as u128
            }
            None => {
                *guard = Some(now);
                false
            }
        };
        if do_focus {
            let _ = window.set_focus();
        }
    } else {
        *guard = None;
    }
    Ok(())
}

/// Debug-only: log path and writer are not compiled in release (no file I/O).
#[cfg(debug_assertions)]
fn menu_bounds_log_path() -> std::path::PathBuf {
    std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap_or(std::path::Path::new("."))
        .join(".cursor")
        .join("menu-bounds-debug.log")
}

#[cfg(debug_assertions)]
fn write_menu_bounds_log(msg: &str) {
    let path = menu_bounds_log_path();
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let ts = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis().to_string())
        .unwrap_or_else(|_| "?".to_string());
    let line = format!("{} {}\n", ts, msg);
    let _ = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .and_then(|mut f| std::io::Write::write_all(&mut f, line.as_bytes()));
}

/// No-op in release; only writes to .cursor/menu-bounds-debug.log in debug builds.
#[tauri::command]
fn menu_bounds_log(line: String) {
    #[cfg(debug_assertions)]
    write_menu_bounds_log(&line);
}

/// No-op in release; only writes to .cursor/debug.log in debug builds.
#[tauri::command]
fn debug_log(line: String) {
    #[cfg(debug_assertions)]
    {
        let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .unwrap_or(std::path::Path::new("."))
            .join(".cursor")
            .join("debug.log");
        if let Some(parent) = path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        let _ = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&path)
            .and_then(|mut f| std::io::Write::write_all(&mut f, format!("{}\n", line).as_bytes()));
    }
}

#[tauri::command]
fn start_recording(app: tauri::AppHandle) -> Result<(), String> {
    let _ = app.emit("recording_started", ());
    hotkey::on_recording_start(app)
}

#[tauri::command]
fn stop_recording(app: tauri::AppHandle) -> Result<(), String> {
    let _ = hotkey::on_recording_stop(app.clone());
    let _ = app.emit("recording_stopped", ());
    Ok(())
}

#[tauri::command]
fn set_openai_key(key: String) -> Result<(), String> {
    secrets::set_api_key(key)
}

#[tauri::command]
fn has_openai_key() -> bool {
    secrets::has_api_key()
}

#[tauri::command]
fn delete_openai_key() -> Result<(), String> {
    secrets::delete_api_key()
}

#[tauri::command]
async fn test_openai_key(key: String) -> Result<(), errors::ApiKeyError> {
    secrets::test_api_key(&key)
        .await
        .map_err(|s| errors::parse_api_key_error(&s))
}

// ============================================================================
// MULTI-KEYS COMMANDS (erreurs structurées)
// ============================================================================

#[tauri::command]
fn add_api_key_entry(
    name: String,
    provider: String,
    key: String,
) -> Result<String, errors::ApiKeyError> {
    secrets::add_api_key(name, provider, key).map_err(|s| errors::parse_api_key_error(&s))
}

#[tauri::command]
fn remove_api_key_entry(key_id: String) -> Result<(), errors::ApiKeyError> {
    secrets::remove_api_key(key_id).map_err(|s| errors::parse_api_key_error(&s))
}

#[tauri::command]
fn set_active_api_key(key_id: String) -> Result<(), errors::ApiKeyError> {
    secrets::set_active_key(key_id).map_err(|s| errors::parse_api_key_error(&s))
}

#[tauri::command]
fn get_all_api_keys() -> Result<Vec<(String, String, String, bool)>, errors::ApiKeyError> {
    secrets::get_all_keys().map_err(|s| errors::parse_api_key_error(&s))
}

// ============================================================================
// USAGE TRACKING
// ============================================================================

#[tauri::command]
fn get_usage_stats(app: tauri::AppHandle) -> usage::UsageStats {
    usage::get_usage_stats(&app)
}

#[tauri::command]
fn reset_usage_stats(app: tauri::AppHandle) -> usage::UsageStats {
    usage::reset_usage_stats(&app)
}

// ============================================================================
// PREFERENCES
// ============================================================================

#[tauri::command]
fn get_app_preferences(app: tauri::AppHandle) -> Result<preferences::Preferences, String> {
    preferences::get_preferences(&app)
}

#[tauri::command]
fn set_app_preferences(
    app: tauri::AppHandle,
    prefs: preferences::Preferences,
) -> Result<preferences::Preferences, String> {
    preferences::set_preferences(&app, &prefs)?;
    preferences::get_preferences(&app)
}

#[tauri::command]
fn update_app_preferences(
    app: tauri::AppHandle,
    partial: serde_json::Value,
) -> Result<preferences::Preferences, String> {
    let prefs = preferences::update_preferences(&app, partial)?;
    let _ = app.emit("preferences-updated", ());
    Ok(prefs)
}

// ============================================================================
// MODES
// ============================================================================

#[tauri::command]
fn get_all_modes(app: tauri::AppHandle) -> Result<Vec<modes::ModeConfig>, String> {
    modes::get_all_modes_masked(&app)
}

#[tauri::command]
fn save_mode(
    app: tauri::AppHandle,
    mode: modes::ModeConfig,
) -> Result<Vec<modes::ModeConfig>, String> {
    let result = modes::save_mode(&app, mode)?;
    let _ = app.emit("modes-updated", ());
    Ok(result)
}

#[tauri::command]
fn delete_mode(app: tauri::AppHandle, mode_id: String) -> Result<Vec<modes::ModeConfig>, String> {
    let result = modes::delete_mode(&app, mode_id)?;
    let _ = app.emit("modes-updated", ());
    Ok(result)
}

#[tauri::command]
fn reorder_modes(
    app: tauri::AppHandle,
    mode_ids: Vec<String>,
) -> Result<Vec<modes::ModeConfig>, String> {
    let result = modes::reorder_modes(&app, mode_ids)?;
    let _ = app.emit("modes-updated", ());
    Ok(result)
}

// ============================================================================
// SHORTCUTS
// ============================================================================

#[tauri::command]
fn get_all_shortcuts(app: tauri::AppHandle) -> Result<Vec<shortcuts::ShortcutConfig>, String> {
    shortcuts::get_all_shortcuts(&app)
}

#[tauri::command]
fn save_shortcut(
    app: tauri::AppHandle,
    shortcut: shortcuts::ShortcutConfig,
) -> Result<Vec<shortcuts::ShortcutConfig>, String> {
    shortcuts::save_shortcut(&app, shortcut)
}

#[tauri::command]
fn delete_shortcut(
    app: tauri::AppHandle,
    shortcut_id: String,
) -> Result<Vec<shortcuts::ShortcutConfig>, String> {
    shortcuts::delete_shortcut(&app, shortcut_id)
}

#[tauri::command]
fn toggle_shortcut(
    app: tauri::AppHandle,
    shortcut_id: String,
) -> Result<Vec<shortcuts::ShortcutConfig>, String> {
    shortcuts::toggle_shortcut(&app, shortcut_id)
}

#[tauri::command]
fn reset_shortcuts(app: tauri::AppHandle) -> Result<Vec<shortcuts::ShortcutConfig>, String> {
    shortcuts::reset_shortcuts(&app)
}

#[tauri::command]
fn list_audio_input_devices() -> Result<Vec<audio::AudioInputDevice>, String> {
    audio::list_input_devices()
}

// ============================================================================
// DICTIONARY
// ============================================================================

#[tauri::command]
fn get_dictionary_entries(
    app: tauri::AppHandle,
) -> Result<Vec<dictionary::DictionaryEntry>, String> {
    dictionary::get_all_entries(&app)
}

#[tauri::command]
fn add_dictionary_entry(
    app: tauri::AppHandle,
    word: String,
    entry_type: String,
    pronunciation: Option<String>,
    misspellings: Option<Vec<String>>,
) -> Result<dictionary::DictionaryEntry, String> {
    dictionary::add_entry(&app, word, entry_type, pronunciation, misspellings)
}

#[tauri::command]
fn update_dictionary_entry(
    app: tauri::AppHandle,
    id: String,
    word: Option<String>,
    entry_type: Option<String>,
    pronunciation: Option<String>,
    misspellings: Option<Vec<String>>,
) -> Result<dictionary::DictionaryEntry, String> {
    dictionary::update_entry(&app, id, word, entry_type, pronunciation, misspellings)
}

#[tauri::command]
fn delete_dictionary_entry(app: tauri::AppHandle, id: String) -> Result<(), String> {
    dictionary::delete_entry(&app, id)
}

#[tauri::command]
fn import_dictionary_entries(
    app: tauri::AppHandle,
    entries: Vec<dictionary::DictionaryEntry>,
) -> Result<Vec<dictionary::DictionaryEntry>, String> {
    dictionary::import_entries(&app, entries)
}

#[tauri::command]
fn export_dictionary_entries(app: tauri::AppHandle) -> Result<String, String> {
    dictionary::export_entries(&app)
}

/// Teste si une combinaison de touches est disponible (non prise par le système ou une autre app).
/// Enregistre puis désenregistre le raccourci pour vérifier.
#[tauri::command]
fn check_shortcut_available(app: tauri::AppHandle, keys: Vec<String>) -> Result<(), String> {
    #[cfg(desktop)]
    {
        use tauri_plugin_global_shortcut::GlobalShortcutExt;
        let s = shortcuts::keys_to_shortcut_string(&keys).map_err(|e| e.to_string())?;
        let shortcut: Shortcut = s.parse().map_err(|e| format!("{}", e))?;
        app.global_shortcut()
            .register(shortcut)
            .map_err(|e| e.to_string())?;
        let shortcut2: Shortcut = s.parse().map_err(|e| format!("{}", e))?;
        app.global_shortcut()
            .unregister(shortcut2)
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn reregister_shortcuts(app: tauri::AppHandle) -> Result<(), String> {
    #[cfg(desktop)]
    {
        use tauri_plugin_global_shortcut::GlobalShortcutExt;
        app.global_shortcut()
            .unregister_all()
            .map_err(|e| e.to_string())?;
        let configs = shortcuts::get_all_shortcuts(&app).map_err(|e| e.to_string())?;
        let mut mapping = HashMap::new();
        let mut to_register = Vec::new();
        for c in configs {
            if !c.enabled {
                continue;
            }
            if let Ok(s) = shortcuts::keys_to_shortcut_string(&c.keys) {
                if let Ok(shortcut) = s.parse::<Shortcut>() {
                    mapping.insert(shortcut.id(), c.clone());
                    to_register.push(shortcut);
                }
            }
        }
        if let Some(state) = app.try_state::<ShortcutMappingState>() {
            if let Ok(mut guard) = state.0.lock() {
                *guard = mapping;
            }
        }
        if !to_register.is_empty() {
            app.global_shortcut()
                .register_multiple(to_register)
                .map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

fn run_shortcut_action(
    app: &tauri::AppHandle,
    config: &shortcuts::ShortcutConfig,
    state: ShortcutState,
) {
    use shortcuts::ShortcutAction;
    match &config.action {
        ShortcutAction::PushToTalk => match state {
            ShortcutState::Pressed => {
                let _ = app.emit("recording_started", ());
                let _ = hotkey::on_recording_start(app.clone());
            }
            ShortcutState::Released => {
                let recording = app
                    .try_state::<audio::RecorderState>()
                    .map(|s| s.is_capturing())
                    .unwrap_or(false);
                if recording {
                    let _ = hotkey::on_recording_stop(app.clone());
                    let _ = app.emit("recording_stopped", ());
                }
            }
        },
        ShortcutAction::ToggleRecording if state == ShortcutState::Pressed => {
            let recording = app
                .try_state::<audio::RecorderState>()
                .map(|s| s.is_capturing())
                .unwrap_or(false);
            if recording {
                let _ = hotkey::on_recording_stop(app.clone());
                let _ = app.emit("recording_stopped", ());
            } else {
                let _ = app.emit("recording_started", ());
                let _ = hotkey::on_recording_start(app.clone());
            }
        }
        ShortcutAction::StartRecording if state == ShortcutState::Pressed => {
            let _ = app.emit("recording_started", ());
            let _ = hotkey::on_recording_start(app.clone());
        }
        ShortcutAction::StopRecording if state == ShortcutState::Pressed => {
            let recording = app
                .try_state::<audio::RecorderState>()
                .map(|s| s.is_capturing())
                .unwrap_or(false);
            if recording {
                let _ = hotkey::on_recording_stop(app.clone());
                let _ = app.emit("recording_stopped", ());
            }
        }
        ShortcutAction::PasteLastOutput if state == ShortcutState::Pressed => {
            let _ = paste_last_output(app.clone());
        }
        ShortcutAction::OpenDashboard if state == ShortcutState::Pressed => {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.show();
                let _ = w.unminimize();
                let _ = w.set_focus();
            }
        }
        ShortcutAction::ActivateMode { mode_id } if state == ShortcutState::Pressed => {
            let _ = app.emit("activate-mode", mode_id.clone());
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.show();
                let _ = w.set_focus();
            }
        }
        ShortcutAction::ToggleFloatingBar if state == ShortcutState::Pressed => {
            let _ = app.emit("toggle-floating-bar", ());
        }
        _ => {}
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _ = dotenvy::dotenv();

    let plugin = tauri_plugin_global_shortcut::Builder::new()
        .with_handler(move |app, shortcut, event| {
            let id = shortcut.id();
            if let Some(mapping) = app.try_state::<ShortcutMappingState>() {
                if let Ok(guard) = mapping.0.lock() {
                    if let Some(config) = guard.get(&id) {
                        if !config.enabled {
                            return;
                        }
                        run_shortcut_action(app, config, event.state());
                    }
                }
            }
        })
        .build();

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            #[cfg(desktop)]
            {
                use tauri_plugin_autostart::ManagerExt;
                use tauri_plugin_global_shortcut::GlobalShortcutExt;

                let configs = shortcuts::get_all_shortcuts(&app.handle()).unwrap_or_else(|_| shortcuts::default_shortcuts());
                let mut mapping = HashMap::new();
                let mut to_register = Vec::new();
                for c in configs {
                    if !c.enabled {
                        continue;
                    }
                    if let Ok(s) = shortcuts::keys_to_shortcut_string(&c.keys) {
                        if let Ok(shortcut) = s.parse::<Shortcut>() {
                            mapping.insert(shortcut.id(), c.clone());
                            to_register.push(shortcut);
                        }
                    }
                }
                app.manage(ShortcutMappingState(Mutex::new(mapping)));
                if !to_register.is_empty() {
                    let _ = app.handle().global_shortcut().register_multiple(to_register);
                }

                let _ = app.handle().plugin(tauri_plugin_autostart::init(
                    tauri_plugin_autostart::MacosLauncher::LaunchAgent,
                    None,
                ));
                if let Ok(prefs) = preferences::get_preferences(&app.handle()) {
                    let mgr = app.handle().autolaunch();
                    if prefs.general.launch_at_login {
                        let _ = mgr.enable();
                    } else {
                        let _ = mgr.disable();
                    }
                }

                #[cfg(target_os = "macos")]
                {
                    use tauri::menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem, Submenu};
                    use tauri::tray::TrayIconBuilder;

                    let prefs = preferences::get_preferences(&app.handle()).unwrap_or_default();
                    let current_mic = prefs.recording.input_device_id.as_deref();
                    let current_lang = prefs.transcription.language.as_deref();

                    let dashboard_i = MenuItem::with_id(app, "tray_dashboard", "Dashboard", true, None::<&str>)?;
                    let sep1 = PredefinedMenuItem::separator(app)?;
                    let paste_i = MenuItem::with_id(app, "tray_paste_last", "Paste last output", true, Some("Ctrl+Command+V"))?;
                    let check_updates_i = MenuItem::with_id(app, "tray_check_updates", "Check for updates…", true, None::<&str>)?;
                    let sep2 = PredefinedMenuItem::separator(app)?;
                    let shortcuts_i = MenuItem::with_id(app, "tray_shortcuts", "Shortcuts", true, None::<&str>)?;

                    let devices = audio::list_input_devices().unwrap_or_default();
                    let mic_default_i = CheckMenuItem::with_id(
                        app,
                        "tray_mic_default",
                        "Default",
                        true,
                        current_mic.is_none(),
                        None::<&str>,
                    )?;
                    let mic_device_items: Vec<CheckMenuItem<tauri::Wry>> = devices
                        .iter()
                        .enumerate()
                        .map(|(i, d)| {
                            let checked = current_mic.map(|id| d.id.as_str() == id).unwrap_or(false);
                            CheckMenuItem::with_id(
                                app,
                                &format!("tray_mic_{}", i),
                                &d.name,
                                true,
                                checked,
                                None::<&str>,
                            )
                            .unwrap()
                        })
                        .collect();
                    let mut mic_items: Vec<CheckMenuItem<tauri::Wry>> = vec![mic_default_i];
                    mic_items.extend(mic_device_items);
                    let mic_refs: Vec<&dyn tauri::menu::IsMenuItem<tauri::Wry>> =
                        mic_items.iter().map(|i| i as &dyn tauri::menu::IsMenuItem<tauri::Wry>).collect();
                    let mic_submenu = Submenu::with_id_and_items(
                        app,
                        "tray_mic",
                        "Microphone",
                        true,
                        &mic_refs,
                    )?;

                    const TRAY_LANGS: &[(&str, &str)] = &[
                        ("tray_lang_default", "Default"),
                        ("tray_lang_fr", "French"),
                        ("tray_lang_en", "English"),
                        ("tray_lang_es", "Spanish"),
                        ("tray_lang_de", "German"),
                    ];
                    let lang_items: Vec<CheckMenuItem<tauri::Wry>> = TRAY_LANGS
                        .iter()
                        .map(|(id, label)| {
                            let checked = match *id {
                                "tray_lang_default" => current_lang.is_none(),
                                "tray_lang_fr" => current_lang == Some("fr"),
                                "tray_lang_en" => current_lang == Some("en"),
                                "tray_lang_es" => current_lang == Some("es"),
                                "tray_lang_de" => current_lang == Some("de"),
                                _ => false,
                            };
                            CheckMenuItem::with_id(app, id, label, true, checked, None::<&str>).unwrap()
                        })
                        .collect();
                    let lang_refs: Vec<&dyn tauri::menu::IsMenuItem<tauri::Wry>> =
                        lang_items.iter().map(|i| i as &dyn tauri::menu::IsMenuItem<tauri::Wry>).collect();
                    let lang_submenu = Submenu::with_id_and_items(
                        app,
                        "tray_lang",
                        "Languages",
                        true,
                        &lang_refs,
                    )?;

                    let tray_check_items = TrayCheckItems {
                        mic_items,
                        lang_items,
                    };
                    app.manage(tray_check_items);

                    let sep3 = PredefinedMenuItem::separator(app)?;
                    let help_i = MenuItem::with_id(app, "tray_help", "Help Center", true, None::<&str>)?;
                    let support_i = MenuItem::with_id(app, "tray_support", "Talk to support", true, Some("Command+:"))?;
                    let feedback_i = MenuItem::with_id(app, "tray_feedback", "General feedback", true, None::<&str>)?;
                    let sep4 = PredefinedMenuItem::separator(app)?;
                    let quit_i = PredefinedMenuItem::quit(app, Some("Quit Ghosty"))?;

                    let menu = Menu::with_items(
                        app,
                        &[
                            &dashboard_i,
                            &sep1,
                            &paste_i,
                            &check_updates_i,
                            &sep2,
                            &shortcuts_i,
                            &mic_submenu,
                            &lang_submenu,
                            &sep3,
                            &help_i,
                            &support_i,
                            &feedback_i,
                            &sep4,
                            &quit_i,
                        ],
                    )?;

                    let _tray = TrayIconBuilder::new()
                        .icon(app.default_window_icon().unwrap().clone())
                        .menu(&menu)
                        .show_menu_on_left_click(true)
                        .on_menu_event(move |app, event| {
                            let id = event.id().0.as_str();
                            match id {
                                "tray_dashboard" => {
                                    if let Some(w) = app.get_webview_window("main") {
                                        let _ = w.show();
                                        let _ = w.unminimize();
                                        let _ = w.set_focus();
                                    }
                                }
                                "tray_paste_last" => {
                                    let text: Option<String> = app
                                        .try_state::<LastOutputState>()
                                        .and_then(|s| s.0.lock().ok().map(|g| g.clone()))
                                        .flatten();
                                    if let Some(t) = text {
                                        let _ = crate::clipboard::copy_to_clipboard(&t, app);
                                        let _ = crate::clipboard::auto_paste(app);
                                    }
                                }
                                "tray_check_updates" => {
                                    let _ = open_url(TRAY_URL_CHECK_UPDATES);
                                }
                                "tray_shortcuts" => {
                                    if let Some(w) = app.get_webview_window("main") {
                                        let _ = w.show();
                                        let _ = w.unminimize();
                                        let _ = w.set_focus();
                                    }
                                    let _ = app.emit("open-settings-section", "shortcuts");
                                }
                                id if id == "tray_mic_default" => {
                                    let opt: Option<String> = None;
                                    let partial = serde_json::json!({ "recording": { "inputDeviceId": opt } });
                                    if preferences::update_preferences(app, partial).is_ok() {
                                        if let Some(state) = app.try_state::<TrayCheckItems>() {
                                            state.set_mic_checked(id);
                                        }
                                        let _ = app.emit("preferences-updated", ());
                                    }
                                }
                                id if id.starts_with("tray_mic_") => {
                                    if let Some(idx_str) = id.strip_prefix("tray_mic_") {
                                        if let Ok(idx) = idx_str.parse::<usize>() {
                                            if let Ok(devices) = audio::list_input_devices() {
                                                if let Some(d) = devices.get(idx) {
                                                    let partial = serde_json::json!({ "recording": { "inputDeviceId": d.id } });
                                                    if preferences::update_preferences(app, partial).is_ok() {
                                                        if let Some(state) = app.try_state::<TrayCheckItems>() {
                                                            state.set_mic_checked(id);
                                                        }
                                                        let _ = app.emit("preferences-updated", ());
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                                id if id == "tray_lang_default" => {
                                    let opt: Option<String> = None;
                                    let partial = serde_json::json!({ "transcription": { "language": opt } });
                                    if preferences::update_preferences(app, partial).is_ok() {
                                        if let Some(state) = app.try_state::<TrayCheckItems>() {
                                            state.set_lang_checked(id);
                                        }
                                        let _ = app.emit("preferences-updated", ());
                                    }
                                }
                                id if id.starts_with("tray_lang_") => {
                                    if let Some(code) = id.strip_prefix("tray_lang_") {
                                        let lang = if code.is_empty() {
                                            None
                                        } else {
                                            Some(code.to_string())
                                        };
                                        let partial = serde_json::json!({ "transcription": { "language": lang } });
                                        if preferences::update_preferences(app, partial).is_ok() {
                                            if let Some(state) = app.try_state::<TrayCheckItems>() {
                                                state.set_lang_checked(id);
                                            }
                                            let _ = app.emit("preferences-updated", ());
                                        }
                                    }
                                }
                                "tray_help" => {
                                    let _ = open_url(TRAY_URL_HELP);
                                }
                                "tray_support" => {
                                    let _ = open_url(TRAY_URL_SUPPORT);
                                }
                                "tray_feedback" => {
                                    let _ = open_url(TRAY_URL_FEEDBACK);
                                }
                                _ => {}
                            }
                        })
                        .build(app)?;
                }

                if ENABLE_RIGHT_CLICK_SERVICES {
                    use tauri_plugin_deep_link::DeepLinkExt;
                    let handle = app.handle().clone();
                    if let Ok(Some(urls)) = handle.deep_link().get_current() {
                        for url in urls {
                            if let Some(mode_id) = parse_ghosty_transform_mode(url.as_str()) {
                                let app = handle.clone();
                                tauri::async_runtime::spawn(async move {
                                    let _ = run_transform_selection(app, mode_id).await;
                                });
                                break;
                            }
                        }
                    }
                    let handle_for_callback = handle.clone();
                    handle.deep_link().on_open_url(move |event| {
                        for url in event.urls() {
                            if let Some(mode_id) = parse_ghosty_transform_mode(url.as_str()) {
                                let app = handle_for_callback.clone();
                                tauri::async_runtime::spawn(async move {
                                    let _ = run_transform_selection(app, mode_id).await;
                                });
                                break;
                            }
                        }
                    });
                }
            }
            Ok(())
        })
        .manage(audio::RecorderState::default())
        .manage(prompt_state::ActivePromptState::default())
        .manage(PipelineCancel(Mutex::new(None)))
        .manage(CursorInsideSince(Mutex::new(None)))
        .manage(LastOutputState(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            get_last_output,
            paste_last_output,
            cancel_transcription,
            set_active_prompt,
            set_window_click_through,
            resize_floating_window,
            set_window_position,
            set_floating_window_bounds,
            focus_floating_if_cursor_inside,
            menu_bounds_log,
            debug_log,
            start_recording,
            stop_recording,
            set_openai_key,
            has_openai_key,
            delete_openai_key,
            test_openai_key,
            add_api_key_entry,
            remove_api_key_entry,
            set_active_api_key,
            get_all_api_keys,
            get_usage_stats,
            reset_usage_stats,
            get_app_preferences,
            set_app_preferences,
            update_app_preferences,
            get_all_modes,
            save_mode,
            delete_mode,
            reorder_modes,
            get_all_shortcuts,
            save_shortcut,
            delete_shortcut,
            toggle_shortcut,
            reset_shortcuts,
            reregister_shortcuts,
            check_shortcut_available,
            list_audio_input_devices,
            transform_selection,
            improve_system_prompt,
            list_installed_ghosty_services,
            open_services_folder,
            install_ghosty_services,
            get_dictionary_entries,
            add_dictionary_entry,
            update_dictionary_entry,
            delete_dictionary_entry,
            import_dictionary_entries,
            export_dictionary_entries
        ])
        .plugin(tauri_plugin_deep_link::init())
        .plugin(plugin);
    if let Err(e) = app.run(tauri::generate_context!()) {
        eprintln!("Tauri application error: {}", e);
        std::process::exit(1);
    }
}
