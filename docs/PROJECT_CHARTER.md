# Charter projet — Voice-to-text (type Whispr Flow)

**Statut :** Cadrage (étape 0) — pas de code  
**Cible :** macOS

---

## 1. Vision

SaaS voice-to-text avec **enregistrement au maintien d’une touche globale** et **injection de contexte (pre-prompt)** pour orienter la sortie. Le texte est soit inséré dans le champ focal, soit copié au presse-papier et conservé dans l’app.

---

## 2. Périmètre fonctionnel

### 2.1 Trigger d’enregistrement

| Élément | Spécification |
|--------|----------------|
| **Touche** | Touche **Fn** (ou alternative configurable) |
| **Comportement** | Enregistrement **tant que la touche est maintenue** ; arrêt au relâchement |
| **Portée** | **Global hotkey** : actif dans tout contexte (n’importe quelle app, plein écran, etc.) |
| **Feedback** | Indication visuelle/audio que l’enregistrement est actif (à définir en UX) |

### 2.2 Différenciation : pre-prompt (context injection)

| Élément | Spécification |
|--------|----------------|
| **Rôle** | Façonner la sortie texte (ton, format, style) sans que l’utilisateur dicte ces instructions à chaque fois |
| **Référence** | Équivalent fonctionnel de la **commande /a** pendant la dictée : le pre-prompt est appliqué **automatiquement** au flux voix → texte |
| **Exemples** | « Réponds en style professionnel », « Résume en 3 bullet points », « Texte en markdown » |
| **Livrable** | Mécanisme configurable (pre-prompt par défaut + éventuellement profils/raccourcis) |

### 2.3 Destination du texte

| Situation | Comportement |
|-----------|--------------|
| **Un champ de texte a le focus** | **Insertion directe** dans ce champ (comme si le texte y était tapé) |
| **Aucun champ texte focal** | Texte copié dans le **presse-papier** (prêt pour Cmd+V) **et** conservé dans l’app (**historique / buffer**) |

Contraintes techniques à valider : détection du « champ de texte focal » (accessibilité macOS, API d’injection de texte), gestion des apps sans champ éditable.

---

## 3. Contraintes

### 3.1 Techniques

- **OS** : macOS uniquement (première version).
- **Global hotkey** : nécessite droits **Accessibilité** (Accessibility) et éventuellement **Input Monitoring** pour touche globale.
- **Enregistrement audio** : micro ; respect des permissions et de la vie privée (données voix).
- **Transcription** : dépendance à un service speech-to-text (à choisir : Whisper API, fournisseur cloud, ou modèle local).

### 3.2 Produit / Légal

- Pas d’enregistrement ou de stockage voix au-delà du strict nécessaire pour la transcription, sauf si explicité (option « historique voix »).
- Politique de confidentialité et conditions d’usage à prévoir si SaaS.

### 3.3 Périmètre exclu (v0)

- Pas de support Windows/Linux dans la première version.
- Pas de multi-utilisateurs / orgs dans le cadrage actuel (on peut rester single-user au début).
- Pas de fonctionnalités au-delà de : global hotkey, pre-prompt, insertion champ / clipboard + historique.

---

## 4. Livrables cibles (cadrage)

Livrables **fonctionnels** à viser (sans détail d’implémentation) :

1. **Application desktop macOS**
   - Enregistrement voix déclenché par touche globale (Fn maintenue).
   - Indication claire « enregistrement en cours » et « arrêt ».

2. **Pre-prompt**
   - Configuration d’un (ou plusieurs) pre-prompt(s) appliqué(s) automatiquement à chaque dictée (logique /a).

3. **Routage du texte**
   - Si champ texte focal détecté → insertion directe.
   - Sinon → copie dans le presse-papier + enregistrement dans l’historique/buffer de l’app.

4. **Historique / buffer**
   - Consultation et réutilisation des derniers textes générés (copie, ré-insertion).

5. **Réglages**
   - Touche globale (Fn ou autre).
   - Choix du pre-prompt / profil.
   - Paramètres liés au service de transcription (clé API, etc.) si applicable.

---

## 5. Risques et points à trancher

| Risque / point | Mitigation / décision |
|----------------|------------------------|
| Fn utilisée par le système (mission control, etc.) | Décider touche par défaut (Fn vs autre) et documenter conflits possibles ; proposer alternative configurable. |
| Détection du « champ de texte focal » sur macOS | Étudier Accessibility API / AXFocusedUIElement ; fallback propre si non fiable (toujours clipboard + historique). |
| Coût / latence du cloud STT | Choisir fournisseur et modèle (Whisper, etc.) ; option « modèle local » si objectif latence/offline. |
| Bande passante / offline | Définir si v0 exige une connexion ou si on vise un mode offline (local). |

---

## 6. Stack technique

**Contrainte distribution :** app **téléchargeable en ligne** comme Whispr Flow — l’utilisateur télécharge un installeur (.dmg / .pkg) depuis un site, installe l’app sur son Mac, pas une webapp dans le navigateur.

### Options comparées

| Critère | Swift (native) | Tauri | Electron |
|--------|----------------|-------|----------|
| **Livrable** | .app notarisé, .dmg | .app, .dmg | .app, .dmg |
| **Téléchargeable depuis un site** | Oui | Oui | Oui |
| **Global hotkey (touche maintenue)** | Natif (CGEvent, NSEvent) | Via plugin Rust / bindings macOS | Via `globalShortcut` (maintenue = moins standard) |
| **Accessibilité (champ focal, injection texte)** | Natif (AX API) | Bindings Rust → AX API ou node | Possible via native module / Electron API |
| **Micro** | AVFoundation | Rust crate + permis | Web API ou native |
| **Poids / RAM** | Faible | Faible | Lourd (~Chromium) |
| **Stack** | Swift/SwiftUI | Rust + HTML/JS/TS | Node + HTML/JS/TS |
| **Multi-plateforme plus tard** | Non (Mac only) | Oui (Win/Linux) | Oui |

### Recommandation

- **Si tu veux rester en TypeScript/JS et pouvoir viser Windows plus tard :** **Tauri** — app légère, .dmg propre, UI en HTML/TS ; le « maintenu » (hold) pour la touche et l’Accessibility peuvent demander du Rust ou des bindings macOS, mais c’est faisable.
- **Si tu privilégies la simplicité macOS et que Mac-only suffit longtemps :** **Swift** — tout est natif (hotkey maintenue, AX, micro), pas de couche web, distribution .dmg standard.
- **Electron** : possible et très « web » (TS partout), mais plus lourd et le hotkey « maintenu » est moins idiomatique ; à considérer si tu as déjà une équipe/stack Electron.

**Décision retenue (à confirmer) :** **Tauri** pour garder une UI en TypeScript, une distribution « téléchargeable en ligne » (.dmg) et une base propre pour un éventuel portage ultérieur, en acceptant un peu de Rust pour hotkey + accessibilité. Alternative : **Swift** si tu préfères tout-natif Mac sans Rust.

---

## 7. Prochaines étapes (après cadrage)

1. ~~Valider ce charter~~ Validé.
2. Confirmer stack (Tauri vs Swift).
3. POC : global hotkey + enregistrement + transcription minimale (sans pre-prompt ni routage).
4. Intégrer pre-prompt et routage (champ focal vs clipboard + historique).
5. UX : feedback, réglages, historique.
6. Mise en ligne : site + lien de téléchargement .dmg (et notarisation Apple si distribution hors App Store).

---

## 8. Références

- **Whispr Flow** : inspiration produit (voice-to-text, touche globale).
- **Commande /a** : référence pour la logique du pre-prompt (contexte injecté automatiquement pendant la dictée).

---

*Document de cadrage — pas d’engagement sur l’ordre d’implémentation ni sur les choix techniques finaux.*
