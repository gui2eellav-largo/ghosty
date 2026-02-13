# Créer une release GitHub

Tant qu’aucune release n’est publiée, la page [Releases](https://github.com/gui2eellav-largo/ghosty/releases) affiche « There aren’t any releases here ». Les utilisateurs peuvent quand même récupérer l’app via **Actions** → Artifacts. Pour avoir un téléchargement direct depuis l’onglet Releases, créez une release.

---

## Option 1 : Première release à la main

1. **Builder l’app en local**
   ```bash
   npm run tauri:build
   ```
   Les fichiers sont dans `src-tauri/target/release/bundle/` (sous-dossier `macos/` pour le .app, et éventuellement un .dmg selon la config Tauri).

2. **Sur GitHub**
   - Allez sur [Releases](https://github.com/gui2eellav-largo/ghosty/releases).
   - Cliquez sur **Create a new release**.

3. **Créer un tag**
   - **Choose a tag** : saisissez un nom (ex. `v0.1.0`) puis **Create new tag**.
   - Cible : `main` (ou la branche à publier).

4. **Titre et notes**
   - **Release title** : ex. `v0.1.0` ou `Première release`.
   - **Describe this release** : court résumé des changements ou « First release ».

5. **Ajouter les binaires**
   - Dans **Assets**, glissez-déposez les fichiers à proposer au téléchargement, par ex. :
     - le fichier **.dmg** s’il est présent dans `src-tauri/target/release/bundle/macos/`, ou
     - une archive **.zip** du dossier `Ghosty.app` (clic droit sur `Ghosty.app` → Compresser).

6. **Publier**
   - Cliquez sur **Publish release**.

Après publication, la page Releases affichera la version et les fichiers à télécharger.

---

## Option 2 : Récupérer l’artefact de la CI

Si vous ne voulez pas builder en local :

1. Allez dans [Actions](https://github.com/gui2eellav-largo/ghosty/actions).
2. Ouvrez le dernier run réussi (workflow « CI » ou « Build Tauri »).
3. En bas, section **Artifacts** : téléchargez **ghosty-macos**.
4. Décompressez l’archive : vous obtenez le contenu de `bundle/` (dont `macos/Ghosty.app`).
5. Créez une release comme en option 1, et uploadez le .dmg ou un .zip du .app dans les Assets.

---

## Automatiser les releases (optionnel)

Pour créer une release automatiquement à chaque tag (ex. `v0.1.0`) :

- Ajoutez un job dans `.github/workflows/` qui se déclenche sur `push: tags: ['v*']`.
- Ce job build l’app, puis utilise une action (ex. `softprops/action-gh-release`) pour créer la release et y attacher les binaires.

Voir la [doc GitHub](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository) et des exemples de workflows « release » pour Tauri.
