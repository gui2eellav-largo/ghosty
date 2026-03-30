use crate::http_client;
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use tauri::Emitter;

const MAX_RETRIES: u32 = 3;

#[derive(Serialize)]
struct ChatRequest {
    model: String,
    messages: Vec<Message>,
    temperature: f32,
    max_tokens: u32,
    stream: bool,
}

#[derive(Serialize, Deserialize, Clone)]
struct Message {
    role: String,
    content: String,
}

#[derive(Deserialize)]
struct StreamChunk {
    choices: Option<Vec<StreamChoice>>,
}

#[derive(Deserialize)]
struct StreamChoice {
    delta: StreamDelta,
}

#[derive(Deserialize, Default)]
struct StreamDelta {
    content: Option<String>,
}

#[derive(Deserialize)]
struct ChatCompletionResponse {
    choices: Option<Vec<ChatChoice>>,
}

#[derive(Deserialize)]
struct ChatChoice {
    message: ChatMessage,
}

#[derive(Deserialize)]
struct ChatMessage {
    content: Option<String>,
}

const IMPROVE_SYSTEM_PROMPT_META: &str = r#"You are an expert at improving system prompts. The prompt you will improve is used by a prompt-enhancer app: it instructs a model to rewrite the user's raw voice input. The enhancer's output may be either (a) a REQUEST to paste into another AI tool, or (b) a final deliverable (e.g. Slack message, email) ready to paste — the improved prompt must match what the user asked for.

CRITICAL RULES:
- Fidelity: Stay strictly faithful to the user's intent. Do not add criteria, adjectives, or goals they did not state or clearly imply (e.g. do not add "actionable", "professional", "enhance clarity" unless the user asked for them). Minimal necessary enrichment only.
- Output type: If the user wants a style or format (e.g. "Slack", "email", "tweet"), the enhancer's output is the formatted message itself, ready to paste — say so explicitly in the improved prompt. If the user wants a prompt to feed another AI, the output is a REQUEST — the improved prompt must enforce "output = request, never a response". Do not conflate the two.
- Language: Output the improved system prompt in the same language as the input. If the input is in French, the improved prompt must be in French.
- One-line intents: If the input is a short one-line intent (e.g. "transform into Slack style", "rewrite in teen slang"), the improved prompt MUST expand it into a complete, operational instruction. Define what the style/format means for the model (tone, register, typical traits, what to preserve). The result must be a system prompt that another model can follow without guessing. Do not only add meta phrases like "ready to copy-paste"; add concrete instructions (how to achieve the style, what to change).
- If the current prompt is already long and operational, keep it tight: clean up and add 1–2 precision points. Do not over-expand.
- Undefined references ("this", "my", "the X"): the improved prompt should instruct the model to infer the most likely intent from context. Never leave placeholders or ask for clarification — work with what's given.

PROCESS (apply only where relevant to the user's intent):
1. Intent: What does the user actually need? Infer the real goal. Do not add a different goal (e.g. "actionable" when they only asked for "Slack style").
2. Domain: For reasoning or analytical intents, help the model identify the field and use semantic levers (named methodologies: Root cause analysis, MECE, Five Whys, etc.). For style-only intents (Slack, email, tone), do not force these; focus on format, brevity, tone.
3. Enrich: Add only what the intent implies — scope, format, length, tone. Semantic levers and structure (CONTEXT, OBJECTIVE, METHOD) are for prompts that will produce requests for another AI or complex deliverables, not for simple "rewrite as X format".
4. Structure: Light structure (bullets, short blocks) when it helps. Labeled sections (CONTEXT, OBJECTIVE, METHOD, CONSTRAINTS) only when the user's intent implies a framed or expert-level request. Never impose a heavy template for simple intents.

OUTPUT:
- Output ONLY the improved system prompt. Same language as the input. Zero meta-commentary. No preamble. No explanation of your changes. The text you produce will be used as-is."#;

/// Transformation async avec streaming : accumule le contenu puis retourne le texte complet.
/// Si `cancel` est déclenché, retourne Err("Annulé").
/// `temperature_override` permet de forcer une température pour les modes built-in.
/// If the primary provider (e.g. Groq) fails after all retries and an OpenAI key exists,
/// automatically falls back to OpenAI and emits a `provider_fallback` event.
pub async fn transform_text_streaming(
    text: &str,
    mode_prompt: &str,
    app: &tauri::AppHandle,
    cancel: tokio_util::sync::CancellationToken,
    temperature_override: Option<f32>,
) -> Result<String, String> {
    if mode_prompt.is_empty() {
        return Ok(text.to_string());
    }

    let mut attempt = 0;
    let primary_error = loop {
        match transform_text_streaming_internal(text, mode_prompt, app, cancel.clone(), temperature_override).await {
            Ok(result) => return Ok(result),
            Err(e) if e == "Annulé" => return Err(e),
            Err(e) if attempt < MAX_RETRIES => {
                attempt += 1;
                let backoff = Duration::from_millis(150 * 2u64.pow(attempt));
                eprintln!(
                    "Transformation LLM tentative {}/{} échouée: {}",
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
    if prefs.llm.provider == "groq" && crate::secrets::get_api_key_cached().is_ok() {
        eprintln!("Groq LLM failed, falling back to OpenAI: {}", primary_error);
        let _ = app.emit("provider_fallback", "Groq → OpenAI");
        match transform_text_streaming_openai_fallback(text, mode_prompt, app, cancel, temperature_override).await {
            Ok(result) => return Ok(result),
            Err(fallback_err) => {
                return Err(format!(
                    "Échec transformation après {} tentatives (Groq: {}, OpenAI fallback: {})",
                    MAX_RETRIES, primary_error, fallback_err
                ));
            }
        }
    }

    Err(format!(
        "Échec transformation après {} tentatives: {}",
        MAX_RETRIES, primary_error
    ))
}

/// Single-attempt LLM call using OpenAI as fallback provider.
async fn transform_text_streaming_openai_fallback(
    text: &str,
    mode_prompt: &str,
    app: &tauri::AppHandle,
    cancel: tokio_util::sync::CancellationToken,
    temperature_override: Option<f32>,
) -> Result<String, String> {
    let prefs = crate::preferences::get_preferences(app).unwrap_or_default();
    let (api_key, base_url, model) = resolve_openai_fallback_config(&prefs)?;
    let timeout_secs = prefs.llm.timeout_secs.clamp(15, 120);
    let url = format!("{}/v1/chat/completions", base_url);
    let temperature = temperature_override.unwrap_or(prefs.llm.temperature).clamp(0.0, 2.0);

    let request = ChatRequest {
        model,
        messages: vec![
            Message {
                role: "system".to_string(),
                content: build_system_prompt(mode_prompt),
            },
            Message {
                role: "user".to_string(),
                content: text.to_string(),
            },
        ],
        temperature,
        max_tokens: prefs.llm.max_tokens.clamp(100, 4096),
        stream: true,
    };

    let resp = http_client::client()
        .post(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&request)
        .timeout(Duration::from_secs(timeout_secs))
        .send()
        .await
        .map_err(|e| format!("OpenAI fallback LLM request error: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("OpenAI fallback LLM error {}: {}", status, body));
    }

    let mut stream = resp.bytes_stream();
    let mut buf = Vec::<u8>::new();
    let mut content = String::new();

    loop {
        let chunk_result = tokio::select! {
            _ = cancel.cancelled() => return Err("Annulé".to_string()),
            next = stream.next() => next,
        };
        let Some(chunk_result) = chunk_result else {
            break;
        };
        let chunk = chunk_result.map_err(|e| format!("Stream error: {}", e))?;
        buf.extend_from_slice(&chunk);

        while let Some((line, rest)) = parse_one_line(&buf) {
            buf = rest;
            if line.is_empty() {
                continue;
            }
            if line.starts_with("data: ") {
                let data = line.trim_start_matches("data: ").trim();
                if data == "[DONE]" {
                    return Ok(content.trim().to_string());
                }
                if let Ok(parsed) = serde_json::from_str::<StreamChunk>(data) {
                    if let Some(choices) = parsed.choices {
                        if let Some(choice) = choices.first() {
                            if let Some(ref delta) = choice.delta.content {
                                content.push_str(delta);
                                let _ = app.emit("llm_chunk", content.trim().to_string());
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(content.trim().to_string())
}

fn build_system_prompt(mode_prompt: &str) -> String {
    mode_prompt.to_string()
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

/// Resolve LLM provider config: API key, base URL, and model.
fn resolve_llm_config(prefs: &crate::preferences::Preferences) -> Result<(String, String, String), String> {
    let provider = prefs.llm.provider.as_str();
    match provider {
        "groq" => {
            let key = crate::secrets::get_key_for_provider("groq")
                .map_err(|_| "No Groq API key found. Add a Groq key (gsk_...) in Settings → API Keys.".to_string())?;
            let url = prefs.advanced.llm_base_url
                .as_deref()
                .unwrap_or("https://api.groq.com/openai")
                .trim_end_matches('/')
                .to_string();
            validate_base_url(&url)?;
            // Default to llama-3.1-8b-instant if user hasn't picked a Groq model
            let model = if prefs.llm.model.starts_with("llama") || prefs.llm.model.starts_with("mixtral") || prefs.llm.model.starts_with("qwen") {
                prefs.llm.model.clone()
            } else {
                "llama-3.1-8b-instant".to_string()
            };
            Ok((key, url, model))
        }
        _ => {
            let key = crate::secrets::get_api_key_cached()?;
            let url = prefs.advanced.llm_base_url
                .as_deref()
                .unwrap_or("https://api.openai.com")
                .trim_end_matches('/')
                .to_string();
            validate_base_url(&url)?;
            Ok((key, url, prefs.llm.model.clone()))
        }
    }
}

/// Resolve LLM config specifically for OpenAI fallback (ignores current provider setting).
fn resolve_openai_fallback_config(prefs: &crate::preferences::Preferences) -> Result<(String, String, String), String> {
    let key = crate::secrets::get_api_key_cached()?;
    let url = prefs.advanced.llm_base_url
        .as_deref()
        .unwrap_or("https://api.openai.com")
        .trim_end_matches('/')
        .to_string();
    validate_base_url(&url)?;
    Ok((key, url, "gpt-4o-mini".to_string()))
}

async fn transform_text_streaming_internal(
    text: &str,
    mode_prompt: &str,
    app: &tauri::AppHandle,
    cancel: tokio_util::sync::CancellationToken,
    temperature_override: Option<f32>,
) -> Result<String, String> {
    let prefs = crate::preferences::get_preferences(app).unwrap_or_default();
    let (api_key, base_url, model) = resolve_llm_config(&prefs)?;
    let timeout_secs = prefs.llm.timeout_secs.clamp(15, 120);
    let url = format!("{}/v1/chat/completions", base_url);

    let temperature = temperature_override.unwrap_or(prefs.llm.temperature).clamp(0.0, 2.0);

    let request = ChatRequest {
        model,
        messages: vec![
            Message {
                role: "system".to_string(),
                content: build_system_prompt(mode_prompt),
            },
            Message {
                role: "user".to_string(),
                content: text.to_string(),
            },
        ],
        temperature,
        max_tokens: prefs.llm.max_tokens.clamp(100, 4096),
        stream: true,
    };

    let resp = http_client::client()
        .post(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&request)
        .timeout(Duration::from_secs(timeout_secs))
        .send()
        .await
        .map_err(|e| format!("Erreur requête API LLM: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("API LLM error {}: {}", status, body));
    }

    let mut stream = resp.bytes_stream();
    let mut buf = Vec::<u8>::new();
    let mut content = String::new();

    loop {
        let chunk_result = tokio::select! {
            _ = cancel.cancelled() => return Err("Annulé".to_string()),
            next = stream.next() => next,
        };
        let Some(chunk_result) = chunk_result else {
            break;
        };
        let chunk = chunk_result.map_err(|e| format!("Stream error: {}", e))?;
        buf.extend_from_slice(&chunk);

        while let Some((line, rest)) = parse_one_line(&buf) {
            buf = rest;
            if line.is_empty() {
                continue;
            }
            if line.starts_with("data: ") {
                let data = line.trim_start_matches("data: ").trim();
                if data == "[DONE]" {
                    return Ok(content.trim().to_string());
                }
                if let Ok(parsed) = serde_json::from_str::<StreamChunk>(data) {
                    if let Some(choices) = parsed.choices {
                        if let Some(choice) = choices.first() {
                            if let Some(ref delta) = choice.delta.content {
                                content.push_str(delta);
                                let _ = app.emit("llm_chunk", content.trim().to_string());
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(content.trim().to_string())
}

/// Améliore un system prompt (meta: clarté, structure, concision, alignement Ghosty). Appel non-streaming.
pub async fn improve_system_prompt(prompt: &str, app: &tauri::AppHandle) -> Result<String, String> {
    let prefs = crate::preferences::get_preferences(app).unwrap_or_default();
    let (api_key, base_url, model) = resolve_llm_config(&prefs)?;
    let timeout_secs = prefs.llm.timeout_secs.clamp(15, 120);
    let url = format!("{}/v1/chat/completions", base_url);

    let request = ChatRequest {
        model,
        messages: vec![
            Message {
                role: "system".to_string(),
                content: IMPROVE_SYSTEM_PROMPT_META.to_string(),
            },
            Message {
                role: "user".to_string(),
                content: prompt.to_string(),
            },
        ],
        temperature: 0.3,
        max_tokens: prefs.llm.max_tokens.clamp(500, 8192),
        stream: false,
    };

    let resp = http_client::client()
        .post(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&request)
        .timeout(Duration::from_secs(timeout_secs))
        .send()
        .await
        .map_err(|e| format!("Erreur requête API LLM: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("API LLM error {}: {}", status, body));
    }

    let parsed: ChatCompletionResponse = resp
        .json()
        .await
        .map_err(|e| format!("Réponse API invalide: {}", e))?;

    let content = parsed
        .choices
        .and_then(|c| c.into_iter().next())
        .and_then(|c| c.message.content)
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .ok_or_else(|| "Réponse LLM vide".to_string())?;

    Ok(content)
}

/// Retourne une ligne (jusqu'à \n) et le reste du buffer.
fn parse_one_line(buf: &[u8]) -> Option<(String, Vec<u8>)> {
    let pos = buf.iter().position(|&b| b == b'\n')?;
    let line = String::from_utf8_lossy(&buf[..pos]).to_string();
    let rest = buf[pos + 1..].to_vec();
    Some((line, rest))
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── parse_one_line ──────────────────────────────────────────────

    #[test]
    fn test_parse_one_line_basic() {
        let buf = b"hello\nworld\n";
        let (line, rest) = parse_one_line(buf).unwrap();
        assert_eq!(line, "hello");
        assert_eq!(rest, b"world\n");
    }

    #[test]
    fn test_parse_one_line_no_newline() {
        let buf = b"no newline here";
        assert!(parse_one_line(buf).is_none());
    }

    #[test]
    fn test_parse_one_line_empty_line() {
        let buf = b"\nrest";
        let (line, rest) = parse_one_line(buf).unwrap();
        assert_eq!(line, "");
        assert_eq!(rest, b"rest");
    }

    #[test]
    fn test_parse_one_line_empty_buffer() {
        let buf = b"";
        assert!(parse_one_line(buf).is_none());
    }

    #[test]
    fn test_parse_one_line_multiple_lines() {
        let mut buf = b"line1\nline2\nline3\n".to_vec();
        let (line1, rest) = parse_one_line(&buf).unwrap();
        assert_eq!(line1, "line1");
        buf = rest;
        let (line2, rest) = parse_one_line(&buf).unwrap();
        assert_eq!(line2, "line2");
        buf = rest;
        let (line3, _rest) = parse_one_line(&buf).unwrap();
        assert_eq!(line3, "line3");
    }

    #[test]
    fn test_parse_one_line_sse_data() {
        let buf = b"data: {\"choices\":[{\"delta\":{\"content\":\"Hello\"}}]}\n\n";
        let (line, rest) = parse_one_line(buf).unwrap();
        assert!(line.starts_with("data: "));
        // Remainder starts with the second \n
        let (empty_line, _) = parse_one_line(&rest).unwrap();
        assert_eq!(empty_line, "");
    }

    #[test]
    fn test_parse_one_line_done_marker() {
        let buf = b"data: [DONE]\n";
        let (line, rest) = parse_one_line(buf).unwrap();
        assert_eq!(line, "data: [DONE]");
        assert!(rest.is_empty());
    }

    // ── build_system_prompt ─────────────────────────────────────────

    #[test]
    fn test_build_system_prompt_passthrough() {
        let prompt = "You are a helpful assistant.";
        assert_eq!(build_system_prompt(prompt), prompt);
    }

    #[test]
    fn test_build_system_prompt_empty() {
        assert_eq!(build_system_prompt(""), "");
    }

    // ── ChatRequest serialization ───────────────────────────────────

    #[test]
    fn test_chat_request_serialization() {
        let req = ChatRequest {
            model: "gpt-4o-mini".to_string(),
            messages: vec![
                Message { role: "system".to_string(), content: "You are helpful.".to_string() },
                Message { role: "user".to_string(), content: "Hello".to_string() },
            ],
            temperature: 0.3,
            max_tokens: 1024,
            stream: true,
        };
        let json = serde_json::to_value(&req).unwrap();
        assert_eq!(json["model"], "gpt-4o-mini");
        assert_eq!(json["stream"], true);
        assert_eq!(json["messages"].as_array().unwrap().len(), 2);
    }

    // ── StreamChunk deserialization ──────────────────────────────────

    #[test]
    fn test_stream_chunk_deserialization() {
        let json = r#"{"choices":[{"delta":{"content":"Hello"}}]}"#;
        let chunk: StreamChunk = serde_json::from_str(json).unwrap();
        let binding = chunk.choices.unwrap();
        let content = binding[0].delta.content.as_ref().unwrap();
        assert_eq!(content, "Hello");
    }

    #[test]
    fn test_stream_chunk_empty_delta() {
        let json = r#"{"choices":[{"delta":{}}]}"#;
        let chunk: StreamChunk = serde_json::from_str(json).unwrap();
        assert!(chunk.choices.unwrap()[0].delta.content.is_none());
    }

    #[test]
    fn test_stream_chunk_no_choices() {
        let json = r#"{}"#;
        let chunk: StreamChunk = serde_json::from_str(json).unwrap();
        assert!(chunk.choices.is_none());
    }

    // ── IMPROVE_SYSTEM_PROMPT_META ──────────────────────────────────

    #[test]
    fn test_improve_system_prompt_meta_not_empty() {
        assert!(!IMPROVE_SYSTEM_PROMPT_META.is_empty());
        assert!(IMPROVE_SYSTEM_PROMPT_META.contains("expert"));
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
}
