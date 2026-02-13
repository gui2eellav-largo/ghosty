# Changelog

## [0.3.0] - 2026-02-02

### Added

**Phase 1 - API Key Critiques**
- Test connexion API avant enregistrement (TASK-001)
- Validation frontend temps reel (TASK-002)
- Cache RwLock pour cles API (TASK-003, x100 perf)

**Phase 3 - Multi-Keys**
- Systeme multi-cles avec selection active (TASK-008)
- Validation adaptative: OpenAI, Anthropic, Custom
- Bouton Modifier / Ajouter une cle
- Liste des cles avec indicateur actif
- Radio buttons pour changer la cle active

**Validation par provider**
- OpenAI: sk- ou sk-proj-, min 40 char
- Anthropic: sk-ant-, min 40 char
- Custom: min 10 char, format libre

### Changed
- Texte generique (plus "OpenAI" partout)
- Bouton Modifier en bleu (au lieu d'orange)
- Apercu cle active avec badge Keychain macOS

### Fixed
- Compatibilite multi-providers
- Validation frontend selon provider selectionne

---

## Prochaines etapes (Roadmap)

### Phase 2 - UX (6h)
- TASK-005: Gestion erreurs structuree
- TASK-006: Logging et audit

### Phase 3 - Features (6h)
- TASK-007: Usage tracking (compteur requetes, couts)

### Polish
- Tests manuels complets
- Documentation utilisateur finale
- Migration legacy cle unique -> multi-keys
