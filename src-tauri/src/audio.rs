use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::Sample;
use std::io::Write;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc;
use std::sync::{Arc, Mutex};
use tauri::Emitter;
use tauri::Manager;

#[derive(Clone, Debug, serde::Serialize)]
pub struct AudioInputDevice {
    pub id: String,
    pub name: String,
}

/// List available audio input devices. Uses device name as id for persistence.
pub fn list_input_devices() -> Result<Vec<AudioInputDevice>, String> {
    let host = cpal::default_host();
    let devices = host.devices().map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for device in devices {
        if device.default_input_config().is_ok() {
            if let Ok(name) = device.name() {
                out.push(AudioInputDevice {
                    id: name.clone(),
                    name,
                });
            }
        }
    }
    Ok(out)
}

// Défaut (2 min) pour tests; en prod on utilise preferences::max_recording_samples(app)
#[allow(dead_code)]
const DEFAULT_MAX_RECORDING_SAMPLES: usize = 16000 * 60 * 2;

#[derive(Clone, serde::Serialize)]
struct TranscriptionReadyPayload {
    output: String,
    thoughts: Option<String>,
    mode: Option<String>,
}

pub enum AudioCommand {
    Start,
    Stop,
}

pub struct RecorderState {
    cmd_tx: Mutex<Option<mpsc::Sender<AudioCommand>>>,
    is_capturing: AtomicBool,
}

impl Default for RecorderState {
    fn default() -> Self {
        Self {
            cmd_tx: Mutex::new(None),
            is_capturing: AtomicBool::new(false),
        }
    }
}

impl RecorderState {
    pub fn is_capturing(&self) -> bool {
        self.is_capturing.load(Ordering::Relaxed)
    }

    /// Utilisé par le worker quand start_stream échoue pour réaligner l’état.
    pub fn set_capturing(&self, value: bool) {
        self.is_capturing.store(value, Ordering::Relaxed);
    }

    pub fn start_capture(&self, app: tauri::AppHandle) -> Result<(), String> {
        if self.is_capturing.swap(true, Ordering::Relaxed) {
            return Ok(());
        }
        let mut guard = self.cmd_tx.lock().map_err(|e| e.to_string())?;
        if guard.is_none() {
            let (tx, rx) = mpsc::channel();
            std::thread::spawn(move || run_audio_worker(rx, app));
            *guard = Some(tx);
        }
        if let Some(ref tx) = *guard {
            tx.send(AudioCommand::Start).map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    pub fn stop_capture(&self) -> Result<(), String> {
        if !self.is_capturing.swap(false, Ordering::Relaxed) {
            return Ok(());
        }
        let guard = self.cmd_tx.lock().map_err(|e| e.to_string())?;
        if let Some(ref tx) = *guard {
            tx.send(AudioCommand::Stop).map_err(|e| e.to_string())?;
        }
        Ok(())
    }
}

const CANCELLED_MSG: &str = "Annulé";

fn light_fast_path(s: &str) -> String {
    let trimmed = s.trim();
    if trimmed.is_empty() {
        return String::new();
    }
    let collapsed: String = trimmed.split_whitespace().collect::<Vec<_>>().join(" ");
    let mut result = String::with_capacity(collapsed.len() + 1);
    let mut chars = collapsed.chars();
    if let Some(first) = chars.next() {
        result.extend(first.to_uppercase());
        result.extend(chars);
    }
    result = result.trim_end().to_string();
    if let Some(last) = result.chars().last() {
        if last != '.' && last != '?' && last != '!' {
            result.push('.');
        }
    }
    result
}

async fn run_pipeline(
    cancel: tokio_util::sync::CancellationToken,
    wav_bytes: Vec<u8>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let transcribed_text = tokio::select! {
        _ = cancel.cancelled() => return Err(CANCELLED_MSG.to_string()),
        r = crate::transcribe::transcribe_bytes(wav_bytes, &app) => r?,
    };
    crate::usage::increment_transcription(&app);
    let prompt_state = app.try_state::<crate::prompt_state::ActivePromptState>();
    let mode_prompt = prompt_state.as_ref().and_then(|s| s.get().ok()).flatten();
    let active_mode = prompt_state
        .as_ref()
        .and_then(|s| s.get_mode().ok())
        .flatten();

    let final_text = if active_mode.as_deref() == Some("light") {
        light_fast_path(&transcribed_text)
    } else if let Some(ref prompt) = mode_prompt {
        if !prompt.is_empty() {
            match crate::llm::transform_text_streaming(
                &transcribed_text,
                prompt,
                &app,
                cancel.clone(),
            )
            .await
            {
                Ok(t) => {
                    crate::usage::increment_llm(&app, 0, 0);
                    t
                }
                Err(e) => {
                    if e == CANCELLED_MSG {
                        return Err(CANCELLED_MSG.to_string());
                    }
                    eprintln!("Erreur transformation LLM: {}", e);
                    transcribed_text.clone()
                }
            }
        } else {
            transcribed_text.clone()
        }
    } else {
        transcribed_text.clone()
    };

    let payload = if final_text.contains("---REFLECTION---") {
        let parts: Vec<&str> = final_text.splitn(2, "---REFLECTION---").collect();
        let output = parts[0].trim().to_string();
        let thoughts = parts
            .get(1)
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty());
        TranscriptionReadyPayload {
            output: output.clone(),
            thoughts,
            mode: active_mode.clone(),
        }
    } else {
        TranscriptionReadyPayload {
            output: final_text.clone(),
            thoughts: None,
            mode: active_mode.clone(),
        }
    };

    let prefs = crate::preferences::get_preferences(&app).unwrap_or_default();
    let text_to_copy =
        if prefs.behavior.paste_input_and_output && active_mode.as_deref() != Some("light") {
            format!(
                "Original\n\n{}\n\nResult\n\n{}",
                transcribed_text, payload.output
            )
        } else {
            payload.output.clone()
        };

    if let Err(e) = crate::clipboard::copy_to_clipboard(&text_to_copy, &app) {
        eprintln!("Clipboard: {}", e);
    } else {
        let app_main = app.clone();
        let _ = app.run_on_main_thread(move || {
            if let Err(e) = crate::clipboard::auto_paste(&app_main) {
                eprintln!("Auto-paste: {}", e);
            }
        });
    }
    let _ = app.emit("transcription_ready", payload.clone());
    if let Some(state) = app.try_state::<crate::LastOutputState>() {
        if let Ok(mut guard) = state.0.lock() {
            *guard = Some(payload.output);
        }
    }
    if prefs.behavior.sound_on_complete {
        let _ = app.emit_to("main", "play_completion_sound", ());
    }
    if prefs.behavior.system_notification {
        let _ = app.emit_to("main", "show_completion_notification", "Transcription ready");
    }
    Ok(())
}

fn clear_pipeline_cancel(app: &tauri::AppHandle) {
    if let Some(s) = app.try_state::<crate::PipelineCancel>() {
        s.clear()
    }
}

fn run_audio_worker(rx: mpsc::Receiver<AudioCommand>, app: tauri::AppHandle) {
    let mut stream_holder: Option<cpal::Stream> = None;
    let buffer: Arc<Mutex<Vec<f32>>> = Arc::new(Mutex::new(Vec::new()));
    let mut sample_rate: u32 = 16000;

    while let Ok(cmd) = rx.recv() {
        match cmd {
            AudioCommand::Start => {
                if stream_holder.is_some() {
                    continue;
                }
                let max_samples = crate::preferences::max_recording_samples(&app);
                let device_id = crate::preferences::get_preferences(&app)
                    .ok()
                    .and_then(|p| p.recording.input_device_id.clone());
                if let Err(e) = start_stream(
                    &mut stream_holder,
                    &buffer,
                    &mut sample_rate,
                    max_samples,
                    device_id.as_deref(),
                ) {
                    if let Some(state) = app.try_state::<RecorderState>() {
                        state.set_capturing(false);
                    }
                    let _ = app.emit("transcription_error", e);
                }
            }
            AudioCommand::Stop => {
                stream_holder = None;
                let samples = buffer.lock().map(|b| b.clone()).unwrap_or_default();
                if samples.is_empty() {
                    let _ = app.emit("transcription_error", "aucun audio enregistré");
                    continue;
                }
                if let Ok(mut b) = buffer.lock() {
                    b.clear();
                }
                let wav_bytes = match write_wav_to_bytes(&samples, sample_rate) {
                    Ok(b) => b,
                    Err(e) => {
                        let _ = app.emit("transcription_error", e);
                        continue;
                    }
                };
                let app_for_spawn = app.clone();
                if let Err(e) = app.run_on_main_thread(move || {
                    let bytes = wav_bytes;
                    let handle = app_for_spawn.clone();
                    let cancel = tokio_util::sync::CancellationToken::new();
                    let cancel_child = cancel.clone();
                    if let Some(state) = handle.try_state::<crate::PipelineCancel>() {
                        state.set(cancel);
                    }
                    tauri::async_runtime::spawn(async move {
                        let result = run_pipeline(cancel_child, bytes, handle.clone()).await;
                        clear_pipeline_cancel(&handle);
                        if let Err(err) = result {
                            let _ = handle.emit("transcription_error", err);
                        }
                    });
                }) {
                    let _ = app.emit("transcription_error", e.to_string());
                }
            }
        }
    }
}

fn start_stream(
    stream_holder: &mut Option<cpal::Stream>,
    buffer: &Arc<Mutex<Vec<f32>>>,
    sample_rate: &mut u32,
    max_samples: usize,
    device_id: Option<&str>,
) -> Result<(), String> {
    let host = cpal::default_host();
    let device = if let Some(id) = device_id {
        host.devices()
            .map_err(|e| e.to_string())?
            .find(|d| d.name().ok().as_deref() == Some(id))
            .ok_or_else(|| format!("input device not found: {}", id))?
    } else {
        host.default_input_device()
            .ok_or_else(|| "no input device".to_string())?
    };

    let config = device.default_input_config().map_err(|e| e.to_string())?;

    *sample_rate = config.sample_rate().0;
    buffer.lock().map_err(|e| e.to_string())?.clear();

    let buffer_clone = buffer.clone();
    let err_fn = move |err| {
        eprintln!("audio stream error: {}", err);
    };

    let stream = match config.sample_format() {
        cpal::SampleFormat::F32 => {
            let b = buffer_clone.clone();
            device
                .build_input_stream(
                    &config.into(),
                    move |data: &[f32], _: &cpal::InputCallbackInfo| {
                        if let Ok(mut guard) = b.lock() {
                            if guard.len() + data.len() <= max_samples {
                                guard.extend_from_slice(data);
                            } else if guard.len() < max_samples {
                                let remaining = max_samples - guard.len();
                                guard.extend_from_slice(&data[..remaining]);
                                eprintln!("Limite d'enregistrement atteinte");
                            }
                        }
                    },
                    err_fn,
                    None,
                )
                .map_err(|e| e.to_string())?
        }
        cpal::SampleFormat::I16 => {
            let b = buffer_clone.clone();
            device
                .build_input_stream(
                    &config.into(),
                    move |data: &[i16], _: &cpal::InputCallbackInfo| {
                        if let Ok(mut guard) = b.lock() {
                            for &s in data {
                                if guard.len() < max_samples {
                                    guard.push(f32::from_sample(s));
                                } else {
                                    eprintln!("Limite d'enregistrement atteinte");
                                    break;
                                }
                            }
                        }
                    },
                    err_fn,
                    None,
                )
                .map_err(|e| e.to_string())?
        }
        _ => return Err("unsupported sample format".to_string()),
    };

    stream.play().map_err(|e| e.to_string())?;
    *stream_holder = Some(stream);
    Ok(())
}

#[allow(dead_code)]
pub fn write_wav(path: &std::path::Path, samples: &[f32], sample_rate: u32) -> Result<(), String> {
    let spec = wav_spec(sample_rate);
    let mut writer = hound::WavWriter::create(path, spec).map_err(|e| e.to_string())?;
    for &s in samples {
        writer.write_sample(s).map_err(|e| e.to_string())?;
    }
    writer.finalize().map_err(|e| e.to_string())?;
    Ok(())
}

#[allow(dead_code)]
fn wav_spec(sample_rate: u32) -> hound::WavSpec {
    hound::WavSpec {
        channels: 1,
        sample_rate,
        bits_per_sample: 32,
        sample_format: hound::SampleFormat::Float,
    }
}

/// WAV en mémoire (évite I/O disque). Format: PCM 32-bit float mono, header 44 octets.
pub fn write_wav_to_bytes(samples: &[f32], sample_rate: u32) -> Result<Vec<u8>, String> {
    let data_size = samples.len() * 4;
    let file_size = 36 + data_size;
    let mut buf = Vec::with_capacity(44 + data_size);
    buf.write_all(b"RIFF").map_err(|e| e.to_string())?;
    buf.write_all(&(file_size as u32).to_le_bytes())
        .map_err(|e| e.to_string())?;
    buf.write_all(b"WAVE").map_err(|e| e.to_string())?;
    buf.write_all(b"fmt ").map_err(|e| e.to_string())?;
    buf.write_all(&16u32.to_le_bytes())
        .map_err(|e| e.to_string())?;
    buf.write_all(&3u16.to_le_bytes())
        .map_err(|e| e.to_string())?; // WAVE_FORMAT_IEEE_FLOAT
    buf.write_all(&1u16.to_le_bytes())
        .map_err(|e| e.to_string())?;
    buf.write_all(&sample_rate.to_le_bytes())
        .map_err(|e| e.to_string())?;
    buf.write_all(&(sample_rate * 4).to_le_bytes())
        .map_err(|e| e.to_string())?;
    buf.write_all(&4u16.to_le_bytes())
        .map_err(|e| e.to_string())?;
    buf.write_all(&32u16.to_le_bytes())
        .map_err(|e| e.to_string())?;
    buf.write_all(b"data").map_err(|e| e.to_string())?;
    buf.write_all(&(data_size as u32).to_le_bytes())
        .map_err(|e| e.to_string())?;
    for &s in samples {
        buf.write_all(&s.to_le_bytes()).map_err(|e| e.to_string())?;
    }
    Ok(buf)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_write_wav_valid() {
        let samples: Vec<f32> = vec![0.0, 0.5, -0.5, 1.0];
        let temp_dir = tempfile::tempdir().unwrap();
        let path = temp_dir.path().join("test.wav");

        let result = write_wav(&path, &samples, 16000);
        assert!(result.is_ok());
        assert!(path.exists());
    }

    #[test]
    fn test_write_wav_empty() {
        let samples: Vec<f32> = vec![];
        let temp_dir = tempfile::tempdir().unwrap();
        let path = temp_dir.path().join("empty.wav");

        let result = write_wav(&path, &samples, 16000);
        assert!(result.is_ok());
    }

    #[test]
    fn test_max_recording_samples_constant() {
        assert_eq!(DEFAULT_MAX_RECORDING_SAMPLES, 1_920_000);
    }

    #[test]
    fn test_recorder_state_default() {
        let state = RecorderState::default();
        assert!(state.cmd_tx.lock().is_ok());
    }
}
