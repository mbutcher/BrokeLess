# PRD — Phase 2: Theme Presets & Design Refresh

**Version:** v0.3
**Priority:** High
**Scope:** Medium
**Status:** Complete
**Dependency:** Phase 1 (Storybook) — stories must be updated after design refresh

---

## Overview

Introduce a CSS custom property–based theme system with 5 curated presets, a visual theme picker in Account Settings, and a one-time design refresh of the default aesthetic. Themes persist to the backend (user preferences) and are cached in `localStorage` to prevent flash-of-unstyled-content on load.

---

## Problem Statement

The current design uses hardcoded Tailwind palette values and has no user-configurable appearance options. The UI has minor inconsistencies in spacing and typography that have accumulated across phases. There is no path to offering visual themes without a foundational token system.

---

## Goals

- Replace hardcoded colour values in `tailwind.config.ts` with CSS custom properties
- Define 5 named theme presets controlled via `data-theme` on `<html>`
- Persist theme choice to backend user preferences and `localStorage`
- Add a visual theme picker to Account Settings (Appearance section)
- Perform a one-time audit and tightening of default spacing, font sizing, and padding
- Update Storybook stories to reflect the refreshed design baseline

## Non-Goals

- Dark mode as a separate toggle (Midnight preset serves this use case)
- Per-component theme overrides
- User-defined custom themes
- CSS-in-JS migration

---

## User Stories

1. As a user, I can open Account Settings → Appearance and select from 5 visual themes, so I can personalise the look of my budgeting app.
2. As a user, my chosen theme is remembered across browser sessions and devices I log into, so I never have to reselect it.
3. As a user, the theme applies instantly when I select it (no page reload), so the experience feels responsive.
4. As a developer, I can define component colours using design tokens (`var(--color-primary)`) rather than hardcoded values, making future theme work straightforward.

---

## Functional Requirements

### 2.1 CSS Custom Property Theme System

#### Token Set

Define the following custom properties in a root CSS block. Each theme preset overrides all tokens:

```css
:root, [data-theme="default"] {
  --color-primary:        /* brand accent */;
  --color-primary-hover:  /* darker accent */;
  --color-surface:        /* page/card background */;
  --color-surface-raised: /* elevated card/modal bg */;
  --color-border:         /* default border */;
  --color-muted:          /* muted text, placeholders */;
  --color-muted-foreground: /* lighter secondary text */;
  --color-foreground:     /* primary text */;
  --color-destructive:    /* error/danger */;
  --color-warning:        /* amber warnings */;
  --color-success:        /* green positive */;
  --color-chart-1 … --color-chart-5: /* chart palette */;
}
```

#### Theme Presets

| Name | `data-theme` value | Character |
|------|--------------------|-----------|
| Default | `default` | Current design — starting reference; neutral blues |
| Slate | `slate` | Cool grey/blue tones; muted professional |
| Forest | `forest` | Green accents; earthy calm |
| Warm | `warm` | Amber/terracotta accents; friendly, energetic |
| Midnight | `midnight` | Dark surfaces; high-contrast accents |

Each preset is a complete override of the full token set. Defined in `src/styles/themes.css`, imported in `main.tsx`.

#### Tailwind Config Refactor

`tailwind.config.ts` `theme.extend.colors` entries reference CSS variables:

```ts
colors: {
  primary: 'var(--color-primary)',
  surface: 'var(--color-surface)',
  // ...
}
```

This is a **refactor of existing hardcoded values** — all existing components must continue to render correctly with the Default theme.

### 2.2 ThemeProvider

- React context: `ThemeContext` with `theme: ThemeName` and `setTheme(name: ThemeName) => void`
- On mount: reads theme from `localStorage` key `budgetapp_theme`; applies `data-theme` to `document.documentElement`
- On `setTheme`: applies `data-theme`, writes to `localStorage`, calls `PATCH /api/v1/auth/me/preferences` (`{ theme: name }`)
- Listens to user preference changes from TanStack Query (`onSuccess` of auth/me query) to sync theme if user logs in from a new session
- Wrapped in `App.tsx` providers chain (outermost, before Router)

### 2.3 Theme Picker in Account Settings

Location: `AccountSettingsPage` → new **"Appearance"** card, above Preferences.

UI:
- Heading: "Appearance" (i18n key: `settings.appearance.title`)
- Subtitle: "Choose a colour theme" (i18n key: `settings.appearance.subtitle`)
- Grid of 5 theme swatches, each showing:
  - Theme name (translated)
  - A mini colour preview strip (3 colour blocks: primary, surface, muted)
  - Selected state: ring + checkmark icon
- Clicking a swatch calls `setTheme()` immediately (optimistic) and patches preferences

i18n keys (add to all 3 locales — en-CA, en-US, fr-CA):
```json
"settings": {
  "appearance": {
    "title": "Appearance",
    "subtitle": "Choose a colour theme",
    "themes": {
      "default": "Default",
      "slate": "Slate",
      "forest": "Forest",
      "warm": "Warm",
      "midnight": "Midnight"
    }
  }
}
```

### 2.4 Backend Persistence

- `user_preferences` already has a `theme` column (add if missing via migration; default `'default'`)
- `PATCH /api/v1/auth/me/preferences` already exists — add `theme` to the accepted payload and the update query
- `GET /api/v1/auth/me` response includes `preferences.theme`
- `AuthInitializer` reads `preferences.theme` on app load and calls `setTheme()` after auth is confirmed

### 2.5 Flash-of-Unstyled-Content Prevention

Add an inline `<script>` to `index.html` (before any React bundle) that reads `localStorage.getItem('budgetapp_theme')` and sets `document.documentElement.dataset.theme` synchronously. This ensures the correct theme is applied before first paint.

```html
<script>
  (function() {
    var t = localStorage.getItem('budgetapp_theme');
    if (t) document.documentElement.setAttribute('data-theme', t);
  })();
</script>
```

### 2.6 One-Time Design Refresh

Audit and adjust the following areas (Default theme only — other themes inherit the same spacing/typography):

| Area | What to review |
|------|---------------|
| Navigation sidebar | Item padding, icon alignment, active state contrast |
| Table rows | Row height, cell padding, border weight |
| Card components | Header padding, content padding, shadow |
| Widget headers | Font size, weight, icon gap |
| Form elements | Input height, label margin, error message spacing |

Changes must be purely aesthetic (spacing, size, colour adjustments within the token system). No component restructuring.

After refresh: update Storybook stories (Phase 1) to reflect new visual baseline.

---

## Technical Requirements

### New Files

| File | Purpose |
|------|---------|
| `frontend/src/styles/themes.css` | All 5 theme preset token overrides |
| `frontend/src/app/ThemeProvider.tsx` | React context + `data-theme` management |

### Modified Files

| File | Change |
|------|--------|
| `frontend/tailwind.config.ts` | Replace hardcoded colours with `var(--color-*)` references |
| `frontend/src/styles/globals.css` | Import `themes.css`; add `:root` default token values |
| `frontend/index.html` | Add FOUC-prevention inline script |
| `frontend/src/app/App.tsx` (or providers file) | Wrap with `ThemeProvider` |
| `frontend/src/features/auth/pages/AccountSettingsPage.tsx` | Add Appearance card |
| `frontend/src/lib/i18n/locales/en-CA.json` | New appearance keys |
| `frontend/src/lib/i18n/locales/en-US.json` | New appearance keys |
| `frontend/src/lib/i18n/locales/fr-CA.json` | New appearance keys |
| `backend/src/database/migrations/` | Add `theme` column to `user_preferences` if not present |
| `backend/src/services/auth/authService.ts` | Accept + persist `theme` in preferences update |
| `backend/src/types/` | Add `theme: ThemeName` to preferences types |
| `.storybook/preview.ts` | `ThemeProvider` decorator; add `data-theme` controls |

### Migration

If `user_preferences.theme` column does not exist:
- New migration: `20260301001_add_theme_to_user_preferences.ts`
- `ALTER TABLE user_preferences ADD COLUMN theme VARCHAR(20) NOT NULL DEFAULT 'default'`

---

## Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC-1 | All 5 theme presets render correctly with no style bleed between switches |
| AC-2 | Switching theme in Account Settings applies instantly (no reload) |
| AC-3 | Theme persists after page refresh (localStorage) |
| AC-4 | Theme persists after logging out and back in (backend preference) |
| AC-5 | On fresh load, correct theme is applied before React hydrates (no flash) |
| AC-6 | All existing components render correctly under the Default theme (no visual regression from Tailwind refactor) |
| AC-7 | Midnight preset has sufficient contrast to pass WCAG AA for text on background |
| AC-8 | Appearance section appears in Account Settings with 5 swatches; selected theme shows ring/checkmark |
| AC-9 | i18n keys present and correct in all 3 locales |
| AC-10 | Design refresh passes visual review across Dashboard, Transactions, Budget, Accounts pages at `lg` breakpoint |
| AC-11 | Storybook stories updated and rendering correctly with refreshed design |

---

## Dependencies

- Phase 1 (Storybook) must be complete so stories can be updated post-refresh
- `user_preferences` table must exist (established in prior phases)

## Out of Scope

- Dark/light OS preference auto-detection (`prefers-color-scheme`)
- Animated theme transitions
- Per-user custom theme builder
