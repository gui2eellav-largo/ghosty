# Ghosty Methodology: Dense Prompting for Voice Transformation

**Version**: 2.0  
**Date**: 2026-01-31

---

## Core Concept: Pure Prompt Enhancement

**CRITICAL**: Ghosty does NOT generate final output.  
**Ghosty generates OPTIMIZED PROMPTS.**

### Flow

```
1. User speaks vaguely
2. Ghosty enhances → precise prompt
3. User copies → pastes to ChatGPT/Claude
4. AI generates final content
```

### Example

**Voice input**:
> "email team about meeting"

**Ghosty output (optimized prompt)**:
```
Write a professional follow-up email to the team. 

Include: 
- Meeting decisions
- Assigned actions with deadlines
- Next steps

Tone: courteous, direct
Structure: 3 paragraphs max
Format: Subject line + Body + CTA
```

**User action**: Copy → Paste to ChatGPT → Gets final email

---

## Vision

Ghosty leverages **dense prompting** methodology. Voice input → optimized prompt → ChatGPT/Claude → quality output.

**Ghosty is a meta-tool for prompt engineering**. Ultra-precise magic keywords activate specific neural patterns in GPT-4o-mini to transform vague speech into perfect AI prompts.

**Core principle**: Maximum semantic density. One precise term > one vague phrase.

---

## Mode Architecture

Each Ghosty mode = **2-4 magic keywords** combination defining:
1. **Methodology** (processing approach)
2. **Cognitive action** (transformation type)
3. **Output qualifier** (constraints)

### Mode Template

```typescript
{
  id: "mode_id",
  name: "Human-readable name",
  prompt: "[Methodology]. [Cognitive action]. [Output qualifier].",
  category: "enhancement|documentation|communication"
}
```

---

## Modes by Category

### Category 1: Prompt Enhancement

**Use case**: Enhance voice prompt for AI interaction

#### Mode: Prompt Enhancer (Dense)

**Magic keywords**: `First principles. Elucidate tersely. Actionable.`

**Full system prompt**:
```
Top 0.001% prompt engineering expert.
Transform voice command → optimized prompt.
First principles. Elucidate tersely. Actionable.
Constraint: ±10% original length.
```

**Output**:
- Intention clarified
- Domain-specific jargon added
- Ambiguities eliminated
- Structure if needed

---

#### Mode: Prompt Enhancer (Complete)

**Magic keywords**: `Forensic analysis. MECE breakdown. Nuanced.`

**Full system prompt**:
```
Top 0.001% prompt engineering expert.
Full forensic analysis of voice command.
MECE breakdown. Nuanced. Structured synthesis.
Constraint: +50% max expansion for clarity.
```

**Output**:
- Cognitive intent identified (analytical, creative, comparative)
- Deep contextual enrichment
- Domain-specific jargon
- Hierarchical structure if relevant

---

### Category 2: Project Documentation

**Use case**: Transform voice notes → structured documentation

#### Mode: Project Context

**Magic keywords**: `Distill ruthlessly. MECE organization. Actionable only.`

**Full system prompt**:
```
Generate structured project note from voice command.
Distill ruthlessly. MECE organization. Actionable only.
Markdown format mandatory:
- Objective (1 sentence)
- Constraints (bullet points)
- Key decisions (numbered)
- Next steps (precise actions)
```

**Output**:
- Fluff eliminated
- MECE organization (Mutually Exclusive, Collectively Exhaustive)
- Actionable elements only
- Clear Markdown structure

---

#### Mode: Project Kickoff

**Magic keywords**: `Systematic decomposition. Trade-off mapping. Strategic.`

**Full system prompt**:
```
Transform voice note → structured project brief.
Systematic decomposition. Trade-off mapping. Strategic.
Markdown format mandatory:
- Problem (root cause)
- Proposed solution (first principles)
- Scope (MECE breakdown)
- Constraints (quantified)
- Expected deliverables (measurable)
- Risks (risk assessment)
```

**Output**:
- Systematic decomposition
- Trade-offs mapped
- Strategic vision
- Elements quantified

---

### Category 3: Professional Communication

**Use case**: Transform voice notes → professional communication

#### Mode: Professional Email

**Magic keywords**: `Crystallize. Rigorous brevity. Diplomatic.`

**Full system prompt**:
```
Transform voice note → professional email.
Crystallize. Rigorous brevity. Diplomatic.
Structure:
- Subject (clear, actionable)
- Body (3 paragraphs max)
- Call-to-action (precise)
Tone: courteous, direct, zero fluff.
```

---

#### Mode: Executive Summary

**Magic keywords**: `Distill ruthlessly. Priority ranking. Strategic implications only.`

**Full system prompt**:
```
Transform voice note → executive summary.
Distill ruthlessly. Priority ranking. Strategic implications only.
Format:
- Context (2 sentences)
- Stakes (3 bullet points max, ranked)
- Recommendations (actionable, prioritized)
Constraint: 1 page equivalent max.
```

---

### Category 4: Analysis & Problem Solving

**Use case**: Transform voice problem description → structured analysis

#### Mode: Root Cause Analysis

**Magic keywords**: `Five Whys. Forensic approach. Isolate true lever.`

**Full system prompt**:
```
Forensic analysis of voice-described problem.
Five Whys. Forensic approach. Isolate true lever.
Format:
- Observed symptoms
- Causal chain (5 levels)
- Root cause identified
- True lever actionable
- Precise recommendation
```

---

#### Mode: Decision Framework

**Magic keywords**: `Trade-off mapping. Cost-benefit. Recommend decisively.`

**Full system prompt**:
```
Transform voice reflection → decision framework.
Trade-off mapping. Cost-benefit. Recommend decisively.
Format:
- Options (MECE)
- Trade-offs (quantified)
- Cost-benefit (numbered if possible)
- Recommendation (clear, justified)
- Risks (mitigations)
```

---

### Category 5: Creativity & Ideation

#### Mode: Structured Brainstorm

**Magic keywords**: `MECE breakdown. Different angles strategy. Hierarchical.`

**Full system prompt**:
```
Transform voice idea flow → MECE structure.
MECE breakdown. Different angles strategy. Hierarchical.
Format:
- Central theme
- Categories (mutually exclusive)
- Ideas per category (3-5 max)
- Prioritization (High/Medium/Low)
```

---

#### Mode: Concept Clarification

**Magic keywords**: `Socratic method. Delineate precisely. First principles.`

**Full system prompt**:
```
Clarify concept from voice description.
Socratic method. Delineate precisely. First principles.
Format:
- Definition (first principles)
- Delineation (what it is / what it isn't)
- Applications (3 concrete examples)
- Implications (why important)
```

---

## New Mode Design Rules

### 1. Maximum 3-4 Magic Keywords

**Bad**:
```
"Analyze, dissect, elucidate, crystallize, synthesize, distill..."
```
→ Effect dilution

**Good**:
```
"Dissect methodically. Synthesize. Actionable."
```

---

### 2. Coherent Combination

**Formula**:
```
[Methodology] + [Cognitive action] + [Qualifier]
```

**Valid examples**:
- `First principles. Distill. Actionable only.`
- `MECE breakdown. Synthesize. Rigorous brevity.`
- `Forensic analysis. Dissect. Unambiguous recommendations.`

**Incompatible**:
```
"Quick overview but be exhaustive and rigorous"
```
→ Semantic contradiction

---

### 3. Keywords at Instruction Start

**Privileged position**: Magic keywords must appear **before** format constraints.

**Structure**:
```
[Expert role] → [Magic keywords] → [Format/Constraints]
```

---

### 4. Reference the Library

Consult `docs/prompting-dense-library.md` and `docs/magic-keywords-prompt-engineering.md` to:
- Choose proven keywords
- Understand their effect
- Test combinations

---

## Magic Keywords Library for Ghosty

### Cognitive Actions (Top 20)

| Keyword | Effect | Ghosty Use Case |
|---------|--------|-----------------|
| **Distill** | Extract essence | Synthesis, condensation |
| **Elucidate** | Clarify deeply | Prompt enhancement |
| **Articulate** | Express precisely | Pro communication |
| **Crystallize** | Make ultra-clear | Emails, briefs |
| **Synthesize** | Combine intelligently | Structured brainstorm |
| **Dissect** | Analyze deeply | Debug, root cause |
| **Delineate** | Trace precise contours | Definitions, concepts |
| **Decompose** | Dismantle systematically | Problem analysis |

### Qualifiers (Top 20)

| Keyword | Effect | Ghosty Use Case |
|---------|--------|-----------------|
| **Terse** | Concise, dense | All modes (constraint) |
| **Actionable** | Directly applicable | Documentation, decisions |
| **Rigorous** | Logically flawless | Technical analyses |
| **Nuanced** | Subtle, not simplistic | Complex analyses |
| **Pragmatic** | Concrete, realistic | Recommendations |
| **Strategic** | Long-term vision | Briefs, kickoff |
| **Tactical** | Immediate operational | Actions, next steps |
| **Unambiguous** | Zero interpretation | Critical communication |

### Methodologies (Top 15)

| Framework | Effect | Ghosty Use Case |
|-----------|--------|-----------------|
| **First principles** | Rebuild from base | Concept clarification |
| **MECE breakdown** | Exhaustive/exclusive decomposition | Organization, brainstorm |
| **Five Whys** | Dig causality | Root cause analysis |
| **Trade-off mapping** | Map compromises | Decisions |
| **Forensic analysis** | Systematic investigation | Debugging, problems |
| **Socratic method** | Iterative questioning | Deep dive |
| **Pareto analysis** | 80/20 rule | Prioritization |

---

## Testing & Validation

### A/B Protocol

New mode testing:

1. **Baseline**: Classic verbose prompt
2. **Dense**: Same intent with magic keywords
3. **Measure**:
   - Information density (useful info / tokens)
   - Relevance (actionable elements / total)
   - Transformation time
   - Subjective quality (1-10)

### KPIs per Mode

| Metric | Target | Measure |
|--------|--------|---------|
| Info density | >0.8 | Info / Tokens |
| Relevance | >0.9 | Actionable / Total |
| Structure | Yes | Binary |
| Reproducibility | >0.85 | Run similarity |

---

## Mode Evolution

### New Keyword Discovery

1. **Observe experts**: What vocabulary signals rigor?
2. **Academic literature**: Established methodology terms
3. **Empirical testing**: Systematic A/B testing
4. **Specialized domains**: Professional jargon

### Addition Process

1. Identify user need
2. Choose 2-4 magic keywords from library
3. Test with 10+ varied examples
4. Measure KPIs
5. If >baseline significantly → Add mode
6. Document in this file

---

## References

- **Dense Prompting Library**: `docs/prompting-dense-library.md`
- **Magic Keywords Full Doc**: `docs/magic-keywords-prompt-engineering.md`
- **Implementation**: `src/main.ts` (DEFAULT_MODES)

---

**Contributors**: Guillaume  
**Last updated**: 2026-01-31
