# 💳 Credit Card Management Feature

## Overview

This feature adds comprehensive credit card management and cashback calculation capabilities to the Expense Manager application. Users can track multiple credit cards, configure cashback rules, and get real-time insights into their spending and rewards.

## Features

### 1. Credit Card Management
- ✅ Add, edit, and delete multiple credit cards
- ✅ Configure card details: name, limit, billing day
- ✅ Support for cashback and points card types
- ✅ Set optional benefit minimum spend thresholds

### 2. Billing Cycle Tracking
- ✅ Automatic billing cycle calculation based on billing day (1-28)
- ✅ Support for month-specific billing day overrides
- ✅ Next billing date display
- ✅ Current cycle spending calculation

### 3. Cashback Rules
- ✅ Multiple cashback rules per card
- ✅ Category-based cashback rates
- ✅ Tiered rates (met/not met minimum spend)
- ✅ Cashback caps per rule
- ✅ Real-time spend-to-cap calculation

### 4. Dashboard Integration
- ✅ Cards tab with full management UI
- ✅ Card statistics on dashboard home
- ✅ Spending utilization visualization
- ✅ Cashback suggestions and insights

### 5. Expense Tracking
- ✅ Link expenses to credit cards
- ✅ Optional card selection when adding expenses
- ✅ Automatic cycle-based spending calculation

## Data Structure

### Card Model
```typescript
interface Card {
  id?: string;
  userId: string;
  name: string;                    // e.g., "Chase Freedom Unlimited"
  cardLimit: number;               // Credit limit
  billingDay: number;              // 1-28, fixed billing day each month
  perMonthOverrides?: MonthOverride[];  // Optional month-specific overrides
  benefitMinSpend?: number;        // Optional: overall minimum spend
  cardType: 'cashback' | 'points'; // Card type
  cashbackRules?: CashbackRule[];  // Cashback rules (if cashback card)
  createdAt: Date;
  updatedAt: Date;
}
```

### Cashback Rule Model
```typescript
interface CashbackRule {
  id?: string;
  linkedCategoryId: string;        // Links to existing category
  minSpendForRate: number;         // Min spend for higher rate
  rateIfMet: number;               // e.g., 0.08 for 8%
  capIfMet: number;                // Max cashback when met
  rateIfNotMet: number;            // e.g., 0.01 for 1%
  capIfNotMet: number;             // Max cashback when not met
}
```

### Month Override Model (for irregular billing dates)
```typescript
interface MonthOverride {
  year: number;                    // e.g., 2025
  month: number;                   // 1-12
  day: number;                     // 1-31
}
```

## Billing Cycle Logic (Design Decision: Option A)

### Approach
We implemented **Option A** (recommended in requirements):
- Regular billing day (1-28) stored in `billingDay` field
- Optional `perMonthOverrides` array for month-specific exceptions
- Balances simplicity with flexibility

### Calculation Rules
1. **Billing Cycle Definition**:
   - Cycle runs from `billing_day` to `(next_month_billing_day - 1 day)`
   - Example: `billingDay=25` → Feb 25 to Mar 24, then Mar 25 to Apr 24

2. **Current Cycle Determination**:
   - If today < billing_day: cycle is last month's billing_day to today's month's (billing_day-1)
   - If today >= billing_day: cycle is this month's billing_day to next month's (billing_day-1)

3. **Month-Specific Overrides**:
   - Check `perMonthOverrides` array for specific year-month combinations
   - If found, use override day instead of regular billing_day
   - Example: Override Feb 2025 from day 25 to day 28:
     ```typescript
     perMonthOverrides: [{ year: 2025, month: 2, day: 28 }]
     ```

### Example Usage

#### Regular Billing (no overrides)
```typescript
const card: Card = {
  name: "Chase Freedom",
  cardLimit: 10000,
  billingDay: 25,
  cardType: "cashback",
  // ...other fields
};

// If today is March 20:
// Current cycle: Feb 25 - Mar 24
// Next billing date: Mar 25
```

#### With Month Override
```typescript
const card: Card = {
  name: "Chase Freedom",
  cardLimit: 10000,
  billingDay: 25,
  perMonthOverrides: [
    { year: 2025, month: 2, day: 28 }  // Feb 2025 billing day is 28
  ],
  cardType: "cashback",
  // ...other fields
};

// If today is Feb 27, 2025:
// Current cycle: Jan 25 - Feb 27 (override applied)
// Next billing date: Feb 28, 2025
```

## Cashback Calculation

### How It Works

1. **Per-Rule Calculation**:
   - Get all expenses in current cycle for the card
   - Filter expenses by linked category
   - Calculate total spending in that category
   - Compare with `minSpendForRate`:
     - If `categorySpend >= minSpendForRate`: use `rateIfMet` and `capIfMet`
     - Otherwise: use `rateIfNotMet` and `capIfNotMet`
   - Calculate: `cashback = min(categorySpend * rate, cap)`

2. **Insights Provided**:
   - **Estimated Cashback**: Current cashback amount for the rule
   - **Required to Reach Min Spend**: How much more to spend to unlock higher rate
   - **Required to Reach Cap**: How much more to spend to maximize cashback

### Example

```typescript
const cashbackRule: CashbackRule = {
  linkedCategoryId: "food-dining-id",
  minSpendForRate: 500,      // Need $500 to get higher rate
  rateIfMet: 0.08,           // 8% if $500+ spent
  capIfMet: 15,              // Max $15 cashback
  rateIfNotMet: 0.01,        // 1% if less than $500
  capIfNotMet: 5,            // Max $5 cashback
};

// Scenario 1: Spent $300 on food
// Result: $300 * 0.01 = $3 (under cap of $5)
// Insight: Spend $200 more to unlock 8% rate
// Insight: Spend $188 more to reach $15 cap (at 8% rate: $15/0.08 = $188)

// Scenario 2: Spent $600 on food
// Result: $600 * 0.08 = $48, capped at $15
// Insight: Already at cap, no more benefits in this category
```

## Usage Guide

### Adding a New Card

1. Navigate to the **Cards** tab
2. Click **+ Add Card**
3. Fill in card details:
   - **Card Name**: Give it a memorable name
   - **Card Limit**: Your credit limit
   - **Billing Day**: Choose 1-28 (e.g., 25 for the 25th of each month)
   - **Benefit Min Spend** (optional): Overall minimum spend threshold
   - **Card Type**: Select "Cashback" or "Points"

4. For cashback cards, add cashback rules:
   - Click **+ Add Cashback Rule**
   - Select a **Linked Category** (e.g., "Food & Dining")
   - Set **Min Spend for Higher Rate** (e.g., $500)
   - Set **Rate if Met** (e.g., 8%)
   - Set **Cap if Met** (e.g., $15)
   - Set **Rate if Not Met** (e.g., 1%)
   - Set **Cap if Not Met** (e.g., $5)
   - View **Spend to Reach Cap** calculation automatically

5. Click **Save**

### Linking Expenses to Cards

1. When adding an expense, use the **Select Card** dropdown
2. Choose the card you used (or leave as "None / Cash")
3. The expense will be counted toward that card's current cycle spending
4. Card statistics will update automatically

### Viewing Card Statistics

#### On Dashboard Home
- See top 3 cards with:
  - Current cycle spending
  - Credit utilization bar (color-coded)
  - Available credit
  - Estimated cashback
  - Smart suggestions (e.g., "Spend $X more on Y to max out rewards")

#### On Cards Tab
- View all cards with detailed information
- Expand each card to see:
  - Cashback breakdown by rule
  - Category spending
  - Required amounts to reach thresholds

## Firestore Structure

### Collection: `cards`
```
cards/
  {cardId}/
    userId: string
    name: string
    cardLimit: number
    billingDay: number
    perMonthOverrides: array (optional)
    benefitMinSpend: number (optional)
    cardType: string ("cashback" | "points")
    cashbackRules: array (optional)
      - linkedCategoryId: string
      - minSpendForRate: number
      - rateIfMet: number
      - capIfMet: number
      - rateIfNotMet: number
      - capIfNotMet: number
    createdAt: timestamp
    updatedAt: timestamp
```

### Updated Collection: `expenses`
```
expenses/
  {expenseId}/
    ...existing fields...
    cardId: string (optional, new field)
```

## API / Service Layer

### `cardService.ts`
```typescript
// Create a new card
create(card: Omit<Card, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>

// Get all cards for user
getAll(userId: string): Promise<Card[]>

// Update a card
update(id: string, updates: Partial<Card>): Promise<void>

// Delete a card
delete(id: string): Promise<void>
```

### `cardUtils.ts`
```typescript
// Calculate current billing cycle
getCurrentBillingCycle(card: Card, referenceDate?: Date): BillingCycle

// Get next billing date
getNextBillingDate(card: Card, referenceDate?: Date): string

// Calculate total spending in current cycle
calculateCurrentCycleSpending(card: Card, expenses: Expense[]): number

// Calculate category spending
calculateCategorySpending(card: Card, expenses: Expense[], categoryId: string): number

// Calculate cashback for a specific rule
calculateRuleCashback(rule: CashbackRule, categorySpend: number): CashbackResult

// Calculate complete card statistics
calculateCardStats(card: Card, expenses: Expense[], categories: Category[]): CardStats
```

## Testing

### Manual Testing Steps

1. **Create a Card**:
   - Add a new cashback card with 2-3 rules
   - Verify billing day is within 1-28
   - Check that spend-to-cap calculations are correct

2. **Add Expenses**:
   - Create expenses and link them to the card
   - Verify they appear in current cycle spending
   - Check that category-specific spending is tracked

3. **View Dashboard**:
   - Check that card appears in dashboard summary
   - Verify utilization bar is correct
   - Confirm cashback estimates are accurate

4. **Test Billing Cycle**:
   - Create expenses on different dates
   - Verify only expenses within current cycle are counted
   - Test near billing day boundary

5. **Test Cashback Calculations**:
   - Spend below min threshold → verify lower rate applied
   - Spend above min threshold → verify higher rate applied
   - Exceed cap → verify capped amount shown

### Edge Cases to Test

- Card with no cashback rules (points card)
- Expenses without linked card (cash)
- Billing day at month boundaries (e.g., day 28)
- Month with fewer days (e.g., February)
- Multiple cards with same category rules

## Future Enhancements (Optional)

- [ ] Historical billing cycle reports
- [ ] Points card calculation (similar to cashback)
- [ ] Monthly billing day change notifications
- [ ] Automatic recurring charges
- [ ] Card benefit expiration tracking
- [ ] Export card statements
- [ ] Multi-currency support for international cards
- [ ] Annual fee tracking
- [ ] Payment due date reminders

## Technical Notes

### Why Option A for Billing Rules?
- **Simplicity**: Single `billingDay` field for most common case
- **Flexibility**: `perMonthOverrides` array handles exceptions
- **Performance**: No complex rule evaluation needed
- **Maintainability**: Easy to understand and debug
- **User-friendly**: Simple UI for overrides when needed

### Optimistic Updates
All card operations use optimistic updates:
- UI updates immediately
- Changes queued for background sync
- Rollback on failure
- Consistent with existing patterns (expenses, categories, budgets)

### Type Safety
- Full TypeScript coverage
- No `any` types (lint enforced)
- Proper type inference in calculations
- Type-safe Firebase operations

## Screenshots

_(Screenshots to be added after UI testing)_

1. Cards Tab - Card List View
2. Add Card Form - Basic Details
3. Add Card Form - Cashback Rules
4. Dashboard - Card Statistics Summary
5. Expense Form - Card Selection

## License

This feature is part of the Expense Manager project and follows the same MIT License.

---

**Built with ❤️ using TypeScript, React, and Firebase**
