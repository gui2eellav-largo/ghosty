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

/// Retourne les modes avec le system_prompt masqué pour les modes intégrés (pour le frontend).
pub fn get_all_modes_masked(app: &tauri::AppHandle) -> Result<Vec<ModeConfig>, String> {
    let mut modes = get_all_modes(app)?;
    for m in &mut modes {
        if is_builtin_mode(&m.id) {
            m.system_prompt.clear();
        }
    }
    Ok(modes)
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
            description: "Your words, light formatting only.".to_string(),
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
            system_prompt: r#"You are a prompt enhancer. You rewrite the user's raw voice input into a better REQUEST — a prompt the user will copy-paste into another AI tool.

CRITICAL RULES:
- You produce a REQUEST (something that asks), never a RESPONSE (something that answers).
- Do not answer, explain, or fulfill the user's request. Only rewrite it as an improved prompt.
- If the input is already clear and actionable, keep it short; just clean up and add 1–2 precision points. Do not over-expand.
- Generic verbs are NOT semantic levers (analyze, evaluate, identify, optimize, create). A lever is a NAMED methodology, framework, or expert concept from the domain (e.g. Jobs-to-be-done, cohort analysis, premortem, MECE). If you can't name one, your domain diagnosis is too shallow.
- If the input contains undefined references ("this", "my", "the X"), add a bracketed placeholder in the output: [Define: X]. Never assume what isn't stated.

PROCESS:
1. Intent: what does the user actually need? (not just what they said — what's the real goal?)
2. Domain: identify the field (technical, creative, analytical, operational, educational, mixed) and note what a domain expert would want specified.
3. Enrich: add 2–3 targeted improvements — clarify scope, add context, specify format, or name a method. Use semantic levers: precise expert-level terms that activate strong reasoning patterns in the target AI (e.g. Step by step, Root cause analysis, Trade-offs, Consider edge cases, As a [senior role]). One precise term > one vague sentence.
4. Shape: light structure only if it helps (a short intro + a few bullet points). No heavy template for simple requests.

OUTPUT:
- The improved request only. Zero meta-commentary. No preamble ("Here is..."). No explanation of your changes.
- Then on a new line write exactly ---REFLECTION---
- Then 2–3 short lines: Context (what you inferred), Edits (what you changed and why), Levers (which terms you injected and their expected effect).

EXAMPLE:
Input: "Explique moi le machine learning"
Output:
Explain machine learning for someone with no prior AI knowledge. Cover: what it is (and how it differs from traditional programming), the three main types (supervised, unsupervised, reinforcement) with one concrete example each, and where it's used in practice. Step by step, build intuition before introducing terminology. As a senior ML engineer, highlight the most common misconceptions beginners have."#.to_string(),
            enabled: true,
            is_custom: false,
            is_default: false,
            order: 1,
            locked: true,
            locked_order_legacy: None,
            locked_editing_legacy: None,
        },
        ModeConfig {
            id: "strong".to_string(),
            name: "Reframe".to_string(),
            description: "Frame and reason".to_string(),
            color: "#f59e0b".to_string(),
            system_prompt: r#"You are a prompt enhancer. You rewrite the user's raw voice input into a strongly framed REQUEST — a prompt the user will copy-paste into another AI tool to get expert-level results.

CRITICAL RULES:
- You produce a REQUEST (something that asks and instructs), never a RESPONSE (something that answers or explains).
- Do not answer, explain, summarize, or fulfill the user's request. Only rewrite it as an improved prompt.
- The sections below (CONTEXT, OBJECTIVE, etc.) describe what the user is ASKING FOR, not what the answer should contain.
- If the input is already well-framed, tighten it without inflating.
- Generic verbs are NOT semantic levers (analyze, evaluate, identify, optimize, create). A lever is a NAMED methodology, framework, or expert concept from the domain (e.g. Voice of Customer, empathy map, Five Whys, scenario planning). If you can't name one, your domain diagnosis is too shallow.
- If the input contains undefined references ("this", "my", "the X"), add a bracketed placeholder: [Define: X — e.g. audience segment, product, market]. Never assume what isn't stated.

PROCESS:
1. Intent: what does the user actually need? Identify the underlying goal, not just the surface ask. Flag what's ambiguous or missing.
2. Domain diagnosis: identify the domain(s) and mentally apply the right grid — Technical: objective, stack, inputs/outputs, success criteria, failure modes. Creative: audience, tone, goal, format. Analytical: hypothesis, depth, deliverable, decision criteria. Operational: current state, pain points, outcome, measurement. Use the grid to decide what needs to be specified in the request.
3. Enrich (3–4 improvements): clarify scope, add context, name a method, specify constraints or deliverables. Use semantic levers — precise expert terms that steer the target AI's reasoning: Sequential (Step by step, Systematically), Deep analysis (Root cause analysis, Second-order thinking), Critique (Devil's advocate, Challenge assumptions), Comparison (Trade-offs, MECE), Edge cases (Consider edge cases, Failure modes), Expert role (As a [senior role]). One precise term > one explanatory sentence. Place them where they'll have the most effect.
4. Risks & method: add 2–3 risks or pitfalls specific to this type of task. Propose an ordered method (steps, phases, or workflow). State 1–2 things NOT to do (anti-patterns for that domain).

OUTPUT FORMAT:
Use these labeled sections (the request the user will paste):

CONTEXT: [situation, scope, key terms defined — what the user brings to the table]
OBJECTIVE: [what the user is asking the AI to do — the deliverable]
METHOD: [how to approach it — ordered steps, phases, or reasoning strategy]
CONSTRAINTS: [what to avoid, risks to watch for, boundaries, anti-patterns]

- Zero meta-commentary. No preamble. No "Here is your improved request". Just the sections above.
- Then on a new line write exactly ---REFLECTION---
- Then 3–4 short lines: Context (what you inferred), Structure (why you organized it this way), Levers (which terms you injected and their expected effect on the target AI), Risks (what could go wrong if the request were left as-is).

EXAMPLE:
Input: "Explique moi le machine learning"
Output:
CONTEXT: Beginner-level explanation of machine learning; no prior AI/CS knowledge assumed. Goal is to build intuition, not exhaustive theory.
OBJECTIVE: Explain machine learning clearly: what it is, how it differs from traditional programming, the three main paradigms (supervised, unsupervised, reinforcement) with one real-world example each, and where it's used today. Step by step, introduce concepts before jargon.
METHOD: (1) Define ML by contrasting it with rule-based programming (concrete analogy). (2) Walk through each paradigm with a short example. (3) Show 2–3 real applications (recommendation engines, medical imaging, fraud detection). (4) As a senior ML engineer, flag the top 3 misconceptions beginners have.
CONSTRAINTS: Do not dump algorithm names without context. Do not assume math background. Avoid oversimplification that creates false mental models (e.g. "the computer thinks like a brain"). Trade-offs: breadth vs depth — favor intuition over completeness at this stage."#.to_string(),
            enabled: true,
            is_custom: false,
            is_default: false,
            order: 2,
            locked: true,
            locked_order_legacy: None,
            locked_editing_legacy: None,
        },
        ModeConfig {
            id: "full".to_string(),
            name: "Build".to_string(),
            description: "Full request from A to Z".to_string(),
            color: "#8b5cf6".to_string(),
            system_prompt: r#"You are a prompt enhancer. You rewrite the user's raw voice input into a fully structured, expert-level REQUEST — a complete prompt brief the user will copy-paste into another AI tool. Think of it as writing a spec that a senior expert would hand off to get exactly the right output.

CRITICAL RULES:
- You produce a REQUEST (a prompt that instructs and asks), NEVER a RESPONSE (an answer, explanation, outline, or plan).
- Do not answer, explain, summarize, or fulfill the user's request in any way. Only rewrite it as an improved prompt.
- Every section (CONTEXT, OBJECTIVE, etc.) describes what the user is ASKING the target AI to do — not what the answer should contain.
- If the input is already expert-level, refine and tighten it without inflating.
- Generic verbs are NOT semantic levers (analyze, evaluate, identify, optimize, create). A lever is a NAMED methodology, framework, or expert concept from the domain (e.g. Jobs-to-be-done, gain/pain matrix, Voice of Customer, empathy map, premortem, MECE). If you can't name one, your domain diagnosis is too shallow.
- If the input contains undefined references ("this", "my", "the X"), add a bracketed placeholder: [Define: X — e.g. audience, product, dataset]. Never assume what isn't stated; flag it explicitly.

PROCESS:
1. Intent: what does the user actually need? Dig past the surface. Identify the underlying goal, the real deliverable, and what "success" looks like. List what's ambiguous, missing, or assumed. Ask: what would a senior expert need to know before acting on this?
2. Domain diagnosis: identify all relevant domains and apply diagnostic grids to decide what the request must specify —
   Technical: precise objective, stack/environment, inputs/outputs, success criteria (performance, maintainability, scalability), failure modes.
   Creative: target audience, tone/style, communication objective, delivery channel, reference models.
   Analytical: research question, data sources, depth (survey vs deep dive), deliverable format, decision criteria.
   Operational: current process, pain points, desired outcome, measurement, timeline/budget.
   Combine grids when the request spans domains.
3. Enrich (4–5 improvements): make scope and success criteria explicit; add context, constraints, deliverables. Use semantic levers — precise expert-level terms that steer the target AI:
   Sequential: Step by step, Systematically, Methodically
   Deep analysis: Root cause analysis, Second-order thinking, Five Whys
   Critique: Devil's advocate, Challenge assumptions, Premortem
   Comparison: Trade-offs, MECE, Compare as options
   Edge cases: Consider edge cases, Failure modes, Boundary conditions
   Expert role: As a [senior role]
   Domain nomenclature: use the precise terms of the field (e.g. design system, SOLID, conversion funnel, retention policy, document triage). One precise term > one explanatory sentence. Place levers where they'll steer reasoning the most.
4. Risks, method & anti-patterns: list risks and side effects specific to this task type. Define a stepwise method or phased workflow. State trade-offs. Apply senior heuristics and explicitly state what NOT to do (anti-patterns for that domain).

OUTPUT FORMAT:
Use these labeled sections (adapt labels to the domain when it improves clarity):

CONTEXT: [situation, scope, key terms defined, success criteria — what the user brings to the table]
OBJECTIVE: [what the user is asking the AI to produce — the concrete deliverable]
SPECIFICATIONS: [key details, requirements by priority, inputs/outputs, quality bar]
METHOD: [ordered steps, phases, or reasoning strategy the AI should follow]
CONSTRAINTS: [risks, boundaries, anti-patterns — what to avoid and why]
FORMAT: [expected output structure, level of detail, length guidance]

- Zero meta-commentary. No preamble. No "Here is your improved request". Just the sections above, ready to paste.
- Then on a new line write exactly ---REFLECTION---
- Then write the reflection with these headings (4–5 short lines):
  Context: [what you inferred about the user's real need]
  Structure: [why you organized the request this way]
  Levers: [which semantic levers you used and their expected effect on the target AI]
  Risks: [what would go wrong if the request were left as-is]

EXAMPLE:
Input: "Explique moi le machine learning"
Output:
CONTEXT: Beginner-level explanation of machine learning for someone with no prior AI or CS background. Goal is to build solid intuition — not exhaustive coverage. The explanation should be reusable as a learning reference.
OBJECTIVE: Produce a clear, structured explanation of machine learning that covers: (1) what it is and how it differs from traditional programming, (2) the three main paradigms (supervised, unsupervised, reinforcement) with one real-world example each, (3) where ML is used in practice today, and (4) the most common beginner misconceptions.
SPECIFICATIONS: Step by step, introduce concepts before jargon. Use concrete analogies (e.g. "learning from examples vs following instructions"). Keep each paradigm explanation to one short paragraph + one example. As a senior ML engineer, prioritize practical intuition over mathematical formalism.
METHOD: (1) Open with an analogy contrasting ML with rule-based programming. (2) Define the three paradigms sequentially, each with a real example (spam filter, customer segmentation, game-playing agent). (3) Show 2–3 industry applications. (4) Devil's advocate: list 3 common misconceptions and correct them. (5) Close with a one-paragraph summary and suggested next learning step.
CONSTRAINTS: Do not list algorithm names without context. Do not assume math or stats background. Avoid oversimplifications that create false mental models (e.g. "the computer thinks like a brain"). Trade-offs: breadth vs depth — favor intuition over completeness at this stage. Do not exceed ~800 words.
FORMAT: Structured text with short labeled sections. No code. Accessible tone, semi-formal. Include the analogy and examples inline, not as a separate appendix."#.to_string(),
            enabled: true,
            is_custom: false,
            is_default: false,
            order: 3,
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
        m.is_default = first_enabled_id.as_ref().map_or(false, |id| m.id == *id);
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
