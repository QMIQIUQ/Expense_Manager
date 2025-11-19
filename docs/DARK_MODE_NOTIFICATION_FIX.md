# Dark Mode Notification Fix

## Issue
The notification system (HeaderStatusBar) was using hardcoded light-mode colors for backgrounds and icons, causing them to appear too bright and out of place in dark mode.

## Changes
Modified `src/components/HeaderStatusBar.tsx` to use CSS variables instead of hardcoded hex values.

### 1. Updated `getNotificationColor`
Changed return values from hex codes to CSS variables:
- Success: `#10b981` -> `var(--success-text)`
- Error: `#ef4444` -> `var(--error-text)`
- Info: `#3b82f6` -> `var(--info-text)`
- Pending: `#f59e0b` -> `var(--warning-text)`
- Default: `#6b7280` -> `var(--text-secondary)`

### 2. Updated Styles
Replaced hardcoded background colors with theme-aware CSS variables:
- `statusItemImporting`: `var(--info-bg)`
- `statusItemDeleting`: `var(--warning-bg)`
- `statusItemComplete`: `var(--success-bg)`
- `statusItemError`: `var(--error-bg)`
- `statusItemDefault`: `var(--card-bg)`

Added `borderColor` to match the text color for better visibility in both modes.

### 3. Updated Icons
Updated inline styles for checkmark and cross icons to use `var(--success-text)` and `var(--error-text)`.

### 4. Updated Progress Bar
- Background: `var(--bg-tertiary)`
- Fill: `var(--accent-primary)`

## Result
Notifications will now automatically adapt to the current theme (light or dark) using the application's existing CSS variable system.
