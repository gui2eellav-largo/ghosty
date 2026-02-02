use tauri::Manager;

use crate::audio;

pub fn on_recording_start(app: tauri::AppHandle) -> Result<(), String> {
    let state = app
        .try_state::<audio::RecorderState>()
        .ok_or_else(|| "RecorderState not found".to_string())?;
    state.start_capture(app.clone())
}

pub fn on_recording_stop(app: tauri::AppHandle) -> Result<(), String> {
    let state = app
        .try_state::<audio::RecorderState>()
        .ok_or_else(|| "RecorderState not found".to_string())?;
    state.stop_capture()
}
