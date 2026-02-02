use std::path::Path;
use std::time::Duration;

const MAX_RETRIES: u32 = 3;
const REQUEST_TIMEOUT_SECS: u64 = 30;

pub fn transcribe_wav(path: &Path) -> Result<String, String> {
    transcribe_wav_with_retry(path, MAX_RETRIES)
}

fn transcribe_wav_with_retry(path: &Path, max_retries: u32) -> Result<String, String> {
    let mut attempt = 0;

    loop {
        match transcribe_wav_internal(path) {
            Ok(result) => return Ok(result),
            Err(e) if attempt < max_retries => {
                attempt += 1;
                let backoff = Duration::from_millis(100 * 2u64.pow(attempt));
                eprintln!("Transcription tentative {}/{} échouée: {}", attempt, max_retries, e);
                eprintln!("Retry dans {:?}...", backoff);
                std::thread::sleep(backoff);
            }
            Err(e) => {
                return Err(format!("Échec transcription après {} tentatives: {}", max_retries, e));
            }
        }
    }
}

fn transcribe_wav_internal(path: &Path) -> Result<String, String> {
    let api_key = crate::secrets::get_api_key_cached()?;

    if !path.exists() {
        return Err(format!("Fichier audio introuvable: {}", path.display()));
    }
    let file = std::fs::File::open(path).map_err(|e| e.to_string())?;
    let file_name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("audio.wav");
    let part = reqwest::blocking::multipart::Part::reader(file)
        .file_name(file_name.to_string())
        .mime_str("audio/wav")
        .map_err(|e| e.to_string())?;

    let form = reqwest::blocking::multipart::Form::new()
        .part("file", part)
        .text("model", "whisper-1");

    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(REQUEST_TIMEOUT_SECS))
        .build()
        .map_err(|e| format!("Erreur création client HTTP: {}", e))?;
    
    let resp = client
        .post("https://api.openai.com/v1/audio/transcriptions")
        .header("Authorization", format!("Bearer {}", api_key))
        .multipart(form)
        .send()
        .map_err(|e| format!("Erreur requête API Whisper: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().unwrap_or_default();
        return Err(format!("API error {}: {}", status, body));
    }

    #[derive(serde::Deserialize)]
    struct Transcription {
        text: String,
    }
    let out: Transcription = resp.json().map_err(|e| e.to_string())?;
    Ok(out.text.trim().to_string())
}
