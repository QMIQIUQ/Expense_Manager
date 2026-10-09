# Compact Navigation V2

## Goal

Keep the compact header while making every enabled destination available in one horizontally scrollable navigation row. Preserve the original bottom-left quick-add expense and receipt-scan actions, including direct add, long-press date shortcuts, and the page-specific entry behavior.

## Layout

- **Desktop:** one compact header row targeted at 56 px. Brand, one horizontally scrollable navigation row, notifications, and the existing utility/account menu share the header.
- **Mobile:** a 52 px brand/action row followed by a 44 px horizontally scrollable navigation row. The active item scrolls into view when selected. There is no bottom navigation bar and no navigation `More` dropdown.
- **Order:** the navigation row follows the saved order exactly. Existing `tabFeatures` retain their order first; unique `hamburgerFeatures` follow in their saved order. No fixed desktop/mobile priority or item-count cap is applied.
- **Active destination:** a subtle underline marks the current destination. Every navigation button remains directly available in the scrollable row.
- **Utility menu:** the hamburger/account utility menu remains separate for language, appearance, import/export, account, and admin actions. It is not the removed navigation `More` dropdown.
- **Status:** synchronization and progress status remains absent while idle.
- **Quick actions:** retain two separate bottom-left floating controls. On mobile both are 56×56 px circles, 16 px from the left and 16 px plus the safe-area inset from the bottom, with a 12 px gap. On desktop both remain separate 56 px-high actions, 24 px from the left and bottom. The add button opens the existing form on click and keeps its long-press date shortcuts; the receipt action keeps its current flow.
- **Occlusion:** hide floating actions while utility menus, modals, customization, or the long-press radial date menu is open. The navigation row has no dropdown state that can cover page content.

## Feature settings and compatibility

Feature Manager now presents one ordered list for all navigation destinations. Dragging, touch reordering, numeric position changes, enabling/disabling features, saving, and reset all operate on this unified list.

On load, the shared normalization helper merges legacy settings without writing to Firestore:

1. When both `tabFeatures` and `hamburgerFeatures` exist, preserve the tab order and append only not-yet-listed hamburger items. Do not revive stale entries from `enabledFeatures` in this case.
2. When only one location list exists, retain its order and append enabled legacy items missing from that list.
3. When neither location list exists, use the order in `enabledFeatures`, or defaults when no saved preferences exist.
4. Normalize legacy `cards` and `ewallets` to `paymentMethods`, remove duplicates and utility-only `profile`/`admin` entries, and keep Settings reachable.
5. Save the unified order to both `enabledFeatures` and `tabFeatures`; write an empty `hamburgerFeatures` array for older clients. A reset uses the same format. Existing data is not rewritten simply by opening the page.

## Components

- `Dashboard.tsx`: passes one ordered feature list to the compact header and leaves notification and utility controls in place.
- `CompactNavigation.tsx`: renders all destinations in one horizontal scroll container, preserves focus/active states, and scrolls the active destination into view.
- `navigationConfig.ts`: normalizes both current and legacy preference records into the same ordered list used by the header and Feature Manager.
- `FeatureManager.tsx`: manages one feature list while continuing to save the legacy fields in a compatible form.
- `featureSettingsService.ts`: preserves Firestore field compatibility and resets to the unified format.
- `FloatingExpenseActions.tsx`: shares presentation for the two preserved floating actions.
- `index.css`: establishes compact desktop/mobile header dimensions, horizontal scrolling, active underline, FAB placement, and widget spacing.
- `docs/mockups/navigation-preview.html` and SVG mockups: illustrate that all destinations use the same scrollable row and the utility menu remains separate.

## Validation plan

- Test saved order, both legacy lists, partial migrations, duplicate/legacy aliases, no stale feature resurrection, and Settings reachability.
- Test that no `More` navigation button renders, every destination is in the navigation row, click navigation and active states work, and the row remains horizontally scrollable.
- Test Feature Manager's unified ordering and existing mouse/touch/numeric sorting and reset behavior.
- Run `npm run test:run`, `npm run lint`, `npm run build`, `FIREBASE_DEPLOY=true npm run build`, and `git diff --check`.
- Review desktop and mobile layouts at 1280, 768, 390, 375, and 320 px; confirm no page-level horizontal overflow and that notification and utility controls remain visible.
- Confirm the add FAB remains a direct add action, long-press still opens date shortcuts, receipt scanning remains separate, and its restored primary/secondary styling is unchanged.
- Check light/dark and Warm Kitty themes; Traditional Chinese, Simplified Chinese, and English; modal/menu/customizer occlusion; and safe-area/content spacing.

## Firebase test deployment

Push this task to `firebase-testing`. The existing `firebase-hosting-deploy.yml` workflow listens to that branch and deploys to Firebase Hosting's `live` channel at `https://expense-manager-41afb.web.app/`. The `main` trigger remains for explicitly requested production releases. Because both branches publish to the same live channel, whichever workflow deploys last controls the public site; a push to `firebase-testing` replaces the current Hosting release. The app uses the existing Firebase project and production backend, so do not create, edit, or delete real expense records during testing. Do not push this task to `main`.
