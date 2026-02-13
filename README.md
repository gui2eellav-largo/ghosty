# Ghosty

Voice-to-text + AI request optimization. Dense request methodology. Meta-tool for AI interactions.

## Core Concept

**Problem**: Vague voice input → vague requests → suboptimal results.

**Solution**: Voice → Whisper → GPT-4o-mini request enhancement → Optimized request → ChatGPT/Claude → Quality output.

**Ghosty is a request optimizer**, not a content generator.

### Flow

```
User speaks vaguely
    ↓
Whisper transcription
    ↓
GPT-4o-mini enhances → Optimized request
    ↓
Clipboard (auto-copy)
    ↓
User pastes to ChatGPT/Claude
    ↓
AI generates final content
```

**Innovation**: Magic keywords. Dense requests. Maximum semantic efficiency.

---

## Features

### Voice Input
- Global hotkey: `Ctrl+Shift+Space`
- Hold to record → Release to process
- Whisper API transcription (16kHz, accurate)

### AI Transformation
- GPT-4o-mini request enhancement (NOT content generation)
- Mode-based optimization
- Magic keywords methodology
- Auto-copy to clipboard
- Cost: ~$0.0015/command

### Mode System
- **4 built-in modes** (by level of intervention): Direct, Shape, Reframe, Build
- Custom modes (user-defined)
- Glass menu (quick selection during recording)
- Reflection in history for every mode

### Built-in Modes

1. **Direct** — Your words, light formatting only. No LLM; transcription only.
2. **Shape** — Structure and polish. Professional, organized (default).
3. **Reframe** — Frame and reason. Expert-level analysis.
4. **Build** — Full request from A to Z. Project scoping, full plan.

**All modes output**: Optimized request ready for ChatGPT/Claude (NOT final content). Each mode adds a short reflection (visible in history).

---

## Tech Stack

**Backend**: Rust (Tauri 2)
- `transcribe.rs` - Whisper API integration
- `llm.rs` - GPT-4o-mini transformation
- `audio.rs` - Recording (cpal)
- `hotkey.rs` - Global shortcut handling

**Frontend**: TypeScript + Vite
- Mode management (localStorage)
- Glass menu (overlay UI)
- Real-time status updates

**APIs**:
- OpenAI Whisper (transcription)
- OpenAI GPT-4o-mini (request optimization)

### Plateformes

- **macOS** : support complet (keychain pour les clés, multi-clés dans l’app, Services « clic droit », raccourcis globaux, copier/coller).
- **Linux / Windows** : l’app peut être compilée et lancée (`npm run tauri:build` avec la cible voulue), mais le support est **limité** :
  - **Clé API** : une seule clé, uniquement via la variable d’environnement `OPENAI_API_KEY`. La gestion des clés dans Paramètres > API Keys (ajout, suppression, multi-clés) est **macOS uniquement** (keychain).
  - **Services** (clic droit dans les apps) : macOS uniquement.
  - Raccourcis globaux, enregistrement, transcription et LLM fonctionnent dès que `OPENAI_API_KEY` est définie.

---

## Setup

### Prerequisites
```bash
# Rust toolchain
rustup default stable

# Node.js 18+
node --version
```

### Install
```bash
npm install
```

### Configure
```bash
# .env or export
export OPENAI_API_KEY="sk-..."
```

### Run
```bash
npm run tauri:dev
```

### Build
```bash
npm run tauri:build
```

Les binaires et le `.app` (macOS) sont dans `src-tauri/target/release/bundle/` (ex. `macos/Ghosty.app`, ou `.dmg` selon la cible).

### Télécharger l'app (sans compiler)

- **Compiler soi-même** : `npm run tauri:build` (voir ci-dessus). L’app est dans `src-tauri/target/release/bundle/` (ex. `macos/Ghosty.app`).
- **Releases** : [Releases GitHub](https://github.com/gui2eellav-largo/ghosty/releases) — téléchargez le `.dmg` ou l’archive (quand une release est publiée).
- **Sans release** : [Actions](https://github.com/gui2eellav-largo/ghosty/actions) → dernier run réussi → **Artifacts** → `ghosty-macos` (contient le `.app` macOS). Voir [Créer une release](docs/CREER-UNE-RELEASE.md) pour publier la première release.

**Ouvrir l'app sur macOS** : si Ghosty n'est pas signée, macOS peut afficher « l'app d'un développeur non identifié ». Pour lancer quand même : **clic droit** sur l'app (ou le .app) → **Ouvrir** → confirmer. Une seule fois par téléchargement. Pour signer et notariser (éviter ce message), voir [Préparation à la production](docs/PRODUCTION-READINESS.md#22-signature-et-notarisation-macos) et `signingIdentity` dans `tauri.conf.json`.

---

## Usage

### Basic Flow
1. Press `Ctrl+Shift+Space` → Glass menu appears
2. Select mode (arrows + Enter) or keep current
3. Speak your vague idea
4. Release → Whisper transcription → GPT-4o-mini request optimization → **Optimized request** in clipboard
5. `Ctrl+V` in ChatGPT/Claude → Get final content

### Mode Selection
- **During recording**: Glass menu (keyboard nav)
- **Settings tab**: Full mode management (CRUD)

### Example Workflow

**Scenario**: Need professional email

1. `Ctrl+Shift+Space` → Select "Email Generation Prompt"
2. Speak: "email team about yesterday's meeting, we decided to switch to new API, need feedback by Friday"
3. Ghosty outputs:
```
Write a professional follow-up email to the team regarding yesterday's meeting.

Context: Decision made to migrate to new API.
Required action: Team feedback needed by Friday.

Structure:
- Subject: Clear, actionable
- Paragraph 1: Meeting recap + decision
- Paragraph 2: Required action with deadline
- Paragraph 3: Next steps

Tone: Courteous, direct, professional.
Max 3 paragraphs.
```
4. Paste in ChatGPT → Get polished email

### Creating Custom Modes

**Template**:
```typescript
{
  name: "Your Mode",
  prompt: "[Methodology]. [Cognitive action]. [Output qualifier]."
}
```

**Example**:
```typescript
{
  name: "Bug Report",
  prompt: "Forensic analysis. Systematic decomposition. Actionable. Format: Issue, Steps, Expected, Actual, Fix."
}
```

**Guidelines**:
- 2-4 magic keywords max
- Reference `docs/internal/GHOSTY-MODES-METHODOLOGY.md` (doc interne)
- Test with varied inputs

---

## Documentation

- **[docs/README.md](docs/README.md)** — Index de la documentation (démarrage, production).
- **[Guide de démarrage (Quick Start)](docs/QUICKSTART.md)** — Installer, configurer la clé API, lancer l’app.
- **[Préparation à la production](docs/PRODUCTION-READINESS.md)** — Sécurité, distribution, checklist avant mise en ligne.

La doc interne (méthodologie modes, audits, etc.) est dans **docs/internal/**.

### Architecture
```
Voice Input
    ↓
Whisper API (transcription)
    ↓
GPT-4o-mini (transformation via mode)
    ↓
Clipboard / Active Field
```

### Cost Structure
- Whisper: $0.001/command (10s audio)
- GPT-4o-mini: $0.0005/transformation (~700 tokens)
- **Total**: ~$0.0015/command

---

## Methodology: Dense Prompting

**Core principle**: One precise term > one vague phrase.

### Magic Keywords Categories

**Cognitive actions**:
- Distill, Elucidate, Articulate, Crystallize, Synthesize, Dissect, Delineate, Decompose

**Qualifiers**:
- Terse, Actionable, Rigorous, Nuanced, Pragmatic, Strategic, Tactical, Unambiguous

**Methodologies**:
- First principles, MECE breakdown, Five Whys, Trade-off mapping, Forensic analysis, Socratic method

### Stacking Pattern
```
[Methodology] + [Cognitive action] + [Output qualifier]
```

**Example**:
```
❌ "Please analyze this carefully and provide a detailed breakdown with actionable recommendations"

✓ "Forensic analysis. MECE breakdown. Actionable only."
```

**Effect**: 3 words replace 14. Semantic density ×4. Neural pattern activation maximized.

---

## Development

### Project Structure
```
ghosty/
├── src/                    # Frontend (TypeScript)
│   ├── main.ts            # App logic, modes, glass menu
│   └── style.css          # UI styles
├── src-tauri/             # Backend (Rust)
│   ├── src/
│   │   ├── lib.rs         # Entry point
│   │   ├── transcribe.rs  # Whisper integration
│   │   ├── llm.rs         # GPT-4o-mini integration
│   │   ├── audio.rs       # Recording logic
│   │   ├── hotkey.rs      # Global shortcut
│   │   └── prompt_state.rs # Active mode state
│   └── Cargo.toml
├── docs/                  # Documentation
└── package.json
```

### Adding a New Mode Category

1. Design mode (consult methodology doc)
2. Choose 2-4 magic keywords
3. Add to `DEFAULT_MODES` in `src/main.ts`
4. Test with varied inputs
5. Measure KPIs (density, relevance, structure)
6. Document in `docs/internal/GHOSTY-MODES-METHODOLOGY.md`

---

## Roadmap

### Phase 1 (Current)
- ✅ Whisper transcription
- ✅ GPT-4o-mini transformation
- ✅ Mode system (5 built-in: Hands-off → Build)
- ✅ Glass menu UI
- ✅ Dense request methodology

### Phase 2
- [ ] Streaming responses (perceived latency ↓)
- [ ] Context injection (previous commands)
- [ ] Mode presets export/import
- [ ] Analytics (usage, cost tracking)

### Phase 3
- [ ] Local LLM option (Llama 3.2)
- [ ] Multi-language support
- [ ] Voice feedback confirmation
- [ ] Clipboard history integration

---

## Contributing

### Guidelines
- Follow dense request methodology
- Test new modes (A/B protocol)
- Measure KPIs before/after
- Document magic keywords used

### Mode Contribution
1. Identify use case
2. Design request (2-4 keywords)
3. Test (10+ varied inputs)
4. Submit PR with:
   - Mode definition
   - Test results (KPIs)
   - Use case documentation

---

## License

MIT

---

## Credits

**Magic Keywords Methodology**: Inspired by academic request-design research + empirical testing.

**Dense requests**: Systematic semantic compression. Maximum efficiency.

---

**Version**: 1.0  
**Status**: Production-ready  
**Cost**: ~$0.0015/command  
**Latency**: 2-4s (Whisper + GPT-4o-mini)
