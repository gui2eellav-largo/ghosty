# Règles UI – Minimal, Notion-like, Vercel

Philosophie : **less is more**. Interface organique, épurée, UX-first. Pas de chrome inutile.

---

## Principes

- **Une seule façon** de faire chaque chose : un style de titre de page, un style de section, un primary button.
- **Espace > bordures** : privilégier le vide et la hiérarchie typographique plutôt que des cadres.
- **Neutre d’abord** : fonds et textes neutres ; accent (vert actif, rouge destructif) uniquement quand nécessaire.
- **Touch targets** : zones cliquables suffisantes, hover discret (léger fond, pas de gros bloc).

---

## Structure de page (toutes les vues)

- **Titre** : `uiClasses.pageTitle`. Un seul niveau par écran.
- **Description / sous-titre** : `uiClasses.pageDescription`. Optionnel, sous le titre.
- **Marge sous le header** : `uiClasses.pageHeaderMargin` (bloc titre + description).
- Pas d’animation de vue (pas de slide-in) pour rester calme.

---

## Sections et blocs

- **Label de section** (ex. "Today", "How to add words", "Built-in") : `uiClasses.sectionLabel`. Uppercase, petite taille, muted. Un seul style dans toute l’app.
- **Carte / zone surélevée** (ex. CTA Home, guide Dictionary) : `uiClasses.pageCard`. Fond très léger, bordure fine ou absente. Pas de ombre lourde.
- **Info / notice** (ex. encadré d’aide) : `uiClasses.infoBox`. Variante de pageCard si besoin, ou même classe avec plus de padding.

---

## Boutons

- **Primary** : un seul CTA principal par écran ou modale. `uiClasses.buttonPrimary`. Taille et poids fixes (text-sm, font-semibold).
- **Secondaire** : `uiClasses.buttonGhost`. Texte muted, hover fond léger. Pour Import, Cancel, liens d’action.
- **Liste** : actions en IconButton (ghost / danger), `aria-label` obligatoire. Pas de libellé "Supprimer" à côté de l’icône.

---

## Listes et rows

- Contenu à gauche, actions à droite. Séparateur : `divide-y` avec bordure subtle. Pas de carte par ligne.
- État actif : un seul type (ex. fond léger ou icône Check verte).

---

## Formulaires

- Labels associés (htmlFor + id). Inputs/select : `uiClasses.input` / `uiClasses.select`. Un seul style de focus (ring neutre, pas orange).

---

## Empty state

- Icône (taille fixe, muted) + titre (`uiClasses.emptyStateTitle`) + sous-texte optionnel + 0 ou 1 bouton (ghost ou primary selon contexte). Centré dans la zone.

---

## Tokens à utiliser (design-tokens.ts)

- **Pages** : `pageTitle`, `pageDescription`, `pageHeaderMargin`, `sectionLabel`, `pageCard`, `infoBox`.
- **Corps de texte** : `bodyText` (text-sm + muted) pour descriptions, paragraphes secondaires ; `bodyTextPrimary` (text-sm + foreground) si besoin. Une seule taille de corps : `text-sm`.
- **Composants** : `buttonPrimary`, `buttonSecondary`, `buttonGhost`, `buttonDanger`, `input`, `select`, `navItem`, `navItemActive`, `navItemInactive`.
- **Empty** : `emptyStateTitle`, `emptyStateIcon` (classe pour wrapper icône).

Ne pas dupliquer : toute nouvelle nécessité = nouveau token ou réutilisation d’un existant.

---

## Vérification

- Après modification UI : parcourir Home, Dictionary, Style & Modes, Paramètres, FloatingBar.
- Checklist : même style de titre partout ; primary = buttonPrimary ; sections = sectionLabel ; listes = divide-y + IconButton ; pas de focus ring coloré sauf exception.
