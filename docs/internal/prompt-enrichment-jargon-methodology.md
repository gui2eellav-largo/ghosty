# Méthodologie d'enrichissement de requête (jargon + contexte)

Référence pour améliorer une requête en conservant sa longueur (±10%), avec analyse contextuelle et utilisation du jargon professionnel.

---

## Requête à utiliser (meta-instruction)

**Requête à améliorer :** [coller ici]

### Processus

1. **Analyse contextuelle**
  Analyser les échanges précédents (contexte, patterns). Identifier l'intention primaire sans la modifier. Détecter les contraintes implicites. Évaluer la complexité (simple vs multi-étapes) pour choisir les leviers.
2. **Compréhension sémantique**
  Identifier l'intention cognitive (itérative, analytique, comparative, créative). Déterminer le domainpasse (UX, dev, marketing, architecture) uniquement si le jargon sert la tâche. Repérer les ambiguïtés à clarifier par des critères concrets (nombre de mots, format exact), pas par des formules vagues ("sois précis", "réfléchis bien").
3. **Enrichissement — leviers efficaces uniquement**
  Prioriser dans l'ordre : (a) **format de sortie explicite** (structure attendue : liste, JSON, paragraphe, nombre d'items) ; (b) **contraintes négatives** ("ne pas…") pour éviter des erreurs récurrentes ; (c) **critères de succès ou priorité** (ex. "priorité concision" vs "exhaustivité") ; (d) **1–3 exemples few-shot** si la tâche bénéficie d'exemples input→output ; (e) **step-by-step / raisonnement explicite** seulement pour tâches complexes (raisonnement, calcul, décisions multi-critères) ; (f) **rôle en une phrase** si utile pour le ton (pas de long blurb "expert 0,001 %"). Intégrer les éléments pertinents des échanges précédents. Pas de répétition de la même consigne en plusieurs formulations.
4. **Jargon**
  Utiliser le vocabulaire technique du domaine **uniquement quand il désigne des concepts que le modèle doit respecter** (ex. type safety, idempotent, WCAG AA). Pas de jargon décoratif. Un terme précis remplace une phrase explicative ; si le terme n'ajoute pas de contrainte ou de critère, ne pas l'ajouter.

### Contraintes

- **Longueur :** ±10 % de l'original.
- **Format :** Sortie = uniquement la requête améliorée, compacte et directe.
- **Intention :** Préservée à 100 %, aucune altération du résultat attendu.

### Règles

- Maximum 1–3 enrichissements (format, contraintes négatives, exemples, critères de succès, step-by-step si complexe).
- Jargon seulement s'il sert la tâche (concept à respecter), pas pour "faire pro".
- Référence aux échanges précédents par reprise de contraintes ou termes déjà utilisés.
- Clarifier les ambiguïtés par des critères concrets (chiffres, format), pas par des injonctions vagues.
- À éviter : long blurb expert, répétition de la consigne, "sois précis" sans chiffre/format, "pense étape par étape" sans structure de sortie.

---

## Principes clés


| Leviers efficaces                                      | À éviter (vanity)                                       |
| ------------------------------------------------------ | ------------------------------------------------------- |
| Format de sortie explicite (structure, nombre d'items) | "Sois précis" / "Sois concis" sans chiffre ou format    |
| Few-shot (1–3 exemples input→output)                   | Long blurb "expert 0,001 %"                             |
| Contraintes négatives ("ne pas…")                      | Répéter la consigne en 3 formulations                   |
| Step-by-step / CoT pour tâches complexes               | "Pense bien" / "Réfléchis" sans structure               |
| Rôle en une phrase si utile au ton                     | Jargon décoratif (terme qui n'ajoute pas de contrainte) |
| Critères de succès ou priorité explicites              | "Pense étape par étape" sans format de sortie           |


**Enrichissements** = format, contraintes négatives, exemples, critères de succès, step-by-step si complexe. **Jargon** = seulement si le terme désigne un concept que le modèle doit respecter. **Sortie** = toujours la requête améliorée seule, sans préambule.

---

## Relation avec les modes Ghosty (levels Cursor)

Nomenclature app : **Hands-off** (1), **Light edit** (2), **Shape** (3), **Reframe** (4), **Build** (5).

- **Hands-off** : syntaxe + 0–2 keywords, pas d'enrichissement lourd.
- **Light edit** : 1–2 enrichissements + domain nomenclature, longueur ±10 %.
- **Shape, Reframe, Build** : même processus en plus d'enrichissements et de structuration ; cette doc sert de base sémantique et de référence pour le jargon et les contraintes.

