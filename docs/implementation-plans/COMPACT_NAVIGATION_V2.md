# Compact Navigation V2

## Goal

Reduce the persistent navigation footprint so page content appears sooner, while keeping every enabled destination available. Preserve the existing bottom-left quick-add expense and receipt-scan actions, including direct add, long-press date shortcuts, and the page-specific entry behavior.

## Layout

- **Desktop:** one header row targeted at 56 px. Brand, primary destinations, `More`, notifications, and utility menu share the row. Primary destinations are Overview, Expenses, Incomes, and Budgets; other enabled destinations appear in `More`.
- **Mobile:** a 52 px brand/action row followed by a 44 px horizontally scrollable navigation row. `More` stays pinned at the right edge. There is no bottom navigation bar.
- **Active destination:** a subtle underline marks primary destinations. If the current destination is in the overflow list, `More` shows its active state.
- **Status:** synchronization and progress status remains absent while idle.
- **Quick actions:** retain two separate bottom-left floating controls. On mobile both are 56×56 px circles, 16 px from the left and 16 px plus the safe-area inset from the bottom, with a 12 px gap. On desktop both remain separate 56 px-high actions, 24 px from the left and bottom. The add button opens the existing form on click and keeps its long-press date shortcuts; the receipt action keeps its current flow.
- **Occlusion:** hide floating actions while menus, modals, customization, or the long-press radial date menu is open. Add bottom content breathing room for the mobile controls and respect the PWA safe area.

## Feature settings and compatibility

The navigation uses `tabFeatures`, `hamburgerFeatures`, and legacy `enabledFeatures` together. It normalizes legacy card and wallet entries, excludes profile/admin from regular destinations, retains configured order where possible, and places all remaining enabled destinations in `More`. Settings remains reachable from `More` for older preference records that omitted it. The utility menu remains separate for language, appearance, import/export, account, and admin actions. Saving feature settings stores the union of both navigation groups in `enabledFeatures` for older consumers.

## Components

- `Dashboard.tsx`: integrates the compact header/navigation and shared bottom quick actions without changing data or expense-entry services.
- `CompactNavigation.tsx`: renders primary destinations and the overflow menu, with Escape/outside-click dismissal and focus return.
- `navigationConfig.ts`: resolves feature compatibility, ordering, and primary/overflow groups.
- `FloatingExpenseActions.tsx`: shares presentation for the two preserved floating actions.
- `FeatureManager.tsx`: keeps old enabled-feature storage synchronized with the two navigation groups.
- `index.css`: establishes desktop/mobile dimensions, active underline, responsive menu, FAB placement, and widget spacing.
- `translations.ts`: provides navigation labels in Traditional Chinese, Simplified Chinese, and English.

## Validation plan

- Run navigation tests, the production TypeScript/Vite build, lint, and `git diff --check`.
- Build with `FIREBASE_DEPLOY=true` to check the deployment configuration.
- Review responsive layouts at 1280, 1024, 390, 375, and 320 px; confirm no page-level horizontal overflow, and that `More` remains visible on mobile.
- Check primary and overflow active states; mouse/touch menu open, outside-click, Escape, and focus return.
- Confirm the add FAB remains a direct add action, long-press still opens date shortcuts, receipt scanning remains separate, and page-specific form behavior is preserved.
- Check light/dark and Warm Kitty themes; Traditional Chinese, Simplified Chinese, and English; feature migration and ordering; modal/menu/customizer occlusion; and safe-area/content spacing.

## Firebase test deployment

Push this task to `firebase-testing`. The existing `firebase-hosting-deploy.yml` workflow now also listens to that branch and deploys to the Firebase Hosting `live` channel at `https://expense-manager-41afb.web.app/`. The existing `main` trigger remains for explicitly requested production releases. Because both branches publish to the same live channel, whichever workflow deploys last controls the public site; a push to `firebase-testing` immediately replaces the current Hosting release. The app uses the existing Firebase project and its production backend, so do not create, edit, or delete real expense records during testing. Do not push this task to `main`.
