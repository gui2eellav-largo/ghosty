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
            description: "Clean transcription: filler words removed, punctuation added, ready to paste.".to_string(),
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
            system_prompt: r#"Dense reprompting. Compress a voice-dictated request into a sharper, semantically dense version. Output → pasted into another AI tool.

Same intent, fewer words, higher signal. Replace vague terms with precise ones. Inject 1–3 domain-specific keywords if the field is identifiable — they trigger better reasoning in the target AI. Strip all filler. Preserve data, names, numbers verbatim.

Deliverable request (email, message, report) → sharpen the ask, don't produce it.

ABSOLUTE RULES:
- NEVER respond conversationally. NEVER ask questions. NEVER say "I don't understand" or "could you clarify".
- ALWAYS output the transformed text, even if the input seems incomplete or vague. Infer what's missing.
- Your output is pasted directly — it must be the final text, nothing else.
- Same language as input. No commentary. No preamble."#.to_string(),
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
            system_prompt: r#"Strategist. Reframe a voice-dictated input into the request that will get the best answer from another AI.

Identify the real goal behind the surface ask. Rewrite from that angle. Add implied scope, constraints, output format. Use domain-specific expert terms if the field is identifiable — they activate better reasoning in the target AI. Deliverable request → frame the brief, don't produce it.

ABSOLUTE RULES:
- NEVER respond conversationally. NEVER ask questions. NEVER say "I don't understand".
- ALWAYS output the reframed request, even if the input seems vague. Infer intent.
- Your output is pasted directly — it must be the final text, nothing else.
- Same language. No commentary. Dense — every sentence earns its place."#.to_string(),
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
            system_prompt: r#"Senior consultant. Build the complete request the user would have written with 10 minutes and domain expertise. Output → pasted into another AI for a one-shot answer.

Infer domain, real goal, unstated constraints. Structure: what is needed → why → approach/methodology → expected output format. Use named frameworks only if the domain is clear. Every sentence must carry new information — if two say the same thing, delete one.

Deliverable rule: if the user asks to WRITE something (email, message, report), build a detailed production brief — never produce the deliverable itself. The output is always a REQUEST about producing it. NEVER output greetings, sign-offs, subject lines, or any text formatted as the final deliverable.

ABSOLUTE RULES:
- NEVER respond conversationally. NEVER ask questions. NEVER say "I don't understand".
- ALWAYS output the built request, even if the input seems incomplete. Infer everything missing.
- Your output is pasted directly — it must be the final text, nothing else.
- Same language. No commentary. Dense — every sentence must carry new information."#.to_string(),
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

#[cfg(test)]
mod tests {
    use super::*;

    // ── default_modes ───────────────────────────────────────────────

    #[test]
    fn test_default_modes_contains_all_builtin() {
        let modes = default_modes();
        let ids: Vec<&str> = modes.iter().map(|m| m.id.as_str()).collect();
        assert!(ids.contains(&"light"));
        assert!(ids.contains(&"medium"));
        assert!(ids.contains(&"strong"));
        assert!(ids.contains(&"full"));
    }

    #[test]
    fn test_default_modes_count() {
        let modes = default_modes();
        assert_eq!(modes.len(), 4);
    }

    #[test]
    fn test_default_modes_all_enabled() {
        for m in default_modes() {
            assert!(m.enabled, "Default mode '{}' should be enabled", m.id);
        }
    }

    #[test]
    fn test_default_modes_not_custom() {
        for m in default_modes() {
            assert!(!m.is_custom, "Default mode '{}' should not be custom", m.id);
        }
    }

    #[test]
    fn test_default_modes_locked() {
        for m in default_modes() {
            assert!(m.locked, "Default mode '{}' should be locked", m.id);
        }
    }

    #[test]
    fn test_default_modes_light_has_empty_prompt() {
        let modes = default_modes();
        let light = modes.iter().find(|m| m.id == "light").unwrap();
        assert!(light.system_prompt.is_empty(), "Light mode should have empty system_prompt (no LLM)");
    }

    #[test]
    fn test_default_modes_non_light_have_prompts() {
        let modes = default_modes();
        for m in &modes {
            if m.id != "light" {
                assert!(!m.system_prompt.is_empty(), "Mode '{}' should have a system_prompt", m.id);
            }
        }
    }

    #[test]
    fn test_default_modes_ordered() {
        let modes = default_modes();
        let orders: Vec<i32> = modes.iter().map(|m| m.order).collect();
        let mut sorted = orders.clone();
        sorted.sort();
        assert_eq!(orders, sorted);
    }

    // ── is_builtin_mode ─────────────────────────────────────────────

    #[test]
    fn test_is_builtin_mode_true() {
        assert!(is_builtin_mode("light"));
        assert!(is_builtin_mode("medium"));
        assert!(is_builtin_mode("strong"));
        assert!(is_builtin_mode("full"));
    }

    #[test]
    fn test_is_builtin_mode_false() {
        assert!(!is_builtin_mode("custom-mode-123"));
        assert!(!is_builtin_mode(""));
        assert!(!is_builtin_mode("Light")); // case-sensitive
    }

    // ── ModeConfig::new_custom ──────────────────────────────────────

    #[test]
    fn test_new_custom_generates_uuid() {
        let mode = ModeConfig::new_custom(
            "Custom".to_string(),
            "Desc".to_string(),
            "#ff0000".to_string(),
            "You are a custom assistant".to_string(),
            10,
        );
        assert!(!mode.id.is_empty());
        assert!(mode.is_custom);
        assert!(mode.enabled);
        assert!(!mode.locked);
        assert!(!mode.is_default);
        assert_eq!(mode.order, 10);
    }

    // ── merge_builtin_prompts ───────────────────────────────────────

    #[test]
    fn test_merge_builtin_prompts_updates_prompts() {
        // Simulate loaded modes with stale prompts
        let mut loaded = default_modes();
        loaded[1].system_prompt = "old prompt".to_string();
        let merged = merge_builtin_prompts(loaded);
        let medium = merged.iter().find(|m| m.id == "medium").unwrap();
        // Should have the current default prompt, not "old prompt"
        assert_ne!(medium.system_prompt, "old prompt");
    }

    #[test]
    fn test_merge_builtin_prompts_preserves_custom_modes() {
        let mut loaded = default_modes();
        loaded.push(ModeConfig {
            id: "my-custom".to_string(),
            name: "My Custom".to_string(),
            description: "custom".to_string(),
            color: "#000".to_string(),
            system_prompt: "custom prompt".to_string(),
            enabled: true,
            is_custom: true,
            is_default: false,
            order: 100,
            locked: false,
            locked_order_legacy: None,
            locked_editing_legacy: None,
        });
        let merged = merge_builtin_prompts(loaded);
        assert!(merged.iter().any(|m| m.id == "my-custom"));
    }

    #[test]
    fn test_merge_builtin_prompts_removes_stale_builtins() {
        // If a loaded mode has an id that's not builtin and not custom, it's removed
        let mut loaded = default_modes();
        loaded.push(ModeConfig {
            id: "removed-builtin".to_string(),
            name: "Gone".to_string(),
            description: "".to_string(),
            color: "#000".to_string(),
            system_prompt: "".to_string(),
            enabled: true,
            is_custom: false, // NOT custom, but not a known builtin
            is_default: false,
            order: 50,
            locked: false,
            locked_order_legacy: None,
            locked_editing_legacy: None,
        });
        let merged = merge_builtin_prompts(loaded);
        assert!(!merged.iter().any(|m| m.id == "removed-builtin"));
    }

    #[test]
    fn test_merge_builtin_prompts_adds_missing_defaults() {
        // If "full" is missing from loaded, it should be added back
        let mut loaded = default_modes();
        loaded.retain(|m| m.id != "full");
        assert_eq!(loaded.len(), 3);
        let merged = merge_builtin_prompts(loaded);
        assert!(merged.iter().any(|m| m.id == "full"));
    }

    #[test]
    fn test_merge_builtin_prompts_preserves_order_and_enabled() {
        let mut loaded = default_modes();
        // User disabled "medium" and changed its order
        if let Some(m) = loaded.iter_mut().find(|m| m.id == "medium") {
            m.enabled = false;
            m.order = 99;
        }
        let merged = merge_builtin_prompts(loaded);
        let medium = merged.iter().find(|m| m.id == "medium").unwrap();
        // enabled and order should be preserved (merge doesn't touch them)
        // Actually merge_builtin_prompts updates name/description/color/system_prompt
        // but not enabled/order. Let's verify:
        assert!(!medium.enabled);
        assert_eq!(medium.order, 99);
    }

    // ── File-based operations ───────────────────────────────────────

    #[test]
    fn test_load_from_file_missing_returns_defaults() {
        let tmp = tempfile::tempdir().unwrap();
        let path = tmp.path().join("nonexistent.json");
        let modes = load_from_file(&path);
        assert_eq!(modes.len(), default_modes().len());
    }

    #[test]
    fn test_save_and_load_roundtrip() {
        let tmp = tempfile::tempdir().unwrap();
        let path = tmp.path().join("modes.json");
        let modes = default_modes();
        save_to_file(&path, &modes).unwrap();
        let loaded = load_from_file(&path);
        assert_eq!(loaded.len(), modes.len());
        for (orig, loaded) in modes.iter().zip(loaded.iter()) {
            assert_eq!(orig.id, loaded.id);
        }
    }

    #[test]
    fn test_save_creates_parent_directories() {
        let tmp = tempfile::tempdir().unwrap();
        let path = tmp.path().join("a").join("b").join("modes.json");
        let result = save_to_file(&path, &default_modes());
        assert!(result.is_ok());
        assert!(path.exists());
    }

    // ── ModeConfig serialization ────────────────────────────────────

    #[test]
    fn test_mode_config_serialization_roundtrip() {
        let mode = ModeConfig::new_custom(
            "Test".to_string(),
            "Desc".to_string(),
            "#ff0000".to_string(),
            "prompt".to_string(),
            5,
        );
        let json = serde_json::to_string(&mode).unwrap();
        let deserialized: ModeConfig = serde_json::from_str(&json).unwrap();
        assert_eq!(mode.id, deserialized.id);
        assert_eq!(mode.name, deserialized.name);
        assert_eq!(mode.is_custom, deserialized.is_custom);
    }

    #[test]
    fn test_mode_config_camel_case_serialization() {
        let mode = default_modes().into_iter().next().unwrap();
        let json = serde_json::to_value(&mode).unwrap();
        // Should use camelCase field names
        assert!(json.get("systemPrompt").is_some());
        assert!(json.get("isCustom").is_some());
        assert!(json.get("isDefault").is_some());
    }

    // ── DIRECT_MODE_ID ──────────────────────────────────────────────

    #[test]
    fn test_direct_mode_id_is_light() {
        assert_eq!(DIRECT_MODE_ID, "light");
    }
}
