# Prompt Enhancement Cursor

**Type:** Methodology  
**Scope:** Single flow = Prompt Enhancement with level slider (1–5)  
**Prompt library:** `cursor-prompt-level-1.md` (Minimal) through `cursor-prompt-level-5.md` (Full plan).

---

## 1. Structure (all five levels)

Every cursor prompt follows the same skeleton for consistency and professionalism:

- **Purpose:** One sentence. Transform voice input into improved prompt. Do not execute; output the prompt only. (Level 1: minimal; level 5: full expert cadrage.)
- **Process:** Numbered steps (1–2 at level 1; 1–4 at levels 2–3; 1–5 at levels 4–5). Same professional wording: contextual analysis, semantic understanding, contextual enrichment, domain nomenclature, magic keywords (where applicable).
- **Output format:** Strict. What to return. Zero meta. No preamble. (Level 5: copy-ready prompt then ---REFLECTION--- then reflection.)
- **Constraints:** Length (per level), intent 100% preserved, no execution.
- **Rules:** Per-level (enrichments count, keywords, structure, reflection at 5).

Same structure = same expectations for the model and for the user. High-level quality, all in English.

---

## 2. Dashboard

Only **Prompt Enhancement** is available. The user sets the **level** (1–5) via a slider. Level 1 is minimal (almost clean transcription); level 5 is full expert cadrage with reflection. Reference docs: `cursor-prompt-level-1.md` … `cursor-prompt-level-5.md`.

---

## 3. Cursor Levels (1–5)

| Level | Label | Scenario | Length | Enrichment | Magic keywords | Reflection |
|-------|-------|----------|--------|------------|----------------|------------|
| 1 | Minimal | Almost like classic. Syntax + readability; 0–2 keywords only if relevant. Not aggressive. | ±10% | Syntax + optional keywords | 0–2, only when relevant | No |
| 2 | Light | Everyday prompt, one clear task. See `cursor-prompt-level-2.md`. | ±10% | 1–2 light enrichments | 1–2 | No |
| 3 | Medium | Multi-step or important task. See `cursor-prompt-level-3.md`. | May extend slightly | 2–3 enrichments | 2–3 | No |
| 4 | Strong | Project kickoff, framing. See `cursor-prompt-level-4.md`. | Can be longer | 3–4 enrichments | 3–4 | No |
| 5 | Full plan | New project, full plan. See `cursor-prompt-level-5.md`. | Longer, comprehensive | 4–5 enrichments | 4+ | Yes (---REFLECTION---) |

---

## 4. Scenarios (When to Use Which Level)

- **Level 1 – Minimal:** Syntax and clarity; 0–2 magic keywords only when clearly relevant (e.g. input length). Preserve user phrasing. Do not be aggressive.
- **Level 2 – Light:** One clear task. Contextual analysis, semantic understanding, 1–2 enrichments, minimal nomenclature. See `cursor-prompt-level-2.md`.
- **Level 3 – Medium:** Multi-step or important task. Full process 1–4; 2–3 magic keywords; light sections. See `cursor-prompt-level-3.md`.
- **Level 4 – Strong:** Project kickoff. Full process 1–5; 3–4 magic keywords; structured sections. See `cursor-prompt-level-4.md`.
- **Level 5 – Full plan:** New project, full cadrage. Full process 1–5; 4+ magic keywords; reflection. See `cursor-prompt-level-5.md`.

---

## 5. Implementation Notes

- Stored value = enhancement level (1–5). Backend receives the prompt string for that level (same structure as above).
- **Prompt library:** Scoping, Options, etc. remain as a separate "library" of methodology templates (Modes page).
