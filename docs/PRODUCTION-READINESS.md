# Guide : préparation à la production

Ce guide décrit tout ce qu’il faut faire pour que Ghosty soit prêt à être mis en ligne et utilisé en production, avec un focus sur la **sécurité** et les **bonnes pratiques** pour une première mise en production.

---

## 1. Sécurité

### 1.1 Clés API (OpenAI)

**Principe** : les clés API ne doivent **jamais** être en dur dans le code, ni envoyées à un serveur autre qu’OpenAI.

- **Stockage** : aujourd’hui les clés sont stockées côté backend (Rust) dans un stockage local sécurisé (ex. keyring / credential store selon l’OS). À vérifier dans le code :
  - Aucune clé en clair dans le repo (pas de `OPENAI_API_KEY="sk-..."` dans un fichier versionné).
  - Les clés saisies par l’utilisateur sont persistées via l’API Tauri (ex. `secrets`, `add_api_key_entry`) et jamais loguées.
- **En production** :
  - Chaque utilisateur utilise **sa propre** clé OpenAI (compte personnel ou entreprise). L’app ne fournit pas de clé partagée.
  - Rappeler à l’utilisateur de ne pas partager sa clé et de la révoquer en cas de fuite (OpenAI Dashboard).
- **Facturation** : les appels (Whisper, GPT-4o-mini) sont facturés au compte OpenAI associé à la clé. L’utilisateur doit avoir un compte OpenAI à jour.

**Checklist** :
- [ ] Aucune clé en dur dans le code ni dans `.env` versionné (`.env` dans `.gitignore`).
- [ ] Pas de `console.log` / `println!` qui affichent des clés ou tokens.
- [ ] Documentation utilisateur : où saisir la clé, comment la révoquer.

### 1.2 Données utilisateur

- **Données stockées localement** : préférences, modes personnalisés, dictionnaire, raccourcis. Elles restent sur la machine de l’utilisateur.
- **Données envoyées à l’extérieur** :
  - **OpenAI** : audio (Whisper) et texte (LLM). Vérifier la [politique de confidentialité OpenAI](https://openai.com/policies/privacy) et l’indiquer en une phrase dans la doc ou l’app (ex. « Les enregistrements et textes sont envoyés à OpenAI pour la transcription et la transformation »).
- **Aucun autre serveur** : pas d’analytics, pas de télémétrie, sauf si vous en ajoutez explicitement (et alors : consentement, politique de confidentialité).

**Checklist** :
- [ ] Lister clairement quelles données partent vers OpenAI.
- [ ] Si vous ajoutez analytics/crash reporting : consentement utilisateur + politique de confidentialité.

### 1.3 Permissions de l’app

Ghosty a besoin de :
- **Micro** : pour l’enregistrement vocal.
- **Raccourcis clavier globaux** : pour le hotkey (ex. Ctrl+Shift+Space) même quand l’app n’est pas au premier plan.
- **Presse-papier** : pour copier le résultat et éventuellement coller.

**En production** :
- Sur macOS, l’utilisateur devra autoriser micro et accessibilité (pour les raccourcis) dans Réglages Système. Prévoir une phrase dans la doc ou une première fenêtre qui explique « Ghosty a besoin du micro et des raccourcis clavier pour fonctionner ».
- Ne demander que ce qui est strictement nécessaire.

---

## 2. Build et distribution

### 2.1 Build de release

```bash
npm run build          # compile le frontend (TypeScript + Vite)
npm run tauri build    # produit le .app (macOS) et/ou binaires
```

Les artefacts sont dans `src-tauri/target/release/` (ou équivalent selon la cible).

### 2.2 Signature et notarisation (macOS)

Pour que les utilisateurs puissent ouvrir l’app sans « app non identifiée » :

1. **Signature de l’app** :
   - Dans `tauri.conf.json`, section `bundle.macOS` :
     - `signingIdentity` : mettre l’identité de votre certificat développeur Apple (ex. `"Developer ID Application: Votre Nom (TEAM_ID)"`).
   - Sans certificat Apple, l’app peut quand même être diffusée mais macOS affichera un avertissement (contournable en clic droit → Ouvrir).

2. **Notarisation** (recommandé pour distribution hors App Store) :
   - Permet d’éviter le blocage Gatekeeper.
   - Tauri peut intégrer la notarisation ; voir la [doc Tauri (macOS)](https://v2.tauri.app/start/build/sidecar/).
   - Prérequis : compte Apple Developer (payant), `notarytool` ou `altool`.

3. **Identifiant de bundle** :
   - Actuellement `com.ghosty.app`. Apple déconseille de terminer par `.app` (conflit avec l’extension du bundle). À terme, préférer par ex. `com.ghosty.desktop` ou `app.ghosty`.

**Checklist** :
- [ ] Build release qui se lance sans erreur.
- [ ] Décider : signature + notarisation (compte Apple) ou distribution « manuelle » avec instructions pour contourner l’avertissement.
- [ ] Changer l’identifiant de bundle si vous suivez la recommandation Apple.

### 2.3 Mises à jour automatiques (optionnel)

Tauri propose un plugin de mise à jour (updater) : l’app peut vérifier une URL (ou un serveur) pour télécharger une nouvelle version. Utile après le premier lancement pour livrer des correctifs sans redownload complet. À configurer plus tard si besoin.

---

## 3. Comptes et services externes

### 3.1 OpenAI

- **Compte** : chaque utilisateur doit avoir un compte OpenAI et une clé API.
- **Coûts** : Whisper + GPT-4o-mini = de l’ordre de ~0,0015 $ par commande. Les coûts sont à la charge du titulaire du compte (la clé).
- **Limites** : respecter les rate limits OpenAI ; en cas de dépassement, l’app peut afficher une erreur claire (déjà partiellement géré selon le code).
- **Bonnes pratiques** :
  - Ne jamais exposer sa clé (pas de clé « partagée » pour tous les utilisateurs de l’app).
  - Documenter comment créer une clé et où la mettre dans Ghosty.

### 3.2 Autres comptes

- Aucun autre compte obligatoire pour l’app (pas de compte « Ghosty » central). Tout est local + OpenAI.

---

## 4. Checklist avant mise en ligne

À valider avant de considérer la première version « production ».

### Code et config
- [ ] `ENABLE_RIGHT_CLICK_SERVICES` et toute feature « en suspens » laissées à `false` (ou documentées).
- [ ] Aucun secret (clé API, token) dans le repo ni dans les artefacts de build.
- [ ] Logs de debug retirés ou désactivés en build release (pas de logs sensibles).
- [ ] `.env` et fichiers de clés dans `.gitignore`.

### Build
- [ ] `npm run tauri build` réussit.
- [ ] L’app lance correctement depuis le `.app` (pas seulement en `tauri:dev`).
- [ ] Raccourci global et micro testés sur une machine « propre ».

### Utilisateur
- [ ] Un « Quick Start » ou équivalent à jour (ex. `docs/QUICKSTART.md`) : install, clé API, premier usage.
- [ ] Une phrase sur les données envoyées à OpenAI (transcription + texte) et lien vers la politique OpenAI si besoin.
- [ ] Si vous distribuez hors Mac App Store : une note sur l’ouverture d’une app non notarisée (clic droit → Ouvrir) si vous ne notarisez pas encore.

### Légal / Produit (recommandations)
- [ ] Licence du projet claire (ex. MIT).
- [ ] Si vous collectez des données personnelles ailleurs qu’OpenAI : politique de confidentialité + consentement.
- [ ] Version et numéro de build visibles (ex. dans À propos ou tauri.conf.json).

---

## 5. Après le lancement

- **Monitoring** : au début, pas d’infra dédiée ; compter sur les retours utilisateurs et les erreurs affichées dans l’app. Si vous ajoutez un crash reporter ou des métriques anonymes plus tard, le faire avec consentement et transparence.
- **Mises à jour** : prévoir un canal (site, GitHub Releases, ou Tauri updater) pour livrer les correctifs.
- **Sécurité** : en cas de fuite de clé signalée, rappeler à l’utilisateur de révoquer la clé dans OpenAI et d’en créer une nouvelle.

---

## Résumé

| Thème | Action principale |
|-------|-------------------|
| Clés API | Jamais en dur ; stockage local sécurisé ; chaque utilisateur sa clé. |
| Données | Clarifier ce qui part vers OpenAI ; pas d’envoi inutile. |
| Permissions | Micro + raccourcis + presse-papier ; documenter pourquoi. |
| Build | `npm run tauri build` ; signature/notarisation macOS si diffusion large. |
| OpenAI | Compte + clé par utilisateur ; coûts et limites à leur charge. |
| Avant release | Checklist code/config, build, doc utilisateur, licence. |

Ce guide peut être complété au fil du temps (ex. notarisation pas à pas, configuration de l’updater, politique de confidentialité type).
