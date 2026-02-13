# Audit : Services macOS (clic droit) – État et correctifs

**Date** : 2026-02-13  
**Contexte** : L’utilisateur a les entrées Services (Ghosty – Direct, etc.) dans le menu clic droit → Services, mais au lancement d’un mode apparaît l’erreur système : *« Ce service ne peut être lancé car il n’est pas configuré correctement. »*

---

## 1. État du code et de la doc

| Élément | État |
|--------|------|
| **Flag** | `ENABLE_RIGHT_CLICK_SERVICES = false` dans `lib.rs` et `src/types/index.ts` |
| **Effet du flag** | Quand `false` : le **deep link** `ghosty://` n’est pas enregistré dans l’app (le callback `on_open_url` n’est pas branché). Donc même si le workflow exécute `open "ghosty://transform?mode=..."`, l’app ne réagit pas. |
| **UI** | La section Réglages « Install Services » / « Open Services folder » est masquée quand le flag est `false`. |
| **Workflows installés** | Présents dans `~/Library/Services/` (Ghosty – Direct.workflow, etc.), générés par `services_installer.rs`. |
| **Doc** | `docs/internal/SERVICES-CLIC-DROIT-MACOS.md` à jour (fonctionnalité en suspens, flag à `false`). |

Conclusion : les workflows sont bien créés et visibles dans le menu, mais deux choses peuvent provoquer l’erreur ou un comportement incorrect :
1. **Configuration du service** : `Info.plist` utilise `NSRequiredContext` avec `NSTextContent` = `"Text"`. La doc Apple indique que les valeurs valides de `NSTextContent` sont : `URL`, `Date`, `Address`, `Email`, `FilePath` — pas `"Text"`. Une valeur invalide peut faire rejeter le service par le système (« pas configuré correctement »).
2. **Deep link désactivé** : même si le service s’exécutait, `open ghosty://...` ne serait pas géré par l’app tant que `ENABLE_RIGHT_CLICK_SERVICES` est `false`.

---

## 2. Correctifs appliqués

### 2.1 Info.plist (workflows)

- **Avant** : `NSRequiredContext` avec `NSTextContent` = `"Text"` (valeur non documentée pour ce champ).
- **Après** : `NSRequiredContext` laissé comme dictionnaire vide `{}`. La doc Apple précise : *« Always include this property, even when you do not require any filtering (in which case you specify an empty dictionary as the value). »* Le type de données reçu reste défini par `NSSendTypes` = `public.utf8-plain-text`, donc le service reçoit bien du texte.

### 2.2 Réactivation du flux clic droit

- **Rust** : `ENABLE_RIGHT_CLICK_SERVICES` passé à `true` dans `src-tauri/src/lib.rs`.
- **Front** : `ENABLE_RIGHT_CLICK_SERVICES` passé à `true` dans `src/types/index.ts`.
- Effet : enregistrement du handler pour `ghosty://`, affichage des réglages « Install Services » / « Open Services folder », et traitement de `run_transform_selection` au clic sur un mode depuis les Services.

### 2.3 Réinstaller les workflows après correctifs

Après mise à jour du code, il faut **réinstaller** les Services pour que les workflows utilisent le nouvel `Info.plist` :

1. Lancer Ghosty (build release depuis le .app).
2. Réglages > System > **Install Services**.
3. Réglages Système > Raccourcis > Services (Texte) : vérifier que les entrées **Ghosty – …** sont cochées.
4. Tester : sélection de texte → clic droit → Services → Ghosty – Direct (ou autre mode).

---

## 3. Si l’erreur persiste

- **Console** : Ouvrir l’app **Console**, filtrer par `WorkflowServiceRunner` ou `Automator`, relancer le service et regarder les messages d’erreur.
- **Workflow à la main** : Créer une Action rapide dans Automator (réception Texte, « Exécuter un script Shell » avec `open "ghosty://transform?mode=light"`), l’enregistrer dans `~/Library/Services/`, l’activer dans Raccourcis > Services. Si celle-ci fonctionne, le problème vient du format généré par `services_installer.rs` ; si elle échoue aussi, le problème est ailleurs (schéma `ghosty://`, app non lancée depuis le .app, etc.).
- **Schéma ghosty://** : L’app doit avoir été lancée au moins une fois depuis le **.app** buildé (pas `npm run tauri dev`) pour que le schéma soit enregistré.

---

## 4. Fichiers modifiés (résumé)

- `src-tauri/src/services_installer.rs` : `NSRequiredContext` vide, suppression de `NSTextContent` = `"Text"`.
- `src-tauri/src/lib.rs` : `ENABLE_RIGHT_CLICK_SERVICES = true`.
- `src/types/index.ts` : `ENABLE_RIGHT_CLICK_SERVICES = true`.
- `docs/internal/SERVICES-CLIC-DROIT-MACOS.md` : retrait de la mention « en suspens », ajout dépannage « pas configuré correctement ».
- `docs/internal/AUDIT-SERVICES-CLIC-DROIT.md` : ce document.
