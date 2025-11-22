# Payment Methods Style Fix

## Issue
The "Payment Methods" section had broken styling in dark mode:
1. The tab navigation (Cards vs E-Wallets) was using hardcoded Tailwind classes (`text-blue-600`, `border-gray-200`) which did not adapt to the dark mode theme.
2. The action buttons (Edit/Delete) in `CardManager` and `EWalletManager` were relying on `.desktop-actions` and `.mobile-actions` classes which were missing from the component styles, potentially causing layout issues.

## Fixes Applied

### 1. PaymentMethodsTab.tsx
- Removed hardcoded Tailwind classes.
- Implemented a `styles` object using CSS variables:
  - `var(--text-primary)` / `var(--text-secondary)` for text colors.
  - `var(--accent-primary)` for active tab indication.
  - `var(--border-color)` for borders.
- This ensures the tabs look correct in both light and dark modes.

### 2. CardManager.tsx & EWalletManager.tsx
- Injected a `<style>` block to define `.desktop-actions` and `.mobile-actions`.
- This ensures that:
  - Desktop view shows the individual Edit/Delete buttons.
  - Mobile view shows the hamburger menu.
  - Layout is preserved across screen sizes.

## Verification
- Check the "Payment Methods" tab in the application.
- Toggle between Light and Dark mode.
- Verify that the active tab is clearly visible and highlighted with the accent color.
- Verify that the list of Cards and E-Wallets displays correctly.
- Check that the Edit/Delete actions are accessible.


## Recent Update: Bank Option Added
- Added full Bank list to payment method selector (now: Cards / Banks / E-Wallets).
- Ensured CardForm & PaymentMethodsTab properly pass and render `banks`.
- Banks follow optimistic + cache update pattern (no stale reload after edits).
