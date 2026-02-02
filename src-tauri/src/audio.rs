use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::Sample;
use std::sync::mpsc;
use tauri::Emitter;
use tauri::Manager;
use std::sync::{Arc, Mutex};

// Limite d'enregistrement: 2 minutes à 16kHz = 1,920,000 samples
const MAX_RECORDING_SAMPLES: usize = 16000 * 60 * 2;

#[derive(Clone, serde::Serialize)]
struct TranscriptionReadyPayload {
    output: String,
    reflection: Option<String>,
    mode: Option<String>,
}

pub enum AudioCommand {
    Start,
    Stop,
}

pub struct RecorderState {
    cmd_tx: Mutex<Option<mpsc::Sender<AudioCommand>>>,
}

impl Default for RecorderState {
    fn default() -> Self {
        Self {
            cmd_tx: Mutex::new(None),
        }
    }
}

impl RecorderState {
    pub fn start_capture(&self, app: tauri::AppHandle) -> Result<(), String> {
        let mut guard = self.cmd_tx.lock().map_err(|e| e.to_string())?;
        if guard.is_none() {
            let (tx, rx) = mpsc::channel();
            std::thread::spawn(move || run_audio_worker(rx, app));
            *guard = Some(tx);
        }
        guard
            .as_ref()
            .unwrap()
            .send(AudioCommand::Start)
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn stop_capture(&self) -> Result<(), String> {
        let guard = self.cmd_tx.lock().map_err(|e| e.to_string())?;
        if let Some(ref tx) = *guard {
            tx.send(AudioCommand::Stop).map_err(|e| e.to_string())?;
        }
        Ok(())
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
                if let Err(e) = start_stream(&mut stream_holder, &buffer, &mut sample_rate) {
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
                buffer.lock().unwrap().clear();
                let temp_file = match tempfile::Builder::new()
                    .suffix(".wav")
                    .tempfile()
                {
                    Ok(f) => f,
                    Err(e) => {
                        let _ = app.emit("transcription_error", e.to_string());
                        continue;
                    }
                };
                let path = temp_file.path();
                if let Err(e) = write_wav(path, &samples, sample_rate) {
                    let _ = app.emit("transcription_error", e);
                    continue;
                }
                match crate::transcribe::transcribe_wav(path) {
                    Ok(transcribed_text) => {
                        let prompt_state = app.try_state::<crate::prompt_state::ActivePromptState>();
                        
                        let mode_prompt = prompt_state
                            .as_ref()
                            .and_then(|s| s.get().ok())
                            .flatten();

                        let active_mode = prompt_state
                            .as_ref()
                            .and_then(|s| s.get_mode().ok())
                            .flatten();

                        let final_text = if let Some(prompt) = mode_prompt {
                            if !prompt.is_empty() {
                                match crate::llm::transform_text(&transcribed_text, &prompt) {
                                    Ok(transformed) => transformed,
                                    Err(e) => {
                                        eprintln!("Erreur transformation LLM: {}", e);
                                        transcribed_text
                                    }
                                }
                            } else {
                                transcribed_text
                            }
                        } else {
                            transcribed_text
                        };

                        let payload = if final_text.contains("---REFLECTION---") {
                            let parts: Vec<&str> = final_text.splitn(2, "---REFLECTION---").collect();
                            let output = parts[0].trim().to_string();
                            let reflection = parts
                                .get(1)
                                .map(|s| s.trim().to_string())
                                .filter(|s| !s.is_empty());
                            TranscriptionReadyPayload {
                                output: output.clone(),
                                reflection,
                                mode: active_mode.clone(),
                            }
                        } else {
                            TranscriptionReadyPayload {
                                output: final_text.clone(),
                                reflection: None,
                                mode: active_mode.clone(),
                            }
                        };

                        if let Err(e) = crate::clipboard::copy_to_clipboard(&payload.output, &app) {
                            eprintln!("Clipboard: {}", e);
                        }
                        
                        let _ = app.emit("transcription_ready", payload);
                    }
                    Err(e) => {
                        let _ = app.emit("transcription_error", e);
                    }
                }
            }
        }
    }
}

fn start_stream(
    stream_holder: &mut Option<cpal::Stream>,
    buffer: &Arc<Mutex<Vec<f32>>>,
    sample_rate: &mut u32,
) -> Result<(), String> {
    let host = cpal::default_host();
    let device = host
        .default_input_device()
        .ok_or_else(|| "no input device".to_string())?;

    let config = device
        .default_input_config()
        .map_err(|e| e.to_string())?;

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
                            if guard.len() + data.len() <= MAX_RECORDING_SAMPLES {
                                guard.extend_from_slice(data);
                            } else if guard.len() < MAX_RECORDING_SAMPLES {
                                // Ajouter seulement jusqu'à la limite
                                let remaining = MAX_RECORDING_SAMPLES - guard.len();
                                guard.extend_from_slice(&data[..remaining]);
                                eprintln!("Limite d'enregistrement atteinte (2 minutes)");
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
                                if guard.len() < MAX_RECORDING_SAMPLES {
                                    guard.push(f32::from_sample(s));
                                } else {
                                    eprintln!("Limite d'enregistrement atteinte (2 minutes)");
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

pub fn write_wav(path: &std::path::Path, samples: &[f32], sample_rate: u32) -> Result<(), String> {
    let spec = hound::WavSpec {
        channels: 1,
        sample_rate,
        bits_per_sample: 32,
        sample_format: hound::SampleFormat::Float,
    };
    let mut writer = hound::WavWriter::create(path, spec).map_err(|e| e.to_string())?;
    for &s in samples {
        writer.write_sample(s).map_err(|e| e.to_string())?;
    }
    writer.finalize().map_err(|e| e.to_string())?;
    Ok(())
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
        assert_eq!(MAX_RECORDING_SAMPLES, 1_920_000);
    }

    #[test]
    fn test_recorder_state_default() {
        let state = RecorderState::default();
        assert!(state.cmd_tx.lock().is_ok());
    }
}
