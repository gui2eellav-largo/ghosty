# Ghosty Request Rules

**Type:** Methodology  
**Scope:** Founder modes, request design, reading and exploration workflows  
**Status:** Reference for mode design and future requests

---

## 1. Core Rules

### 1.1 Structure (founder modes)

Every founder mode follows the same skeleton:

- **Purpose:** One sentence. What the mode does. "Do not execute; output the request only."
- **Process:** Numbered steps. Same depth of detail. Imperative.
- **Output format:** Strict. What to return. Zero meta. No preamble.
- **Constraints:** Length/format/intent preserved. No execution.
- **Rules:** Same exigence. Nomenclature, intent 100%, clarity.

Same structure = same expectations for the model and for the user.

### 1.2 Tone

- **Direct, imperative:** "Identify", "Adopt", "Preserve", "Output = request only."
- **Expert-level:** Top 0.001% perspective; domain vocabulary; no fluff.
- **Zero meta:** No "Here is the request:", no explanations around the output. Output is the request.

### 1.3 Exigence

- **Intent preserved 100%:** No alteration of expected outcome.
- **Constraints explicit:** Length (±10% when dense), format (request only), no execution.
- **Nomenclature:** One precise term over explanatory phrasing; activates more patterns with fewer tokens.

---

## 2. Request Design

### 2.1 Dense vs structured

- **Dense:** Same length (±10%). Maximum semantic density. Minimal structure. Best when the user wants a compact, copy-paste request.
- **Structured:** Can be longer. Explicit sections, magic keywords, organizational logic. Best when the user wants a reasoned, step-by-step request or when reflection (contextual analysis, organizational logic) is useful.

### 2.2 Magic keywords

Terms that activate specific reasoning modes (see `magic-keywords-prompt-engineering.md`):

- Sequential: Step by step, Systematically, Methodically.
- Deep analysis: Root cause analysis, Deep dive, Second-order thinking.
- Critique: Devil's advocate, Critically evaluate, Challenge assumptions.
- Comparison: Context-dependent, Compare as options, Trade-offs.
- Workflow: Workflow, Iterative process, Validation continue.
- Edge cases: Consider edge cases, Failure modes, Error conditions.
- Expert perspective: As a [senior role], From the perspective of.

Embed 2–4 by intent. Weave into text naturally; do not list them.

### 2.3 Domain nomenclature

Identify domain (UX, dev, marketing, architecture). Adopt expert vocabulary (e.g. design system, architecture patterns, conversion optimization, scalability, SOLID principles). One precise term replaces a phrase and activates pre-trained patterns.

---

## 3. Reading Workflow: Macro to Micro

### 3.1 What it means

**Macro to micro** = read and build the request from the big picture down to the concrete.

- **Macro:** Intent, scope, context. "What is the user trying to achieve? In which domain? What constraints (implicit or explicit)?"
- **Micro:** Concrete formulation. "Which exact terms? Which magic keywords? Which structure (sections, steps)?"

Implications:

1. **Order of operations:** Contextual analysis and semantic understanding (macro) before enrichment and formulation (micro).
2. **Reading flow:** The model (and the user, when editing) should "read" the voice input top-down: intent first, then constraints, then options, then precise wording.
3. **Scoping / exploration:** Explicitly use macro→micro: delineate scope (macro), then options and constraints (micro), then formulation.

### 3.2 In the founder modes

- **Dense / Structured:** Process steps 1–2 (contextual, semantic) = macro; steps 3–4 (–5) (enrichment, nomenclature, magic keywords) = micro.
- **Scoping / exploration:** "Reading flow: macro to micro" is stated in the mode: delineate scope first, then options and constraints, then formulation.
- **Options / variants:** Identification of "alternatives" (macro) before imperative formulation and precision (micro).

---

## 4. Learning and Exploration Workflow

### 4.1 Learning

Use modes to **learn** how to formulate requests:

- **Raw:** Baseline. What did I say? No transformation.
- **Dense:** How can the same intent be said with better semantics and nomenclature? Compare input vs output to see compression and vocabulary shift.
- **Structured:** How is the request organized? Which magic keywords were chosen and why (reflection)? Use reflection in history to inspect reasoning.

Reflection in history is available for any mode that outputs ---REFLECTION--- (not only Structured). The app displays it in history whenever the model returns that delimiter.

Workflow: dictate → compare raw vs dense vs structured → read reflection when present → adjust your own phrasing and mode choice next time.

### 4.2 Exploration

Use modes to **explore** possibilities:

- **Scoping / exploration:** Voice a vague or high-level goal → get a request that frames scope, options, and trade-offs. Macro first (scope), then micro (options, criteria).
- **Options / variants:** Voice "give me several ideas" → get a request that forces the target model to return multiple proposals, not one. Exploration of alternatives.

Workflow: dictate an exploratory intent → get a request that opens the space (scoping) or forces variety (options) → paste into ChatGPT/Claude and iterate.

### 4.3 Testing "best" reading workflow

To test which reading workflow works best:

1. **Macro→micro (current):** Process = context/semantics first, then enrichment/formulation. Explicit in Scoping: "Reading flow: macro to micro".
2. **Alternative:** Micro→macro (e.g. "draft the request first, then add context/constraints") could be tried as an experimental mode and compared on clarity and copy-paste success.
3. **Metric:** User satisfaction + ease of copy-paste + whether the target model (ChatGPT/Claude) follows the generated request as intended.

The doc and founder prompts currently standardize on **macro→micro** as the default reading flow.

---

## 5. Document Maintenance

- When adding or changing a founder mode, keep Purpose / Process / Output format / Constraints / Rules and the same tone and exigence.
- When adding new concepts (e.g. another reading flow), document them here and reference from the mode definition if needed.
- Related: `cursor-prompt-level-1.md` … `cursor-prompt-level-5.md`, `prompt-enhancement-cursor.md`, `GHOSTY-MODES-METHODOLOGY.md`, `magic-keywords-prompt-engineering.md`, `prompting-dense-library.md`.
