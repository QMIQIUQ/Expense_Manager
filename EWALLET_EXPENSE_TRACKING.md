# E-Wallet Expense Tracking Implementation

## Overview
Added expense tracking functionality to e-wallets, providing feature parity with credit cards. Users can now view all expenses made with each e-wallet, including total spending and detailed expense breakdowns.

## Changes Made

### 1. EWalletManager Component (`web/src/components/ewallet/EWalletManager.tsx`)

#### New Props
- `expenses: Expense[]` - Array of all expenses
- `categories: Category[]` - Array of all categories for display

#### New State
- `expandedWalletId: string | null` - Tracks which wallet's expense list is expanded

#### New Functionality

##### Expense Statistics Calculation
```typescript
const getWalletStats = useMemo(() => {
  // Filters expenses by paymentMethod === 'e_wallet' && paymentMethodName === wallet.name
  // Calculates total spending per wallet
  // Sorts expenses by date (newest first)
}, [ewallets, expenses]);
```

##### Helper Functions
- `toggleExpand(walletId)` - Expands/collapses expense list
- `formatDate(dateString, time)` - Formats expense date/time
- `getCategoryDisplay(categoryName)` - Shows category icon + name

#### UI Updates

##### Stats Section (shown when expenses exist)
- **Total Spending**: Displays sum of all wallet expenses
- **Expand/Collapse Button**: ChevronUp/Down icon to show/hide details

##### Expense List (when expanded)
Each expense item shows:
- Category icon and name
- Date and time
- Description (if available)
- Amount in green color

##### Styling
New styles added:
- `statsSection` - Container with top border
- `statRow` - Flex row for total spending display
- `statLabel`, `statValue` - Total spending text styles
- `expandButton` - Icon button for expand/collapse
- `expenseList` - Container for expense items
- `expenseItem` - Individual expense row with gray background
- `expenseInfo`, `expenseCategory`, `expenseDate`, `expenseDesc` - Info display styles
- `expenseAmount` - Green amount display

### 2. PaymentMethodsTab Component (`web/src/components/payment/PaymentMethodsTab.tsx`)

#### Updated Props Passing
Now passes `categories` and `expenses` props to `EWalletManager`:
```tsx
<EWalletManager
  ewallets={ewallets}
  categories={categories}
  expenses={expenses}
  onAdd={onAddEWallet}
  onUpdate={onUpdateEWallet}
  onDelete={onDeleteEWallet}
/>
```

### 3. Translations (`web/src/locales/translations.ts`)

#### New Translation Key
- `totalSpending`: 
  - en: "Total Spending"
  - zh: "總消費金額"
  - zh-CN: "总消费金额"

## How It Works

### Data Flow
1. Parent component (PaymentMethodsTab) receives expenses and categories
2. Props are passed down to EWalletManager
3. useMemo hook filters and calculates stats for each wallet
4. Stats are displayed in wallet cards
5. User can expand/collapse to view detailed expense list

### Expense Filtering Logic
```typescript
expenses.filter(
  (exp) => exp.paymentMethod === 'e_wallet' && exp.paymentMethodName === wallet.name
)
```

### Display Logic
- Only shows stats section if wallet has expenses
- Expenses sorted by date (newest first)
- Each expense shows: category, date/time, description, amount
- Expandable section controlled by expandedWalletId state

## User Experience

### Before
- E-wallets only showed static information (name, provider, account)
- No visibility into spending patterns
- No way to see which expenses used which wallet

### After
- Each wallet shows total spending amount
- Expandable list shows all expenses made with that wallet
- Easy to track spending per e-wallet
- Consistent with credit card expense tracking UI

## Visual Layout

```
┌─────────────────────────────────────┐
│ 💳 Wallet Icon  Wallet Name    🔵   │  Row 1: Icon, Name, Color Badge
│ Provider Name                        │  Row 2: Provider & Account
│ ···· 1234                           │
├─────────────────────────────────────┤
│ 總消費金額: $1,234.56           ▼   │  Stats: Total + Expand Button
│                                      │
│ ┌──────────────────────────────────┐│
│ │ 🍔 食物                          ││  Expense Item 1
│ │ Dec 25, 2023 14:30              ││
│ │ Lunch at restaurant             ││
│ │                          $45.00 ││
│ └──────────────────────────────────┘│
│ ┌──────────────────────────────────┐│
│ │ 🚗 交通                          ││  Expense Item 2
│ │ Dec 24, 2023 09:15              ││
│ │                          $12.50 ││
│ └──────────────────────────────────┘│
├─────────────────────────────────────┤
│                          ✏️  🗑️     │  Row 3: Actions
└─────────────────────────────────────┘
```

## Benefits

1. **Better Visibility**: Users can see exactly how much they've spent with each wallet
2. **Feature Parity**: E-wallets now have the same tracking capabilities as credit cards
3. **Detailed Breakdown**: Individual expenses listed with full context
4. **Performance**: useMemo ensures efficient recalculation
5. **Consistent UX**: Same expand/collapse pattern as credit card cashback breakdown

## Technical Notes

- Uses React.useMemo for performance optimization
- Expense filtering happens at render time (not in database)
- All calculations done client-side
- No backend changes required
- Maintains existing inline editing functionality
- Responsive design maintained (desktop/mobile actions)

## Testing Checklist

- [ ] Create multiple e-wallets
- [ ] Add expenses with different e-wallets
- [ ] Verify total spending calculation is accurate
- [ ] Test expand/collapse functionality
- [ ] Check expense list sorting (newest first)
- [ ] Verify category icons display correctly
- [ ] Test with no expenses (stats section should hide)
- [ ] Test with multiple expenses across different wallets
- [ ] Verify translations work in all languages
- [ ] Test responsive layout on mobile devices

## Future Enhancements

1. **Category Breakdown**: Show spending by category (like credit cards)
2. **Date Range Filtering**: View expenses for specific periods
3. **Export**: Export e-wallet transaction history
4. **Charts**: Visual representation of spending patterns
5. **Comparison**: Compare spending across different wallets
