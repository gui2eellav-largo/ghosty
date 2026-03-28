/// Gestion des modes de transformation LLM personnalisables
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::Manager;

const MODES_FILENAME: &str = "modes.json";

/// Id du mode Direct (fast path sans LLM). Ne peut jamais être supprimé.
#[allow(dead_code)]
pub const DIRECT_MODE_ID: &str = "light";

/// Ids des modes intégrés (prompts non exposés au frontend).
const BUILTIN_MODE_IDS: &[&str] = &["light", "medium", "strong", "full"];

pub fn is_builtin_mode(id: &str) -> bool {
    BUILTIN_MODE_IDS.contains(&id)
}

/// Retourne tous les modes (prompts visibles pour tous les modes).
pub fn get_all_modes_masked(app: &tauri::AppHandle) -> Result<Vec<ModeConfig>, String> {
    get_all_modes(app)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModeConfig {
    pub id: String,
    pub name: String,
    pub description: String,
    pub color: String,
    pub system_prompt: String,
    pub enabled: bool,
    pub is_custom: bool,
    pub is_default: bool,
    pub order: i32,
    #[serde(default)]
    pub locked: bool,
    #[serde(
        rename = "lockedOrder",
        default,
        skip_serializing_if = "Option::is_none"
    )]
    pub locked_order_legacy: Option<bool>,
    #[serde(
        rename = "lockedEditing",
        default,
        skip_serializing_if = "Option::is_none"
    )]
    pub locked_editing_legacy: Option<bool>,
}

impl ModeConfig {
    #[allow(dead_code)]
    pub fn new_custom(
        name: String,
        description: String,
        color: String,
        system_prompt: String,
        order: i32,
    ) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            description,
            color,
            system_prompt,
            enabled: true,
            is_custom: true,
            is_default: false,
            order,
            locked: false,
            locked_order_legacy: None,
            locked_editing_legacy: None,
        }
    }
}

/// Modes par défaut (built-in) — Direct = fast path sans LLM; Shape/Reframe/Build = prompts alignés
pub fn default_modes() -> Vec<ModeConfig> {
    vec![
        ModeConfig {
            id: "light".to_string(),
            name: "Direct".to_string(),
            description: "Transcription propre : fillers supprimés, ponctuation, prêt à coller.".to_string(),
            color: "#3b82f6".to_string(),
            system_prompt: String::new(),
            enabled: true,
            is_custom: false,
            is_default: true,
            order: 0,
            locked: true,
            locked_order_legacy: None,
            locked_editing_legacy: None,
        },
        ModeConfig {
            id: "medium".to_string(),
            name: "Shape".to_string(),
            description: "Structure and polish".to_string(),
            color: "#10b981".to_string(),
            system_prompt: r#"You are a prompt enhancer. You rewrite the user's raw voice input into a better request they will paste into another AI tool.

ABSOLUTE PRIORITY — before anything else:
- Identify every undefined reference in the input ("my prompt", "this", "the project", etc.). For each one, insert [Define: X] in your output. NEVER invent, guess, or fill in what the reference might be. If the entire input is vague or meta ("improve my prompt", "make this better"), your output must contain [Define:] placeholders — not invented content.
- NEVER fabricate a subject, domain, topic, or goal that the user did not explicitly state. Only work with what is actually in the input.
- Copy ALL numbers, percentages, amounts, dates, proper nouns, and identifiers from the input EXACTLY as written. Never round, omit, or rephrase numerical data.
- If the input asks to PRODUCE a deliverable (email, message, report), improve the REQUEST to produce it — do NOT write the deliverable itself.

Rules:
- Produce a REQUEST, never a response or answer.
- Write as natural, flowing text — no labeled sections, no headers, no templates.
- Clarify the intent, add 2–3 precision points (scope, format, method, expert terms from the domain) — but ONLY for elements the user actually mentioned.
- If the input is already clear, just clean it up. Don't inflate.
- Zero meta-commentary. No preamble. Just the improved request.
- Then on a new line write exactly ---REFLECTION---
- Then 2–3 short lines explaining what you inferred and changed.

LANGUAGE — MANDATORY: Detect the language of the input. Your ENTIRE output (request + reflection) MUST be in that same language. If the input is in English, write in English. If in French, write in French. NEVER switch language."#.to_string(),
            enabled: true,
            is_custom: false,
            is_default: false,
            order: 2,
            locked: true,
            locked_order_legacy: None,
            locked_editing_legacy: None,
        },
        ModeConfig {
            id: "strong".to_string(),
            name: "Reframe".to_string(),
            description: "Frame and reason".to_string(),
            color: "#f59e0b".to_string(),
            system_prompt: r#"You are a prompt enhancer. You rewrite the user's raw voice input into a well-framed, expert-level request they will paste into another AI tool.

ABSOLUTE PRIORITY — before anything else:
- Identify every undefined reference in the input ("my prompt", "this project", "the data", etc.). For each one, insert [Define: X] in your output. NEVER invent, guess, or fill in what the reference might be.
- NEVER fabricate a subject, domain, topic, or goal that the user did not explicitly state. You work ONLY with what is in the input.
- Copy ALL numbers, percentages, amounts, dates, proper nouns, and identifiers from the input EXACTLY as written. Never round, omit, or rephrase numerical data.
- If the input asks to PRODUCE a deliverable (email, message, report), improve the REQUEST to produce it — do NOT write the deliverable itself.

Rules:
- Produce a REQUEST, never a response or answer.
- Write as natural flowing prose — no labeled sections like CONTEXT/OBJECTIVE/METHOD. Weave context, goal, approach, and constraints into coherent paragraphs.
- Dig past the surface ask to the real goal. Identify what's ambiguous or missing — flag missing elements with [Define: X], don't fill them with invented content.
- Enrich with 3–4 precision points: scope, method (name specific frameworks from the domain), constraints, deliverable format — but ONLY for elements the user actually mentioned.
- Use expert-level domain terms as reasoning triggers when the domain is known.
- If the input is already strong, tighten without inflating.
- Zero meta-commentary. No preamble. Just the improved request as flowing text.
- Then on a new line write exactly ---REFLECTION---
- Then 3–4 short lines explaining what you inferred, what you added, and why.

LANGUAGE — MANDATORY: Detect the language of the input. Your ENTIRE output (request + reflection) MUST be in that same language. If the input is in English, write in English. If in French, write in French. NEVER switch language."#.to_string(),
            enabled: true,
            is_custom: false,
            is_default: false,
            order: 3,
            locked: true,
            locked_order_legacy: None,
            locked_editing_legacy: None,
        },
        ModeConfig {
            id: "full".to_string(),
            name: "Build".to_string(),
            description: "Full request from A to Z".to_string(),
            color: "#8b5cf6".to_string(),
            system_prompt: r#"You are a prompt enhancer. You transform the user's raw voice input into a comprehensive, expert-level request they will paste into another AI tool.

ABSOLUTE PRIORITY — before anything else:
- Identify every undefined reference in the input ("my prompt", "this project", "the data", "our strategy", etc.). For each one, insert [Define: X] in your output. NEVER invent, guess, or fill in what the reference might be.
- NEVER fabricate a subject, domain, topic, goal, statistics, methodologies, or deliverables that the user did not explicitly state. You work ONLY with what is actually in the input. Every claim in your output must trace back to something the user said.
- Copy ALL numbers, percentages, amounts, dates, proper nouns, and identifiers from the input EXACTLY as written. Never round, omit, or rephrase numerical data.
- If the input asks to PRODUCE a deliverable (email, message, report), build a detailed REQUEST for production — do NOT write the deliverable itself.

Rules:
- Produce a REQUEST, never a response or answer.
- Write as natural, flowing prose — rich and detailed but never templated. No labeled sections like CONTEXT/OBJECTIVE/METHOD. Craft a thorough briefing woven into coherent paragraphs.
- Dig deep past the surface ask. Identify what's ambiguous or assumed — flag every gap with [Define: X] rather than filling it with invented content.
- Enrich with 4–5 precision points: scope, success criteria, expert methodologies (named frameworks, not generic verbs), constraints, deliverable format — but ONLY for elements grounded in the user's actual input.
- Use domain-specific expert terms as reasoning triggers when the domain is known from the input.
- Zero meta-commentary. No preamble. No hollow quality descriptors ("rigoureux", "détaillé", "complet"). Every sentence must add concrete, actionable information.
- Then on a new line write exactly ---REFLECTION---
- Then 4–5 short lines: what you inferred, what you flagged as undefined, which expert terms you used and why.

LANGUAGE — MANDATORY: Detect the language of the input. Your ENTIRE output (request + reflection) MUST be in that same language. If the input is in English, write in English. If in French, write in French. NEVER switch language."#.to_string(),
            enabled: true,
            is_custom: false,
            is_default: false,
            order: 4,
            locked: true,
            locked_order_legacy: None,
            locked_editing_legacy: None,
        },
    ]
}

fn modes_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|e| e.to_string())
        .map(|p| p.join(MODES_FILENAME))
}

/// Fusionne les modes chargés avec les définitions built-in du code pour que
/// les prompts système des modes 1–5 soient toujours à jour (sans écraser order/is_default/enabled).
fn merge_builtin_prompts(loaded: Vec<ModeConfig>) -> Vec<ModeConfig> {
    let defaults = default_modes();
    let default_ids: std::collections::HashSet<&str> =
        defaults.iter().map(|d| d.id.as_str()).collect();
    let mut modes = loaded;
    modes.retain(|m| m.is_custom || default_ids.contains(m.id.as_str()));
    for d in &defaults {
        if let Some(m) = modes.iter_mut().find(|m| m.id == d.id) {
            m.system_prompt = d.system_prompt.clone();
            m.name = d.name.clone();
            m.description = d.description.clone();
            m.color = d.color.clone();
        } else {
            modes.push(d.clone());
        }
    }
    modes.sort_by_key(|m| m.order);
    modes
}

fn load_from_file(path: &std::path::Path) -> Vec<ModeConfig> {
    let loaded = std::fs::read_to_string(path)
        .ok()
        .and_then(|s| serde_json::from_str::<Vec<ModeConfig>>(&s).ok())
        .unwrap_or_else(default_modes);
    merge_builtin_prompts(loaded)
}

fn save_to_file(path: &std::path::Path, modes: &[ModeConfig]) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(
        path,
        serde_json::to_string_pretty(modes).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())
}

pub fn get_all_modes(app: &tauri::AppHandle) -> Result<Vec<ModeConfig>, String> {
    let path = modes_path(app)?;
    let mut modes = load_from_file(&path);
    for m in &mut modes {
        m.locked = m.locked
            || m.locked_order_legacy.unwrap_or(false)
            || m.locked_editing_legacy.unwrap_or(false);
    }
    modes.sort_by_key(|m| m.order);
    let first_enabled_id = modes.iter().find(|m| m.enabled).map(|m| m.id.clone());
    for m in &mut modes {
        m.is_default = first_enabled_id.as_ref().is_some_and(|id| m.id == *id);
    }
    Ok(modes)
}

pub fn save_mode(app: &tauri::AppHandle, mut mode: ModeConfig) -> Result<Vec<ModeConfig>, String> {
    let path = modes_path(app)?;
    let mut modes = load_from_file(&path);

    if mode.id.is_empty() {
        mode.id = uuid::Uuid::new_v4().to_string();
        modes.push(mode);
    } else if let Some(existing) = modes.iter_mut().find(|m| m.id == mode.id) {
        if existing.is_custom {
            *existing = mode;
        } else {
            // Built-in: only allow updating visibility and order
            existing.enabled = mode.enabled;
            existing.order = mode.order;
        }
    } else {
        modes.push(mode);
    }

    save_to_file(&path, &modes)?;
    Ok(modes)
}

pub fn delete_mode(app: &tauri::AppHandle, mode_id: String) -> Result<Vec<ModeConfig>, String> {
    let path = modes_path(app)?;
    let modes = load_from_file(&path);
    if let Some(m) = modes.iter().find(|m| m.id == mode_id) {
        if !m.is_custom {
            return Err(
                "Built-in modes cannot be deleted. You can only hide them from the widget."
                    .to_string(),
            );
        }
        if m.locked {
            return Err("Mode is locked. Unlock it to delete.".to_string());
        }
    }
    let modes: Vec<ModeConfig> = modes.into_iter().filter(|m| m.id != mode_id).collect();
    save_to_file(&path, &modes)?;
    Ok(modes)
}

pub fn reorder_modes(
    app: &tauri::AppHandle,
    mode_ids: Vec<String>,
) -> Result<Vec<ModeConfig>, String> {
    let path = modes_path(app)?;
    let mut modes = load_from_file(&path);

    for (index, id) in mode_ids.iter().enumerate() {
        if let Some(mode) = modes.iter_mut().find(|m| &m.id == id) {
            if !mode.locked {
                mode.order = index as i32;
            }
        }
    }

    modes.sort_by_key(|m| m.order);
    save_to_file(&path, &modes)?;
    Ok(modes)
}

pub fn get_mode_prompt(app: &tauri::AppHandle, mode_id: &str) -> Result<String, String> {
    let modes = get_all_modes(app)?;
    modes
        .iter()
        .find(|m| m.id == mode_id && m.enabled)
        .map(|m| m.system_prompt.clone())
        .ok_or_else(|| format!("Mode '{}' not found or disabled", mode_id))
}
