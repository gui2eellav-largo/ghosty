# Guide de tests manuels (front production-ready)

## Démarrer l’app

```bash
npm run tauri:dev
```

---

## 1. Paramètres / Modale

- Ouvrir les paramètres (bouton ou entrée prévue).
- **Échappement** : touche Escape ferme la modale.
- **Focus** : à l’ouverture, le focus va sur le premier élément focusable ; en tabulant, le focus reste dans la modale (pas derrière).
- **Fermeture** : en fermant, le focus revient sur l’élément qui a ouvert la modale.
- **Lecture d’écran** : la modale est annoncée comme dialogue (titre « Preferences »).

## 2. Bouton vocal (VoiceButton)

- **États** : idle → clic → recording → processing → success/error.
- **Accessibilité** : le bouton a un libellé qui change selon l’état (ex. « Start voice input », « Recording… », « Processing… »).
- **Raccourci** : si un raccourci est affiché (ex. ⌥Space), il reste lisible à l’écran.

## 3. Waveform (LiveWaveform)

- En **enregistrement**, les barres réagissent au micro.
- En **processing**, animation de type « traitement » (ou statique si préférence « réduire les animations »).
- **Réduire les animations** : dans les paramètres système (accessibilité), activer « Réduire les mouvements » et vérifier que l’animation de processing est réduite ou statique.

## 4. Modes (Dashboard)

- Changer de mode, en créer un, en dupliquer, réorganiser (flèches), importer/exporter.
- Vérifier qu’après une mise à jour des modes (ou un événement `modes-updated`), la liste se recharge correctement.

## 5. Dictionnaire

- Ouvrir la modale d’ajout de mot, remplir, enregistrer.
- Vérifier que le mot apparaît et qu’aucune erreur type `entryType`/`pronunciation` ne s’affiche.

## 6. Build et tests auto

```bash
npm run build
npm run test
npm run lint
```

Tout doit passer (build OK, 14 tests, 0 erreurs lint).
