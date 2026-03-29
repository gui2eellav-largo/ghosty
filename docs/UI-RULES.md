# UI rules – Minimal, Notion-like, Vercel

Philosophy: **less is more**. Clean, organic interface, UX-first. No unnecessary chrome.

---

## Principles

- **One way** to do each thing: one page title style, one section style, one primary button.
- **Space over borders**: Prefer whitespace and typographic hierarchy over frames.
- **Neutral first**: Neutral backgrounds and text; accent (green active, red destructive) only when needed.
- **Touch targets**: Sufficient clickable areas, subtle hover (light background, no heavy block).

---

## Page structure (all views)

- **Title**: `uiClasses.pageTitle`. Single level per screen.
- **Description / subtitle**: `uiClasses.pageDescription`. Optional, under the title.
- **Margin under header**: `uiClasses.pageHeaderMargin` (title + description block).
- No view animation (no slide-in) to keep the UI calm.

---

## Sections and blocks

- **Section label** (e.g. "Today", "How to add words", "Built-in"): `uiClasses.sectionLabel`. Uppercase, small size, muted. One style across the app.
- **Card / elevated zone** (e.g. Home CTA, Dictionary guide): `uiClasses.pageCard`. Very light background, thin or no border. No heavy shadow.
- **Info / notice** (e.g. help box): `uiClasses.infoBox`. Variant of pageCard if needed, or same class with more padding.

---

## Buttons

- **Primary**: One main CTA per screen or modal. `uiClasses.buttonPrimary`. Fixed size and weight (text-sm, font-semibold).
- **Secondary**: `uiClasses.buttonGhost`. Muted text, light background on hover. For Import, Cancel, action links.
- **List**: IconButton actions (ghost / danger), `aria-label` required. No "Delete" label next to the icon.

---

## Lists and rows

- Content on the left, actions on the right. Separator: `divide-y` with subtle border. No card per row.
- Active state: Single type (e.g. light background or green Check icon).

---

## Forms

- Associated labels (htmlFor + id). Inputs/select: `uiClasses.input` / `uiClasses.select`. Single focus style (neutral ring, not orange).

---

## Empty state

- Icon (fixed size, muted) + title (`uiClasses.emptyStateTitle`) + optional subtitle + 0 or 1 button (ghost or primary as context). Centered in the zone.

---

## Tokens to use (design-tokens.ts)

- **Pages**: `pageTitle`, `pageDescription`, `pageHeaderMargin`, `sectionLabel`, `pageCard`, `infoBox`.
- **Body text**: `bodyText` (text-sm + muted) for descriptions, secondary paragraphs; `bodyTextPrimary` (text-sm + foreground) if needed. Single body size: `text-sm`.
- **Components**: `buttonPrimary`, `buttonSecondary`, `buttonGhost`, `buttonDanger`, `input`, `select`, `navItem`, `navItemActive`, `navItemInactive`.
- **Empty**: `emptyStateTitle`, `emptyStateIcon` (class for icon wrapper).

Do not duplicate: any new need = new token or reuse an existing one.

---

## Verification

- After UI change: go through Home, Dictionary, Style & Modes, Settings, FloatingBar.
- Checklist: same title style everywhere; primary = buttonPrimary; sections = sectionLabel; lists = divide-y + IconButton; no colored focus ring except where needed.
