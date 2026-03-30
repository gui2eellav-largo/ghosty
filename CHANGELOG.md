# Changelog

## [0.3.0] - 2026-02-02

### Added

**Phase 1 - API Key Critiques**
- Test API connection before recording (TASK-001)
- Real-time frontend validation (TASK-002)
- RwLock cache for API keys (TASK-003, x100 perf)

**Phase 3 - Multi-Keys**
- Multi-key system with active selection (TASK-008)
- Adaptive validation: OpenAI, Anthropic, Custom
- Edit / Add key button
- Key list with active indicator
- Radio buttons to change active key

**Validation per provider**
- OpenAI: sk- or sk-proj-, min 40 char
- Anthropic: sk-ant-, min 40 char
- Custom: min 10 char, free format

### Changed
- Generic wording (no longer "OpenAI" everywhere)
- Edit button in blue (instead of orange)
- Active key preview with Keychain macOS badge

### Fixed
- Multi-provider compatibility
- Frontend validation based on selected provider

---

## Next steps (Roadmap)

### Phase 2 - UX (6h)
- TASK-005: Structured error handling
- TASK-006: Logging and audit

### Phase 3 - Features (6h)
- TASK-007: Usage tracking (request count, costs)

### Polish
- Full manual testing
- Final user documentation
- Legacy single-key to multi-keys migration
