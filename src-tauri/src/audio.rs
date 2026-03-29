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
    pasted: bool,
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

/// Filler words to strip from transcriptions (case-insensitive, whole-word).
/// French and English fillers that add no semantic value.
const FILLERS_FR: &[&str] = &[
    "euh", "euhm", "heu", "heum", "hmm", "hm",
    "bah", "beh", "ben", "bon", "bon ben",
    "genre", "en fait", "du coup", "en gros",
    "tu vois", "vous voyez", "tu sais", "vous savez",
    "quoi", // trailing filler "...quoi"
    "voilà", // trailing filler "...voilà"
    "disons", "disons que",
    "comment dire",
];

const FILLERS_EN: &[&str] = &[
    "uh", "uhm", "um", "umm", "hmm", "hm",
    "like", "you know", "i mean", "basically",
    "kind of", "sort of", "right",
    "so yeah", "yeah so",
];

fn light_fast_path(s: &str) -> String {
    let trimmed = s.trim();
    if trimmed.is_empty() {
        return String::new();
    }

    // Split into words, remove filler phrases by whole-word matching
    let words: Vec<&str> = trimmed.split_whitespace().collect();
    let mut cleaned: Vec<String> = Vec::new();
    let mut i = 0;

    while i < words.len() {
        let mut matched = false;
        // Try longest fillers first to avoid partial matches
        let mut all_fillers: Vec<&str> = FILLERS_FR.iter().chain(FILLERS_EN.iter()).copied().collect();
        all_fillers.sort_by(|a, b| b.split_whitespace().count().cmp(&a.split_whitespace().count()));
        for filler in &all_fillers {
            let filler_words: Vec<&str> = filler.split_whitespace().collect();
            let flen = filler_words.len();
            if flen > 0 && i + flen <= words.len() {
                let candidate: Vec<String> = words[i..i + flen]
                    .iter()
                    .map(|w| {
                        w.to_lowercase()
                            .trim_matches(|c: char| c == ',' || c == ';' || c == '.' || c == '!' || c == '?')
                            .to_string()
                    })
                    .collect();
                let filler_match: Vec<String> =
                    filler_words.iter().map(|w| w.to_lowercase()).collect();
                if candidate == filler_match {
                    i += flen;
                    matched = true;
                    break;
                }
            }
        }
        if !matched {
            cleaned.push(words[i].to_string());
            i += 1;
        }
    }

    let collapsed = cleaned.join(" ");
    let mut result = String::with_capacity(collapsed.len() + 1);

    // Capitalize first letter
    let mut chars = collapsed.chars();
    if let Some(first) = chars.next() {
        result.extend(first.to_uppercase());
        result.extend(chars);
    }
    result = result.trim_end().to_string();

    // Ensure ending punctuation
    if let Some(last) = result.chars().last() {
        if last != '.' && last != '?' && last != '!' {
            result.push('.');
        }
    }

    // Clean orphan commas/spaces from filler removal
    result = result.replace("  ", " ");
    result = result.replace(" ,", ",");
    result = result.replace(",,", ",");
    result = result.replace(", .", ".");
    result = result.replace(" .", ".");

    result
}

/// Find the "---REFLECTION---" separator in any variant (case, spacing, French).
/// Returns (start, end) byte offsets if found.
fn find_reflection_separator(text: &str) -> Option<(usize, usize)> {
    let lower = text.to_lowercase();
    for keyword in &["reflection", "réflexion"] {
        if let Some(kw_pos) = lower.find(keyword) {
            // Walk backwards to find leading dashes
            let start = text[..kw_pos]
                .rfind('\n')
                .map(|p| p + 1)
                .unwrap_or(kw_pos);
            let line_start = &text[start..kw_pos];
            if line_start.trim().chars().all(|c| c == '-') && line_start.contains('-') {
                // Walk forward past trailing dashes
                let after_kw = kw_pos + keyword.len();
                let end = text[after_kw..]
                    .find('\n')
                    .map(|p| after_kw + p + 1)
                    .unwrap_or(text.len());
                return Some((start, end));
            }
        }
    }
    None
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

    // Fix 3: Validate transcription before sending to LLM
    // If too short (< 3 words), skip LLM — avoids transforming hallucinations
    let word_count = transcribed_text.split_whitespace().count();
    let is_builtin = matches!(
        active_mode.as_deref(),
        Some("light") | Some("medium") | Some("strong") | Some("full")
    );
    // Built-in modes use temperature 0.2 for fidelity (Fix 2)
    let temp_override = if is_builtin { Some(0.2_f32) } else { None };

    let final_text = if active_mode.as_deref() == Some("light") {
        light_fast_path(&transcribed_text)
    } else if word_count < 3 {
        // Too short for meaningful LLM transformation — just clean up
        light_fast_path(&transcribed_text)
    } else if let Some(ref prompt) = mode_prompt {
        if !prompt.is_empty() {
            match crate::llm::transform_text_streaming(
                &transcribed_text,
                prompt,
                &app,
                cancel.clone(),
                temp_override,
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

    // Robust split: handle variations like "--- REFLECTION ---", "---Reflection---", "---RÉFLEXION---"
    let payload = if let Some((start, end)) = find_reflection_separator(&final_text) {
        let output = final_text[..start].trim().to_string();
        let thoughts_str = final_text[end..].trim().to_string();
        let thoughts = if thoughts_str.is_empty() { None } else { Some(thoughts_str) };
        TranscriptionReadyPayload {
            output: output.clone(),
            thoughts,
            mode: active_mode.clone(),
            pasted: false,
        }
    } else {
        TranscriptionReadyPayload {
            output: final_text.clone(),
            thoughts: None,
            mode: active_mode.clone(),
            pasted: false,
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

    let mut did_paste = false;
    if let Err(e) = crate::clipboard::copy_to_clipboard(&text_to_copy, &app) {
        eprintln!("Clipboard: {}", e);
    } else {
        // Release floating window focus so Cmd+V goes to the user's app
        let app_for_paste = app.clone();
        let _ = app.run_on_main_thread(move || {
            if let Some(w) = app_for_paste.get_webview_window("floating") {
                let _ = w.set_ignore_cursor_events(true);
            }
        });
        // Give macOS time to restore focus to previous window
        std::thread::sleep(std::time::Duration::from_millis(100));
        // Send Cmd+V
        let app_for_cmd_v = app.clone();
        let (tx, rx) = std::sync::mpsc::channel();
        let _ = app.run_on_main_thread(move || {
            let result = crate::clipboard::auto_paste(&app_for_cmd_v);
            let _ = tx.send(result.is_ok());
        });
        if let Ok(success) = rx.recv_timeout(std::time::Duration::from_millis(500)) {
            did_paste = success;
        }
        if !did_paste {
            eprintln!("Auto-paste: failed or timed out");
        }
        // Re-enable interactivity on floating window after a short delay
        let app_restore = app.clone();
        std::thread::sleep(std::time::Duration::from_millis(50));
        let _ = app.run_on_main_thread(move || {
            if let Some(w) = app_restore.get_webview_window("floating") {
                let _ = w.set_ignore_cursor_events(false);
            }
        });
    }
    let mut payload_with_paste = payload.clone();
    payload_with_paste.pasted = did_paste;
    let _ = app.emit("transcription_ready", payload_with_paste);
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
                let sample_count = samples.len();
                let duration_secs = sample_count as f64 / sample_rate as f64;
                let rms = if samples.is_empty() {
                    0.0
                } else {
                    (samples.iter().map(|s| s * s).sum::<f32>() / samples.len() as f32).sqrt()
                };
                let peak = samples.iter().map(|s| s.abs()).fold(0.0f32, f32::max);
                let diag = format!(
                    "[audio] samples={}, duration={:.2}s, rate={}, RMS={:.6}, peak={:.6}\n",
                    sample_count, duration_secs, sample_rate, rms, peak
                );
                eprintln!("{}", diag.trim());
                let _ = std::fs::OpenOptions::new()
                    .create(true).append(true)
                    .open("/tmp/ghosty_diag.log")
                    .and_then(|mut f| std::io::Write::write_all(&mut f, diag.as_bytes()));
                // Save debug WAV for inspection
                if let Ok(wav) = write_wav_to_bytes(&samples, sample_rate) {
                    let _ = std::fs::write("/tmp/ghosty_debug.wav", &wav);
                }
                if samples.is_empty() {
                    let _ = app.emit("transcription_error", "aucun audio enregistré");
                    continue;
                }
                // VAD: Reject near-silence before sending to Whisper (prevents hallucinations)
                if peak < 0.002 {
                    eprintln!("[audio] VAD rejected: peak={:.6}, RMS={:.6} — likely silence", peak, rms);
                    let _ = app.emit("transcription_error", "Audio trop faible ou silence détecté. Parlez plus fort ou plus près du micro.");
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

/// Check microphone permission on macOS before touching CoreAudio.
/// CoreAudio calls abort() if access is denied, which kills the whole process.
#[cfg(target_os = "macos")]
fn check_microphone_permission() -> Result<(), String> {
    let output = std::process::Command::new("swift")
        .args(["-e", r#"
import AVFoundation
switch AVCaptureDevice.authorizationStatus(for: .audio) {
case .authorized: print("authorized")
case .notDetermined: print("notDetermined")
case .denied: print("denied")
case .restricted: print("restricted")
@unknown default: print("unknown")
}
"#])
        .output()
        .map_err(|e| format!("Cannot check mic permission: {}", e))?;

    let status = String::from_utf8_lossy(&output.stdout).trim().to_string();
    match status.as_str() {
        "authorized" => Ok(()),
        "notDetermined" => {
            // Request permission (async but we wait for it)
            let req_output = std::process::Command::new("swift")
                .args(["-e", r#"
import AVFoundation
import Foundation
let sem = DispatchSemaphore(value: 0)
AVCaptureDevice.requestAccess(for: .audio) { _ in sem.signal() }
sem.wait()
let s = AVCaptureDevice.authorizationStatus(for: .audio)
print(s == .authorized ? "authorized" : "denied")
"#])
                .output()
                .map_err(|e| format!("Mic permission request failed: {}", e))?;

            let result = String::from_utf8_lossy(&req_output.stdout).trim().to_string();
            if result == "authorized" {
                Ok(())
            } else {
                Err("Microphone access denied. Please grant microphone permission in System Settings > Privacy & Security > Microphone.".to_string())
            }
        }
        "denied" => Err("Microphone access denied. Please grant microphone permission in System Settings > Privacy & Security > Microphone.".to_string()),
        "restricted" => Err("Microphone access is restricted on this device.".to_string()),
        _ => Err(format!("Unknown microphone permission status: {}", status)),
    }
}

#[cfg(not(target_os = "macos"))]
fn check_microphone_permission() -> Result<(), String> {
    Ok(())
}

fn start_stream(
    stream_holder: &mut Option<cpal::Stream>,
    buffer: &Arc<Mutex<Vec<f32>>>,
    sample_rate: &mut u32,
    max_samples: usize,
    device_id: Option<&str>,
) -> Result<(), String> {
    // Check permission BEFORE touching CoreAudio (which aborts on denied access)
    check_microphone_permission()?;

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

    let device_name = device.name().unwrap_or_else(|_| "unknown".to_string());
    let config = device.default_input_config().map_err(|e| e.to_string())?;
    let channels = config.channels();

    eprintln!(
        "[audio] device='{}', format={:?}, rate={}, channels={}",
        device_name,
        config.sample_format(),
        config.sample_rate().0,
        channels
    );
    let _ = std::fs::write(
        "/tmp/ghosty_device.log",
        format!(
            "device={}\nformat={:?}\nrate={}\nchannels={}\n",
            device_name,
            config.sample_format(),
            config.sample_rate().0,
            channels
        ),
    );

    *sample_rate = config.sample_rate().0;
    buffer.lock().map_err(|e| e.to_string())?.clear();

    let buffer_clone = buffer.clone();
    let err_fn = move |err| {
        eprintln!("audio stream error: {}", err);
    };

    // Force mono: take only channel 0 from interleaved multi-channel input
    let ch = channels as usize;

    let stream = match config.sample_format() {
        cpal::SampleFormat::F32 => {
            let b = buffer_clone.clone();
            device
                .build_input_stream(
                    &config.into(),
                    move |data: &[f32], _: &cpal::InputCallbackInfo| {
                        if let Ok(mut guard) = b.lock() {
                            if ch <= 1 {
                                if guard.len() + data.len() <= max_samples {
                                    guard.extend_from_slice(data);
                                } else if guard.len() < max_samples {
                                    let remaining = max_samples - guard.len();
                                    guard.extend_from_slice(&data[..remaining]);
                                }
                            } else {
                                // Extract channel 0 from interleaved data
                                for chunk in data.chunks(ch) {
                                    if guard.len() >= max_samples {
                                        break;
                                    }
                                    guard.push(chunk[0]);
                                }
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
                            if ch <= 1 {
                                for &s in data {
                                    if guard.len() >= max_samples {
                                        break;
                                    }
                                    guard.push(f32::from_sample(s));
                                }
                            } else {
                                for chunk in data.chunks(ch) {
                                    if guard.len() >= max_samples {
                                        break;
                                    }
                                    guard.push(f32::from_sample(chunk[0]));
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

/// WAV en mémoire (évite I/O disque). Format: PCM 16-bit signed mono, header 44 octets.
/// 16-bit PCM is the most compatible format for speech APIs (Whisper, etc.).
pub fn write_wav_to_bytes(samples: &[f32], sample_rate: u32) -> Result<Vec<u8>, String> {
    let data_size = samples.len() * 2; // 16-bit = 2 bytes per sample
    let file_size = 36 + data_size;
    let byte_rate = sample_rate * 2; // 1 channel * 2 bytes
    let mut buf = Vec::with_capacity(44 + data_size);
    buf.write_all(b"RIFF").map_err(|e| e.to_string())?;
    buf.write_all(&(file_size as u32).to_le_bytes())
        .map_err(|e| e.to_string())?;
    buf.write_all(b"WAVE").map_err(|e| e.to_string())?;
    buf.write_all(b"fmt ").map_err(|e| e.to_string())?;
    buf.write_all(&16u32.to_le_bytes())
        .map_err(|e| e.to_string())?;
    buf.write_all(&1u16.to_le_bytes())
        .map_err(|e| e.to_string())?; // WAVE_FORMAT_PCM
    buf.write_all(&1u16.to_le_bytes())
        .map_err(|e| e.to_string())?; // 1 channel
    buf.write_all(&sample_rate.to_le_bytes())
        .map_err(|e| e.to_string())?;
    buf.write_all(&byte_rate.to_le_bytes())
        .map_err(|e| e.to_string())?;
    buf.write_all(&2u16.to_le_bytes())
        .map_err(|e| e.to_string())?; // block align
    buf.write_all(&16u16.to_le_bytes())
        .map_err(|e| e.to_string())?; // bits per sample
    buf.write_all(b"data").map_err(|e| e.to_string())?;
    buf.write_all(&(data_size as u32).to_le_bytes())
        .map_err(|e| e.to_string())?;
    for &s in samples {
        // Clamp and convert f32 [-1.0, 1.0] to i16
        let clamped = s.clamp(-1.0, 1.0);
        let pcm = (clamped * 32767.0) as i16;
        buf.write_all(&pcm.to_le_bytes()).map_err(|e| e.to_string())?;
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
