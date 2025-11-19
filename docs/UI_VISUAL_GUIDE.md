# Visual Guide to UI Changes

The dashboard shell has been refactored into a gradient hero, a single hamburger-driven command center, and tokenized navigation tabs. Use this guide to understand how the pieces fit together before touching UI code.

## 1. Gradient Header Card

The entire header is now a single `dashboard-card` with a purple gradient background and white typography.

```
┌──────────────────────────────────────────────────────────────┐
│ 💰 Expense Manager                               [≡]        │
│ Welcome back, user@email                           queue=2  │
└──────────────────────────────────────────────────────────────┘
```

- Gradient: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`.
- Left column: title + welcome message (truncated for small screens).
- Right column: hamburger trigger with optional orange queue badge (pending offline sync).
- Card uses `border: none`, `box-shadow: 0 10px 20px rgba(0,0,0,0.1)` to distinguish it from the body cards.

## 2. Hamburger Command Center

Clicking the hamburger opens a fly-out with grouped sections. Each block inherits theme tokens, so there are no separate light/dark styles to maintain.

```
┌────────────────────────────────────────────┐
│ Language / 語言        ▶                 │
│ Appearance              ▶                 │
│ Features                ▶                 │
│ Import / Export         ▶                 │
│ Pending Uploads (if any)                   │
│ Profile / Admin buttons                    │
│ Theme Toggle (Light / Dark / System)       │
│ Logout (red)                               │
└────────────────────────────────────────────┘
```

Section details:

- **Language**: English, 繁體中文, 简体中文 with radio-style highlighting.
- **Appearance**: font family (System/Serif/Mono) and font scale (A-, A, A+) controls wired to `ThemeContext`.
- **Features**: dynamic list sourced from feature settings, opens the relevant tab and closes the menu.
- **Import / Export**: downloads template, exports Excel, or opens the import modal.
- **Offline Queue**: appears only when `offlineQueue.count() > 0` and includes a clear button.
- **Profile & Admin**: relocated here for a cleaner tab bar; Admin button only renders for privileged users.
- **Theme Toggle**: persists the next mode and syncs with system preferences when set to `system`.
- **Logout**: always anchored to the bottom with red text.

All sections rely on the `.menu-item-hover` helper so hover and active states adapt to dark mode without extra code.

## 3. Header Status Rail

`HeaderStatusBar` renders directly below the hero card and surfaces long-running background jobs:

- Import progress (% indicator + message).
- Bulk delete progress.
- Dismiss buttons feed back into the state machine.

Always ensure new async jobs hook into this bar instead of adding ad-hoc toasts near the header.

## 4. Navigation Tabs

Tabs now read from the user’s feature settings (`tabFeatures`/`enabledFeatures`).

```
[Dashboard] [Expenses] [Incomes] [Categories] [Budgets] [Recurring] [Payment Methods]
```

- Active tab background: `var(--tab-active-bg)` gradient with white text.
- Inactive tab: `var(--tab-inactive-bg)` with secondary text tone.
- Tabs become scrollable on narrow screens and are hidden entirely for Profile/Admin (those live in the hamburger).

## 5. Floating “Add Expense” Button

- Appears on every tab except Expenses and is hidden automatically whenever a modal/menu is open.
- Desktop: rectangle with label `+ Add New Expense`.
- Mobile: circular 56px button with just `+`.
- Taps open the standard expense modal; the modal now respects the global font scaling and theme tokens.

```
Desktop:                                    Mobile:
┌──────────────────────┐                    ┌──────┐
│ + Add New Expense    │                    │  +   │
└──────────────────────┘                    └──────┘
```

## 6. UX Behaviors

- **Hover / Focus**: All interactive elements share the same transitions defined in `index.css`. Avoid inline overrides.
- **Click Outside**: Hamburger, language, import/export dropdown, and action sheets close when clicking outside.
- **Responsive Copy**: Header text, tabs, and inline chips truncate gracefully with `text-overflow: ellipsis`.
- **Queue Badge**: Shows the number of offline actions; inherits warning colors automatically.

## Usage Examples

- **Import data**: Hamburger → Import / Export → Import Data → follow modal steps documented in `UI_CHANGES.md`.
- **Switch theme**: Hamburger → Theme Toggle (cycles Light → Dark → System).
- **Change typography**: Hamburger → Appearance → choose font family + scale. Confirm cards still layout correctly.
- **Open Admin**: Hamburger → Admin (option only if `isAdmin` is true).

## Screen Size Breakpoints

- `< 768px`: Hamburger icon persists, tabs become scrollable, floating button shrinks to icon-only.
- `≥ 768px`: Tabs spread evenly, floating button shows the label, header text expands.
- `< 360px`: Additional padding reductions inside cards (handled automatically via CSS media queries).

## Accessibility Notes

- Hamburger button exposes `aria-expanded` and `aria-controls` for each collapsible section.
- Import/export modal traps focus; Escape closes it unless a background task is running.
- FAB has a `title` and `aria-label` so screen readers describe the action.
- Contrast stays WCAG AA compliant in both themes because everything is token-based.

## Browser Support & Performance

- Verified on Chrome, Edge, Safari, Firefox, iOS Safari, and Chrome Mobile.
- State hooks rely on passive listeners and debounced effects; no measurable layout thrash.
- Additional bundle impact from the menu + theme toggle logic is negligible (<3 KB gzipped).
