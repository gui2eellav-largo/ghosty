# Magic Keywords en Prompt Engineering

**Type** : Documentation Méthodologie  
**Domaine** : Prompt Engineering, Sémantique  
**Version** : 1.0  
**Date** : 2025-01-19

---

## Vue d'Ensemble

Les **magic keywords** sont des mots ou combinaisons de mots qui déclenchent des comportements spécifiques et reproductibles chez les LLMs, grâce à leur récurrence dans des contextes de haute qualité durant l'entraînement.

### Principe Fondamental

**Densité sémantique > Verbosité**

Un mot précis active des patterns neuronaux spécifiques. Le modèle a appris des associations entre certains mots et des types de réponses.

### Pourquoi ça marche

Ces mots apparaissent fréquemment dans :
- Papers académiques
- Documentation technique premium
- Analyses d'experts
- Contextes où la rigueur est exigée

Le LLM associe automatiquement ces mots à des **outputs de haute qualité**.

---

## Anatomie d'un Magic Keyword

### Structure

```
[Contexte sémantique] → [Magic Keyword] → [Pattern neuronal activé] → [Type de réponse]
```

### Exemple

```
Problème complexe → "Step by step" → Pattern raisonnement séquentiel → Réponse structurée
```

### Caractéristiques

1. **Haute fréquence** dans corpus de qualité
2. **Association forte** avec comportements spécifiques
3. **Indépendance contextuelle** (fonctionne dans divers domaines)
4. **Effet mesurable** sur la structure de la réponse

---

## Catégories de Magic Keywords

### 1. Actions Cognitives (Single Words)

**Extraction/Synthèse :**
- **Distill** - extraire l'essence, éliminer le superflu
- **Synthesize** - combiner intelligemment des éléments
- **Crystallize** - rendre ultra-clair, condensé
- **Extrapolate** - projeter au-delà des données
- **Reconcile** - résoudre contradictions

**Analyse/Clarification :**
- **Elucidate** - clarifier avec profondeur
- **Delineate** - tracer les contours précis
- **Articulate** - exprimer avec précision maximale
- **Dissect** - analyser en profondeur, décomposer
- **Deconstruct** - démonter méthodiquement

**Impact** :
```
"Explain this concept" → réponse générique
"Elucidate" → réponse structurée, précise, profonde
```

---

### 2. Qualificateurs de Sortie (Adjectives)

**Précision :**
- **Terse** - concis, dense, zéro fluff
- **Succinct** - bref et complet
- **Rigorous** - sans faille logique
- **Unambiguous** - zéro interprétation possible
- **Cogent** - argument serré, convaincant

**Profondeur :**
- **Nuanced** - avec subtilité, pas de simplification
- **Granular** - niveau de détail fin
- **Comprehensive** - exhaustif, complet
- **Exhaustive** - absolument tout
- **Methodical** - systématique, ordonné

**Action :**
- **Actionable** - directement applicable
- **Pragmatic** - concret, réaliste
- **Tactical** - opérationnel immédiat
- **Strategic** - vision long terme

**Impact** :
```
"Be clear" → amélioration mineure
"Terse" → densité maximale
"Terse + Actionable" → densité + applicabilité
```

---

### 3. Déclencheurs de Raisonnement (Triggers)

**Profondeur cognitive :**
- **"Step by step"** - active raisonnement séquentiel
- **"Think carefully"** - augmente profondeur analyse
- **"Let's think about this"** - raisonnement explicite
- **"Walk me through"** - explication détaillée progressive

**Structure :**
- **"First"**, **"Then"**, **"Finally"** - séquençage temporel
- **"Systematically"** - approche méthodique
- **"In order"** - progression logique

**Critique :**
- **"Critically"** - évaluation rigoureuse
- **"Objectively"** - sans biais
- **"Ruthlessly"** - sans compromis

**Impact** :
```
"Solve this" → solution directe
"Step by step" → raisonnement visible + solution
"Dissect methodically" → décomposition + analyse + solution
```

---

### 4. Combinaisons Puissantes (2-3 mots)

**Analyse ultra-dense :**
- **"Distill ruthlessly"** - extraction maximale, zéro fluff
- **"Synthesize concisely"** - fusion + brièveté
- **"Elucidate tersely"** - clarté + densité maximale
- **"Articulate precisely"** - expression exacte
- **"Dissect methodically"** - analyse systématique profonde

**Output qualifié :**
- **"Actionable insights"** - pas de théorie, du concret
- **"Rigorous brevity"** - précision + concision
- **"Structured decomposition"** - décomposition méthodique
- **"Nuanced analysis"** - analyse subtile, pas simpliste
- **"Critical assessment"** - évaluation sans complaisance

**Raisonnement avancé :**
- **"First principles thinking"** - reconstruire depuis la base
- **"Root cause analysis"** - remonter à l'origine vraie
- **"Differential diagnosis"** - élimination systématique
- **"Comparative analysis"** - contraste structuré

**Impact** :
```
"Analyze this problem and tell me what's wrong"
→ Réponse générique, potentiellement longue

"Dissect methodically. Root cause. Actionable only."
→ 3 mots = méthodologie complète + contrainte output
```

---

## Méthodologies de Travail (Magic Keywords)

### Approches Analytiques (Single Words)

**Modes de pensée :**
- **Socratic** - questionnement itératif
- **Heuristic** - règles empiriques rapides
- **Axiomatic** - partir des principes premiers
- **Empirical** - basé sur observation/données
- **Dialectic** - thèse/antithèse/synthèse
- **Inductive** - du particulier au général
- **Deductive** - du général au particulier
- **Abductive** - meilleure explication probable

**Types d'analyse :**
- **Autopsy** - analyse post-mortem détaillée
- **Forensic** - investigation systématique
- **Comparative** - contraste structuré
- **Differential** - élimination progressive
- **Longitudinal** - évolution temporelle
- **Cross-sectional** - vue transversale instant T

---

### Frameworks de Réflexion (2-3 mots)

**Déconstruction :**
- **"MECE breakdown"** - Mutually Exclusive, Collectively Exhaustive
- **"First principles"** - reconstruire depuis zéro
- **"Reverse engineering"** - déconstruire pour comprendre
- **"Working backwards"** - partir de la fin désirée

**Évaluation :**
- **"Five Whys"** - creuser la causalité profonde
- **"Pareto analysis"** - règle 80/20, prioriser
- **"Trade-off mapping"** - cartographier compromis
- **"Cost-benefit"** - peser gains/pertes
- **"Risk assessment"** - évaluer les dangers

**Testing :**
- **"Red teaming"** - attaquer pour tester solidité
- **"Devil's advocate"** - opposition systématique
- **"Premortem analysis"** - imaginer l'échec futur
- **"Stress testing"** - pousser aux limites
- **"Edge cases"** - tester les extrêmes

**Exécution :**
- **"Critical path"** - chemin critique seulement
- **"Minimum viable"** - version minimale fonctionnelle
- **"Time-boxed"** - limite temporelle stricte
- **"Fail-fast"** - échouer vite pour apprendre
- **"Iterative refinement"** - amélioration par cycles

---

## Analyse Forensic : Comment Identifier les Magic Keywords

### Méthode d'Identification

#### 1. Pattern Recognition

**Signaux forts :**
- Mots récurrents dans papers académiques
- Vocabulaire technique spécialisé
- Termes présents dans méthodologies établies
- Mots associés à la rigueur intellectuelle

**Test empirique :**
```
Prompt A: "Explain this concept clearly"
Prompt B: "Elucidate tersely"

Comparer :
- Longueur réponse
- Structure
- Profondeur
- Densité informationnelle
```

---

#### 2. Analyse Sémantique

**Questions clés :**
1. Ce mot apparaît-il dans des contextes de haute qualité ?
2. A-t-il une charge sémantique forte ?
3. Est-il spécifique ou générique ?
4. Déclenche-t-il un comportement mesurable ?

**Exemple d'analyse :**

| Mot | Spécificité | Contexte d'origine | Effet mesuré | Score |
|-----|-------------|-------------------|--------------|-------|
| "Explain" | Faible | Universel | Minimal | 2/10 |
| "Clarify" | Moyenne | Pédagogique | Faible | 4/10 |
| "Elucidate" | Forte | Académique | Fort | 9/10 |
| "Distill" | Forte | Analytique | Très fort | 10/10 |

---

#### 3. Test A/B Systématique

**Protocole :**

```markdown
Contexte identique, varier uniquement le keyword

Test 1:
"Analyze this code and find issues"

Test 2:
"Dissect forensically. Pinpoint vulnerabilities."

Mesurer :
- Taux de détection des bugs
- Profondeur de l'analyse
- Clarté des recommandations
- Temps de génération (parfois plus long = plus de "réflexion")
```

---

#### 4. Gradient de Spécificité

**Échelle d'efficacité :**

```
Générique → Spécifique → Expert → Magic

"Look at" → "Analyze" → "Dissect" → "Forensic analysis"
   1x    →    2x     →    5x    →      10x
```

Plus le mot est spécifique à un domaine d'excellence, plus l'effet est fort.

---

#### 5. Détection par Domaine

**Sciences/Académique :**
- Rigorous, empirical, systematic, methodical
- Hypothesis, axiom, postulate, theorem

**Technique/Engineering :**
- Optimize, refactor, decompose, modular
- Scalable, robust, resilient, fault-tolerant

**Analytique/Consulting :**
- MECE, Pareto, trade-off, leverage
- Strategic, tactical, operational

**Créatif/Innovation :**
- Ideate, iterate, prototype, pivot
- Disruptive, novel, paradigm shift

---

## Patterns d'Utilisation Avancés

### 1. Stacking (Empilement)

Combiner plusieurs magic keywords pour effet cumulatif.

**Formule :**
```
[Méthodologie] + [Action cognitive] + [Qualificateur output]
```

**Exemples :**
```
"First principles. Distill. Actionable only."
"MECE breakdown. Synthesize. Rigorous brevity."
"Forensic analysis. Dissect. Unambiguous recommendations."
```

**Résultat :** Chaque mot active un pattern, l'ensemble crée un mode de réponse ultra-spécifique.

---

### 2. Negative Constraints

Utiliser des magic keywords pour spécifier ce qu'on ne veut PAS.

**Exemples :**
```
"No generalities. No platitudes. No filler."
"Exclude: theory, context, background."
"Avoid: verbose explanations, redundancy, obvious statements."
```

---

### 3. Output Format Specification

Combiner magic keywords avec format structurel.

**Template :**
```
[Magic Keywords] + [Structure exigée]

"Distill ruthlessly. Format:
- Core issue: [1 sentence]
- Root cause: [1 sentence]  
- Action: [bullet points, max 3]"
```

---

### 4. Conditional Activation

Magic keywords contextuels qui changent selon la situation.

**Exemple :**
```
"If complex → decompose systematically
If ambiguous → elucidate tersely
If multiple options → comparative analysis"
```

---

### 5. Cascading Specificity

Augmenter progressivement la spécificité.

**Progression :**
```
Level 1: "Analyze"
Level 2: "Analyze methodically"
Level 3: "Forensic analysis. MECE breakdown."
Level 4: "Forensic analysis. MECE. Root cause. Actionable. Terse."
```

---

## Anti-Patterns (À Éviter)

### 1. Dilution Sémantique

**Mauvais :**
```
"Please kindly analyze this carefully and thoroughly with great detail"
```
- Mots faibles (please, kindly)
- Redondance (carefully + thoroughly)
- Pas de spécificité

**Bon :**
```
"Dissect methodically. Granular."
```

---

### 2. Mélange Incompatible

**Mauvais :**
```
"Quick overview but be exhaustive and rigorous"
```
- Contradictions sémantiques
- Confusion du modèle

**Bon :**
```
"High-level synthesis. Rigorous."
ou
"Exhaustive analysis. Systematic."
```

---

### 3. Surcharge

**Mauvais :**
```
"Analyze dissect elucidate crystallize synthesize distill articulate..."
```
- Trop de keywords annulent l'effet
- Confusion des priorités

**Bon :**
```
"Dissect. Synthesize. Actionable."
(Maximum 3-4 keywords puissants)
```

---

### 4. Contexte Manquant

**Mauvais :**
```
"Distill"
[sans préciser quoi distiller]
```

**Bon :**
```
"Distill this 50-page report into 3 key insights"
```

---

## Bibliothèque de Combinaisons Éprouvées

### Pour Analyse Profonde

```
"Forensic analysis. Root cause. MECE."
"Dissect systematically. First principles."
"Differential diagnosis. Eliminate ruthlessly."
```

### Pour Synthèse

```
"Distill ruthlessly. Actionable only."
"Crystallize into 3 points. Terse."
"Synthesize concisely. Strategic implications only."
```

### Pour Résolution de Problèmes

```
"Five Whys. Root cause. Actionable."
"First principles. Working backwards. Pragmatic."
"Red team approach. Edge cases. Fail-fast scenarios."
```

### Pour Évaluation

```
"Trade-off mapping. Nuanced assessment."
"Cost-benefit. Quantify. Rigorous."
"Comparative analysis. MECE. Recommend decisively."
```

### Pour Clarification

```
"Elucidate tersely. Unambiguous."
"Delineate precisely. No ambiguity."
"Articulate. Structure: Problem → Solution → Impact."
```

### Pour Documentation

```
"Comprehensive overview. Hierarchical structure."
"Systematic inventory. Granular taxonomy."
"Exhaustive catalog. Cross-referenced."
```

---

## Mesure d'Efficacité

### KPIs pour Magic Keywords

1. **Densité informationnelle**
   - Info utile / Tokens totaux
   - Target : > 0.8

2. **Pertinence**
   - Éléments actionnables / Total éléments
   - Target : > 0.9

3. **Structure**
   - Réponse structurée : Oui/Non
   - Hiérarchie claire : Oui/Non

4. **Profondeur**
   - Niveaux d'analyse : compter
   - Chaînes causales : compter

5. **Reproductibilité**
   - Même prompt → Similarité réponses
   - Target : > 0.85

---

## Guide de Sélection Rapide

### Par Type de Tâche

| Tâche | Magic Keywords Recommandés |
|-------|---------------------------|
| Analyser un bug | "Forensic analysis. Root cause. Systematic." |
| Résumer un document | "Distill ruthlessly. Key insights only." |
| Évaluer des options | "Trade-off mapping. MECE. Recommend." |
| Clarifier un concept | "Elucidate tersely. First principles." |
| Trouver une solution | "Five Whys. Working backwards. Actionable." |
| Optimiser du code | "Dissect. Optimize. Justify changes." |
| Créer une stratégie | "Strategic synthesis. Pareto priorities." |
| Valider une approche | "Red team. Edge cases. Risk assessment." |

---

## Évolution et Découverte

### Comment trouver de nouveaux Magic Keywords

1. **Observer les experts** dans votre domaine
   - Quels mots utilisent-ils fréquemment ?
   - Quel vocabulaire signale la rigueur ?

2. **Consulter la littérature académique**
   - Papers de référence
   - Méthodologies établies
   - Terminologie technique

3. **Tester empiriquement**
   - A/B testing systématique
   - Mesurer l'impact
   - Documenter les résultats

4. **Analyser les langues spécialisées**
   - Jargon professionnel
   - Vocabulaire technique
   - Termes de méthodologies

---

## Références et Ressources

### Concepts Liés

- **Chain of Thought (CoT)** : Les magic keywords amplifient l'effet CoT
- **Few-Shot Learning** : Combiner avec exemples pour effet maximum
- **Prompt Engineering Patterns** : Magic keywords sont des patterns atomiques

### Lectures Recommandées

- Papers sur prompting efficace
- Documentation méthodologies (MECE, First Principles, etc.)
- Littérature académique dans votre domaine

### Outils

- A/B testing de prompts
- Mesure de perplexité/confiance
- Analyse de similarité sémantique

---

## Annexe : Liste Exhaustive par Catégorie

### Actions Cognitives (50+ mots)

**Extraction :**
Distill, Extract, Isolate, Identify, Pinpoint, Filter, Sift, Parse

**Synthèse :**
Synthesize, Integrate, Consolidate, Merge, Unify, Crystallize, Coalesce

**Analyse :**
Dissect, Deconstruct, Decompose, Analyze, Examine, Inspect, Scrutinize, Probe

**Clarification :**
Elucidate, Clarify, Articulate, Delineate, Define, Specify, Precise

**Évaluation :**
Assess, Evaluate, Judge, Weigh, Measure, Quantify, Appraise

**Raisonnement :**
Deduce, Infer, Conclude, Derive, Extrapolate, Interpolate, Reason

**Transformation :**
Refactor, Optimize, Streamline, Simplify, Enhance, Improve

---

### Qualificateurs (100+ adjectifs)

**Concision :**
Terse, Succinct, Concise, Brief, Compact, Condensed, Laconic

**Rigueur :**
Rigorous, Precise, Exact, Accurate, Meticulous, Thorough, Exhaustive

**Clarté :**
Clear, Unambiguous, Explicit, Transparent, Lucid, Crystalline

**Profondeur :**
Deep, Profound, Nuanced, Granular, Detailed, Comprehensive, In-depth

**Action :**
Actionable, Practical, Pragmatic, Tactical, Operational, Implementable

**Structure :**
Systematic, Methodical, Structured, Organized, Hierarchical, Ordered

**Qualité :**
Robust, Solid, Sound, Valid, Reliable, Credible, Authoritative

---

### Méthodologies (50+ frameworks)

**Analyse :**
MECE, First Principles, Root Cause, Five Whys, Pareto, SWOT

**Testing :**
Red Team, Stress Test, Edge Cases, Premortem, Devil's Advocate

**Stratégie :**
Scenario Planning, Trade-off Analysis, Cost-Benefit, Risk Assessment

**Exécution :**
MVP, Time-boxed, Critical Path, Fail-fast, Iterative, Agile

**Raisonnement :**
Socratic, Deductive, Inductive, Abductive, Dialectic, Heuristic

---

## Version History

**v1.0** (2025-01-19)
- Documentation initiale complète
- Catégorisation systématique
- Méthode d'identification forensic
- Bibliothèque de combinaisons
- Guide de sélection par tâche
