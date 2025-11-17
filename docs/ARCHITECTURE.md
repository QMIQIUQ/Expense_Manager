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
│                         USER INTERFACE                             │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────┐│
│  │Dashboard │  │ Expenses │  │Categories│  │ Budgets  │  │Recur.││
│  │   Tab    │  │   Tab    │  │   Tab    │  │   Tab    │  │ Tab  ││
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────┘│
│       │              │              │              │          │    │
│       └──────────────┴──────────────┴──────────────┴──────────┘    │
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
│  │ RecurringMgr    │  │ DashboardSummary│                         │
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
  │
  └─── Router
        │
        ├─── Home (/)
        ├─── Login (/login)
        ├─── Register (/register)
        │
        └─── Dashboard (/dashboard) [Protected]
              │
              ├─── Header (with logout & export)
              │
              ├─── Tabs Navigation
              │
              └─── Tab Content
                    │
                    ├─── Dashboard Tab
                    │     └─── DashboardSummary
                    │
                    ├─── Expenses Tab
                    │     ├─── ExpenseForm
                    │     └─── ExpenseList
                    │
                    ├─── Categories Tab
                    │     └─── CategoryManager
                    │
                    ├─── Budgets Tab
                    │     └─── BudgetManager
                    │
                    └─── Recurring Tab
                          └─── RecurringExpenseManager
```

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
│   │   └── exportUtils.ts
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
