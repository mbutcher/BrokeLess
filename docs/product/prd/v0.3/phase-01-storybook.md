# PRD — Phase 1: Storybook Integration

**Version:** v0.3
**Priority:** High
**Scope:** Medium
**Status:** Ready for development

---

## Overview

Integrate Storybook into the frontend as a component development and interaction-testing harness. This gives developers an isolated environment to build, inspect, and regression-test UI components without running the full app, and establishes the visual baseline before the design refresh in Phase 2.

---

## Problem Statement

Currently there is no isolated component development environment. Every UI change requires running the full application with a live API, making iterative design work slow and fragile. There are also no interaction tests for UI components — only unit/integration tests at the feature level.

---

## Goals

- Install and configure Storybook using the Vite builder (matches existing Vite 5 setup)
- Provide stories for all shared UI primitives, chart/layout components, and dashboard widgets
- Integrate interaction tests (`@storybook/test`) for stateful components
- Ensure path aliases, Tailwind CSS, i18n, and TanStack Query work correctly in story context
- Zero real network requests in any story

## Non-Goals

- Visual regression snapshots / screenshot diffing (not in scope for v0.3)
- Storybook deployment / hosting
- Stories for page-level routes

---

## User Stories

1. As a developer, I can run `npm run storybook` and browse all UI components in isolation, so I can work on design without the live API.
2. As a developer, I can run `npm run test-storybook` to verify that interaction tests pass, giving confidence that interactive components behave correctly.
3. As a developer adding a new component, I have a clear pattern (existing stories) to follow for writing the corresponding story.

---

## Functional Requirements

### 1.1 Storybook Setup

| # | Requirement |
|---|-------------|
| 1.1.1 | Install packages: `@storybook/react-vite`, `@storybook/test`, `@storybook/addon-interactions`, `@storybook/addon-essentials` as devDependencies |
| 1.1.2 | `.storybook/main.ts` — Vite builder; all 8 path aliases from `vite.config.ts` replicated |
| 1.1.3 | `.storybook/preview.ts` — global Tailwind CSS import; decorators: `I18nextProvider` (default locale), `QueryClientProvider` (fresh client per story), `ThemeProvider`; viewport presets: mobile (390×844), tablet (768×1024), desktop (1280×800) |
| 1.1.4 | `frontend/package.json` gets three new scripts: `storybook` (port 6006), `build-storybook`, `test-storybook` |
| 1.1.5 | `.storybook/` directory committed to version control; no story output committed |

### 1.2 UI Primitive Stories (`src/components/ui/`)

Stories for all 11 Shadcn components. Each story file lives alongside the component (`button.stories.tsx`, etc.).

| Component | Required story variants | Interaction test? |
|-----------|------------------------|-------------------|
| `button` | Default, Outline, Ghost, Destructive variants; sm/md/lg sizes; disabled; loading spinner | No |
| `input` | Placeholder only, with label, error state, disabled | No |
| `card` | Header+body+footer, body only, header+body | No |
| `dialog` | Closed (trigger visible), open with form content | Yes — open, fill, close |
| `badge` | All colour variants (default, secondary, destructive, outline) | No |
| `alert` | Info, warning, error | No |
| `tabs` | 3-tab layout, default active tab | Yes — click tab 2, verify content |
| `dropdown-menu` | Trigger, 3 items, 1 disabled item | Yes — open, click item |
| `form-field` | Label + input + no error, label + input + error message | No |
| `separator` | Horizontal, vertical | No |
| `label` | Standalone, paired with checkbox via `htmlFor` | No |

### 1.3 Chart & Layout Component Stories (`src/components/charts/`, `src/components/layout/`)

| Component | Variants |
|-----------|----------|
| `MonthlyChart` | 6-month mock data (income+expense), with forecast line, empty dataset |
| `NetWorthChart` | Positive upward trend, negative trend, flat |
| `SpendingPieChart` | 5-category dataset, single category, empty |
| `TopPayeesBarChart` | Top 5 payees dataset, empty |
| `AccountCard` | Asset (positive), liability (positive), credit card, negative balance |
| `UserAvatarMenu` | Closed (avatar visible), open | Yes — open, click Settings link |

All chart stories use static fixture arrays — no hooks, no API calls.

### 1.4 Dashboard Widget Stories (`src/features/dashboard/widgets/`)

One story file per widget. Each story:
- Mocks the widget's custom hook(s) at module level via Storybook `loaders` or `parameters.moduleMock`
- Provides three story variants: **Loaded** (realistic data), **Loading** (hook returns `isLoading: true`), **Empty/Error** (empty arrays or error state)
- Does not import or call TanStack Query hooks in production — hooks are replaced in story context

Widgets requiring interaction tests:
- `WarningsWidget` — collapse/expand the accordion
- `MonthlyChartWidget` — toggle forecast on/off

All 9 existing widgets must have stories. New widgets from Phase 3 will be added in that phase.

---

## Technical Requirements

### File Structure

```
frontend/
  .storybook/
    main.ts
    preview.ts
  src/
    components/ui/
      button.stories.tsx
      input.stories.tsx
      card.stories.tsx
      dialog.stories.tsx
      badge.stories.tsx
      alert.stories.tsx
      tabs.stories.tsx
      dropdown-menu.stories.tsx
      form-field.stories.tsx
      separator.stories.tsx
      label.stories.tsx
    components/charts/
      MonthlyChart.stories.tsx
      NetWorthChart.stories.tsx
      SpendingPieChart.stories.tsx
      TopPayeesBarChart.stories.tsx
    components/layout/
      AccountCard.stories.tsx
    features/auth/
      UserAvatarMenu.stories.tsx
    features/dashboard/widgets/
      AccountBalancesWidget.stories.tsx
      BudgetSnapshotWidget.stories.tsx
      MonthlyChartWidget.stories.tsx
      NetWorthWidget.stories.tsx
      RecentTransactionsWidget.stories.tsx
      SavingsGoalsWidget.stories.tsx
      UpcomingExpensesWidget.stories.tsx
      WarningsWidget.stories.tsx
      GoalDeadlineWarning.stories.tsx   (if standalone)
```

### Path Aliases

All 8 aliases from `vite.config.ts` must be replicated in `.storybook/main.ts` under `viteFinal`:

```ts
'@config', '@components', '@features', '@hooks', '@lib', '@stores', '@types', '@utils'
```

### Decorator Order (outermost → innermost)

1. `I18nextProvider` (locale: en-CA)
2. `QueryClientProvider` (new `QueryClient` per story via `decorator` factory)
3. `ThemeProvider` (default theme)
4. Story component

### Mock Strategy for Widget Hooks

Use Storybook `loaders` to override module exports via `jest.mock`-equivalent. Preferred pattern:

```ts
// In widget story
import * as hooks from '@features/dashboard/hooks/useAccountBalances';
// parameters.mockData or vi.spyOn approach in preview context
```

Exact mock mechanism to be decided during implementation based on `@storybook/addon-interactions` + Vitest compatibility. The constraint is: **no real fetch calls from any story**.

---

## Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC-1 | `npm run storybook` starts on port 6006 without errors; all story files compile |
| AC-2 | All 11 UI primitive stories render in all specified variants |
| AC-3 | All 6 chart/layout component stories render correctly |
| AC-4 | All 9 dashboard widget stories render in Loaded, Loading, and Empty states |
| AC-5 | `npm run test-storybook` passes all interaction tests (dialog, tabs, dropdown, UserAvatarMenu, WarningsWidget, MonthlyChartWidget) |
| AC-6 | Path aliases resolve correctly — no module-not-found errors |
| AC-7 | Tailwind classes render with correct styles in Storybook |
| AC-8 | `useTranslation()` returns correct en-CA strings in all stories |
| AC-9 | Network tab in Storybook browser shows zero requests to `localhost:3001` |
| AC-10 | `npm run build-storybook` completes without errors |

---

## Dependencies

- None (this is the first phase and a prerequisite for Phase 3 widget development)

## Out of Scope

- Visual regression / snapshot testing
- Stories for page-level components (LoginPage, DashboardPage, etc.)
- Storybook CI integration (can be added later)
- New widgets from Phase 3 (those stories added in Phase 3)
