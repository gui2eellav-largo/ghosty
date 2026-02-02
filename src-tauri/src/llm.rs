use serde::{Deserialize, Serialize};
use std::time::Duration;

const MAX_RETRIES: u32 = 3;
const REQUEST_TIMEOUT_SECS: u64 = 45;

#[derive(Serialize)]
struct ChatRequest {
    model: String,
    messages: Vec<Message>,
    temperature: f32,
    max_tokens: u32,
}

#[derive(Serialize, Deserialize, Clone)]
struct Message {
    role: String,
    content: String,
}

#[derive(Deserialize)]
struct ChatResponse {
    choices: Vec<Choice>,
}

#[derive(Deserialize)]
struct Choice {
    message: Message,
}

pub fn transform_text(text: &str, mode_prompt: &str) -> Result<String, String> {
    transform_text_with_retry(text, mode_prompt, MAX_RETRIES)
}

fn transform_text_with_retry(text: &str, mode_prompt: &str, max_retries: u32) -> Result<String, String> {
    if mode_prompt.is_empty() {
        return Ok(text.to_string());
    }

    let mut attempt = 0;

    loop {
        match transform_text_internal(text, mode_prompt) {
            Ok(result) => return Ok(result),
            Err(e) if attempt < max_retries => {
                attempt += 1;
                let backoff = Duration::from_millis(150 * 2u64.pow(attempt));
                eprintln!("Transformation LLM tentative {}/{} échouée: {}", attempt, max_retries, e);
                eprintln!("Retry dans {:?}...", backoff);
                std::thread::sleep(backoff);
            }
            Err(e) => {
                return Err(format!("Échec transformation après {} tentatives: {}", max_retries, e));
            }
        }
    }
}

fn transform_text_internal(text: &str, mode_prompt: &str) -> Result<String, String> {
    let api_key = crate::secrets::get_api_key_cached()?;

    let meta_system_prompt = format!(
        "You are a prompt optimization expert. Your role: transform user's voice input into an optimized prompt ready for AI (ChatGPT/Claude/etc).

CRITICAL RULES:
1. Output = prompt for AI, NOT the final content
2. Adaptive length: short input → concise prompt, detailed input → comprehensive prompt
3. Zero meta-commentary. No 'Here is the prompt:' or explanations
4. Output format: Direct prompt ready to copy-paste

MODE INSTRUCTION:
{}

USER VOICE INPUT (to transform into optimized prompt):",
        mode_prompt
    );

    let request = ChatRequest {
        model: "gpt-4o-mini".to_string(),
        messages: vec![
            Message {
                role: "system".to_string(),
                content: meta_system_prompt,
            },
            Message {
                role: "user".to_string(),
                content: text.to_string(),
            },
        ],
        temperature: 0.3,
        max_tokens: 2000,
    };

    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(REQUEST_TIMEOUT_SECS))
        .build()
        .map_err(|e| format!("Erreur création client HTTP: {}", e))?;
    
    let resp = client
        .post("https://api.openai.com/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&request)
        .send()
        .map_err(|e| format!("Erreur requête API GPT-4o-mini: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().unwrap_or_default();
        return Err(format!("API GPT-4o-mini error {}: {}", status, body));
    }

    let chat_response: ChatResponse = resp
        .json()
        .map_err(|e| format!("Erreur parsing réponse GPT-4o-mini: {}", e))?;

    chat_response
        .choices
        .first()
        .map(|choice| choice.message.content.trim().to_string())
        .ok_or_else(|| "Aucune réponse de GPT-4o-mini".to_string())
}
