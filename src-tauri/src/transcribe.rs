use crate::http_client;
use std::time::Duration;

const MAX_RETRIES: u32 = 3;

/// Known Whisper hallucination patterns — boilerplate text from training data
/// that Whisper outputs when audio is too short, silent, or inaudible.
fn is_whisper_hallucination(text: &str) -> bool {
    let lower = text.to_lowercase();
    // Long patterns: match if text contains them
    let hallucinations = [
        "sous-titres réalisés par",
        "sous-titres par",
        "amara.org",
        "subtitles by",
        "sous-titrage",
        "merci d'avoir regardé",
        "thank you for watching",
        "시청해주셔서 감사합니다",
        "请不吝点赞",
        "ご視聴ありがとうございました",
        "thanks for watching",
        "please subscribe",
        "like and subscribe",
    ];
    if hallucinations.iter().any(|h| lower.contains(h)) {
        return true;
    }
    // Short exact-match hallucinations (common single-word outputs on silence)
    let trimmed = lower.trim().trim_end_matches('.');
    let short_hallucinations = [
        "merci", "bonjour", "au revoir", "bye", "thanks", "thank you",
        "oui", "non", "ok", "hello", "hi",
    ];
    short_hallucinations.iter().any(|h| trimmed == *h)
}

/// Transcription async à partir du WAV en mémoire. Retries avec backoff.
pub async fn transcribe_bytes(
    wav_bytes: Vec<u8>,
    app: &tauri::AppHandle,
) -> Result<String, String> {
    let mut attempt = 0;
    loop {
        match transcribe_bytes_internal(&wav_bytes, app).await {
            Ok(result) => return Ok(result),
            Err(e) if attempt < MAX_RETRIES => {
                attempt += 1;
                let backoff = Duration::from_millis(100 * 2u64.pow(attempt));
                eprintln!(
                    "Transcription tentative {}/{} échouée: {}",
                    attempt, MAX_RETRIES, e
                );
                tokio::time::sleep(backoff).await;
            }
            Err(e) => {
                return Err(format!(
                    "Échec transcription après {} tentatives: {}",
                    MAX_RETRIES, e
                ));
            }
        }
    }
}

async fn transcribe_bytes_internal(
    wav_bytes: &[u8],
    app: &tauri::AppHandle,
) -> Result<String, String> {
    let api_key = crate::secrets::get_api_key_cached()?;
    let prefs = crate::preferences::get_preferences(app).unwrap_or_default();
    let timeout_secs = prefs.transcription.timeout_secs.clamp(10, 120);
    let model = prefs.transcription.model.clone();
    let base_url = prefs
        .advanced
        .transcription_base_url
        .as_deref()
        .unwrap_or("https://api.openai.com")
        .trim_end_matches('/');
    let url = format!("{}/v1/audio/transcriptions", base_url);

    let part = reqwest::multipart::Part::bytes(wav_bytes.to_vec())
        .file_name("audio.wav")
        .mime_str("audio/wav")
        .map_err(|e| e.to_string())?;

    let mut form = reqwest::multipart::Form::new()
        .part("file", part)
        .text("model", model);
    let lang = prefs.transcription.language.as_deref().unwrap_or("fr");
    if !lang.is_empty() {
        form = form.text("language", lang.to_string());
    }

    let dict_prompt = crate::dictionary::build_whisper_prompt(app);
    // Send dict words as prompt to guide Whisper transcription.
    // Don't send conversational text as prompt — Whisper may echo it back.
    if !dict_prompt.is_empty() {
        form = form.text("prompt", dict_prompt);
    }

    let resp = http_client::client()
        .post(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .multipart(form)
        .timeout(Duration::from_secs(timeout_secs))
        .send()
        .await
        .map_err(|e| format!("Erreur requête API Whisper: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("API error {}: {}", status, body));
    }

    #[derive(serde::Deserialize)]
    struct Transcription {
        text: String,
    }
    let out: Transcription = resp.json().await.map_err(|e| e.to_string())?;
    let text = out.text.trim().to_string();

    // Filter known Whisper hallucinations (boilerplate from training data)
    if is_whisper_hallucination(&text) {
        return Err("Transcription vide ou inaudible. Essayez de parler plus fort ou plus longtemps.".to_string());
    }

    Ok(text)
}
