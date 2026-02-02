# Ghosty

Voice-to-text + AI prompt optimization. Dense prompting methodology. Meta-tool for AI interactions.

## Core Concept

**Problem**: Vague voice input → poor AI prompts → suboptimal results.

**Solution**: Voice → Whisper → GPT-4o-mini prompt enhancement → Optimized prompt → ChatGPT/Claude → Quality output.

**Ghosty is a prompt optimizer**, not a content generator.

### Flow

```
User speaks vaguely
    ↓
Whisper transcription
    ↓
GPT-4o-mini enhances → Optimized prompt
    ↓
Clipboard (auto-copy)
    ↓
User pastes to ChatGPT/Claude
    ↓
AI generates final content
```

**Innovation**: Magic keywords. Dense prompting. Maximum semantic efficiency.

---

## Features

### Voice Input
- Global hotkey: `Ctrl+Shift+Space`
- Hold to record → Release to process
- Whisper API transcription (16kHz, accurate)

### AI Transformation
- GPT-4o-mini prompt enhancement (NOT content generation)
- Mode-based optimization
- Magic keywords methodology
- Auto-copy to clipboard
- Cost: ~$0.0015/command

### Mode System
- **9 built-in modes** (prompt enhancement focus)
- Custom modes (user-defined)
- Glass menu (quick selection during recording)
- Categories: General Enhancement, Email, Analysis, Documentation, Decision, Ideation, Code, Review

### Built-in Modes

1. **Pure Transcription** - Zero transformation (raw Whisper output)
2. **Prompt Enhancer (Adaptive)** - `First principles. Elucidate intent. Adaptive length.`
3. **Email Generation Prompt** - `Crystallize intent. Specify tone/structure.`
4. **Analysis Prompt** - `Specify methodology (Five Whys/MECE/Forensic).`
5. **Documentation Prompt** - `Distill elements. MECE. Specify format.`
6. **Decision Framework Prompt** - `Trade-off mapping. MECE options.`
7. **Ideation Prompt** - `MECE breakdown. Different angles.`
8. **Code Task Prompt** - `Specify: language, constraints, edge cases, tests.`
9. **Review Prompt** - `Specify review type. Criteria explicit.`

**All modes output**: Optimized prompt ready for ChatGPT/Claude (NOT final content).

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
- OpenAI GPT-4o-mini (prompt optimization)

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

---

## Usage

### Basic Flow
1. Press `Ctrl+Shift+Space` → Glass menu appears
2. Select mode (arrows + Enter) or keep current
3. Speak your vague idea
4. Release → Whisper transcription → GPT-4o-mini prompt optimization → **Optimized prompt** in clipboard
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
- Reference `docs/GHOSTY-MODES-METHODOLOGY.md`
- Test with varied inputs

---

## Documentation

### Core Docs
- **[GHOSTY-MODES-METHODOLOGY.md](docs/GHOSTY-MODES-METHODOLOGY.md)** - Mode design, magic keywords, examples
- **[prompting-dense-library.md](docs/prompting-dense-library.md)** - Systematic dense prompting reference
- **[magic-keywords-prompt-engineering.md](docs/magic-keywords-prompt-engineering.md)** - Magic keywords theory & library

### Architecture
```
Voice Input
    ↓
Whisper API (transcription)
    ↓
GPT-4o-mini (transformation via mode prompt)
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
6. Document in `GHOSTY-MODES-METHODOLOGY.md`

---

## Roadmap

### Phase 1 (Current)
- ✅ Whisper transcription
- ✅ GPT-4o-mini transformation
- ✅ Mode system (9 built-in)
- ✅ Glass menu UI
- ✅ Dense prompting methodology

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
- Follow dense prompting methodology
- Test new modes (A/B protocol)
- Measure KPIs before/after
- Document magic keywords used

### Mode Contribution
1. Identify use case
2. Design prompt (2-4 keywords)
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

**Magic Keywords Methodology**: Inspired by academic prompting research + empirical testing.

**Dense Prompting**: Systematic semantic compression. Maximum efficiency.

---

**Version**: 1.0  
**Status**: Production-ready  
**Cost**: ~$0.0015/command  
**Latency**: 2-4s (Whisper + GPT-4o-mini)
