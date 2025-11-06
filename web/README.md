# Expense Manager Web App

A comprehensive expense tracking application built with React, TypeScript, and Firebase. This app helps you track expenses, manage budgets, handle recurring expenses, and export data for analysis.

## 🚀 Features

### 1. **Expense Tracking (費用記錄)**
- ✅ Add, edit, and delete expenses
- ✅ Categorize expenses
- ✅ Add notes to expenses
- ✅ Search and filter by description
- ✅ Filter by category
- ✅ Sort by date or amount
- ✅ Real-time sync across devices via Firebase

### 2. **Category Management (費用分類)**
- ✅ Pre-loaded default categories (Food, Transport, Shopping, etc.)
- ✅ Create custom categories
- ✅ Choose from emoji icons
- ✅ Customize category colors
- ✅ Edit and delete custom categories

### 3. **Budget Management (預算設定)**
- ✅ Set budgets for each category
- ✅ Choose budget period (weekly, monthly, yearly)
- ✅ Visual progress bars showing budget usage
- ✅ Alert thresholds (e.g., alert at 80% usage)
- ✅ Color-coded indicators (green, orange, red)

### 4. **Dashboard & Analytics (儀表板與數據分析)**
- ✅ Summary cards (total, monthly, daily expenses)
- ✅ Top spending categories breakdown
- ✅ Visual percentage bars
- ✅ Real-time updates

### 5. **Recurring Expenses (定期/重複性費用)**
- ✅ Set up recurring expenses (rent, subscriptions)
- ✅ Frequency options: daily, weekly, monthly, yearly
- ✅ Pause/resume recurring expenses
- ✅ Edit and delete recurring expenses

### 6. **Export Reports (報表匯出)**
- ✅ Export all expenses to CSV
- ✅ Compatible with Excel and spreadsheet applications

### 7. **Multi-Device Sync (多裝置同步)**
- ✅ Firebase Firestore for cloud storage
- ✅ Real-time synchronization
- ✅ Access from any device

## 🛠️ Technology Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Firebase Authentication** - User management
- **Firebase Firestore** - Cloud database
- **Vite** - Build tool
- **React Router** - Navigation

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- A Firebase project (for authentication)

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up Firebase:
   - Create a Firebase project at https://console.firebase.google.com/
   - Enable Authentication (Email/Password and Google providers)
   - Copy your Firebase configuration

3. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Fill in your Firebase configuration values

   ```bash
   cp .env.example .env
   ```

### Development

Run the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Building

Build the app for production:

```bash
npm run build
```

### Deploying to GitHub Pages

- Enable GitHub Pages in the repository settings (`Settings` → `Pages`) and choose **GitHub Actions** as the source.
- Push to the `main1` branch (or run the workflow manually) to trigger `.github/workflows/deploy.yml`.
- The workflow builds the app in `/web`, sets the correct base path for project pages, and publishes the contents of `web/dist` to GitHub Pages.
- For a local build that mimics the production base path you can run:

   ```bash
   DEPLOY_BASE=/Expense_Manager/ npm run build
   ```

   On Windows PowerShell, use:

   ```powershell
   $env:DEPLOY_BASE = '/Expense_Manager/'; npm run build; Remove-Item Env:DEPLOY_BASE
   ```

### Preview Production Build

Preview the production build locally:

```bash
npm run preview
```

### Linting

Run ESLint to check code quality:

```bash
npm run lint
```

## Project Structure

```
web/
├── src/
│   ├── components/      # Reusable components
│   │   └── PrivateRoute.tsx
│   ├── contexts/        # React contexts
│   │   └── AuthContext.tsx
│   ├── config/          # Configuration files
│   │   └── firebase.ts
│   ├── pages/           # Page components
│   │   ├── Home.tsx
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   └── Dashboard.tsx
│   ├── App.tsx          # Main app component with routing
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles
├── index.html           # HTML template
├── vite.config.ts       # Vite configuration
├── tsconfig.json        # TypeScript configuration
└── package.json         # Dependencies and scripts
```

## Authentication

The app includes a complete authentication system with:

- **Email/Password Registration**: Create new accounts with email and password
- **Email/Password Login**: Sign in with existing credentials
- **Google Sign-in**: Quick authentication with Google accounts
- **Protected Routes**: Dashboard requires authentication
- **Auth Context**: Centralized authentication state management

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Technologies

- **React 18** - UI library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Firebase** - Authentication backend
- **ESLint** - Code linting

## 📱 Usage Guide

### Getting Started

1. **Register/Login** - Create a new account or log in with existing credentials
2. **Dashboard Tab** - View summary of your expenses and top spending categories
3. **Expenses Tab** - Add, edit, delete, search, filter, and sort expenses
4. **Categories Tab** - Create and manage custom categories with icons and colors
5. **Budgets Tab** - Set budget limits for categories and track spending
6. **Recurring Tab** - Add recurring expenses with frequency settings
7. **Export** - Click "📊 Export CSV" button to download your data

## 🏗️ Project Structure

```
web/
├── src/
│   ├── components/
│   │   ├── budgets/          # Budget management UI
│   │   ├── categories/       # Category management UI
│   │   ├── dashboard/        # Dashboard summary
│   │   ├── expenses/         # Expense CRUD UI
│   │   └── recurring/        # Recurring expense UI
│   ├── services/             # Firebase service layer
│   │   ├── expenseService.ts
│   │   ├── categoryService.ts
│   │   ├── budgetService.ts
│   │   └── recurringExpenseService.ts
│   ├── types/                # TypeScript type definitions
│   ├── utils/                # Utility functions (export, etc.)
│   ├── contexts/             # React contexts (Auth)
│   ├── config/               # Firebase configuration
│   └── pages/                # Page components
├── .env.example
├── package.json
└── vite.config.ts
```

## 🚀 Future Enhancements

- [ ] Receipt scanning with OCR
- [ ] Advanced data visualization with charts
- [ ] Budget alerts and notifications
- [ ] Automatic generation of recurring expenses
- [ ] Multi-currency support
- [ ] Dark mode
- [ ] Mobile app version
- [ ] PDF export
