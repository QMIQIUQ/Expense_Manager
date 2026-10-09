# Expense Manager - System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Expense Manager Web App                      │
│                   (React + TypeScript + Firebase)                │
└─────────────────────────────────────────────────────────────────┘
```

## Application Structure

```
┌───────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                            │
├───────────────────────────────────────────────────────────────────┤
│ Dashboard header                                                  │
│  Brand + scrollable Tabs + notifications + hamburger              │
│  Desktop: one 56px row; mobile: 52px actions + 44px Tabs          │
│  Hamburger: tools, account, admin and sign-out                    │
│  Separate lists: tabFeatures / hamburgerFeatures                 │
│  activeTab switches views inside /dashboard                     │
└─────────────────────────────┼────────────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────────┐
│                       COMPONENT LAYER                               │
├──────────────────────────────┼──────────────────────────────────────┤
│                              ▼                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │
│  │ ExpenseForm     │  │ CategoryManager │  │ BudgetManager   │   │
│  │ ExpenseList     │  │                 │  │                 │   │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘   │
│                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐                         │
│  │ Scheduled Pmts  │  │ CustomizableDash│                         │
│  └─────────────────┘  └─────────────────┘                         │
│                              │                                      │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────────┐
│                        SERVICE LAYER                                │
├──────────────────────────────┼──────────────────────────────────────┤
│                              ▼                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │
│  │ expenseService  │  │ categoryService │  │ budgetService   │   │
│  │                 │  │                 │  │                 │   │
│  │ - create()      │  │ - create()      │  │ - create()      │   │
│  │ - getAll()      │  │ - getAll()      │  │ - getAll()      │   │
│  │ - update()      │  │ - update()      │  │ - update()      │   │
│  │ - delete()      │  │ - delete()      │  │ - delete()      │   │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘   │
│                                                                     │
│  ┌──────────────────────────┐                                      │
│  │ recurringExpenseService  │                                      │
│  │                          │                                      │
│  │ - create()               │                                      │
│  │ - getAll()               │                                      │
│  │ - update()               │                                      │
│  │ - delete()               │                                      │
│  │ - toggleActive()         │                                      │
│  └──────────────────────────┘                                      │
│                              │                                      │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────────┐
│                         FIREBASE LAYER                              │
├──────────────────────────────┼──────────────────────────────────────┤
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────┐           │
│  │              Firebase Configuration                  │           │
│  │  - Authentication (Email/Password, Google)          │           │
│  │  - Firestore Database                               │           │
│  └─────────────────────────────────────────────────────┘           │
│                              │                                      │
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │  Collection:  │  │ Collection:  │  │ Collection:  │            │
│  │   expenses    │  │  categories  │  │   budgets    │            │
│  └───────────────┘  └──────────────┘  └──────────────┘            │
│                                                                     │
│  ┌─────────────────────┐                                           │
│  │    Collection:      │                                           │
│  │ recurringExpenses   │                                           │
│  └─────────────────────┘                                           │
│                              │                                      │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
                               ▼
                    ┌────────────────────┐
                    │   Firebase Cloud   │
                    │  (Data Storage &   │
                    │  Synchronization)  │
                    └────────────────────┘
```

## Data Flow

### Adding an Expense

```
User Action (Fill Form)
        │
        ▼
ExpenseForm Component
        │
        ▼
Dashboard Handler (handleAddExpense)
        │
        ▼
expenseService.create()
        │
        ▼
Firebase Firestore
        │
        ▼
Data Persisted in Cloud
        │
        ▼
loadData() Refreshes UI
        │
        ▼
ExpenseList Updates
```

### Budget Tracking

```
User Views Budget
        │
        ▼
BudgetManager Component
        │
        ├─── Fetches Budget Data
        │    (from budgets collection)
        │
        └─── Calculates Spending
             (from expenses collection)
        │
        ▼
Displays Progress Bar
  - Green (< threshold)
  - Orange (>= threshold)
  - Red (>= 100%)
```

### Dashboard Analytics

```
Dashboard Tab
        │
        ▼
DashboardSummary Component
        │
        ├─── Calculate Total Expenses
        ├─── Calculate Monthly Expenses
        ├─── Calculate Daily Expenses
        └─── Calculate Category Breakdown
        │
        ▼
Display Summary Cards
        │
        ▼
Display Top Categories
```

## Component Hierarchy

```
App.tsx
└── PWAProvider
    ├── RouterProvider
    │   ├── /                    Login
    │   ├── /login               redirect to /
    │   ├── /dashboard           PrivateRoute → Dashboard.tsx
    │   └── *                    redirect to /
    └── PWAInstallPrompt

Dashboard.tsx (/dashboard; activeTab switches views, not URLs)
├── dashboard-header-modern
│   ├── header-brand
│   ├── CompactNavigation (tabFeatures)
│   └── header-actions
│       ├── NotificationBell
│       └── hamburger button → dashboard-menu-panel
│           ├── NetworkStatusIndicator
│           ├── Language accordion
│           ├── Appearance accordion
│           ├── Features accordion (settings + hamburgerFeatures)
│           ├── Import / Export accordion
│           ├── Offline queue (conditional)
│           ├── Profile / Admin actions
│           └── Logout action
├── HeaderStatusBar (progress / revalidation status)
├── dashboard-card (active feature view)
└── FloatingExpenseActions (when overlays allow it)
    ├── Add expense (tap; long-press opens date shortcuts)
    └── Scan receipt
```

### UI Navigation and Responsive Layout

The production layout is a compact header, not a row of separate feature cards. On widths above 768px, brand, horizontally scrollable Tabs, notifications, and the hamburger button share one 56px row. At 768px and below, the header uses a 52px brand/actions row and a 44px horizontally scrollable Tabs row. `CompactNavigation` brings the active item into view after a tab change or order change; it does not create a `More` dropdown or a separate feature route.

The hamburger panel is anchored to its header button. `DashboardMenuSection` renders each accordion as a full-width native button with `aria-expanded` and `aria-controls`; expanded content is hidden with the `hidden` attribute when collapsed. The trigger and actionable menu rows own their own full-width hit areas, with at least 44px height. Section wrappers stay unpadded so the visible row and clickable row remain aligned. Menu actions are sibling controls, not nested buttons.

The main Tabs and the Hamburger Features list are independently configurable. `tabFeatures` controls only `CompactNavigation`; `hamburgerFeatures` controls only the feature destinations in the hamburger's Features accordion. The same feature may appear in both lists. `FeatureManager` lets users enable, disable, reorder, and reset each location independently. For older settings records, each missing location list falls back to `enabledFeatures`; saving keeps `enabledFeatures` equal to the Tabs list for backward compatibility, not the union of both lists.

`FloatingExpenseActions` is one shared component that preserves two separate bottom-left actions. The primary action opens expense entry; a long press opens date shortcuts. The secondary action starts receipt scanning. On mobile both are 56px circular buttons positioned above the safe-area inset; on wider screens they show text labels. The group hides while selected menus, forms, import flows, or dashboard customization overlays are open. Component and style details are in [UI_STYLE_GUIDE.md](UI_STYLE_GUIDE.md); the shipped implementation and its historical decisions are in [COMPACT_NAVIGATION_V2.md](implementation-plans/COMPACT_NAVIGATION_V2.md).

## State Management

### Authentication State
```
AuthContext (React Context)
  │
  ├─── currentUser
  ├─── login()
  ├─── logout()
  └─── register()
```

### Application State
```
Dashboard Component (Local State)
  │
  ├─── expenses: Expense[]
  ├─── categories: Category[]
  ├─── budgets: Budget[]
  ├─── recurringExpenses: RecurringExpense[]
  ├─── activeTab: string
  ├─── editingExpense: Expense | null
  └─── loading: boolean
```

## Data Models

### Core Entities

```
┌──────────────────┐
│     Expense      │
├──────────────────┤
│ id               │
│ userId           │
│ description      │
│ amount           │
│ category         │
│ date             │
│ notes            │
│ createdAt        │
│ updatedAt        │
└──────────────────┘

┌──────────────────┐         ┌──────────────────┐
│    Category      │         │      Budget      │
├──────────────────┤         ├──────────────────┤
│ id               │         │ id               │
│ userId           │         │ userId           │
│ name             │◄────────│ categoryName     │
│ icon             │         │ amount           │
│ color            │         │ period           │
│ isDefault        │         │ alertThreshold   │
│ createdAt        │         │ createdAt        │
└──────────────────┘         └──────────────────┘

┌──────────────────────┐
│  RecurringExpense    │
├──────────────────────┤
│ id                   │
│ userId               │
│ description          │
│ amount               │
│ category             │
│ frequency            │
│ startDate            │
│ endDate              │
│ isActive             │
│ createdAt            │
└──────────────────────┘
```

## Security Model

```
┌────────────────────────────────────────────┐
│         Firebase Authentication             │
│  - Email/Password                          │
│  - Google Sign-in                          │
└────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────┐
│         Firestore Security Rules           │
│  - All reads/writes require auth          │
│  - Users can only access their own data   │
│  - Data scoped by userId                  │
└────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────┐
│         Application Security               │
│  - Input validation                        │
│  - XSS protection                          │
│  - Type safety (TypeScript)                │
│  - Error handling                          │
└────────────────────────────────────────────┘
```

## File Organization

```
web/
├── src/
│   ├── components/
│   │   ├── navigation/
│   │   │   ├── CompactNavigation.tsx
│   │   │   ├── DashboardMenuSection.tsx
│   │   │   └── FloatingExpenseActions.tsx
│   │   ├── dashboard/
│   │   │   └── CustomizableDashboard.tsx
│   │   ├── settings/FeatureManager.tsx
│   │   ├── scheduledPayments/ScheduledPaymentManager.tsx
│   │   ├── HeaderStatusBar.tsx
│   │   ├── budgets/BudgetManager.tsx
│   │   ├── categories/CategoryManager.tsx
│   │   ├── expenses/ExpenseList.tsx
│   │   └── PrivateRoute.tsx
│   │
│   ├── services/
│   │   ├── expenseService.ts
│   │   ├── categoryService.ts
│   │   ├── budgetService.ts
│   │   └── recurringExpenseService.ts
│   │
│   ├── types/
│   │   └── index.ts
│   │
│   ├── utils/
│   │   ├── dateUtils.ts       # Date/time utilities for local timezone handling
│   │   └── exportUtils.ts     # CSV export utilities
│   │
│   ├── contexts/
│   │   └── AuthContext.tsx
│   │
│   ├── config/
│   │   └── firebase.ts
│   │
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   └── tabs/
│   │       ├── ExpensesTab.tsx
│   │       └── IncomesTab.tsx
│   │
│   ├── App.tsx
│   └── main.tsx
│
├── public/
├── .env
├── package.json
├── vite.config.ts
└── tsconfig.json
```

This is a focused map of files that participate in the current Dashboard UI, not an exhaustive repository tree. `RecurringExpenseManager.tsx` and `RecurringTab.tsx` remain in the source tree for legacy functionality but are not mounted by `Dashboard.tsx`; the current `Recurring` entry renders `ScheduledPaymentManager`.

## Technology Stack

```
┌─────────────────────────────────────┐
│         Frontend Framework          │
│  React 18 + TypeScript              │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│         Build Tool                  │
│  Vite                               │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│         Routing                     │
│  React Router v6                    │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│         Backend Services            │
│  Firebase                           │
│  - Authentication                   │
│  - Firestore Database              │
└─────────────────────────────────────┘
```

## Feature Integration

```
┌──────────────┐
│  Dashboard   │◄──────┐
│   Summary    │       │
└──────────────┘       │
       │               │
       │  Reads        │
       ▼               │
┌──────────────┐       │
│  Expenses    │───────┤
│ Collection   │       │
└──────────────┘       │
       │               │
       │               │
       ▼               │
┌──────────────┐       │  All Connected
│  Categories  │───────┤  via Firebase
│ Collection   │       │  Firestore
└──────────────┘       │
       │               │
       │               │
       ▼               │
┌──────────────┐       │
│   Budgets    │───────┤
│ Collection   │       │
└──────────────┘       │
       │               │
       │               │
       ▼               │
┌──────────────┐       │
│  Recurring   │───────┘
│ Collection   │
└──────────────┘
```

## Utility Functions

### Date Utilities (`utils/dateUtils.ts`)

The application uses dedicated date utility functions to ensure consistent timezone handling across all components:

```typescript
// Get today's date in local timezone (YYYY-MM-DD)
getTodayLocal(): string

// Get current time in local timezone (HH:MM)
getCurrentTimeLocal(): string

// Format a date to YYYY-MM-DD in local timezone
formatDateLocal(date: Date | string): string
```

**Purpose:**
- Avoid timezone bugs caused by UTC conversions
- Provide consistent date/time formatting across the application
- Ensure users see dates in their local timezone

**Used in:**
- ExpenseForm - Default date/time for new expenses
- IncomeForm - Default date/time for new income entries
- BudgetForm - Date handling for budget periods
- RecurringForm - Date scheduling for recurring expenses
- RepaymentForm - Repayment date handling
- DashboardSummary - Filtering expenses by today's date
- ExpenseList - Date filtering and display

**See:** [DATE_TIME_FORMAT_GUIDE.md](DATE_TIME_FORMAT_GUIDE.md) for date and time format details

### Export Utilities (`utils/exportUtils.ts`)

Handles CSV export functionality for expenses and other data.

## Deployment Flow

```
Development
     │
     ▼
┌─────────────┐
│ npm run dev │ ──► Vite Dev Server (localhost:3000)
└─────────────┘
     │
     ▼
Testing
     │
     ▼
┌──────────────┐
│ npm run build│ ──► TypeScript Compilation + Vite Build
└──────────────┘
     │
     ▼
Production Build
     │
     ▼
┌──────────────┐
│ dist/ folder │ ──► Static files ready for deployment
└──────────────┘
     │
     ▼
Deploy to:
  - Firebase Hosting
  - Netlify
  - Vercel
  - etc.
```

## Performance Optimization

### Current Optimizations
- Type-safe code (TypeScript)
- Component-based architecture
- Service layer abstraction
- Efficient Firebase queries
- Memory management (URL revocation)

### Future Optimizations
- Code splitting with React.lazy()
- Virtual scrolling for large lists
- Real-time listeners with Firebase
- Caching strategies
- PWA features (service workers)
- Image optimization

---

**Architecture Version**: 1.0.0
**Last Updated**: 2024
