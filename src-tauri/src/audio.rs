use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::Sample;
use std::io::Write;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc;
use std::sync::{Arc, Mutex, Once};
use tauri::Emitter;
use tauri::Manager;

/// Cached microphone permission result. Checked once at startup, reused on every recording.
static MIC_PERMISSION_ONCE: Once = Once::new();
static MIC_PERMISSION_OK: AtomicBool = AtomicBool::new(false);

/// Pre-check microphone permission at app startup (call from setup).
/// Caches the result so `start_stream` never blocks on a Swift subprocess.
/// NOTE: Skipped in debug builds — on macOS 26+, the unsigned dev binary
/// has no Info.plist bundle, so TCC kills the process on first mic access.
pub fn warmup_mic_permission() {
    #[cfg(debug_assertions)]
    {
        // In dev mode, defer permission check to first actual recording
        return;
    }
    #[cfg(not(debug_assertions))]
    {
        std::thread::spawn(|| {
            MIC_PERMISSION_ONCE.call_once(|| {
                MIC_PERMISSION_OK.store(
                    check_microphone_permission().is_ok(),
                    Ordering::SeqCst,
                );
            });
        });
    }
}

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
    /// Bundle ID of the app that was frontmost when recording started.
    /// Used to reactivate it before auto-paste (Cmd+V).
    previous_app: Mutex<Option<String>>,
}

impl Default for RecorderState {
    fn default() -> Self {
        Self {
            cmd_tx: Mutex::new(None),
            is_capturing: AtomicBool::new(false),
            previous_app: Mutex::new(None),
        }
    }
}

impl RecorderState {
    pub fn is_capturing(&self) -> bool {
        self.is_capturing.load(Ordering::SeqCst)
    }

    /// Utilisé par le worker quand start_stream échoue pour réaligner l’état.
    pub fn set_capturing(&self, value: bool) {
        self.is_capturing.store(value, Ordering::SeqCst);
    }

    /// Get the saved previous app bundle ID (for auto-paste).
    pub fn take_previous_app(&self) -> Option<String> {
        self.previous_app.lock().ok().and_then(|mut g| g.take())
    }

    /// Pre-spawn the audio worker thread so the first recording starts instantly.
    /// Call this once from app setup.
    pub fn warmup(&self, app: tauri::AppHandle) {
        let mut guard = self.cmd_tx.lock().unwrap_or_else(|e| e.into_inner());
        if guard.is_none() {
            let (tx, rx) = mpsc::channel();
            std::thread::spawn(move || run_audio_worker(rx, app));
            *guard = Some(tx);
        }
    }

    pub fn start_capture(&self, app: tauri::AppHandle) -> Result<(), String> {
        if self.is_capturing.swap(true, Ordering::SeqCst) {
            return Ok(());
        }
        // Send Start command FIRST for minimum latency — the stream opens immediately.
        let mut guard = self.cmd_tx.lock().map_err(|e| e.to_string())?;
        if guard.is_none() {
            // Fallback if warmup wasn't called
            let (tx, rx) = mpsc::channel();
            std::thread::spawn({
                let app = app.clone();
                move || run_audio_worker(rx, app)
            });
            *guard = Some(tx);
        }
        if let Some(ref tx) = *guard {
            tx.send(AudioCommand::Start).map_err(|e| e.to_string())?;
        }
        drop(guard);
        // Save the currently frontmost app AFTER starting the stream.
        // This is used later to reactivate it for auto-paste (Cmd+V).
        if let Ok(mut prev) = self.previous_app.lock() {
            *prev = crate::clipboard::get_frontmost_app();
            #[cfg(debug_assertions)]
            {
                if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open("/tmp/ghosty_paste.log") {
                    let _ = std::io::Write::write_all(&mut f, format!("[start_capture] previous_app={:?}\n", *prev).as_bytes());
                }
            }
        }
        Ok(())
    }

    pub fn stop_capture(&self) -> Result<(), String> {
        if !self.is_capturing.swap(false, Ordering::SeqCst) {
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
    "quoi", "voilà",
    "disons", "disons que",
    "comment dire",
    "alors", "enfin", "donc", "et donc", "en mode",
    "tu vois ce que je veux dire",
    "c'est-à-dire", "j'veux dire",
    "attends", "nan mais",
    "ouais", "ouais ouais",
    "en vrai", "après",
];

const FILLERS_EN: &[&str] = &[
    "uh", "uhm", "um", "umm", "hmm", "hm",
    "like", "you know", "i mean", "basically",
    "kind of", "sort of", "right",
    "so yeah", "yeah so",
    "actually", "literally", "honestly",
    "so basically", "i guess", "well", "anyway",
    "you see", "like basically",
    "at the end of the day", "to be honest",
];

pub fn strip_fillers(s: &str) -> String {
    let trimmed = s.trim();
    if trimmed.is_empty() {
        return String::new();
    }

    let words: Vec<&str> = trimmed.split_whitespace().collect();
    let mut cleaned: Vec<String> = Vec::new();
    let mut i = 0;

    let mut all_fillers: Vec<&str> = FILLERS_FR.iter().chain(FILLERS_EN.iter()).copied().collect();
    all_fillers.sort_by(|a, b| b.split_whitespace().count().cmp(&a.split_whitespace().count()));

    while i < words.len() {
        let mut matched = false;
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

    let result = cleaned.join(" ");
    let result = result.replace("  ", " ");
    let result = result.replace(" ,", ",");
    let result = result.replace(",,", ",");
    result.trim().to_string()
}

fn light_fast_path(s: &str) -> String {
    let stripped = strip_fillers(s);
    if stripped.is_empty() {
        return String::new();
    }

    let mut result = String::with_capacity(stripped.len() + 1);

    let mut chars = stripped.chars();
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
    let transcribed_text = strip_fillers(&transcribed_text);
    let transcribed_text = crate::dictionary::apply_corrections(&app, &transcribed_text);
    let transcribed_text = crate::snippets::process_snippets(&transcribed_text, &app);
    let edit_result = crate::edit_commands::process_edit_commands(&transcribed_text);
    if edit_result.edits_applied > 0 {
        crate::clipboard::log_debug(&format!(
            "[run_pipeline] edit commands applied: {} edit(s)",
            edit_result.edits_applied
        ));
    }
    let transcribed_text = edit_result.text;
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

    let is_light_mode = active_mode.as_deref() == Some("light");

    let final_text = if is_light_mode {
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
                    #[cfg(debug_assertions)]
                    eprintln!("Erreur transformation LLM: {}", e);
                    let _ = app.emit("llm_skipped", e.clone());
                    transcribed_text.clone()
                }
            }
        } else {
            transcribed_text.clone()
        }
    } else {
        transcribed_text.clone()
    };

    // Voice commands: extract from final text in light/Direct mode only
    let (final_text, voice_commands) = if is_light_mode {
        let result = crate::voice_commands::extract_commands(&final_text);
        if !result.commands.is_empty() {
            crate::clipboard::log_debug(&format!(
                "[run_pipeline] voice commands detected: {:?}",
                result.commands
            ));
        }
        (result.cleaned_text, result.commands)
    } else {
        (final_text, Vec::new())
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

    // Count words in the final output for usage stats
    let output_word_count = payload.output.split_whitespace().count() as u64;
    crate::usage::increment_words(&app, output_word_count);

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

    // 1. Try direct AX insertion first (no clipboard pollution)
    let mut did_paste = false;
    let ax_inserted = match crate::clipboard::insert_text_via_ax(&text_to_copy) {
        Ok(true) => {
            crate::clipboard::log_debug("[run_pipeline] AX insertion succeeded, skipping clipboard");
            did_paste = true;
            true
        }
        Ok(false) => {
            crate::clipboard::log_debug("[run_pipeline] AX insertion not available, falling back to clipboard");
            false
        }
        Err(e) => {
            crate::clipboard::log_debug(&format!("[run_pipeline] AX insertion error: {}, falling back to clipboard", e));
            false
        }
    };

    // 2. Fall back to clipboard + Cmd+V if AX didn't work
    if !ax_inserted {
        if let Err(e) = crate::clipboard::copy_to_clipboard(&text_to_copy, &app) {
            crate::clipboard::log_debug(&format!("[run_pipeline] clipboard FAILED: {}", e));
        } else {
            let has_text_focus = crate::clipboard::has_focused_text_field();
            crate::clipboard::log_debug(&format!("[run_pipeline] clipboard OK, has_text_focus={}", has_text_focus));

            match crate::clipboard::send_paste_keystroke() {
                Ok(()) => {
                    crate::clipboard::log_debug("[run_pipeline] Cmd+V sent OK");
                    did_paste = has_text_focus;
                }
                Err(e) => crate::clipboard::log_debug(&format!("[run_pipeline] Cmd+V FAILED: {}", e)),
            }
        }
    }

    // 3. Execute voice commands after paste (light mode only)
    if !voice_commands.is_empty() && did_paste {
        if let Err(e) = crate::voice_commands::execute_commands(&voice_commands) {
            crate::clipboard::log_debug(&format!(
                "[run_pipeline] voice commands FAILED: {}", e
            ));
        }
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
                let samples = buffer.lock().ok().map(|mut b| std::mem::take(&mut *b)).unwrap_or_default();
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
                #[cfg(debug_assertions)]
                eprintln!("{}", diag.trim());
                #[cfg(debug_assertions)]
                {
                    let _ = std::fs::OpenOptions::new()
                        .create(true).append(true)
                        .open("/tmp/ghosty_diag.log")
                        .and_then(|mut f| std::io::Write::write_all(&mut f, diag.as_bytes()));
                    // Save debug WAV for inspection
                    if let Ok(wav) = write_wav_to_bytes(&samples, sample_rate) {
                        let _ = std::fs::write("/tmp/ghosty_debug.wav", &wav);
                    }
                }
                // Emit audio diagnostics so frontend can show/log them
                let _ = app.emit("audio_diagnostics", format!(
                    "duration={:.2}s samples={} rate={} rms={:.6} peak={:.6}",
                    duration_secs, sample_count, sample_rate, rms, peak
                ));

                if samples.is_empty() {
                    let _ = app.emit("transcription_error", "aucun audio enregistré");
                    continue;
                }
                // Reject recordings too short to contain speech (< 0.3s)
                if duration_secs < 0.3 {
                    let _ = app.emit("transcription_error", "Enregistrement trop court.");
                    continue;
                }
                // VAD: Reject near-silence before sending to Whisper (prevents hallucinations)
                // Peak < 0.001 = absolute silence. RMS < 0.001 = background noise only (no speech).
                if peak < 0.001 || rms < 0.001 {
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
                        if let Err(ref err) = result {
                            #[cfg(debug_assertions)]
                            eprintln!("[run_pipeline] ERROR: {}", err);
                            #[cfg(debug_assertions)]
                            {
                                if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open("/tmp/ghosty_diag.log") {
                                    let _ = std::io::Write::write_all(&mut f, format!("[run_pipeline] ERROR: {}\n", err).as_bytes());
                                }
                            }
                            let _ = handle.emit("transcription_error", err.clone());
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
    // Check cached permission (warmed up at startup). Fall back to live check if not cached yet.
    MIC_PERMISSION_ONCE.call_once(|| {
        MIC_PERMISSION_OK.store(check_microphone_permission().is_ok(), Ordering::SeqCst);
    });
    if !MIC_PERMISSION_OK.load(Ordering::SeqCst) {
        // Permission was denied at startup — try once more in case user granted it since
        if check_microphone_permission().is_err() {
            return Err("Microphone access denied. Please grant microphone permission in System Settings > Privacy & Security > Microphone.".to_string());
        }
        MIC_PERMISSION_OK.store(true, Ordering::SeqCst);
    }

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

    #[cfg(debug_assertions)]
    eprintln!(
        "[audio] device='{}', format={:?}, rate={}, channels={}",
        device_name,
        config.sample_format(),
        config.sample_rate().0,
        channels
    );
    #[cfg(debug_assertions)]
    {
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
    }

    *sample_rate = config.sample_rate().0;
    buffer.lock().map_err(|e| e.to_string())?.clear();

    let buffer_clone = buffer.clone();
    let err_fn = move |err: cpal::StreamError| {
        let _ = err; // consumed; logged only in debug builds
        #[cfg(debug_assertions)]
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

    // ── write_wav (hound-based, file) ───────────────────────────────

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
    fn test_write_wav_different_sample_rates() {
        for rate in [8000u32, 16000, 44100, 48000] {
            let samples = vec![0.0f32; 100];
            let temp_dir = tempfile::tempdir().unwrap();
            let path = temp_dir.path().join(format!("rate_{}.wav", rate));
            let result = write_wav(&path, &samples, rate);
            assert!(result.is_ok(), "Failed for sample rate {}", rate);
        }
    }

    // ── write_wav_to_bytes (in-memory PCM 16-bit) ───────────────────

    #[test]
    fn test_write_wav_to_bytes_header_size() {
        let samples = vec![0.0f32; 10];
        let bytes = write_wav_to_bytes(&samples, 16000).unwrap();
        // 44-byte header + 10 samples * 2 bytes = 64
        assert_eq!(bytes.len(), 44 + 10 * 2);
    }

    #[test]
    fn test_write_wav_to_bytes_riff_header() {
        let samples = vec![0.0f32; 4];
        let bytes = write_wav_to_bytes(&samples, 16000).unwrap();
        assert_eq!(&bytes[0..4], b"RIFF");
        assert_eq!(&bytes[8..12], b"WAVE");
        assert_eq!(&bytes[12..16], b"fmt ");
        assert_eq!(&bytes[36..40], b"data");
    }

    #[test]
    fn test_write_wav_to_bytes_sample_rate_encoded() {
        let samples = vec![0.0f32; 4];
        let bytes = write_wav_to_bytes(&samples, 44100).unwrap();
        // Sample rate is at offset 24, little-endian u32
        let rate = u32::from_le_bytes([bytes[24], bytes[25], bytes[26], bytes[27]]);
        assert_eq!(rate, 44100);
    }

    #[test]
    fn test_write_wav_to_bytes_pcm_format() {
        let samples = vec![0.0f32; 4];
        let bytes = write_wav_to_bytes(&samples, 16000).unwrap();
        // Audio format at offset 20: 1 = PCM
        let format = u16::from_le_bytes([bytes[20], bytes[21]]);
        assert_eq!(format, 1);
        // Channels at offset 22: 1 = mono
        let channels = u16::from_le_bytes([bytes[22], bytes[23]]);
        assert_eq!(channels, 1);
        // Bits per sample at offset 34: 16
        let bits = u16::from_le_bytes([bytes[34], bytes[35]]);
        assert_eq!(bits, 16);
    }

    #[test]
    fn test_write_wav_to_bytes_empty_samples() {
        let bytes = write_wav_to_bytes(&[], 16000).unwrap();
        assert_eq!(bytes.len(), 44); // header only
    }

    #[test]
    fn test_write_wav_to_bytes_clamping() {
        // Values outside [-1.0, 1.0] should be clamped
        let samples = vec![2.0f32, -2.0, 0.5];
        let bytes = write_wav_to_bytes(&samples, 16000).unwrap();
        // First sample (2.0 clamped to 1.0) -> 32767 as i16
        let s0 = i16::from_le_bytes([bytes[44], bytes[45]]);
        assert_eq!(s0, 32767);
        // Second sample (-2.0 clamped to -1.0) -> -32767 as i16
        let s1 = i16::from_le_bytes([bytes[46], bytes[47]]);
        assert_eq!(s1, -32767);
    }

    #[test]
    fn test_write_wav_to_bytes_silence() {
        let samples = vec![0.0f32; 100];
        let bytes = write_wav_to_bytes(&samples, 16000).unwrap();
        // All PCM samples should be 0
        for i in 0..100 {
            let offset = 44 + i * 2;
            let val = i16::from_le_bytes([bytes[offset], bytes[offset + 1]]);
            assert_eq!(val, 0, "Sample {} should be 0", i);
        }
    }

    // ── wav_spec ────────────────────────────────────────────────────

    #[test]
    fn test_wav_spec_mono_float32() {
        let spec = wav_spec(16000);
        assert_eq!(spec.channels, 1);
        assert_eq!(spec.sample_rate, 16000);
        assert_eq!(spec.bits_per_sample, 32);
        assert_eq!(spec.sample_format, hound::SampleFormat::Float);
    }

    // ── DEFAULT_MAX_RECORDING_SAMPLES ───────────────────────────────

    #[test]
    fn test_max_recording_samples_constant() {
        // 16000 Hz * 60s * 2 min = 1,920,000
        assert_eq!(DEFAULT_MAX_RECORDING_SAMPLES, 1_920_000);
    }

    // ── RecorderState ───────────────────────────────────────────────

    #[test]
    fn test_recorder_state_default() {
        let state = RecorderState::default();
        assert!(state.cmd_tx.lock().is_ok());
        assert!(!state.is_capturing());
    }

    #[test]
    fn test_recorder_state_is_capturing_default_false() {
        let state = RecorderState::default();
        assert!(!state.is_capturing());
    }

    #[test]
    fn test_recorder_state_set_capturing() {
        let state = RecorderState::default();
        state.set_capturing(true);
        assert!(state.is_capturing());
        state.set_capturing(false);
        assert!(!state.is_capturing());
    }

    #[test]
    fn test_recorder_state_take_previous_app_none_by_default() {
        let state = RecorderState::default();
        assert!(state.take_previous_app().is_none());
    }

    #[test]
    fn test_recorder_state_take_previous_app_clears_value() {
        let state = RecorderState::default();
        // Manually set previous_app
        if let Ok(mut guard) = state.previous_app.lock() {
            *guard = Some("com.apple.Safari".to_string());
        }
        let app = state.take_previous_app();
        assert_eq!(app, Some("com.apple.Safari".to_string()));
        // Second take should be None
        assert!(state.take_previous_app().is_none());
    }

    // ── light_fast_path ─────────────────────────────────────────────

    #[test]
    fn test_light_fast_path_empty() {
        assert_eq!(light_fast_path(""), "");
        assert_eq!(light_fast_path("   "), "");
    }

    #[test]
    fn test_light_fast_path_capitalizes_first_letter() {
        let result = light_fast_path("hello world");
        assert!(result.starts_with('H'));
    }

    #[test]
    fn test_light_fast_path_adds_period() {
        let result = light_fast_path("hello world");
        assert!(result.ends_with('.'));
    }

    #[test]
    fn test_light_fast_path_keeps_existing_punctuation() {
        let result = light_fast_path("is this a question?");
        assert!(result.ends_with('?'));
        assert!(!result.ends_with("?."));
    }

    #[test]
    fn test_light_fast_path_keeps_exclamation() {
        let result = light_fast_path("that is amazing!");
        assert!(result.ends_with('!'));
    }

    #[test]
    fn test_light_fast_path_removes_french_fillers() {
        let result = light_fast_path("euh je pense que euh c'est bon");
        assert!(!result.to_lowercase().contains("euh"));
    }

    #[test]
    fn test_light_fast_path_removes_english_fillers() {
        let result = light_fast_path("um I think like basically it works");
        assert!(!result.to_lowercase().contains(" um "));
        assert!(!result.to_lowercase().contains(" like "));
        assert!(!result.to_lowercase().contains("basically"));
    }

    #[test]
    fn test_light_fast_path_removes_multi_word_fillers() {
        let result = light_fast_path("you know the meeting is tomorrow");
        assert!(!result.to_lowercase().contains("you know"));
    }

    #[test]
    fn test_light_fast_path_cleans_orphan_spaces() {
        let result = light_fast_path("euh hello  world");
        assert!(!result.contains("  "));
    }

    // ── strip_fillers ────────────────────────────────────────────────

    #[test]
    fn test_strip_fillers_empty() {
        assert_eq!(strip_fillers(""), "");
        assert_eq!(strip_fillers("   "), "");
    }

    #[test]
    fn test_strip_fillers_no_capitalization() {
        let result = strip_fillers("hello world");
        assert_eq!(result, "hello world");
    }

    #[test]
    fn test_strip_fillers_no_punctuation_added() {
        let result = strip_fillers("hello world");
        assert!(!result.ends_with('.'));
    }

    #[test]
    fn test_strip_fillers_removes_french() {
        let result = strip_fillers("euh je pense que en fait c'est bon");
        assert!(!result.to_lowercase().contains("euh"));
        assert!(!result.contains("en fait"));
        assert!(result.contains("je pense que"));
    }

    #[test]
    fn test_strip_fillers_removes_english() {
        let result = strip_fillers("um I think like basically it works");
        assert!(!result.contains(" um "));
        assert!(!result.contains(" like "));
        assert!(!result.contains("basically"));
        assert!(result.contains("I think"));
        assert!(result.contains("it works"));
    }

    #[test]
    fn test_strip_fillers_removes_new_french_fillers() {
        let result = strip_fillers("alors je vais en mode te montrer du coup le truc");
        assert!(!result.to_lowercase().contains("alors"));
        assert!(!result.contains("en mode"));
        assert!(!result.contains("du coup"));
    }

    #[test]
    fn test_strip_fillers_removes_new_english_fillers() {
        let result = strip_fillers("honestly I think to be honest it works");
        assert!(!result.to_lowercase().contains("honestly"));
        assert!(!result.contains("to be honest"));
    }

    #[test]
    fn test_strip_fillers_longest_match_first() {
        let result = strip_fillers("tu vois ce que je veux dire c'est cool");
        assert!(!result.contains("tu vois ce que je veux dire"));
        assert!(result.contains("c'est cool"));
    }

    #[test]
    fn test_strip_fillers_cleans_orphan_commas() {
        let result = strip_fillers("euh, hello world");
        assert!(!result.contains(" ,"));
        assert!(!result.contains(",,"));
    }

    // ── find_reflection_separator ───────────────────────────────────

    #[test]
    fn test_find_reflection_separator_standard() {
        let text = "Output text\n---REFLECTION---\nSome thoughts";
        let sep = find_reflection_separator(text);
        assert!(sep.is_some());
        let (start, end) = sep.unwrap();
        assert_eq!(&text[..start].trim(), &"Output text");
        assert_eq!(&text[end..].trim(), &"Some thoughts");
    }

    #[test]
    fn test_find_reflection_separator_with_spaces() {
        let text = "Output text\n--- REFLECTION ---\nSome thoughts";
        let sep = find_reflection_separator(text);
        assert!(sep.is_some());
    }

    #[test]
    fn test_find_reflection_separator_french() {
        let text = "Texte\n---RÉFLEXION---\nPensées";
        let sep = find_reflection_separator(text);
        assert!(sep.is_some());
    }

    #[test]
    fn test_find_reflection_separator_case_insensitive() {
        let text = "Output\n---Reflection---\nThoughts";
        let sep = find_reflection_separator(text);
        assert!(sep.is_some());
    }

    #[test]
    fn test_find_reflection_separator_none_when_absent() {
        let text = "Just regular output text without any separator";
        assert!(find_reflection_separator(text).is_none());
    }

    #[test]
    fn test_find_reflection_separator_none_without_dashes() {
        // "REFLECTION" without leading dashes should not match
        let text = "Output\nREFLECTION\nThoughts";
        assert!(find_reflection_separator(text).is_none());
    }
}
