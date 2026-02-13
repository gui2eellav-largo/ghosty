# Magic keywords en prompting : définition et démonstration

## Définition précise

Un **magic keyword** est une expression courte (mot ou 2–3 mots) qui, insérée dans un prompt, active un **pattern de réponse** déjà appris par le LLM pendant l’entraînement.

### Conditions pour qu’un terme soit un magic keyword

1. **Fréquence** : il apparaît souvent dans des corpus où une certaine forme de réponse est attendue (rigueur, séquence, concision, etc.).
2. **Association** : le modèle a appris l’association « ce terme → ce type de réponse ».
3. **Spécificité** : il active un pattern précis, pas une réponse générique.
4. **Contrainte** : il impose une contrainte sur la sortie (structure, profondeur, format), pas du vocabulaire décoratif.

En résumé : **comportement de réponse visé → genre de discours où ce comportement est la norme → expressions qui, dans ce genre, signalent ce comportement → choix du signal le plus spécifique et contraignant.**

### Angle sémantique (ce qu’ils sont)

Les magic keywords sont d’abord des **mots parfaitement adaptés** pour décrire une méthodologie, un concept ou une situation. Ce sont souvent les termes très précis employés par le **top 0,1 % des experts** d’un domaine : sémantique pure, pas du remplissage. Un seul mot bien choisi (ex. *MECE*, *premortem*, *document triage*) remplace une phrase explicative et ancre la demande dans un cadre que le modèle reconnaît. L’effet « activation de pattern » vient justement du fait que ce vocabulaire expert apparaît dans des contextes de haute qualité pendant l’entraînement : précision sémantique et contrainte sur la réponse sont deux faces du même phénomène.

### Typologie (d’après le projet)

| Type | Rôle | Exemples |
|------|------|----------|
| **Style / raisonnement** | Comment répondre (forme) | Terse, Step by step, Devil's advocate |
| **Méthode / framework** | Comment traiter (procédure) | MECE, Five Whys, Root cause analysis, Premortem |
| **Concept précis** | Quoi appliquer (domaine) | Single source of truth, document triage, retention policy |

---

## Démonstration : même demande, avec et sans magic keywords

### Contexte

Demande utilisateur (voix ou texte) : *« Explique-moi pourquoi notre API renvoie parfois 500 et comment on pourrait corriger. »*

---

### Version A : sans magic keywords (prompt brut)

```
Explique-moi pourquoi notre API renvoie parfois 500 et comment on pourrait corriger.
```

**Réponse typique du LLM** : explication générale, liste de causes possibles sans priorisation, recommandations vagues (« vérifier les logs », « ajouter du monitoring »), peu structurée.

---

### Version B : avec magic keywords (enrichi)

Même intention, mais on ajoute des termes qui contraignent la forme et la profondeur :

```
Root cause analysis : pourquoi notre API renvoie parfois 500. Step by step, isoler causes probables puis prioriser. Trade-offs pour chaque correctif. Recommandations actionable only.
```

**Effet attendu** :
- **Root cause analysis** → raisonnement causal structuré, pas juste une liste.
- **Step by step** → séquence claire (observation → hypothèses → vérification → conclusion).
- **Trade-offs** → pour chaque correctif, avantages/inconvénients explicites.
- **Actionable only** → pas de théorie, uniquement ce qu’on peut faire concrètement.

La réponse tend vers : diagnostic méthodique, causes ordonnées, options avec trade-offs, et recommandations implémentables.

---

### Version C : stacking (méthodologie + action + qualifier)

Pattern recommandé dans Ghosty : `[Méthodologie] + [Action cognitive] + [Qualifier de sortie]`.

```
Forensic analysis. MECE breakdown des causes possibles (côté serveur, réseau, données, dépendances). Distill en 3–5 causes probables. Actionable only.
```

- **Forensic analysis** → investigation rigoureuse, pas superficielle.
- **MECE breakdown** → catégories mutuellement exclusives et exhaustives.
- **Distill** → extraire l’essentiel, pas de flou.
- **Actionable only** → livrable directement utilisable.

---

## Synthèse

| Sans magic keywords | Avec magic keywords |
|---------------------|---------------------|
| « Explique en détail » | « Forensic analysis. Step by step. » |
| Réponse générique, longue | Réponse cadrée (structure, profondeur, format) |
| Beaucoup de tokens pour peu de contrainte | Peu de tokens pour une contrainte forte |

**En une phrase** : un magic keyword est un **signal court**, ancré dans un genre de discours de qualité, qui **contraint** la sortie du modèle sans avoir à détailler la consigne en phrases longues.
