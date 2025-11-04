# Expense Manager - Feature Documentation

## Overview

This document provides detailed information about all the features implemented in the Expense Manager web application.

## Feature List

### 1. Expense Tracking (費用記錄)

**Purpose**: Track all your expenses in one place with detailed information.

**Capabilities**:
- Add new expenses with description, amount, category, date, and optional notes
- Edit existing expenses
- Delete expenses with confirmation
- View all expenses in a list format
- Search expenses by description
- Filter expenses by category
- Sort expenses by date (newest/oldest) or amount (highest/lowest)

**Data Model**:
```typescript
interface Expense {
  id?: string;
  userId: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**User Flow**:
1. Navigate to "Expenses" tab
2. Fill out the expense form with required details
3. Click "Add Expense" to save
4. View the expense in the list below
5. Use search/filter/sort to find specific expenses
6. Click "Edit" to modify or "Delete" to remove

---

### 2. Category Management (費用分類)

**Purpose**: Organize expenses into meaningful categories for better tracking.

**Capabilities**:
- Pre-loaded default categories (Food & Dining, Transportation, Shopping, Entertainment, Bills & Utilities, Healthcare, Education, Other)
- Create custom categories
- Customize category icons (choose from emoji collection)
- Customize category colors
- Edit category names, icons, and colors
- Delete custom categories (default categories are protected)

**Data Model**:
```typescript
interface Category {
  id?: string;
  userId: string;
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
  createdAt: Date;
}
```

**Default Categories**:
- 🍔 Food & Dining (#FF6B6B)
- 🚗 Transportation (#4ECDC4)
- 🛍️ Shopping (#45B7D1)
- 🎬 Entertainment (#FFA07A)
- 📄 Bills & Utilities (#98D8C8)
- 🏥 Healthcare (#F7DC6F)
- 📚 Education (#BB8FCE)
- 📦 Other (#95A5A6)

**User Flow**:
1. Navigate to "Categories" tab
2. View all existing categories
3. Click "+ Add Category" to create a new one
4. Select an icon from the emoji grid
5. Choose a color using the color picker
6. Enter category name and save
7. Edit or delete custom categories as needed

---

### 3. Budget Management (預算設定)

**Purpose**: Set spending limits for each category and track progress.

**Capabilities**:
- Set budget amount for any category
- Choose budget period (weekly, monthly, yearly)
- Set alert threshold percentage (e.g., 80% = alert when 80% of budget is used)
- Visual progress bars showing budget usage
- Color-coded indicators:
  - Green: Under threshold
  - Orange: At or above threshold
  - Red: Over budget (100%+)
- Track spent vs. budgeted amounts

**Data Model**:
```typescript
interface Budget {
  id?: string;
  userId: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  period: 'monthly' | 'weekly' | 'yearly';
  startDate: string;
  alertThreshold: number; // percentage (e.g., 80)
  createdAt: Date;
  updatedAt: Date;
}
```

**User Flow**:
1. Navigate to "Budgets" tab
2. Click "+ Set Budget"
3. Select a category
4. Enter budget amount
5. Choose period (weekly/monthly/yearly)
6. Set alert threshold (default 80%)
7. Save budget
8. View budget cards with progress bars
9. Monitor spending against budget limits

---

### 4. Dashboard & Analytics (儀表板與數據分析)

**Purpose**: Get a quick overview of your spending habits and patterns.

**Capabilities**:
- Summary cards showing:
  - Total Expenses: Sum of all expenses
  - This Month: Total expenses for current month
  - Today: Expenses recorded today
  - Categories: Number of categories used
- Top Spending Categories breakdown:
  - Shows top 5 categories by spending
  - Visual progress bars
  - Percentage of total spending
  - Amount spent per category

**Data Visualization**:
- Clean card-based UI
- Color-coded progress bars
- Real-time updates when expenses change
- Responsive grid layout

**User Flow**:
1. Navigate to "Dashboard" tab (default view)
2. View summary cards at the top
3. Review top spending categories below
4. Understand spending patterns at a glance

---

### 5. Recurring Expenses (定期/重複性費用)

**Purpose**: Automatically track regular expenses like rent, subscriptions, and bills.

**Capabilities**:
- Create recurring expense templates
- Set frequency: daily, weekly, monthly, yearly
- Define start date
- Optional end date
- Pause/resume recurring expenses
- Edit recurring expense details
- Delete recurring expenses
- Active/inactive status indicator

**Data Model**:
```typescript
interface RecurringExpense {
  id?: string;
  userId: string;
  description: string;
  amount: number;
  category: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  endDate?: string;
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  lastGenerated?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**Use Cases**:
- Monthly rent
- Subscription services (Netflix, Spotify, etc.)
- Utility bills
- Insurance premiums
- Gym memberships

**User Flow**:
1. Navigate to "Recurring" tab
2. Click "+ Add Recurring"
3. Enter expense details
4. Select frequency
5. Set start date
6. Save recurring expense
7. Use "Pause" to temporarily stop
8. Use "Resume" to reactivate
9. Edit or delete as needed

---

### 6. Export Reports (報表匯出)

**Purpose**: Export expense data for external analysis or record-keeping.

**Capabilities**:
- Export all expenses to CSV format
- Includes all expense fields:
  - Date
  - Description
  - Category
  - Amount
  - Notes
- Compatible with Excel, Google Sheets, Numbers
- Proper CSV formatting with quotes and escaping
- Timestamped filename

**Export Format**:
```csv
Date,Description,Category,Amount,Notes
2024-01-15,"Grocery shopping","Food & Dining","125.50","Weekly groceries"
2024-01-14,"Gas","Transportation","45.00",""
```

**User Flow**:
1. Click "📊 Export CSV" button in header (available from any tab)
2. File automatically downloads to your device
3. Open in your preferred spreadsheet application
4. Analyze, share, or archive the data

---

### 7. Multi-Device Sync (多裝置同步)

**Purpose**: Access your expense data from any device, anywhere.

**Capabilities**:
- Cloud storage via Firebase Firestore
- Real-time synchronization
- Automatic data sync across devices
- Offline support (data cached locally)
- Secure authentication
- User-specific data isolation

**Technical Implementation**:
- Firebase Authentication for user management
- Firebase Firestore for data storage
- Collection-based data organization:
  - `expenses` collection
  - `categories` collection
  - `budgets` collection
  - `recurringExpenses` collection
- All data scoped to authenticated user's ID
- Real-time listeners for instant updates

**User Flow**:
1. Log in on any device (computer, tablet, phone)
2. Data automatically syncs from cloud
3. Make changes on one device
4. See changes reflected on all other devices instantly
5. Work offline - changes sync when connection restored

---

## Technical Architecture

### Service Layer

All Firebase operations are abstracted into service modules:

- **expenseService.ts**: CRUD operations for expenses
- **categoryService.ts**: CRUD operations for categories
- **budgetService.ts**: CRUD operations for budgets
- **recurringExpenseService.ts**: CRUD operations for recurring expenses

### Component Structure

React components are organized by feature:

- **expenses/**: Expense form and list components
- **categories/**: Category manager component
- **budgets/**: Budget manager component
- **recurring/**: Recurring expense manager
- **dashboard/**: Dashboard summary component

### Data Flow

1. User interacts with UI component
2. Component calls handler function in Dashboard.tsx
3. Handler calls appropriate service function
4. Service performs Firebase operation
5. Data reloads from Firebase
6. UI updates with new data

### State Management

- Local state in components for UI interactions
- Firebase Firestore as source of truth
- React Context for authentication state
- Real-time updates via Firebase listeners (future enhancement)

---

## Security & Privacy

### Authentication
- Secure login with Firebase Authentication
- Email/Password authentication
- Google Sign-in support
- Password reset functionality

### Data Security
- All data scoped to authenticated user
- Firebase security rules enforce user isolation
- No public access to user data
- Encrypted data transmission (HTTPS)

### Best Practices
- Input validation on client and server
- XSS protection with proper escaping
- CSRF protection via Firebase
- Regular security updates

---

## Performance Considerations

### Optimization Techniques
- Lazy loading of components
- Efficient Firebase queries with proper indexing
- Debounced search and filter operations
- Pagination for large datasets (future enhancement)

### Caching Strategy
- Firebase local persistence
- Browser localStorage for offline support
- Service Worker for PWA functionality (root app)

---

## Browser Compatibility

- ✅ Chrome (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

---

## Accessibility

- Semantic HTML elements
- Keyboard navigation support
- Screen reader friendly
- High contrast color schemes
- Responsive design for all screen sizes

---

## Future Roadmap

### Short Term
- [ ] Automatic recurring expense generation
- [ ] Budget alert notifications
- [ ] Enhanced data visualization (charts/graphs)
- [ ] Date range filtering for reports

### Medium Term
- [ ] Receipt scanning with OCR
- [ ] Multi-currency support
- [ ] Budget recommendations
- [ ] Expense trends analysis

### Long Term
- [ ] Mobile app (iOS/Android)
- [ ] AI-powered expense categorization
- [ ] Financial goals tracking
- [ ] Bill reminders
- [ ] Collaborative budgets (family/team)

---

## Support & Contributing

For issues, feature requests, or contributions, please visit the GitHub repository:
https://github.com/QMIQIUQ/Expense_Manager

---

**Last Updated**: 2024
**Version**: 1.0.0
