# Expense Manager - System Architecture

> 目前 main 核對基準：`main@9fce5d7`（2026-10-25）。此文件保留較完整的系統分層說明；功能掛載以 [功能與頁面](FEATURES_AND_PAGES.md) 為準，離線契約與實際 queue 行為以 [同步架構](OFFLINE_SYNC_ARCHITECTURE.md) 和 [Method 流程盤點](LOGIC_METHOD_FLOW.md) 為準。

> **UI 架構更新（2026-10-25）**：現行畫面路由、Dashboard 頁籤與導覽排列請以 [UI 架構與導覽排列盤點](UI_NAVIGATION_AUDIT.md) 為準；目前 UI 元件、樣式差異與後續統一候選請看 [UI 元件盤點與計畫](ui-standardization/UI_COMPONENT_INVENTORY_AND_PLAN.md)。逐功能表單/CRUD 入口見 [CRUD 流程盤點](ui-standardization/CRUD_FLOW_AUDIT.md)，候選互動和後續改檔計畫見 [UI 設計標準化文件組](ui-standardization/PATTERN_STANDARDIZATION_PLAN.md)。早期系統圖是簡化示意，不能用來推斷目前所有功能入口。

## System Overview

> 本文件保留歷史架構說明及資料流範例。現行目錄職責、主頁籤與完整功能地圖請先看 [完整功能與頁面文檔](FEATURES_AND_PAGES.md)；主要 method 與寫入流程見 [LOGIC_METHOD_FLOW.md](LOGIC_METHOD_FLOW.md) 和 [本機優先同步架構](OFFLINE_SYNC_ARCHITECTURE.md)，其中以 `web/src` 現況核對。UI 元件的 CRUD 入口與逐階段調整範圍見 [UI 設計文件組](ui-standardization/UI_COMPONENT_INVENTORY_AND_PLAN.md)。

### Current Implementation Layers

| Layer | Current implementation | Responsibility |
|---|---|---|
| Bootstrap | `web/src/main.tsx` | Registers the service worker and mounts Theme, Language, Auth, Notification, and UserSettings providers. |
| Routing and access | `web/src/App.tsx`, `components/PrivateRoute.tsx` | Routes login and the authenticated dashboard; unknown paths return to `/`. |
| Application shell | `web/src/pages/Dashboard.tsx` | Owns the shared dashboard shell, tab selection, data handlers, header menu, and overlays. |
| Feature UI | `web/src/pages/tabs/`, `web/src/components/` | Implements finance, planning, payment, analytics, settings, admin, and shared UI features. |
| Shared state and interactions | `web/src/contexts/`, `web/src/hooks/` | Shares account/preferences/theme/notifications and reusable offline, optimistic CRUD, network, and selection behavior. |
| Application and domain logic | `web/src/services/`, `web/src/domain/`, `web/src/utils/` | Owns Firestore operations, currency and money handling, OCR, import/export, dashboard layout, caching, and synchronization. |
| Firebase boundary | `web/src/config/firebase.ts`, `web/firestore.rules`, `web/functions/` | Initializes Firebase, enforces database access, and runs privileged callable operations. |

The current provider and feature map is documented alongside the route and feature inventory in [FEATURES_AND_PAGES.md](FEATURES_AND_PAGES.md). Avoid using the simplified diagram below as a complete inventory of current collections or mounted features.

```
┌─────────────────────────────────────────────────────────────────┐
│                     Expense Manager Web App                      │
│                   (React + TypeScript + Firebase)                │
└─────────────────────────────────────────────────────────────────┘
```

## Application Structure

```
┌───────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                             │
├───────────────────────────────────────────────────────────────────┤
│  Main tabs (user-configurable order and visibility)                  │
│  Dashboard · Expenses · Incomes · Categories · Budgets               │
│  Recurring · Payment Methods · Settings                               │
│  Profile and Admin are opened from the header utility menu            │
│  activeTab selects one view inside the shared Dashboard content area  │
│                              │                                      │
└──────────────────────────────┼──────────────────────────────────────┘
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
│  │ Scheduled Pmts  │  │ CustomizableDash │                         │
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
   ├── Router
   │   ├── /                         Login
   │   ├── /login                    redirect to /
   │   └── /dashboard [PrivateRoute]
   │       └── Dashboard.tsx
   │           ├── Dashboard header
   │           │   ├── Brand / greeting
   │           │   ├── CompactNavigation (tabFeatures)
   │           │   └── Header actions
   │           │       ├── NotificationBell
   │           │       └── Hamburger → dashboard-menu-panel
   │           │           ├── DashboardMenuSection accordions
   │           │           ├── Profile action
   │           │           ├── Admin action (admin only)
   │           │           └── Logout action
   │           ├── HeaderStatusBar
   │           ├── Shared content card (activeTab state)
   │           │   ├── Dashboard → CustomizableDashboard → widgets
   │           │   ├── Expenses → ExpensesTab
   │           │   ├── Incomes → IncomesTab
   │           │   ├── Categories → CategoryManager
   │           │   ├── Budgets → BudgetManager
   │           │   ├── Recurring → ScheduledPaymentManager
   │           │   │   └── list / calendar / analytics views
   │           │   ├── Payment Methods → cards / e-wallets / banks / transfers
   │           │   └── Settings → FeatureManager
   │           ├── FloatingExpenseActions
   │           │   ├── Add expense (tap; long-press opens date shortcuts)
   │           │   └── Scan receipt
   │           └── Modal / Bottom Sheet / date shortcut overlays
   └── PWAInstallPrompt
```

### Current UI implementation (As-is)

`CompactNavigation`, `DashboardMenuSection`, and `FloatingExpenseActions` are the three mounted navigation/action components. `CompactNavigation` renders the user-configured `tabFeatures`; `DashboardMenuSection` owns each full-width accordion trigger inside the hamburger menu; and `FloatingExpenseActions` keeps separate add-expense and receipt-scan actions. Main tabs and hamburger utilities share the `/dashboard` shell and `activeTab` state, while Profile and Admin are opened from the menu rather than listed as main tabs.

The `Recurring` main tab currently renders `ScheduledPaymentManager`; `RecurringTab` and `RecurringExpenseManager` remain in the source tree but are not mounted from `Dashboard.tsx`. Responsive layout, menu contents, and recommended desktop/mobile arrangements are documented separately in the [UI navigation audit](UI_NAVIGATION_AUDIT.md), with the current implementation clearly separated from proposed changes.

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
│   │   ├── budgets/
│   │   │   └── BudgetManager.tsx
│   │   ├── categories/
│   │   │   └── CategoryManager.tsx
│   │   ├── dashboard/
│   │   │   └── DashboardSummary.tsx
│   │   ├── expenses/
│   │   │   ├── ExpenseForm.tsx
│   │   │   └── ExpenseList.tsx
│   │   ├── recurring/
│   │   │   └── RecurringExpenseManager.tsx
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
│   │   ├── Home.tsx
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   └── Dashboard.tsx
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
