# Compact Navigation and Hamburger Menu

## Goal

Keep the compact header with a horizontally scrollable tab row. Keep the two existing bottom-left floating expense actions unchanged: quick add remains a one-tap expense entry with its long-press date shortcuts, and receipt scanning stays separate.

## Navigation layout

- **Desktop:** brand, the configured Tabs row, notifications, and the utility menu share one compact header line.
- **Mobile:** brand/actions use the first header row; Tabs use a separate 44 px horizontally scrollable row. The active tab scrolls into view.
- **Tabs and Hamburger Menu are separate destinations.** The header reads `tabFeatures` only. The hamburger Features section reads `hamburgerFeatures` only. Each keeps its own order and can contain the same destination, matching `main`.
- There is no navigation `More` dropdown. The hamburger remains the utility/account menu for language, appearance, feature destinations, import/export, account, and admin actions.
- Notifications, status/progress, responsive behavior, and active-tab underline keep their existing behavior.
- The floating add-expense and scan-receipt controls keep their original separate desktop/mobile presentation and interaction behavior.
- The floating action group itself stays transparent; dark-theme floating-button enhancement applies to the buttons, not their layout wrapper.

## Hamburger menu structure and click target

The current implementation keeps one real button per row. The section wrapper is not clickable and never contains a nested button; expanded actions are sibling descendants. This prevents a parent click from firing a child action twice.

```text
div.dashboard-header-modern
└── div.header-actions
    ├── NotificationBell
    └── div (hamburgerRef; position: relative)
        ├── button.header-menu-btn (opens/closes the menu)
        └── div.dashboard-menu-panel
            ├── div (NetworkStatusIndicator; informational)
            ├── div.dashboard-menu-section (DashboardMenuSection: Language)
            │   ├── button.dashboard-menu-section-trigger (full-width toggle)
            │   └── div.dashboard-menu-section-content [always present; hidden when collapsed]
            │       └── button.menu-item-hover (one per language)
            ├── div.dashboard-menu-section (DashboardMenuSection: Appearance)
            │   ├── button.dashboard-menu-section-trigger (full-width toggle)
            │   └── div.dashboard-menu-section-content [always present; hidden when collapsed]
            │       ├── ThemeToggle
            │       ├── button.menu-item-hover (one per font family)
            │       └── button (one per font size)
            ├── div.dashboard-menu-section (DashboardMenuSection: Features)
            │   ├── button.dashboard-menu-section-trigger (full-width toggle)
            │   └── div.dashboard-menu-section-content [always present; hidden when collapsed]
            │       ├── button.menu-item-hover (Feature Settings)
            │       └── button.menu-item-hover (each hamburgerFeatures destination)
            ├── div.dashboard-menu-section (DashboardMenuSection: Import / Export)
            │   ├── button.dashboard-menu-section-trigger (full-width toggle)
            │   └── div.dashboard-menu-section-content [always present; hidden when collapsed]
            │       └── button.menu-item-hover (template, export, import)
            ├── div (Offline Queue; conditional)
            │   ├── button (retry upload)
            │   └── button (clear queue)
            ├── div.dashboard-menu-section-content.dashboard-menu-account-section (Profile / Admin)
            │   └── button.menu-item-hover (one per permitted destination; full-width)
            └── div.dashboard-menu-section-content.dashboard-menu-logout-section
                └── button.menu-item-hover (Logout; full-width)
```

Before the fix, the accordion button used `w-full` inside a wrapper with `px-4 py-2`; child action buttons had the same problem, and Features briefly used a different wrapper geometry while sharing the negative-margin rule. The horizontal padding lived on non-clickable parents, so row edges missed both the button hit area and hover fill. The four accordions now share `DashboardMenuSection`: their section wrappers have no padding, and the native trigger owns `width: 100%`, `box-sizing: border-box`, `min-height: 44px`, and 16 px inline padding. Expanded action rows use the same unpadded content width and own their padding on `.menu-item-hover`. Profile/Admin and Logout also use full-width action buttons. Theme and font-size choices remain separate controls. Enter/Space and focus-visible behavior come from the native button; `aria-expanded` and `aria-controls` describe each accordion. No nested buttons or parent click handlers are used.

## `main` comparison and restoration

| Capability | `origin/main` behavior | Regression in compact branch | Restored behavior |
|---|---|---|---|
| Placement | Separate Tabs and Hamburger Menu selectors | One combined list; placement selector removed | Selector restored; header and hamburger read their own list |
| Enable / disable | Independent available/enabled list per location; cannot disable the final item in a location | Only one shared list; Settings had an additional disable lock not present in `main` | Each location is edited independently and retains `main`'s minimum-one-item rule |
| Ordering | Desktop drag, touch drag, and numeric position input per location | Ordering applied to the merged list | All three ordering methods apply only to the selected location |
| Save | Saves tab order, legacy `enabledFeatures` as the tab list, and hamburger order | Wrote the merged order and an empty hamburger list | Restores the three-field save contract |
| Reset | Resets both location lists to `DEFAULT_FEATURES` | Reset wrote a unified list and empty hamburger list | Both location lists reset to defaults |
| Legacy records | Uses `enabledFeatures` when location-specific lists are absent; migrates cards/ewallets to payment methods; excludes profile/admin | Merging could revive disabled items and collapse placement | Each missing list falls back independently; aliases remain normalized and deduplicated |
| Hamburger Features | Always includes Feature Settings; destination buttons follow hamburger order | Feature destinations and placement management were not independent | Feature Settings entry remains; configured hamburger destinations are listed beneath it |

The initial comparison used `origin/main` at `3e30faf` and the early compact-navigation implementation at `235cc11`. The final tested source is `firebase-testing` at `c053561`; it was selectively promoted onto latest `origin/main` at `7718d54`, without the two branch-specific `AGENTS.md` commits. No permissions or admin checks changed as part of this restoration.

## Settings compatibility

- Prefer `tabFeatures` for the header and `hamburgerFeatures` for the menu independently.
- If one location list is absent, use `enabledFeatures` for that list, as the `main` implementation does. An explicit empty array stays empty.
- Normalize `cards` and `ewallets` to `paymentMethods`, remove duplicates, and filter utility-only `profile`/`admin` entries.
- Opening settings does not write Firestore. Saving stores `enabledFeatures = tabFeatures` for older clients and saves both location arrays. Reset stores defaults in all three fields.

## Components

- `web/src/pages/Dashboard.tsx`: renders the scrollable Tabs row, hamburger sections, expanded feature destinations, and existing floating expense actions.
- `web/src/components/navigation/CompactNavigation.tsx`: renders and scrolls the header's Tabs list.
- `web/src/components/navigation/FloatingExpenseActions.tsx`: keeps add expense and scan receipt as separate fixed actions; the parent only positions the buttons.
- `web/src/components/navigation/DashboardMenuSection.tsx`: owns the shared accordion trigger, ARIA state, and content wrapper for all four hamburger sections.
- `web/src/components/settings/FeatureManager.tsx`: restores independent location selection, availability, ordering, save, and reset behavior from `main`.
- `web/src/services/featureSettingsService.ts`: persists both location lists and resets both to defaults.
- `web/src/index.css`: defines full-row hamburger section triggers and compact navigation/FAB layout.
- `web/src/locales/translations.ts`: provides the Tabs and Hamburger Menu selector labels in English, Traditional Chinese, and Simplified Chinese.
- Design artifacts: `compact-navigation-v2/navigation-desktop.svg`, `compact-navigation-v2/navigation-mobile-a.svg`, and `compact-navigation-v2/navigation-preview.html`.

## Validation

- Tests cover independent location lists, touch and numeric ordering, Settings toggle behavior, legacy aliases, empty lists, reset persistence, hamburger trigger/action row width, minimum target size, and accordion semantics. FAB regression coverage confirms the dark-theme wrapper has no background or shadow while each button action remains independent.
- Verify hamburger accordion left/right/top/bottom row edges, arrows, and labels all activate the same row; verify keyboard, expanded state, and each expanded action.
- Confirm header tabs and hamburger features follow their independent saved orders; verify the add and scan floating actions retain their existing behavior.
- Run the project test suite, lint, standard build, Firebase build, and `git diff --check`.
- Review desktop and mobile at 1280, 768, 390, 375, and 320 px; check light/dark and Warm Kitty themes and the three supported languages.

## Firebase test deployment

The `firebase-testing` branch uses the existing Firebase project and backend for UI preview. Avoid creating, editing, or deleting expense records during deployment checks.

Both branches use `.github/workflows/firebase-hosting-deploy.yml`: `main` deploys to the live channel with no preview expiry, while `firebase-testing` deploys to the isolated `compact-navigation-v2` preview channel for seven days. The preview-only expiry and deployment summary are scoped to the testing branch. The user explicitly approved promoting this UI to `main`; future test pushes remain isolated from production.
