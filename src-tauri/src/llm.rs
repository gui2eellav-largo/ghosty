use crate::http_client;
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::time::Duration;

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
- Undefined references ("this", "my", "the X"): the improved prompt should instruct the model to add [Define: X] when something isn't stated. Never assume what isn't stated.

PROCESS (apply only where relevant to the user's intent):
1. Intent: What does the user actually need? Infer the real goal. Do not add a different goal (e.g. "actionable" when they only asked for "Slack style").
2. Domain: For reasoning or analytical intents, help the model identify the field and use semantic levers (named methodologies: Root cause analysis, MECE, Five Whys, etc.). For style-only intents (Slack, email, tone), do not force these; focus on format, brevity, tone.
3. Enrich: Add only what the intent implies — scope, format, length, tone. Semantic levers and structure (CONTEXT, OBJECTIVE, METHOD) are for prompts that will produce requests for another AI or complex deliverables, not for simple "rewrite as X format".
4. Structure: Light structure (bullets, short blocks) when it helps. Labeled sections (CONTEXT, OBJECTIVE, METHOD, CONSTRAINTS) only when the user's intent implies a framed or expert-level request. Never impose a heavy template for simple intents.

OUTPUT:
- Output ONLY the improved system prompt. Same language as the input. Zero meta-commentary. No preamble. No explanation of your changes. The text you produce will be used as-is."#;

/// Transformation async avec streaming : accumule le contenu puis retourne le texte complet.
/// Si `cancel` est déclenché, retourne Err("Annulé").
pub async fn transform_text_streaming(
    text: &str,
    mode_prompt: &str,
    app: &tauri::AppHandle,
    cancel: tokio_util::sync::CancellationToken,
) -> Result<String, String> {
    if mode_prompt.is_empty() {
        return Ok(text.to_string());
    }

    let mut attempt = 0;
    loop {
        match transform_text_streaming_internal(text, mode_prompt, app, cancel.clone()).await {
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
                return Err(format!(
                    "Échec transformation après {} tentatives: {}",
                    MAX_RETRIES, e
                ));
            }
        }
    }
}

fn meta_system_prompt(mode_prompt: &str) -> String {
    format!(
        r#"You are a request optimization expert. Your role: transform user's voice input into an optimized request ready for AI (ChatGPT/Claude/etc).

CRITICAL RULES:
1. Output = request for AI, NOT the final content
2. Adaptive length: short input → concise request, detailed input → comprehensive request
3. Zero meta-commentary. No 'Here is the request:' or explanations
4. Output format: Direct request ready to copy-paste

MODE INSTRUCTION:
{}

USER VOICE INPUT (to transform into optimized request):"#,
        mode_prompt
    )
}

async fn transform_text_streaming_internal(
    text: &str,
    mode_prompt: &str,
    app: &tauri::AppHandle,
    cancel: tokio_util::sync::CancellationToken,
) -> Result<String, String> {
    let api_key = crate::secrets::get_api_key_cached()?;
    let prefs = crate::preferences::get_preferences(app).unwrap_or_default();
    let timeout_secs = prefs.llm.timeout_secs.clamp(15, 120);
    let base_url = prefs
        .advanced
        .llm_base_url
        .as_deref()
        .unwrap_or("https://api.openai.com")
        .trim_end_matches('/');
    let url = format!("{}/v1/chat/completions", base_url);

    let request = ChatRequest {
        model: prefs.llm.model.clone(),
        messages: vec![
            Message {
                role: "system".to_string(),
                content: meta_system_prompt(mode_prompt),
            },
            Message {
                role: "user".to_string(),
                content: text.to_string(),
            },
        ],
        temperature: prefs.llm.temperature.clamp(0.0, 2.0),
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
    let api_key = crate::secrets::get_api_key_cached()?;
    let prefs = crate::preferences::get_preferences(app).unwrap_or_default();
    let timeout_secs = prefs.llm.timeout_secs.clamp(15, 120);
    let base_url = prefs
        .advanced
        .llm_base_url
        .as_deref()
        .unwrap_or("https://api.openai.com")
        .trim_end_matches('/');
    let url = format!("{}/v1/chat/completions", base_url);

    let request = ChatRequest {
        model: prefs.llm.model.clone(),
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
