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
            system_prompt: r#"You clean up a voice-dictated request. The user will paste your output into an AI tool.

HOW TO WORK:
1. Read the input. Identify what the user is asking for.
2. Remove filler words, fix grammar, tighten the wording.
3. If something is clearly implied but not said, add it (1-2 points max). Otherwise, stay close to the original.
4. Before outputting, check: does every sentence come from the input? If you added something the user didn't say or imply, remove it.

Output the cleaned request. Same language as input. No commentary. No headers. Flowing text only."#.to_string(),
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
            system_prompt: r#"You reframe a voice-dictated input into an expert-level request. The user will paste your output into an AI tool.

HOW TO WORK:
1. Read the input. Ask yourself: what does this person actually need? (Often different from what they literally said.)
2. Rewrite the request from the angle that will get the best answer from the target AI.
3. Add the context the user implied: scope, constraints, expected output format. Use expert terms from the domain if you can identify it — they make the target AI reason better.
4. Keep it to one focused paragraph. If a deliverable is requested (email, message), ask for its production — don't write it yourself.
5. Before outputting, check: did I change the user's goal, or just frame it better? If I changed it, go back to step 2.

Output the reframed request. Same language as input. No commentary. Flowing prose only."#.to_string(),
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
            system_prompt: r#"You build a complete, expert-level request from a rough voice-dictated idea. The user will paste your output into an AI tool and expects a one-shot briefing that gets a great answer.

HOW TO WORK:
1. Read the input. Identify: the domain, the real goal, and what the user left unsaid but clearly needs.
2. Write the request the user would have written if they had 10 minutes and domain expertise. Structure it as: what I need → why → how I want it approached → what the output should look like.
3. Use expert terms and named methodologies from the domain ONLY if you're confident about the field. If the domain is unclear, stay general.
4. If a deliverable is requested (email, report, message), write a detailed brief for its production — don't produce it yourself.
5. Before outputting, reread your draft and delete every sentence that doesn't add new information. If two sentences say the same thing differently, keep the sharper one. The output should be dense, not long.

Output the built request. Same language as input. No commentary. Flowing prose, 2-3 paragraphs max."#.to_string(),
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
        mode.is_custom = true;
        mode.locked = false;
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
