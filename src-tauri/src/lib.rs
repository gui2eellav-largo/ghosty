mod accessibility;
mod audio;
mod clipboard;
mod hotkey;
mod llm;
mod prompt_state;
mod secrets;
mod transcribe;

use tauri::Emitter;
use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut, ShortcutState};

#[tauri::command]
fn set_active_prompt(prompt: Option<String>, mode: Option<String>, state: tauri::State<prompt_state::ActivePromptState>) -> Result<(), String> {
    state.set(prompt)?;
    state.set_mode(mode)?;
    Ok(())
}

#[tauri::command]
fn set_window_click_through(window: tauri::Window, ignore: bool) -> Result<(), String> {
    window.set_ignore_cursor_events(ignore)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn resize_floating_window(window: tauri::Window, width: f64, height: f64) -> Result<(), String> {
    use tauri::LogicalSize;
    window.set_size(LogicalSize::new(width, height))
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn set_window_position(window: tauri::Window, x: f64, y: f64) -> Result<(), String> {
    use tauri::LogicalPosition;
    window.set_position(LogicalPosition::new(x, y))
        .map_err(|e| e.to_string())
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
async fn test_openai_key(key: String) -> Result<(), String> {
    secrets::test_api_key(&key).await
}

// ============================================================================
// MULTI-KEYS COMMANDS
// ============================================================================

#[tauri::command]
fn add_api_key_entry(name: String, provider: String, key: String) -> Result<String, String> {
    secrets::add_api_key(name, provider, key)
}

#[tauri::command]
fn remove_api_key_entry(key_id: String) -> Result<(), String> {
    secrets::remove_api_key(key_id)
}

#[tauri::command]
fn set_active_api_key(key_id: String) -> Result<(), String> {
    secrets::set_active_key(key_id)
}

#[tauri::command]
fn get_all_api_keys() -> Result<Vec<(String, String, String, bool)>, String> {
    secrets::get_all_keys()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _ = dotenvy::dotenv();

    let shortcut = Shortcut::new(
        Some(Modifiers::CONTROL | Modifiers::SHIFT),
        Code::Space,
    );

    let plugin = tauri_plugin_global_shortcut::Builder::new()
        .with_shortcut(shortcut)
        .expect("global shortcut")
        .with_handler(move |app, _shortcut, event| {
            match event.state() {
                ShortcutState::Pressed => {
                    let _ = app.emit("recording_started", ());
                    let _ = hotkey::on_recording_start(app.clone());
                }
                ShortcutState::Released => {
                    let _ = hotkey::on_recording_stop(app.clone());
                    let _ = app.emit("recording_stopped", ());
                }
            }
        })
        .build();

    tauri::Builder::default()
        .manage(audio::RecorderState::default())
        .manage(prompt_state::ActivePromptState::default())
        .invoke_handler(tauri::generate_handler![
            set_active_prompt,
            set_window_click_through,
            resize_floating_window,
            set_window_position,
            start_recording,
            stop_recording,
            set_openai_key,
            has_openai_key,
            delete_openai_key,
            test_openai_key,
            add_api_key_entry,
            remove_api_key_entry,
            set_active_api_key,
            get_all_api_keys
        ])
        .plugin(plugin)
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
