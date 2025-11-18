# Implementation Roadmap - Priority Features

## Overview

This document provides a detailed implementation roadmap for the priority features identified in the Missing Features Assessment. Each section includes specific technical steps, code examples, and considerations.

---

## 🚨 IMMEDIATE: Fix Firebase OAuth Domain Configuration

**Priority**: CRITICAL (Blocks production use)  
**Effort**: 5 minutes  
**Impact**: Enables Google Sign-in on production

### Steps:

1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select project: `expense-manager-41afb`
3. Navigate to: **Authentication** → **Settings** → **Authorized domains**
4. Click **Add domain**
5. Enter: `qmiqiuq.github.io`
6. Click **Save**
7. Clear browser cache and test

### Verification:
```bash
# Visit the production URL
https://qmiqiuq.github.io/Expense_Manager/

# Try Google Sign-in
# Should work without domain authorization error
```

**Documentation**: See `FIREBASE_DOMAIN_SETUP.md` for detailed instructions.

---

## Phase 1: Quick Wins (1-2 weeks)

### 1. Enhanced Data Visualization with Charts

**Priority**: HIGH  
**Effort**: 2-3 days  
**Library**: `recharts` (already installed ✅)

#### Implementation Steps:

##### A. Create Chart Components

```typescript
// src/components/dashboard/SpendingTrendsChart.tsx
import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Expense } from '../../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

interface Props {
  expenses: Expense[];
  period: 'week' | 'month' | 'year';
}

export const SpendingTrendsChart: React.FC<Props> = ({ expenses, period }) => {
  const data = prepareChartData(expenses, period);

  return (
    <div className="chart-container bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Spending Trends</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="amount" 
            stroke="#8884d8" 
            strokeWidth={2}
            name="Daily Spending"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

function prepareChartData(expenses: Expense[], period: string) {
  // Group expenses by date and sum amounts
  const groupedData = expenses.reduce((acc, expense) => {
    const date = format(new Date(expense.date), 'MMM dd');
    if (!acc[date]) {
      acc[date] = { date, amount: 0 };
    }
    acc[date].amount += expense.amount;
    return acc;
  }, {} as Record<string, { date: string; amount: number }>);

  return Object.values(groupedData).sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}
```

```typescript
// src/components/dashboard/CategoryPieChart.tsx
import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip
} from 'recharts';
import { Expense, Category } from '../../types';

interface Props {
  expenses: Expense[];
  categories: Category[];
}

export const CategoryPieChart: React.FC<Props> = ({ expenses, categories }) => {
  const data = preparePieData(expenses, categories);

  return (
    <div className="chart-container bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Spending by Category</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

function preparePieData(expenses: Expense[], categories: Category[]) {
  const categoryMap = categories.reduce((acc, cat) => {
    acc[cat.name] = { color: cat.color, total: 0 };
    return acc;
  }, {} as Record<string, { color: string; total: number }>);

  expenses.forEach(expense => {
    if (categoryMap[expense.category]) {
      categoryMap[expense.category].total += expense.amount;
    }
  });

  return Object.entries(categoryMap)
    .filter(([_, data]) => data.total > 0)
    .map(([name, data]) => ({
      name,
      value: data.total,
      color: data.color
    }))
    .sort((a, b) => b.value - a.value);
}

function renderCustomLabel(entry: any) {
  return `${entry.name}: $${entry.value.toFixed(0)}`;
}
```

##### B. Add Charts to Dashboard

```typescript
// src/pages/tabs/DashboardHomeTab.tsx
// Add imports and integrate new chart components

import { SpendingTrendsChart } from '../../components/dashboard/SpendingTrendsChart';
import { CategoryPieChart } from '../../components/dashboard/CategoryPieChart';

// In the component JSX:
<div className="charts-section mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
  <SpendingTrendsChart expenses={expenses} period="month" />
  <CategoryPieChart expenses={expenses} categories={categories} />
</div>
```

##### C. Add Chart Export Functionality

```typescript
// Add to chart components
import html2canvas from 'html2canvas';

const exportChartAsImage = async (elementId: string) => {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  const canvas = await html2canvas(element);
  const image = canvas.toDataURL('image/png');
  
  const link = document.createElement('a');
  link.download = `chart-${Date.now()}.png`;
  link.href = image;
  link.click();
};
```

#### Testing:
1. Add sample expenses with various dates and categories
2. Verify charts render correctly
3. Test responsiveness on mobile
4. Verify color schemes match categories
5. Test chart interactions (hover, click)

---

### 2. Dark Mode Implementation

**Priority**: MEDIUM-HIGH  
**Effort**: 2-3 days  
**Approach**: CSS Variables + Context API

#### Implementation Steps:

##### A. Define Color Tokens

```typescript
// src/styles/designTokens.ts
export const lightTheme = {
  colors: {
    // Backgrounds
    background: '#ffffff',
    backgroundSecondary: '#f7f9fc',
    backgroundTertiary: '#e5e7eb',
    
    // Text
    textPrimary: '#1f2937',
    textSecondary: '#6b7280',
    textTertiary: '#9ca3af',
    
    // Surfaces
    surface: '#ffffff',
    surfaceHover: '#f9fafb',
    
    // Borders
    border: '#e5e7eb',
    borderHover: '#d1d5db',
    
    // Brand
    primary: '#3b82f6',
    primaryHover: '#2563eb',
    
    // Semantic
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  }
};

export const darkTheme = {
  colors: {
    // Backgrounds
    background: '#111827',
    backgroundSecondary: '#1f2937',
    backgroundTertiary: '#374151',
    
    // Text
    textPrimary: '#f9fafb',
    textSecondary: '#d1d5db',
    textTertiary: '#9ca3af',
    
    // Surfaces
    surface: '#1f2937',
    surfaceHover: '#374151',
    
    // Borders
    border: '#374151',
    borderHover: '#4b5563',
    
    // Brand
    primary: '#60a5fa',
    primaryHover: '#3b82f6',
    
    // Semantic
    success: '#34d399',
    warning: '#fbbf24',
    error: '#f87171',
    info: '#60a5fa',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
  }
};

export type Theme = typeof lightTheme;
export type ThemeMode = 'light' | 'dark' | 'system';
```

##### B. Create Theme Context

```typescript
// src/contexts/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeMode, lightTheme, darkTheme, Theme } from '../styles/designTokens';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  currentTheme: Theme;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('theme') as ThemeMode;
    return saved || 'system';
  });

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const updateTheme = () => {
      let shouldBeDark = false;

      if (theme === 'system') {
        shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      } else {
        shouldBeDark = theme === 'dark';
      }

      setIsDark(shouldBeDark);
      document.documentElement.classList.toggle('dark', shouldBeDark);
      
      // Apply CSS variables
      const themeColors = shouldBeDark ? darkTheme : lightTheme;
      Object.entries(themeColors.colors).forEach(([key, value]) => {
        document.documentElement.style.setProperty(`--color-${key}`, value);
      });
    };

    updateTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', updateTheme);

    return () => mediaQuery.removeEventListener('change', updateTheme);
  }, [theme]);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const currentTheme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, setTheme, currentTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
```

##### C. Create Theme Toggle Component

```typescript
// src/components/ThemeToggle.tsx
import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme, isDark } = useTheme();

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const getIcon = () => {
    if (theme === 'light') return '☀️';
    if (theme === 'dark') return '🌙';
    return '💻';
  };

  const getLabel = () => {
    if (theme === 'light') return 'Light';
    if (theme === 'dark') return 'Dark';
    return 'System';
  };

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle-btn p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
      aria-label={`Current theme: ${getLabel()}. Click to change.`}
    >
      <span className="text-xl">{getIcon()}</span>
      <span className="ml-2 text-sm">{getLabel()}</span>
    </button>
  );
};
```

##### D. Update CSS with Variables

```css
/* src/index.css */
:root {
  /* Light theme colors (default) */
  --color-background: #ffffff;
  --color-backgroundSecondary: #f7f9fc;
  --color-textPrimary: #1f2937;
  --color-textSecondary: #6b7280;
  --color-border: #e5e7eb;
  /* ... other colors */
}

.dark {
  /* Dark theme colors */
  --color-background: #111827;
  --color-backgroundSecondary: #1f2937;
  --color-textPrimary: #f9fafb;
  --color-textSecondary: #d1d5db;
  --color-border: #374151;
  /* ... other colors */
}

/* Apply to components */
body {
  background-color: var(--color-background);
  color: var(--color-textPrimary);
}

.card {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
}

/* ... update all components to use CSS variables */
```

##### E. Integrate Theme Provider

```typescript
// src/App.tsx
import { ThemeProvider } from './contexts/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        {/* ... rest of app */}
      </AuthProvider>
    </ThemeProvider>
  );
}
```

##### F. Add Theme Toggle to Header

```typescript
// src/components/HeaderStatusBar.tsx or similar
import { ThemeToggle } from './ThemeToggle';

// Add to header component
<ThemeToggle />
```

#### Testing:
1. Toggle between light, dark, and system themes
2. Verify all components render correctly in both themes
3. Test theme persistence across page reloads
4. Test system theme detection and switching
5. Verify accessibility (contrast ratios)

---

### 3. Basic Notifications System

**Priority**: MEDIUM  
**Effort**: 2-3 days  
**Approach**: In-app notifications + localStorage

#### Implementation Steps:

##### A. Create Notification Types

```typescript
// src/types/notifications.ts
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

export interface NotificationSettings {
  budgetAlerts: boolean;
  recurringReminders: boolean;
  weeklySummary: boolean;
  unusualSpending: boolean;
}
```

##### B. Create Notification Service

```typescript
// src/services/notificationService.ts
import { collection, addDoc, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Notification, NotificationSettings } from '../types/notifications';

export const notificationService = {
  async createNotification(userId: string, notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) {
    const notificationsRef = collection(db, 'notifications');
    await addDoc(notificationsRef, {
      ...notification,
      userId,
      timestamp: new Date(),
      read: false,
    });
  },

  async getNotifications(userId: string, unreadOnly = false): Promise<Notification[]> {
    const notificationsRef = collection(db, 'notifications');
    let q = query(notificationsRef, where('userId', '==', userId));
    
    if (unreadOnly) {
      q = query(q, where('read', '==', false));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp.toDate(),
    })) as Notification[];
  },

  async markAsRead(notificationId: string) {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, { read: true });
  },

  async getSettings(userId: string): Promise<NotificationSettings> {
    // Implement settings retrieval
    const defaultSettings: NotificationSettings = {
      budgetAlerts: true,
      recurringReminders: true,
      weeklySummary: true,
      unusualSpending: true,
    };
    return defaultSettings;
  },

  async updateSettings(userId: string, settings: NotificationSettings) {
    // Implement settings update
  },
};
```

##### C. Create Budget Alert Logic

```typescript
// src/utils/budgetAlerts.ts
import { Budget, Expense } from '../types';
import { notificationService } from '../services/notificationService';

export async function checkBudgetThresholds(
  userId: string,
  budgets: Budget[],
  expenses: Expense[]
) {
  for (const budget of budgets) {
    const spent = calculateSpent(budget, expenses);
    const percentage = (spent / budget.amount) * 100;

    if (percentage >= budget.alertThreshold && percentage < 100) {
      await notificationService.createNotification(userId, {
        type: 'warning',
        title: `Budget Alert: ${budget.categoryName}`,
        message: `You've spent ${percentage.toFixed(0)}% of your ${budget.categoryName} budget ($${spent.toFixed(2)} of $${budget.amount}).`,
        actionUrl: '/dashboard/budgets',
        actionLabel: 'View Budget',
      });
    } else if (percentage >= 100) {
      await notificationService.createNotification(userId, {
        type: 'error',
        title: `Budget Exceeded: ${budget.categoryName}`,
        message: `You've exceeded your ${budget.categoryName} budget by $${(spent - budget.amount).toFixed(2)}.`,
        actionUrl: '/dashboard/budgets',
        actionLabel: 'Review Spending',
      });
    }
  }
}

function calculateSpent(budget: Budget, expenses: Expense[]): number {
  // Calculate spent amount for budget period
  // Implementation depends on budget period logic
  return expenses
    .filter(e => e.category === budget.categoryName)
    .reduce((sum, e) => sum + e.amount, 0);
}
```

##### D. Create Notification Bell Component

```typescript
// src/components/NotificationBell.tsx
import React, { useState, useEffect } from 'react';
import { notificationService } from '../services/notificationService';
import { Notification } from '../types/notifications';
import { useAuth } from '../contexts/AuthContext';

export const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;
    const notifs = await notificationService.getNotifications(user.uid);
    setNotifications(notifs.slice(0, 5)); // Show last 5
    setUnreadCount(notifs.filter(n => !n.read).length);
  };

  const handleMarkAsRead = async (id: string) => {
    await notificationService.markAsRead(id);
    loadNotifications();
  };

  return (
    <div className="notification-bell relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 hover:bg-gray-100 rounded-lg"
        aria-label="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg z-50">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Notifications</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No notifications
              </div>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif.id}
                  className={`p-4 border-b hover:bg-gray-50 ${!notif.read ? 'bg-blue-50' : ''}`}
                  onClick={() => handleMarkAsRead(notif.id)}
                >
                  <div className="flex items-start">
                    <span className="text-2xl mr-3">
                      {notif.type === 'error' ? '⚠️' : 
                       notif.type === 'warning' ? '⚡' :
                       notif.type === 'success' ? '✅' : 'ℹ️'}
                    </span>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">{notif.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                      {notif.actionLabel && (
                        <button className="text-blue-600 text-sm mt-2">
                          {notif.actionLabel} →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
```

#### Testing:
1. Create test budgets and exceed thresholds
2. Verify notifications appear
3. Test marking as read
4. Test notification persistence
5. Verify bell icon badge updates

---

## Phase 2: Core Enhancements (3-4 weeks)

### 4. Multi-Currency Support

**Priority**: MEDIUM-HIGH  
**Effort**: 3-4 days  
**API**: exchangerate-api.io (free tier)

#### Implementation Steps:

##### A. Update Data Models

```typescript
// src/types/index.ts
export interface Expense {
  // ... existing fields
  currency: string; // ISO 4217 code (USD, EUR, CNY, etc.)
  originalAmount?: number; // Amount in original currency
  exchangeRate?: number; // Exchange rate used
  baseCurrency: string; // User's primary currency
}

export interface UserSettings {
  // ... existing fields
  preferredCurrency: string; // Default: 'USD'
  displayMultipleCurrencies: boolean;
}

export const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  // ... add more as needed
];
```

##### B. Create Currency Service

```typescript
// src/services/currencyService.ts
const API_KEY = import.meta.env.VITE_EXCHANGE_RATE_API_KEY;
const API_URL = 'https://v6.exchangerate-api.com/v6';

interface ExchangeRateResponse {
  result: string;
  conversion_rates: Record<string, number>;
  time_last_update_unix: number;
}

class CurrencyService {
  private cache: Map<string, { rates: Record<string, number>; timestamp: number }> = new Map();
  private cacheExpiry = 3600000; // 1 hour

  async getExchangeRates(baseCurrency: string = 'USD'): Promise<Record<string, number>> {
    const cached = this.cache.get(baseCurrency);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.rates;
    }

    try {
      const response = await fetch(`${API_URL}/${API_KEY}/latest/${baseCurrency}`);
      const data: ExchangeRateResponse = await response.json();
      
      if (data.result === 'success') {
        this.cache.set(baseCurrency, {
          rates: data.conversion_rates,
          timestamp: Date.now(),
        });
        return data.conversion_rates;
      }
      throw new Error('Failed to fetch exchange rates');
    } catch (error) {
      console.error('Currency conversion error:', error);
      // Return cached data if available, even if expired
      if (cached) return cached.rates;
      throw error;
    }
  }

  async convert(amount: number, from: string, to: string): Promise<number> {
    if (from === to) return amount;
    
    const rates = await this.getExchangeRates(from);
    const rate = rates[to];
    
    if (!rate) {
      throw new Error(`Exchange rate not found for ${from} to ${to}`);
    }
    
    return amount * rate;
  }

  formatAmount(amount: number, currency: string): string {
    const currencyInfo = SUPPORTED_CURRENCIES.find(c => c.code === currency);
    const symbol = currencyInfo?.symbol || currency;
    
    return `${symbol}${amount.toFixed(2)}`;
  }
}

export const currencyService = new CurrencyService();
```

##### C. Add Currency Selector to Expense Form

```typescript
// src/components/expenses/ExpenseForm.tsx
import { SUPPORTED_CURRENCIES } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

// Add to form state
const [currency, setCurrency] = useState(userSettings.preferredCurrency || 'USD');

// Add to form JSX
<div className="form-group">
  <label htmlFor="currency">Currency</label>
  <select
    id="currency"
    value={currency}
    onChange={(e) => setCurrency(e.target.value)}
    className="form-control"
  >
    {SUPPORTED_CURRENCIES.map(curr => (
      <option key={curr.code} value={curr.code}>
        {curr.symbol} {curr.code} - {curr.name}
      </option>
    ))}
  </select>
</div>
```

##### D. Display Converted Amounts

```typescript
// src/components/expenses/ExpenseList.tsx
import { currencyService } from '../../services/currencyService';
import { useAuth } from '../../contexts/AuthContext';

const ExpenseItem: React.FC<{ expense: Expense }> = ({ expense }) => {
  const { user } = useAuth();
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);

  useEffect(() => {
    if (expense.currency !== user.preferredCurrency) {
      currencyService
        .convert(expense.amount, expense.currency, user.preferredCurrency)
        .then(setConvertedAmount)
        .catch(console.error);
    }
  }, [expense, user.preferredCurrency]);

  return (
    <div className="expense-item">
      <span className="amount">
        {currencyService.formatAmount(expense.amount, expense.currency)}
        {convertedAmount && expense.currency !== user.preferredCurrency && (
          <span className="converted-amount text-sm text-gray-500 ml-2">
            ≈ {currencyService.formatAmount(convertedAmount, user.preferredCurrency)}
          </span>
        )}
      </span>
    </div>
  );
};
```

##### E. Add Currency Settings

```typescript
// src/pages/UserProfile.tsx
// Add currency preference to user settings

<div className="setting-item">
  <label>Preferred Currency</label>
  <select
    value={settings.preferredCurrency}
    onChange={(e) => updateSetting('preferredCurrency', e.target.value)}
  >
    {SUPPORTED_CURRENCIES.map(curr => (
      <option key={curr.code} value={curr.code}>
        {curr.symbol} {curr.code} - {curr.name}
      </option>
    ))}
  </select>
</div>
```

#### Testing:
1. Add expenses in different currencies
2. Verify conversion displays correctly
3. Test changing preferred currency
4. Verify export includes currency info
5. Test offline behavior (uses cached rates)

---

### 5. Receipt Photo Attachment

**Priority**: HIGH  
**Effort**: 2-3 days (without OCR initially)  
**Storage**: Firebase Storage

#### Implementation Steps:

##### A. Set Up Firebase Storage

```typescript
// src/config/firebase.ts
import { getStorage } from 'firebase/storage';

export const storage = getStorage(app);
```

##### B. Create Image Upload Service

```typescript
// src/services/imageService.ts
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../config/firebase';

export const imageService = {
  async uploadReceipt(userId: string, expenseId: string, file: File): Promise<string> {
    // Validate file
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      throw new Error('Image size must be less than 5MB');
    }

    // Create reference
    const fileName = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `receipts/${userId}/${expenseId}/${fileName}`);

    // Upload file
    await uploadBytes(storageRef, file);

    // Get download URL
    const url = await getDownloadURL(storageRef);
    return url;
  },

  async deleteReceipt(receiptUrl: string): Promise<void> {
    const storageRef = ref(storage, receiptUrl);
    await deleteObject(storageRef);
  },

  // Compress image before upload
  async compressImage(file: File, maxWidth = 1200): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;

          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error('Canvas to Blob conversion failed'));
            },
            'image/jpeg',
            0.85
          );
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  },
};
```

##### C. Add Upload Component to Expense Form

```typescript
// src/components/expenses/ReceiptUpload.tsx
import React, { useState, useRef } from 'react';
import { imageService } from '../../services/imageService';

interface Props {
  onUpload: (url: string) => void;
  currentReceipt?: string;
}

export const ReceiptUpload: React.FC<Props> = ({ onUpload, currentReceipt }) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentReceipt || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);

      // Show preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Compress and prepare for upload
      const compressedBlob = await imageService.compressImage(file);
      const compressedFile = new File([compressedBlob], file.name, {
        type: 'image/jpeg',
      });

      // Note: Actual upload happens when expense is saved
      // Store file temporarily for batch upload
      onUpload(URL.createObjectURL(compressedFile));
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Failed to process image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onUpload('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="receipt-upload">
      <label className="block text-sm font-medium mb-2">
        Receipt (Optional)
      </label>

      {preview ? (
        <div className="receipt-preview relative">
          <img
            src={preview}
            alt="Receipt preview"
            className="w-full h-48 object-cover rounded-lg"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
          >
            ✕
          </button>
        </div>
      ) : (
        <div
          className="upload-area border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500"
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <div>Uploading...</div>
          ) : (
            <>
              <div className="text-4xl mb-2">📸</div>
              <p className="text-sm text-gray-600">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-gray-500 mt-1">
                PNG, JPG up to 5MB
              </p>
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        capture="environment" // Use camera on mobile
      />
    </div>
  );
};
```

##### D. Integrate with Expense Form

```typescript
// src/components/expenses/ExpenseForm.tsx
import { ReceiptUpload } from './ReceiptUpload';

// Add to form state
const [receiptUrl, setReceiptUrl] = useState('');

// Add to JSX
<ReceiptUpload
  onUpload={setReceiptUrl}
  currentReceipt={editingExpense?.receiptUrl}
/>

// Update save handler to upload receipt
const handleSave = async () => {
  // ... existing validation

  // Upload receipt if present
  let finalReceiptUrl = receiptUrl;
  if (receiptUrl && receiptUrl.startsWith('blob:')) {
    const response = await fetch(receiptUrl);
    const blob = await response.blob();
    const file = new File([blob], 'receipt.jpg', { type: 'image/jpeg' });
    finalReceiptUrl = await imageService.uploadReceipt(user.uid, newExpenseId, file);
  }

  // Save expense with receipt URL
  await expenseService.createExpense({
    ...formData,
    receiptUrl: finalReceiptUrl,
  });
};
```

##### E. Display Receipt in Expense List

```typescript
// src/components/expenses/ExpenseList.tsx
// Add receipt thumbnail to expense items

{expense.receiptUrl && (
  <button
    onClick={() => setViewingReceipt(expense.receiptUrl)}
    className="receipt-thumb ml-2"
  >
    📎
  </button>
)}

// Add modal for full receipt view
{viewingReceipt && (
  <div className="modal-overlay" onClick={() => setViewingReceipt(null)}>
    <div className="modal-content">
      <img src={viewingReceipt} alt="Receipt" className="max-w-full max-h-screen" />
    </div>
  </div>
)}
```

#### Testing:
1. Upload various image formats
2. Test image compression
3. Verify mobile camera integration
4. Test delete functionality
5. Verify Firebase Storage integration

---

## Phase 3: Advanced Features

(Detailed implementation guides for PDF Export, OCR, AI Insights, and 2FA would follow similar format...)

---

## Environment Variables Needed

```env
# .env.example
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Exchange Rate API
VITE_EXCHANGE_RATE_API_KEY=your_exchange_rate_api_key

# OCR Service (when implemented)
VITE_OCR_API_KEY=your_ocr_api_key
```

---

## Security Considerations

1. **Firebase Storage Rules**:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /receipts/{userId}/{expenseId}/{fileName} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow delete: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

2. **Image Upload Validation**:
   - Check file type on client and server
   - Enforce size limits
   - Sanitize file names
   - Scan for malware (if high security needed)

3. **API Keys**:
   - Never commit API keys to git
   - Use environment variables
   - Rotate keys regularly
   - Use Firebase App Check for API protection

---

## Testing Strategy

### Unit Tests
- Service functions
- Utility functions
- Data transformations

### Component Tests
- Form submissions
- User interactions
- State management

### Integration Tests
- Firebase operations
- API integrations
- Multi-step workflows

### E2E Tests
- Complete user flows
- Cross-browser testing
- Mobile responsiveness

---

## Performance Optimization

1. **Lazy Loading**:
```typescript
const Charts = lazy(() => import('./components/dashboard/Charts'));
```

2. **Image Optimization**:
   - Compress before upload
   - Use appropriate formats
   - Implement lazy loading for images

3. **Caching Strategy**:
   - Cache exchange rates (1 hour)
   - Cache Firebase queries
   - Use service worker for offline

4. **Code Splitting**:
   - Split by routes
   - Split large libraries
   - Dynamic imports for heavy features

---

## Deployment Checklist

- [ ] Update environment variables
- [ ] Configure Firebase domain authorization
- [ ] Set up Firebase Storage rules
- [ ] Enable required Firebase services
- [ ] Configure API keys and limits
- [ ] Test on production domain
- [ ] Enable HTTPS
- [ ] Configure CORS if needed
- [ ] Set up monitoring and analytics
- [ ] Create backup strategy

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-17  
**Ready for Implementation**: ✅
