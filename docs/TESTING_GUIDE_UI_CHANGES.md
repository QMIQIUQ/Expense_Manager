# Testing Guide for UI Changes

## Quick Start Testing

### Prerequisites
1. Navigate to your Expense Manager application
2. Log in with your credentials
3. Ensure you're on the Dashboard

## Test Scenarios

### 1. Test Header Dropdowns

#### Import/Export Dropdown
1. **Locate**: Top right corner, look for "📁 Import/Export ▾" button
2. **Click**: The button to open dropdown
3. **Verify**: You should see three options:
   - 📥 Download Template
   - 📤 Import Data
   - 📊 Export to Excel
4. **Test**: Click outside the dropdown - it should close
5. **Test**: Click each option to verify they work

#### User Menu Dropdown
1. **Locate**: Top right corner, look for "👤 Menu ▾" button
2. **Click**: The button to open dropdown
3. **Verify**: You should see:
   - 👤 Profile
   - 👑 Admin (only if you're an admin)
   - Logout (in red text, below a divider line)
4. **Test**: Click "Profile" - you should navigate to Profile page
5. **Test**: If admin, click "Admin" - you should navigate to Admin page
6. **Test**: Click outside - dropdown should close

### 2. Test Navigation Tabs

1. **Verify**: Main navigation should only show 5 tabs:
   - Dashboard
   - Expenses
   - Categories
   - Budgets
   - Recurring
2. **Verify**: Profile and Admin tabs are NO LONGER in the main navigation
3. **Verify**: They are accessible via the User Menu dropdown

### 3. Test Floating "Add Expense" Button

#### On Desktop (Browser Window ≥768px wide)
1. **Go to**: Dashboard tab
2. **Locate**: Bottom right corner - look for blue button
3. **Verify**: Button text should say "+ Add New Expense"
4. **Test**: Hover over button - it should scale up slightly
5. **Click**: Button to open modal

#### On Mobile (Browser Window <768px wide)
1. **Resize**: Browser window to less than 768px OR use mobile device
2. **Go to**: Dashboard tab
3. **Locate**: Bottom right corner
4. **Verify**: Button should show just "+" symbol
5. **Click**: Button to open modal

#### Test on All Tabs
1. **Dashboard**: ✓ Button should be visible
2. **Expenses**: ✗ Button should NOT be visible (form already on page)
3. **Categories**: ✓ Button should be visible
4. **Budgets**: ✓ Button should be visible
5. **Recurring**: ✓ Button should be visible
6. **Profile**: ✓ Button should be visible
7. **Admin**: ✓ Button should be visible

### 4. Test Expense Modal

1. **Click**: The floating "+ Add New Expense" button
2. **Verify**: Modal should appear with:
   - Title: "Add New Expense"
   - Close button (✕) in top right
   - Expense form fields:
     - Amount
     - Category
     - Description
     - Date
     - Notes
   - Submit and Cancel buttons
3. **Test**: Click outside modal (on dark overlay) - modal should close
4. **Test**: Click ✕ button - modal should close
5. **Test**: Click Cancel button - modal should close
6. **Test**: Fill in form and click Submit:
   - Modal should close
   - Expense should be created
   - You should see success notification

### 5. Test Responsive Behavior

#### Resize Test
1. **Start**: With browser at full width (>768px)
2. **Verify**: Floating button shows "+ Add New Expense"
3. **Resize**: Browser window smaller (<768px)
4. **Verify**: Floating button now shows just "+"
5. **Resize**: Browser window larger again (>768px)
6. **Verify**: Floating button shows "+ Add New Expense" again

### 6. Test Dropdown Interactions

1. **Open**: Import/Export dropdown
2. **Then Open**: User Menu dropdown
3. **Verify**: Import/Export dropdown should close automatically
4. **Test**: Open User Menu, then click Import/Export
5. **Verify**: User Menu should close automatically

### 7. Test Admin-Specific Features

#### If you ARE an admin:
1. **Open**: User Menu dropdown
2. **Verify**: You should see "👑 Admin" option
3. **Click**: Admin option
4. **Verify**: You navigate to Admin page

#### If you are NOT an admin:
1. **Open**: User Menu dropdown
2. **Verify**: You should NOT see "👑 Admin" option
3. **Verify**: Only Profile and Logout are visible

## Visual Verification Checklist

### Header
- [ ] Two dropdown buttons in top right corner
- [ ] Buttons are blue with white text
- [ ] Hover effect makes buttons slightly darker
- [ ] Dropdowns appear below buttons when clicked
- [ ] Dropdowns have white background with shadow

### Navigation
- [ ] Five tabs in main navigation
- [ ] No Profile or Admin tabs in main bar
- [ ] Active tab is highlighted in blue
- [ ] Inactive tabs are grey

### Floating Button
- [ ] Button is in bottom right corner
- [ ] Button is blue with white text
- [ ] Button has rounded corners (pill shape)
- [ ] Button has shadow effect
- [ ] Hover makes button scale up slightly
- [ ] Button shows correct text for screen size

### Modal
- [ ] Dark semi-transparent overlay behind modal
- [ ] White modal box centered on screen
- [ ] Close button (✕) visible in top right
- [ ] Form fields properly labeled
- [ ] Submit and Cancel buttons at bottom
- [ ] Modal is scrollable if content is long

## Browser Testing

Test on the following browsers:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

## Accessibility Testing

- [ ] Tab key navigation works through all elements
- [ ] Floating button has tooltip on hover
- [ ] Dropdown items are keyboard accessible
- [ ] Modal can be closed with Escape key
- [ ] All buttons have clear focus indicators

## Expected Behavior Summary

✅ **Should Work**:
- Creating expenses from any tab (except Expenses)
- Accessing Profile and Admin via dropdown
- Import/Export functions via dropdown
- Responsive button text changes
- Dropdown menus open/close properly
- Modal opens/closes properly

✅ **Should NOT Break**:
- Existing expense list on Expenses tab
- Category management
- Budget management
- Recurring expense management
- User authentication
- Data import/export functionality

## Troubleshooting

### Button not visible
- Check that you're not on the Expenses tab
- Check browser console for errors
- Refresh the page

### Dropdown not working
- Check browser console for errors
- Verify JavaScript is enabled
- Clear browser cache

### Modal not opening
- Check browser console for errors
- Verify categories are loaded
- Try refreshing the page

### Responsive text not changing
- Verify browser window is actually crossing 768px threshold
- Try hard refresh (Ctrl+F5 or Cmd+Shift+R)
- Check browser console for errors

## Success Criteria

All tests should pass with:
- ✅ No console errors
- ✅ No broken functionality
- ✅ Smooth user experience
- ✅ Proper responsive behavior
- ✅ All dropdowns working
- ✅ Modal working on all tabs
- ✅ Existing features still functional

## Report Issues

If you find any issues:
1. Note which test scenario failed
2. Check browser console for errors
3. Note your browser and screen size
4. Take a screenshot if possible
5. Report in the PR comments
