use crate::http_client;
use std::time::Duration;

const MAX_RETRIES: u32 = 3;

/// Known Whisper hallucination patterns — boilerplate text from training data
/// that Whisper outputs when audio is too short, silent, or inaudible.
fn is_whisper_hallucination(text: &str) -> bool {
    let trimmed = text.trim();

    // Reject garbage: only punctuation/dots, single characters, or empty
    if trimmed.is_empty() {
        return true;
    }
    let stripped: String = trimmed.chars().filter(|c| c.is_alphanumeric()).collect();
    if stripped.len() <= 1 {
        // "...", "A.", "!!!!", "......................" etc.
        return true;
    }

    let lower = trimmed.to_lowercase();
    // Long patterns: match if text contains them
    let hallucinations = [
        "sous-titres réalisés",
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
        "c'est parti",
        "continue watching",
        "the end",
    ];
    if hallucinations.iter().any(|h| lower.contains(h)) {
        return true;
    }
    // Short exact-match hallucinations (common single-word outputs on silence)
    let trimmed_lower = lower.trim_end_matches('.');
    let short_hallucinations = [
        "merci", "bonjour", "au revoir", "bye", "thanks", "thank you",
        "oui", "non", "ok", "hello", "hi",
    ];
    short_hallucinations.iter().any(|h| trimmed_lower == *h)
}

/// Transcription async à partir du WAV en mémoire. Retries avec backoff.
/// If the primary provider (e.g. Groq) fails after all retries and an OpenAI key exists,
/// automatically falls back to OpenAI and emits a `provider_fallback` event.
pub async fn transcribe_bytes(
    wav_bytes: Vec<u8>,
    app: &tauri::AppHandle,
) -> Result<String, String> {
    use tauri::Emitter;

    let mut attempt = 0;
    let primary_error = loop {
        match transcribe_bytes_internal(&wav_bytes, app).await {
            Ok(result) => return guard_hallucination(result),
            Err(e) if attempt < MAX_RETRIES => {
                attempt += 1;
                let backoff = Duration::from_millis(100 * 2u64.pow(attempt));
                #[cfg(debug_assertions)]
                eprintln!(
                    "Transcription tentative {}/{} échouée: {}",
                    attempt, MAX_RETRIES, e
                );
                tokio::time::sleep(backoff).await;
            }
            Err(e) => {
                break e;
            }
        }
    };

    // Provider fallback: if primary was Groq, try OpenAI
    let prefs = crate::preferences::get_preferences(app).unwrap_or_default();
    if prefs.transcription.provider == "groq" && crate::secrets::get_key_for_provider("openai").or_else(|_| crate::secrets::get_api_key_cached()).is_ok() {
        #[cfg(debug_assertions)]
        eprintln!("Groq transcription failed, falling back to OpenAI: {}", primary_error);
        let _ = app.emit("provider_fallback", "Groq → OpenAI");
        match transcribe_bytes_openai_fallback(&wav_bytes, app).await {
            Ok(result) => return guard_hallucination(result),
            Err(fallback_err) => {
                return Err(format!(
                    "Échec transcription après {} tentatives (Groq: {}, OpenAI fallback: {})",
                    MAX_RETRIES, primary_error, fallback_err
                ));
            }
        }
    }

    Err(format!(
        "Échec transcription après {} tentatives: {}",
        MAX_RETRIES, primary_error
    ))
}

/// Single guard point for hallucination filtering — every transcription path goes through here.
fn guard_hallucination(text: String) -> Result<String, String> {
    if is_whisper_hallucination(&text) {
        Err("Transcription vide ou inaudible. Essayez de parler plus fort ou plus longtemps.".to_string())
    } else {
        Ok(text)
    }
}

/// Fallback transcription using OpenAI when primary provider fails.
async fn transcribe_bytes_openai_fallback(
    wav_bytes: &[u8],
    app: &tauri::AppHandle,
) -> Result<String, String> {
    let prefs = crate::preferences::get_preferences(app).unwrap_or_default();
    let api_key = crate::secrets::get_key_for_provider("openai")
        .or_else(|_| crate::secrets::get_api_key_cached())?;
    let base_url = prefs.advanced.transcription_base_url
        .as_deref()
        .unwrap_or("https://api.openai.com")
        .trim_end_matches('/')
        .to_string();
    validate_base_url(&base_url)?;
    let timeout_secs = prefs.transcription.timeout_secs.clamp(10, 120);
    let url = format!("{}/v1/audio/transcriptions", base_url);

    let part = reqwest::multipart::Part::bytes(wav_bytes.to_vec())
        .file_name("audio.wav")
        .mime_str("audio/wav")
        .map_err(|e| e.to_string())?;

    let mut form = reqwest::multipart::Form::new()
        .part("file", part)
        .text("model", "whisper-1".to_string());
    let lang = prefs.transcription.language.as_deref().unwrap_or("fr");
    if !lang.is_empty() {
        form = form.text("language", lang.to_string());
    }

    let dict_prompt = crate::dictionary::build_whisper_prompt(app);
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
        .map_err(|e| format!("OpenAI fallback request error: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("OpenAI fallback API error {}: {}", status, body));
    }

    #[derive(serde::Deserialize)]
    struct Transcription {
        text: String,
    }
    let out: Transcription = resp.json().await.map_err(|e| e.to_string())?;
    Ok(out.text.trim().to_string())
}

/// Validate that a base URL uses HTTPS. Rejects plain HTTP to protect API keys in transit.
fn validate_base_url(url: &str) -> Result<(), String> {
    if url.starts_with("https://") {
        Ok(())
    } else if url.starts_with("http://") {
        Err("Insecure base URL rejected: plain HTTP is not allowed for API endpoints that transmit API keys. Use https:// instead.".to_string())
    } else {
        Err(format!("Invalid base URL '{}': must start with https://", url))
    }
}

async fn transcribe_bytes_internal(
    wav_bytes: &[u8],
    app: &tauri::AppHandle,
) -> Result<String, String> {
    let prefs = crate::preferences::get_preferences(app).unwrap_or_default();
    let provider = prefs.transcription.provider.as_str();
    let timeout_secs = prefs.transcription.timeout_secs.clamp(10, 120);

    // Resolve API key and base URL based on provider
    let (api_key, base_url, model) = match provider {
        "groq" => {
            let key = crate::secrets::get_key_for_provider("groq")
                .map_err(|_| "No Groq API key found. Add a Groq key (gsk_...) in Settings → API Keys.".to_string())?;
            let url = prefs.advanced.transcription_base_url
                .as_deref()
                .unwrap_or("https://api.groq.com/openai")
                .trim_end_matches('/')
                .to_string();
            validate_base_url(&url)?;
            // Groq supports whisper-large-v3-turbo (fastest) and whisper-large-v3
            let model = if prefs.transcription.model.starts_with("whisper-large") {
                prefs.transcription.model.clone()
            } else {
                "whisper-large-v3-turbo".to_string()
            };
            (key, url, model)
        }
        _ => {
            // OpenAI (default)
            let key = crate::secrets::get_key_for_provider("openai")
                .or_else(|_| crate::secrets::get_api_key_cached())?;
            let url = prefs.advanced.transcription_base_url
                .as_deref()
                .unwrap_or("https://api.openai.com")
                .trim_end_matches('/')
                .to_string();
            validate_base_url(&url)?;
            (key, url, prefs.transcription.model.clone())
        }
    };
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

#[cfg(test)]
mod tests {
    use super::*;

    // ── is_whisper_hallucination ─────────────────────────────────────

    #[test]
    fn test_hallucination_subtitles_french() {
        assert!(is_whisper_hallucination("Sous-titres réalisés par la communauté"));
    }

    #[test]
    fn test_hallucination_subtitles_by() {
        assert!(is_whisper_hallucination("Subtitles by the Amara.org community"));
    }

    #[test]
    fn test_hallucination_amara() {
        assert!(is_whisper_hallucination("amara.org"));
    }

    #[test]
    fn test_hallucination_thank_you_for_watching() {
        assert!(is_whisper_hallucination("Thank you for watching!"));
    }

    #[test]
    fn test_hallucination_merci_davoir_regarde() {
        assert!(is_whisper_hallucination("Merci d'avoir regardé"));
    }

    #[test]
    fn test_hallucination_please_subscribe() {
        assert!(is_whisper_hallucination("Please subscribe and like"));
    }

    #[test]
    fn test_hallucination_like_and_subscribe() {
        assert!(is_whisper_hallucination("Like and subscribe"));
    }

    #[test]
    fn test_hallucination_korean() {
        assert!(is_whisper_hallucination("시청해주셔서 감사합니다"));
    }

    #[test]
    fn test_hallucination_chinese() {
        assert!(is_whisper_hallucination("请不吝点赞"));
    }

    #[test]
    fn test_hallucination_japanese() {
        assert!(is_whisper_hallucination("ご視聴ありがとうございました"));
    }

    // ── Short exact-match hallucinations ─────────────────────────────

    #[test]
    fn test_hallucination_short_merci() {
        assert!(is_whisper_hallucination("Merci"));
        assert!(is_whisper_hallucination("merci"));
        assert!(is_whisper_hallucination("merci."));
    }

    #[test]
    fn test_hallucination_short_bonjour() {
        assert!(is_whisper_hallucination("Bonjour"));
        assert!(is_whisper_hallucination("bonjour."));
    }

    #[test]
    fn test_hallucination_short_hello() {
        assert!(is_whisper_hallucination("hello"));
        assert!(is_whisper_hallucination("Hello."));
    }

    #[test]
    fn test_hallucination_short_bye() {
        assert!(is_whisper_hallucination("bye"));
        assert!(is_whisper_hallucination("Bye"));
    }

    #[test]
    fn test_hallucination_short_oui_non() {
        assert!(is_whisper_hallucination("oui"));
        assert!(is_whisper_hallucination("non"));
        assert!(is_whisper_hallucination("ok"));
    }

    // ── Case insensitive matching ───────────────────────────────────

    #[test]
    fn test_hallucination_case_insensitive_long() {
        assert!(is_whisper_hallucination("SOUS-TITRES RÉALISÉS PAR la communauté"));
        assert!(is_whisper_hallucination("THANK YOU FOR WATCHING"));
    }

    #[test]
    fn test_hallucination_case_insensitive_short() {
        assert!(is_whisper_hallucination("MERCI"));
        assert!(is_whisper_hallucination("OK"));
    }

    // ── Legitimate text passes through ──────────────────────────────

    #[test]
    fn test_legitimate_text_passes() {
        assert!(!is_whisper_hallucination("I need to schedule a meeting for tomorrow"));
    }

    #[test]
    fn test_legitimate_french_text_passes() {
        assert!(!is_whisper_hallucination("Je dois planifier une réunion pour demain"));
    }

    #[test]
    fn test_legitimate_short_sentence_passes() {
        assert!(!is_whisper_hallucination("Let's go"));
    }

    #[test]
    fn test_merci_inside_longer_sentence_not_hallucination() {
        // "merci" as a short hallucination only matches when it IS the entire text
        assert!(!is_whisper_hallucination("merci beaucoup pour votre aide"));
    }

    #[test]
    fn test_hello_inside_longer_sentence_not_hallucination() {
        assert!(!is_whisper_hallucination("hello everyone, welcome to the presentation"));
    }

    // ── Edge cases ──────────────────────────────────────────────────

    #[test]
    fn test_empty_text_is_hallucination() {
        assert!(is_whisper_hallucination(""));
    }

    #[test]
    fn test_whitespace_only_is_hallucination() {
        assert!(is_whisper_hallucination("   "));
    }

    #[test]
    fn test_single_period_is_hallucination() {
        assert!(is_whisper_hallucination("."));
    }

    #[test]
    fn test_dots_garbage_is_hallucination() {
        assert!(is_whisper_hallucination("..."));
        assert!(is_whisper_hallucination("......................"));
    }

    #[test]
    fn test_single_char_is_hallucination() {
        assert!(is_whisper_hallucination("A."));
        assert!(is_whisper_hallucination("a"));
    }

    #[test]
    fn test_cest_parti_is_hallucination() {
        assert!(is_whisper_hallucination("C'est parti."));
    }

    // ── validate_base_url ──────────────────────────────────────────

    #[test]
    fn test_validate_base_url_https_ok() {
        assert!(validate_base_url("https://api.openai.com").is_ok());
        assert!(validate_base_url("https://api.groq.com/openai").is_ok());
    }

    #[test]
    fn test_validate_base_url_http_rejected() {
        let result = validate_base_url("http://api.openai.com");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("plain HTTP"));
    }

    #[test]
    fn test_validate_base_url_invalid_scheme() {
        assert!(validate_base_url("ftp://example.com").is_err());
        assert!(validate_base_url("api.openai.com").is_err());
    }

    #[test]
    fn test_sous_titrage_variant() {
        assert!(is_whisper_hallucination("Sous-titrage ST' 501"));
    }

    #[test]
    fn test_thanks_for_watching_variant() {
        assert!(is_whisper_hallucination("thanks for watching and see you next time"));
    }
}
