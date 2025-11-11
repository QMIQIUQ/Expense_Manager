# Testing Guide - Credit Card Feature

## Pre-Testing Setup

### 1. Firebase Configuration
Ensure your Firebase project has:
- Firestore database enabled
- Authentication configured
- Security rules updated to allow `cards` collection access

### 2. Security Rules Update
Add to `firestore.rules`:
```
match /cards/{cardId} {
  allow read, write: if request.auth != null && 
    request.auth.uid == resource.data.userId;
  allow create: if request.auth != null && 
    request.auth.uid == request.resource.data.userId;
}
```

### 3. Create Test Data

#### Sample Categories (if not exist)
- Food & Dining 🍔
- Transportation 🚗
- Shopping 🛍️
- Entertainment 🎬
- Bills & Utilities 📄

#### Sample Card 1: High-Tier Cashback
```json
{
  "name": "Chase Freedom Unlimited",
  "cardLimit": 10000,
  "billingDay": 25,
  "cardType": "cashback",
  "cashbackRules": [
    {
      "linkedCategoryId": "food-dining-id",
      "minSpendForRate": 500,
      "rateIfMet": 0.08,
      "capIfMet": 15,
      "rateIfNotMet": 0.01,
      "capIfNotMet": 5
    },
    {
      "linkedCategoryId": "shopping-id",
      "minSpendForRate": 300,
      "rateIfMet": 0.05,
      "capIfMet": 10,
      "rateIfNotMet": 0.01,
      "capIfNotMet": 3
    }
  ]
}
```

#### Sample Card 2: Simple Cashback
```json
{
  "name": "Citi Double Cash",
  "cardLimit": 5000,
  "billingDay": 15,
  "cardType": "cashback",
  "cashbackRules": [
    {
      "linkedCategoryId": "all-categories",
      "minSpendForRate": 0,
      "rateIfMet": 0.02,
      "capIfMet": 50,
      "rateIfNotMet": 0.02,
      "capIfNotMet": 50
    }
  ]
}
```

## Test Scenarios

### Scenario 1: Card Creation
**Objective**: Verify card creation with validation

**Steps**:
1. Navigate to Cards tab
2. Click "Add Card"
3. Fill in invalid data (empty name, billing day 0):
   - ✅ Verify validation errors appear
4. Fill in valid data:
   - Name: "Test Card"
   - Limit: $5,000
   - Billing Day: 15
   - Card Type: Cashback
5. Add a cashback rule:
   - Category: Food & Dining
   - Min Spend: $300
   - Rate if Met: 5%
   - Cap if Met: $20
   - Rate if Not Met: 1%
   - Cap if Not Met: $5
6. Click Save

**Expected Results**:
- ✅ Card appears in list
- ✅ Spend-to-cap calculation shown correctly ($20 / 0.05 = $400)
- ✅ Success notification displayed
- ✅ Card saved to Firebase

### Scenario 2: Billing Cycle Calculation
**Objective**: Verify billing cycle dates are calculated correctly

**Setup**:
- Card with billing day = 25
- Today's date: March 20, 2025

**Steps**:
1. View card statistics
2. Check displayed cycle dates

**Expected Results**:
- ✅ Current cycle: Feb 25 - Mar 24
- ✅ Next billing: Mar 25

**Test Edge Case - Month Boundary**:
- Today: March 26, 2025
- Expected cycle: Mar 25 - Apr 24
- Next billing: Apr 25

**Test Edge Case - February**:
- Billing day: 28
- Today: Feb 15, 2025
- Expected cycle: Jan 28 - Feb 27
- Next billing: Feb 28

### Scenario 3: Cashback Calculation - Below Threshold
**Objective**: Verify lower rate applied when below minimum spend

**Setup**:
- Card: Chase Freedom Unlimited (from sample data)
- Rule: Food 8% if $500+, else 1%
- Current date: Within billing cycle

**Steps**:
1. Add expense: $150, Food & Dining, linked to card
2. Check card statistics

**Expected Results**:
- ✅ Category spend: $150
- ✅ Estimated cashback: $1.50 (150 × 0.01)
- ✅ Required to reach min: $350
- ✅ Required to reach cap: $38 (at 8%: $15/0.08 = $188, so $188 - $150 = $38)

### Scenario 4: Cashback Calculation - Above Threshold
**Objective**: Verify higher rate applied when above minimum spend

**Steps** (continuing from Scenario 3):
1. Add another expense: $400, Food & Dining, linked to card
2. Total food spending: $550
3. Check card statistics

**Expected Results**:
- ✅ Category spend: $550
- ✅ Estimated cashback: $15.00 (capped at $15, though 550 × 0.08 = $44)
- ✅ Required to reach min: $0 (already met)
- ✅ Required to reach cap: $0 (already at cap)
- ✅ Dashboard shows suggestion: "Already maxed out rewards for Food & Dining"

### Scenario 5: Credit Utilization
**Objective**: Verify utilization percentage and color coding

**Setup**:
- Card limit: $5,000
- Billing cycle: Mar 15 - Apr 14

**Steps**:
1. Add expenses totaling $1,000 (20% utilization)
   - Check bar color: Green
2. Add expenses totaling $1,500 more ($2,500 total, 50%)
   - Check bar color: Still Green
3. Add expenses totaling $500 more ($3,000 total, 60%)
   - Check bar color: Orange
4. Add expenses totaling $1,500 more ($4,500 total, 90%)
   - Check bar color: Red

**Expected Results**:
- ✅ Bar fills correctly according to percentage
- ✅ Colors: Green (0-50%), Orange (51-80%), Red (81-100%)
- ✅ Available credit updates: $5,000 - [spending]
- ✅ All calculations accurate

### Scenario 6: Multiple Cards
**Objective**: Verify multiple cards work independently

**Steps**:
1. Create Card A (billing day 15) with $200 in expenses
2. Create Card B (billing day 25) with $300 in expenses
3. View dashboard

**Expected Results**:
- ✅ Card A shows $200 spending for its cycle
- ✅ Card B shows $300 spending for its cycle
- ✅ Cards don't interfere with each other
- ✅ Total expense count is correct across all cards

### Scenario 7: Expense Without Card
**Objective**: Verify cash/no card expenses still work

**Steps**:
1. Add expense without selecting a card (cash payment)
2. View dashboard

**Expected Results**:
- ✅ Expense saved successfully
- ✅ Doesn't appear in any card's spending
- ✅ Shows in total expenses
- ✅ Cards statistics unaffected

### Scenario 8: Card Editing
**Objective**: Verify card updates work correctly

**Steps**:
1. Edit existing card
2. Change billing day from 15 to 20
3. Add new cashback rule
4. Save changes

**Expected Results**:
- ✅ Changes saved to Firebase
- ✅ Billing cycle recalculates with new day
- ✅ New rule appears and calculates correctly
- ✅ Existing expenses still linked
- ✅ Statistics update immediately

### Scenario 9: Card Deletion
**Objective**: Verify card deletion and orphaned expenses

**Steps**:
1. Create card with linked expenses
2. Delete card (confirm)
3. Check expenses

**Expected Results**:
- ✅ Card removed from list
- ✅ Deletion confirmation required
- ✅ Expenses keep their cardId but card no longer exists
- ✅ Expenses still visible in expense list
- ✅ Dashboard doesn't crash

**Note**: Consider implementing warning about linked expenses before deletion

### Scenario 10: Dashboard Integration
**Objective**: Verify dashboard displays correct information

**Steps**:
1. Have 2-3 cards with different spending levels
2. View dashboard home tab

**Expected Results**:
- ✅ CardsSummary shows top 3 cards
- ✅ Each card shows:
  - Name
  - Current spending
  - Utilization bar (correct color)
  - Available credit
  - Estimated cashback (if applicable)
  - Next billing date
  - Smart suggestions (if applicable)
- ✅ Layout responsive on mobile
- ✅ Clicking card suggestion helpful

### Scenario 11: Month Override
**Objective**: Test month-specific billing day override

**Steps**:
1. Create card with billing day 25
2. Add month override for Feb 2025: day 28
3. View on different dates in Feb 2025

**Test Dates**:
- Feb 1, 2025: Cycle should be Jan 25 - Feb 27
- Feb 28, 2025: Next billing should be Feb 28
- Mar 1, 2025: Cycle should be Feb 28 - Mar 24

**Expected Results**:
- ✅ Override applied only for Feb 2025
- ✅ Other months use regular billing day (25)
- ✅ Calculations correct for override month
- ✅ Transitions correctly at month boundaries

### Scenario 12: Responsive Design
**Objective**: Verify UI works on different screen sizes

**Devices to Test**:
- Desktop (1920×1080)
- Tablet (768×1024)
- Mobile (375×667)

**Check**:
- ✅ Cards tab layout adapts
- ✅ Card form usable on mobile
- ✅ Dashboard CardsSummary readable
- ✅ No horizontal scroll
- ✅ Touch targets adequate size
- ✅ Text readable without zoom

### Scenario 13: Translation Support
**Objective**: Verify Chinese/English translations

**Steps**:
1. Switch language to 繁體中文
2. Navigate to Cards tab
3. Create a new card

**Expected Results**:
- ✅ All labels translated
- ✅ Field names in Chinese
- ✅ Button text translated
- ✅ Validation messages in Chinese
- ✅ Dashboard widget translated

**Repeat for**:
- 简体中文
- English

## Performance Testing

### Load Test
1. Create 10 cards
2. Create 100 expenses across cards
3. Navigate to Cards tab
4. Navigate to Dashboard

**Expected**:
- ✅ Page loads < 2 seconds
- ✅ No lag when scrolling
- ✅ Calculations complete quickly
- ✅ No console errors

### Optimistic Updates
1. Turn off network (airplane mode / DevTools offline)
2. Create a card
3. Edit a card
4. Delete a card
5. Turn network back on

**Expected**:
- ✅ Changes appear immediately
- ✅ Success notifications shown
- ✅ Changes queued in offline queue
- ✅ Auto-sync when online
- ✅ No data loss

## Edge Cases

### Edge Case 1: Extreme Values
- Card limit: $1,000,000
- Expense: $999,999
- Verify calculations don't overflow

### Edge Case 2: Zero Values
- Card limit: $0
- Cashback rate: 0%
- Cashback cap: $0
- Verify no division by zero errors

### Edge Case 3: Decimal Precision
- Cashback rate: 8.5%
- Expense: $123.45
- Verify: $123.45 × 0.085 = $10.49 (rounded correctly)

### Edge Case 4: Past Dates
- Add expense from 2 months ago with card
- Verify it doesn't count in current cycle

### Edge Case 5: Future Dates
- Try to add expense with future date
- Verify validation or proper handling

## Bug Checklist

Common issues to watch for:
- [ ] Division by zero in spend-to-cap calculation
- [ ] Billing cycle calculation at month/year boundaries
- [ ] February with 28/29 days
- [ ] Orphaned expenses when card deleted
- [ ] Race conditions in optimistic updates
- [ ] Memory leaks with many cards
- [ ] Incorrect cashback when multiple rules for same category
- [ ] Currency formatting issues
- [ ] Timezone issues with dates
- [ ] XSS vulnerabilities in card names

## Regression Testing

After any changes, verify:
- [ ] Existing expenses still work
- [ ] Other tabs (Categories, Budgets, Recurring) unaffected
- [ ] Dashboard summary calculations correct
- [ ] Export/Import functionality still works
- [ ] Authentication still required
- [ ] Admin functions still work

## Accessibility Testing

### Keyboard Navigation
- [ ] Tab through all form fields
- [ ] Enter to submit forms
- [ ] Escape to close modals
- [ ] Arrow keys in dropdowns

### Screen Reader
- [ ] Form labels read correctly
- [ ] Error messages announced
- [ ] Button purposes clear
- [ ] Card statistics understandable

### Visual
- [ ] Sufficient color contrast
- [ ] Not relying only on color (utilization bar also shows %)
- [ ] Text readable at 200% zoom
- [ ] Focus indicators visible

## Security Testing

### Input Validation
- [ ] SQL injection attempts (card names, amounts)
- [ ] XSS attempts in text fields
- [ ] Negative amounts rejected
- [ ] Excessive string lengths handled

### Authorization
- [ ] Users can only see their own cards
- [ ] Cannot access other users' cards via URL manipulation
- [ ] Firebase rules enforce userId matching

### Data Integrity
- [ ] Card IDs properly generated
- [ ] Timestamps accurate
- [ ] No duplicate cards
- [ ] Cascading deletes handled properly

## Sign-Off Checklist

Before marking feature complete:
- [ ] All test scenarios pass
- [ ] No console errors or warnings
- [ ] Build successful
- [ ] Lint passes
- [ ] Performance acceptable
- [ ] Edge cases handled
- [ ] Translations complete
- [ ] Documentation accurate
- [ ] Screenshots captured
- [ ] Ready for production

## Screenshots Needed

1. **Cards Tab - Empty State**
   - "No cards yet" message

2. **Cards Tab - Card List**
   - 2-3 cards with different statuses

3. **Add Card Form - Basic Details**
   - Form filled out with validation

4. **Add Card Form - Cashback Rules**
   - Multiple rules configured

5. **Card Details - Expanded**
   - Cashback breakdown visible

6. **Dashboard - CardsSummary**
   - Widget showing 3 cards with statistics

7. **Expense Form - Card Selection**
   - Dropdown showing available cards

8. **Mobile - Cards Tab**
   - Responsive layout on phone

9. **Mobile - Dashboard**
   - CardsSummary on phone

10. **Utilization Examples**
    - Green bar (low usage)
    - Orange bar (medium usage)
    - Red bar (high usage)

---

**Testing Status**: Pending deployment
**Last Updated**: 2025-11-10
**Tester**: _To be assigned_
