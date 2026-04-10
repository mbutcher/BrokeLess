# PRD — Navigation: Mobile (Drawer + Top Bar)

**Version:** v0.4
**Status:** Complete
**Component:** Navigation
**File:** [frontend/src/components/layout/AppLayout.tsx](../../../../frontend/src/components/layout/AppLayout.tsx)

---

## Current State

Mobile navigation consists of a fixed top bar (hamburger | app name | avatar) and a slide-in drawer from the left containing the same links as the desktop sidebar. A Quick-Add FAB (Plus icon, fixed bottom-right) opens a QuickAddSheet dialog for fast transaction entry. The drawer closes automatically on link tap.

---

## Problems / Observations

- Key features are hidden behind a "swipe from left" menu
- Swipe menu is less intuitive
- Still need to allow deep access to all features and tools.

---

## Proposed Changes

- Replace side navbar with icon based tool bar at bottom of screen
- Key features: Dashboard, Budget, Transactions, and Goals
- Center toggle for popup drawer of additional features and screens

---

## Acceptance Criteria

_To be defined._
