# Quick Start: Ghosty Request Optimizer

**Target**: 2min onboarding. Zero fluff.

**CRITICAL**: Ghosty generates REQUESTS, not final content. You paste the optimized request to ChatGPT/Claude.

---

## Setup (3 steps)

```bash
# 1. Install
npm install

# 2. Configure API key (choose one)
# Option A: environment variable (required on Linux/Windows; optional on macOS)
export OPENAI_API_KEY="sk-..."

# Option B: in the app after launch (macOS only): Paramètres (Settings) > API Keys > Add key
# On Linux/Windows, only Option A is available (one key via OPENAI_API_KEY).

# 3. Run
npm run tauri:dev
```

**Données envoyées à OpenAI** : les enregistrements audio et les textes sont envoyés à OpenAI pour la transcription (Whisper) et la transformation (GPT-4o-mini). Rien n’est envoyé à un autre serveur. Ne partagez pas votre clé API et révoquez-la en cas de fuite (OpenAI Dashboard).

**Permissions** : Ghosty a besoin du micro (enregistrement) et des raccourcis clavier globaux (ex. Ctrl+Shift+Space) pour fonctionner. Sur macOS, autorisez micro et accessibilité dans Réglages Système si demandé.

**Télécharger l'app (sans compiler)** : [Releases](https://github.com/gui2eellav-largo/ghosty/releases) ou [Actions](https://github.com/gui2eellav-largo/ghosty/actions) → dernier run → Artifacts. Sinon : `npm run tauri:build` (voir README). Sur macOS, si « développeur non identifié » s'affiche : clic droit sur l'app → **Ouvrir** (puis confirmer).

---

## Lancer et redémarrer l'app (débutant)

### Lancer l'app pour la première fois

1. **Ouvre un terminal**  
   - Dans Cursor / VS Code : menu **Terminal** → **New Terminal** (raccourci : **Ctrl+ù** sous Windows/Linux, **Cmd+ù** sous Mac).  
   - Ou lance l'app **Terminal** (macOS) / **Invite de commandes** (Windows).

2. **Va dans le dossier du projet**  
   Tape la ligne suivante en remplaçant le chemin par l’emplacement de ton projet. Puis **Entrée**.
   ```
   cd /chemin/vers/ghosty
   ```
   Exemple : \`cd ~/Desktop/ghosty\` ou \`cd ~/ghosty\`.

3. **Démarre l'app**  
   Tape la ligne ci-dessous (sans \`\`\`bash). Puis **Entrée**.
   ```
   npm run tauri:dev
   ```  
   La première fois, ça peut prendre 1–2 minutes (compilation). Ensuite deux fenêtres s’ouvrent : la fenêtre principale Ghosty et le **widget flottant** (petit bloc avec le curseur et le bouton Dictate).

### Redémarrer l'app (après un changement de config ou de code)

1. **Arrête l'app**  
   Dans le même terminal où tourne `npm run tauri:dev`, fais **Ctrl+C** (ou **Cmd+C** sur Mac).  
   Tu dois voir que la commande s’arrête (le curseur revient et tu peux retaper une commande).

2. **Relance l'app**  
   Tape à nouveau :
   ```bash
   npm run tauri:dev
   ```
   Puis **Entrée**.  
   Les fenêtres se rouvrent avec la nouvelle version.

**En résumé** :  
- **Lancer** = \`npm run tauri:dev\` dans le dossier du projet.  
- **Redémarrer** = **Ctrl+C** dans le terminal, puis `npm run tauri:dev` à nouveau.

---

## Usage

### Basic
1. `Ctrl+Shift+Space` → Glass menu
2. Select mode (arrows + Enter)
3. Speak vaguely
4. Release → **Optimized request** in clipboard
5. `Ctrl+V` in ChatGPT/Claude

### First Test
- Select **"Shape"** (or **Light edit** for lighter touch)
- Say: "Create a function that sorts an array"
- Observe: vague → precise AI-ready request
- Paste in ChatGPT → Get code

---

## Understanding Modes

### Mode = Request Optimizer

**Input**: Raw voice transcription  
**Output**: AI-ready optimized request (for ChatGPT/Claude)

**NOT**: Final content generation

**Mechanism**: Magic keywords → GPT-4o-mini → Perfect request for AI

### Example

**Mode**: Email Generation Request
**Keywords**: `Crystallize intent. Specify tone/structure.`

**Voice input**:
> "Hey I need to follow up with the team about yesterday's meeting we discussed the API changes and need their feedback by Friday"

**Ghosty output (optimized request)**:
```
Write a professional follow-up email to the team regarding yesterday's meeting.

Context: API changes discussed
Required action: Team feedback by Friday

Structure:
- Subject: Clear, actionable
- Paragraph 1: Meeting recap
- Paragraph 2: Feedback request with deadline
- Paragraph 3: Next steps

Tone: Professional, courteous, direct
Max 3 paragraphs
```

**User action**: Copy → Paste to ChatGPT → ChatGPT generates actual email

---

## Built-in Modes (5)

By level of intervention (light → full):

1. **Hands-off** — Change as little as possible. Clean transcription, minor syntax.
2. **Light edit** — Improve without altering the voice. Polished, ready-to-send.
3. **Shape** — Structure and polish. Professional, organized (default).
4. **Reframe** — Frame and reason. Expert-level analysis.
5. **Build** — Full request from A to Z. Project scoping, full plan.

**All modes**: Generate requests for AI, NOT final content. Each outputs a short reflection (visible in history).

---

## Creating Custom Mode

### Template
```typescript
{
  name: "Your Mode",
  prompt: "[Method]. [Action]. [Qualifier]."
}
```

### Example: Meeting Notes
```typescript
{
  name: "Meeting Notes",
  prompt: "Distill. MECE organization. Actionable only. Format: Decisions, Actions, Owners, Deadlines."
}
```

### Add via UI
1. Open **Modes** tab
2. Click **"Ajouter un mode"**
3. Name + Prompt
4. Save
5. Test immediately

---

## Magic Keywords 101

### What are Magic Keywords?

**Precise terms** that activate **specific neural patterns** in LLMs.

**Effect**: Dense semantic compression. Maximum clarity.

### Core Principle

```
❌ "Please carefully analyze this in detail"
✓ "Forensic analysis"
```

**Why**: "Forensic" appears in high-quality analytical contexts during LLM training → triggers rigorous analysis pattern.

### Top 10 Keywords

| Keyword | Effect |
|---------|--------|
| **Distill** | Extract essence only |
| **MECE** | Mutually Exclusive, Collectively Exhaustive organization |
| **Forensic** | Systematic, rigorous investigation |
| **Actionable** | Directly implementable (no theory) |
| **Terse** | Maximum concision |
| **First principles** | Rebuild from axioms |
| **Trade-off** | Map compromises explicitly |
| **Crystallize** | Make ultra-clear |
| **Nuanced** | Subtle, not simplistic |
| **Strategic** | Long-term vision |

### Stacking (2-4 keywords)

```
[Methodology] + [Cognitive Action] + [Output Qualifier]
```

**Examples**:
- `MECE breakdown. Synthesize. Terse.`
- `First principles. Distill. Actionable.`
- `Forensic analysis. Isolate root cause. Recommend.`

---

## Common Workflows

### 1. Get Perfect ChatGPT Request
- Mode: **Shape** (or **Reframe** for deeper analysis)
- Speak your vague idea
- Get optimized request
- Copy → Paste to ChatGPT

### 2. Quick polish
- Mode: **Light edit**
- Speak key points
- Get ready-to-send text or request
- Paste to ChatGPT if needed

### 3. Problem analysis
- Mode: **Reframe**
- Describe the problem
- Get framed analysis request
- Paste to ChatGPT → Get root cause analysis

### 4. Project planning
- Mode: **Build**
- Speak project idea
- Get full scoping request
- Paste to ChatGPT → Get structured brief

---

## Troubleshooting

### No transcription
- **Clé API** : vérifiez dans l’app (Paramètres > API Keys) ou en terminal : `echo $OPENAI_API_KEY`
- Autorisez le micro (Réglages Système > Confidentialité et sécurité)
- Vérifiez les erreurs dans le terminal

### Poor transformation quality
- Test with **different mode**
- Speak more clearly (structured sentences)
- Check mode request (too generic?)

### App crashes
- Check Rust logs in terminal
- Verify Tauri version: `npm list @tauri-apps/cli`

---

## Learning Path

### Day 1
- Test 3 built-in modes
- Understand magic keywords concept
- Create 1 custom mode

### Week 1
- Use daily (10+ commands)
- Iterate on custom modes
- Read `GHOSTY-MODES-METHODOLOGY.md`

### Month 1
- Design 5+ custom modes
- Master magic keywords library
- Contribute mode to repo

---

## Resources

### Essential Docs
- **README.md** - Full overview
- **GHOSTY-MODES-METHODOLOGY.md** - Mode design guide
- **magic-keywords-prompt-engineering.md** - Theory deep dive

### Quick Links
- Magic keywords reference: `docs/magic-keywords-prompt-engineering.md` (page 618-644)
- Mode examples: `docs/GHOSTY-MODES-METHODOLOGY.md` (lines 50-200)
- Architecture: `README.md` (lines 90-105)

---

## Next Steps

1. **Try it**: Run `npm run tauri:dev`
2. **Test modes**: Try all 5 built-in modes (Hands-off → Build)
3. **Create custom**: Design mode for your workflow
4. **Deep dive**: Read methodology docs
5. **Contribute**: Share your best modes

---

**Time to productivity**: 5 minutes  
**Mastery**: 1 week daily use  
**ROI**: 10-30min saved per day (voice → optimized request)
