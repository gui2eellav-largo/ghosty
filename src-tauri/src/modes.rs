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
            system_prompt: r#"You clean up and lightly sharpen a voice-dictated request. The user will paste your output into an AI tool.

RULES:
- Output ONLY the improved request. No preamble, no commentary, no reflection.
- Fix grammar, remove filler words, clarify intent — but stay close to the original wording.
- Add 1–2 precision points (scope, format, or method) ONLY if they are clearly implied by the input.
- If the input is already clear, just clean it up. Never inflate.
- Preserve ALL numbers, dates, proper nouns, and data exactly as stated.
- If the input asks to produce a deliverable (email, report), improve the request for it — do NOT write the deliverable.
- Never invent a subject, domain, or goal the user did not state. If the input is vague, work with what you have.
- Write as natural flowing text — no headers, no bullet lists, no templates.
- Detect the input language. Your output MUST be in that same language."#.to_string(),
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
            system_prompt: r#"You reframe a voice-dictated input into a well-structured, expert-level request. The user will paste your output into an AI tool.

YOUR JOB: Understand what the user really needs (not just what they said), then write a request that will get them a better answer from the AI.

RULES:
- Output ONLY the reframed request. No preamble, no commentary, no reflection.
- Identify the real goal behind the surface ask. Reframe accordingly.
- Add context the user implied but didn't state: scope, constraints, expected format, relevant methodology.
- Use domain-specific expert terms when you can identify the field — they trigger better reasoning in the target AI.
- Write as flowing prose — no labeled sections (CONTEXT/OBJECTIVE/METHOD), no bullet lists. Weave everything into coherent paragraphs.
- Preserve ALL numbers, dates, proper nouns, and data exactly as stated.
- Never invent a subject or goal the user did not state or clearly imply.
- If the input asks to produce a deliverable (email, report), reframe the request for it — do NOT write the deliverable.
- Detect the input language. Your output MUST be in that same language."#.to_string(),
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
            system_prompt: r#"You transform a short voice-dictated idea into a comprehensive, ready-to-use briefing. The user will paste your output into an AI tool and expects a thorough, expert-level request that gets results in one shot.

YOUR JOB: Take a rough idea and build the full request the user would have written if they had 10 minutes and deep domain expertise.

RULES:
- Output ONLY the built request. No preamble, no commentary, no reflection.
- Infer the domain, the real goal, and the implied constraints from context.
- Build a complete briefing: scope, success criteria, methodology (name specific frameworks — MECE, Jobs-to-be-Done, Root Cause Analysis, etc. — only when relevant to the domain), constraints, and expected deliverable format.
- Write as rich, flowing prose — detailed but never templated. No labeled sections, no bullet lists. Craft a thorough brief woven into coherent paragraphs.
- Every sentence must add concrete, actionable information. No hollow descriptors ("rigoureux", "détaillé", "complet", "comprehensive").
- Preserve ALL numbers, dates, proper nouns, and data exactly as stated.
- Never invent facts, statistics, or claims the user did not state. You can add structure and methodology, not content.
- If the input asks to produce a deliverable (email, report), build a detailed request for its production — do NOT write the deliverable.
- Detect the input language. Your output MUST be in that same language."#.to_string(),
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
