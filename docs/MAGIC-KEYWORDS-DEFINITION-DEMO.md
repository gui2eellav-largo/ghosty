# Magic keywords in prompting: definition and demo

## Precise definition

A **magic keyword** is a short expression (one word or 2–3 words) that, when inserted into a prompt, activates a **response pattern** already learned by the LLM during training.

### Conditions for a term to be a magic keyword

1. **Frequency**: It appears often in corpora where a certain form of response is expected (rigor, sequence, concision, etc.).
2. **Association**: The model has learned the association "this term → this type of response".
3. **Specificity**: It activates a precise pattern, not a generic response.
4. **Constraint**: It imposes a constraint on the output (structure, depth, format), not decorative vocabulary.

In short: **target response behavior → kind of discourse where that behavior is the norm → expressions that, in that genre, signal that behavior → choose the most specific and constraining signal.**

### Semantic angle (what they are)

Magic keywords are first **perfectly suited words** to describe a methodology, a concept, or a situation. They are often the very precise terms used by the **top 0.1% of experts** in a field: pure semantics, no filler. One well-chosen word (e.g. *MECE*, *premortem*, *document triage*) replaces an explanatory phrase and anchors the request in a frame the model recognizes. The "pattern activation" effect comes from the fact that this expert vocabulary appears in high-quality contexts during training: semantic precision and response constraint are two sides of the same phenomenon.

### Typology (from the project)

| Type | Role | Examples |
|------|------|----------|
| **Style / reasoning** | How to respond (form) | Terse, Step by step, Devil's advocate |
| **Method / framework** | How to process (procedure) | MECE, Five Whys, Root cause analysis, Premortem |
| **Precise concept** | What to apply (domain) | Single source of truth, document triage, retention policy |

---

## Demo: same request, with and without magic keywords

### Context

User request (voice or text): *"Explain why our API sometimes returns 500 and how we could fix it."*

---

### Version A: without magic keywords (raw prompt)

```
Explain why our API sometimes returns 500 and how we could fix it.
```

**Typical LLM response**: General explanation, list of possible causes without prioritization, vague recommendations ("check the logs", "add monitoring"), loosely structured.

---

### Version B: with magic keywords (enriched)

Same intent, but we add terms that constrain form and depth:

```
Root cause analysis: why our API sometimes returns 500. Step by step, isolate likely causes then prioritize. Trade-offs for each fix. Recommendations actionable only.
```

**Expected effect**:
- **Root cause analysis** → structured causal reasoning, not just a list.
- **Step by step** → clear sequence (observation → hypotheses → verification → conclusion).
- **Trade-offs** → for each fix, explicit pros/cons.
- **Actionable only** → no theory, only what can be done concretely.

The response tends toward: methodical diagnosis, ordered causes, options with trade-offs, and implementable recommendations.

---

### Version C: stacking (methodology + action + qualifier)

Recommended pattern in Ghosty: `[Methodology] + [Cognitive action] + [Output qualifier]`.

```
Forensic analysis. MECE breakdown of possible causes (server, network, data, dependencies). Distill into 3–5 likely causes. Actionable only.
```

- **Forensic analysis** → rigorous investigation, not superficial.
- **MECE breakdown** → mutually exclusive and collectively exhaustive categories.
- **Distill** → extract the essence, no vagueness.
- **Actionable only** → directly usable deliverable.

---

## Summary

| Without magic keywords | With magic keywords |
|------------------------|---------------------|
| "Explain in detail" | "Forensic analysis. Step by step." |
| Generic, long response | Framed response (structure, depth, format) |
| Many tokens for little constraint | Few tokens for strong constraint |

**In one sentence**: A magic keyword is a **short signal**, anchored in a quality discourse genre, that **constrains** the model's output without having to spell out the instruction in long sentences.
