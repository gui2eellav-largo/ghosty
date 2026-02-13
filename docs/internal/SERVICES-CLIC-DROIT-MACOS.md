# Services macOS : transformer du texte au clic droit (sans Cmd+C)

Sur macOS, vous pouvez ajouter des entrées au menu **Services** (clic droit sur une sélection) pour envoyer le texte sélectionné à Ghosty et le transformer avec un mode. **Aucune copie (Cmd+C) n’est nécessaire** : le système met la sélection dans le presse-papier avant d’exécuter le service.

---

## Pourquoi je ne vois pas « Ghosty » ou les modes au clic droit ?

**Raison 1 – Les Services ne sont pas encore créés**  
Ghosty n’ajoute pas lui‑même d’entrées au menu contextuel. Il faut **créer une fois** les « Actions rapides » (Quick Actions) dans Automator (voir ci‑dessous), puis les **activer** dans Réglages Système.

**Raison 2 – Ils sont dans le sous‑menu « Services »**  
Les entrées n’apparaissent **pas** en haut du menu contextuel. Il faut aller en bas du menu, ouvrir le sous‑menu **Services**, puis choisir par ex. **Ghosty – Direct**.

- Sur **Chrome / Google** : clic droit sur le texte sélectionné → descendre tout en bas du menu → **Services** → **Ghosty – Direct** (ou autre mode).
- Si vous ne voyez pas **Services** : soit les actions rapides n’ont pas été créées/activées (voir « Activer les services »), soit l’app (ex. certaines pages web) ne propose pas les Services pour le texte.

**Raison 3 – Les services ne sont pas activés**  
Après avoir créé les workflows, il faut les cocher dans **Réglages Système > Raccourcis > Services** (section **Texte**).

### Résumé (recommandé : en 2 étapes)

1. **Installer** : dans Ghosty, ouvrir **Réglages > System** et cliquer sur **« Installer les Services »**. Les workflows sont créés automatiquement à partir de vos **modes actuels** (built-in + personnalisés) et copiés dans `~/Library/Services/`.
2. **Activer** : Réglages Système > Raccourcis > Services (section **Texte**), cocher les entrées **Ghosty – …**.
3. **Utiliser** : sélectionner du texte → clic droit → en bas du menu → **Services** → **Ghosty – Direct** (ou autre mode).

(Si vous préférez créer les workflows à la main dans Automator, voir « Créer un service » plus bas.)

---

## Prérequis

- **Ghosty doit être lancé depuis l’app construite** (le fichier .app), pas depuis le mode développement (`npm run tauri dev`). C’est l’app **buildée** qui enregistre le schéma `ghosty://` auprès de macOS (Launch Services). Si vous voyez l’erreur « No application knows how to open URL ghosty://... », c’est que le schéma n’est pas enregistré : construisez l’app (`npm run tauri build`), ouvrez le .app généré (ou installez-le dans Applications) et lancez-le au moins une fois.
- Ensuite, le schéma `ghosty://` restera associé à Ghosty tant que l’app a été ouverte au moins une fois depuis le bundle.

## Créer un service (Quick Action) pour un mode

1. Ouvrir **Automator** (Recherche Spotlight > Automator).
2. **Fichier > Nouveau** puis choisir **Action rapide** (Quick Action).
3. En haut à gauche :
   - **Réception du workflow** : **texte** (ou « Texte »).
   - **Dans** : **n’importe quelle application** (ou « toute application »).
4. Dans la bibliothèque, chercher **Exécuter un script Shell** (ou « Run Shell Script ») et le glisser dans le workflow.
5. Laisser **Shell** : `/bin/bash` (ou `/bin/zsh`).
6. Dans le script, saisir **une seule ligne** (adapter le `mode=` selon le mode voulu) :

   ```bash
   open "ghosty://transform?mode=light"
   ```

   **Modes built-in :**
   - `light` — Direct (pas de LLM, texte inchangé).
   - `medium` — Shape.
   - `strong` — Reframe.
   - `full` — Build.

7. **Fichier > Enregistrer**.
8. Nom suggéré : **Ghosty – Direct** (pour `mode=light`), **Ghosty – Shape** (pour `medium`), etc.
9. Enregistrer dans le dossier par défaut (les actions rapides sont alors disponibles dans **Services**).

## Activer les services

1. **Réglages Système > Raccourcis > Raccourcis d’application > Services** (ou **Préférences Système > Clavier > Raccourcis > Services**).
2. Dans la liste **Texte**, cocher les entrées **Ghosty – Direct**, **Ghosty – Shape**, etc., que vous avez créées.

## Utilisation

1. Sélectionner du texte dans n’importe quelle app (Safari, Notes, VS Code, etc.).
2. **Clic droit** sur la sélection.
3. **Services** > **Ghosty – Direct** (ou le mode choisi).
4. Ghosty transforme le texte (ou le repasse tel quel en mode Direct), le met dans le presse-papier et **colle automatiquement** si l’option « Coller automatiquement après transformation » est activée dans les réglages (Comportement).

## Dépannage : « Ce service ne peut être lancé car il n'est pas configuré correctement »

Cette erreur apparaît au moment où vous choisissez un mode dans le menu Services (avant même d’ouvrir Ghosty). Causes possibles :

1. **Workflows générés avec une ancienne version** : Réinstallez les Services depuis Ghosty (Réglages > System > **Install Services**) pour régénérer les workflows avec un `Info.plist` valide.
2. **Console** : Ouvrez l’app **Console**, filtrez par `WorkflowServiceRunner` ou `Automator`, relancez le service et consultez les messages d’erreur pour plus de détails.
3. **Test avec un workflow manuel** : Créez une Action rapide dans Automator (réception Texte, script `open "ghosty://transform?mode=light"`), enregistrez-la dans le dossier par défaut, activez-la dans Raccourcis > Services. Si ce workflow manuel fonctionne, le problème venait des workflows générés ; sinon, vérifiez que Ghosty est lancé depuis le .app et que le schéma `ghosty://` est bien enregistré.

## Dépannage : « No application knows how to open URL ghosty://... »

Cette erreur signifie que macOS (Launch Services) n’a **aucune application** enregistrée pour le schéma `ghosty://`. Cela arrive si vous lancez Ghosty **en mode développement** (`npm run tauri dev`) : le binaire de dev n’enregistre pas le schéma.

**Solution :** construisez l’app et lancez-la depuis le bundle :
1. `npm run tauri build`
2. Ouvrez le .app généré (dans `src-tauri/target/release/bundle/macos/` ou après installation dans Applications)
3. Lancez Ghosty au moins une fois depuis ce .app
4. Réessayez le clic droit → Services → Ghosty – …

Après cela, le schéma reste associé à Ghosty tant que l’app a été ouverte au moins une fois depuis le .app.

## Test rapide en terminal

Pour vérifier que le schéma `ghosty://` fonctionne (avec du texte déjà copié dans le presse-papier) :

```bash
open "ghosty://transform?mode=light"
```

Ghosty doit lire le presse-papier, traiter le texte avec le mode `light`, mettre le résultat au presse-papier et coller si l’option est activée.

## Modes personnalisés

Si vous avez créé des modes personnalisés dans Ghosty, utilisez leur **id** (ex. un UUID ou un identifiant personnalisé) dans l’URL :

```bash
open "ghosty://transform?mode=VOTRE_MODE_ID"
```

Vous pouvez créer une action rapide par mode personnalisé de la même façon que pour les modes built-in.
