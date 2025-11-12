# Migration Guide - Feature Manager & E-Wallet Management

This guide provides step-by-step instructions for deploying the new Feature Manager and E-Wallet Management features.

## 📋 Overview

This update adds:
- **E-Wallet Management**: Create, edit, and manage electronic payment methods
- **Feature Manager**: Control which features appear in the main navigation tabs
- **Autocomplete Dropdowns**: Improved UX for selecting categories and e-wallets
- **Unified Design System**: Centralized theme, design tokens, and icon library

## 🔄 Database Schema Changes

### New Collections

#### 1. `ewallets` Collection
Stores electronic payment methods (e.g., PayPal, Apple Pay, etc.)

**Fields:**
- `userId` (string): Owner of the e-wallet
- `name` (string): Display name (e.g., "PayPal")
- `icon` (string): Emoji icon for visual identification
- `color` (string): Hex color code for theming
- `provider` (string, optional): Service provider name
- `accountNumber` (string, optional): Last 4 digits or identifier
- `isDefault` (boolean, optional): Whether it's a system-provided default
- `createdAt` (timestamp): Creation date
- `updatedAt` (timestamp): Last update date

#### 2. `featureSettings` Collection
Stores per-user feature visibility and tab ordering preferences

**Fields:**
- `userId` (string): Owner of the settings
- `enabledFeatures` (array of strings): List of enabled feature tabs in display order
- `createdAt` (timestamp): Creation date
- `updatedAt` (timestamp): Last update date

## 🔐 Firebase Security Rules Update

**IMPORTANT:** You must deploy the updated Firestore security rules to Firebase Console.

### Steps to Deploy Rules:

1. **Navigate to Firebase Console:**
   ```
   https://console.firebase.google.com/
   ```

2. **Select your project**

3. **Go to Firestore Database → Rules**

4. **Copy the rules from `/web/firestore.rules`** and paste them into the Firebase Console

5. **Click "Publish"** to deploy the rules

### New Rules Added:
```javascript
// E-Wallets collection
match /ewallets/{ewalletId} {
  allow read: if isAuthenticated() && (isOwner(resource.data.userId) || isAdmin());
  allow create: if isAuthenticated() && isOwner(request.resource.data.userId);
  allow update, delete: if isAuthenticated() && (isOwner(resource.data.userId) || isAdmin());
}

// Feature Settings collection
match /featureSettings/{settingsId} {
  allow read: if isAuthenticated() && (isOwner(resource.data.userId) || isAdmin());
  allow create: if isAuthenticated() && isOwner(request.resource.data.userId);
  allow update: if isAuthenticated() && (isOwner(resource.data.userId) || isAdmin());
  allow delete: if isAuthenticated() && (isOwner(resource.data.userId) || isAdmin());
}
```

## 📦 Installation Steps

### 1. Install Dependencies
```bash
cd web
npm install
```

### 2. Build the Project
```bash
npm run build
```

### 3. Deploy to Firebase (if using Firebase Hosting)
```bash
firebase deploy
```

Or if you want to deploy only Firestore rules:
```bash
firebase deploy --only firestore:rules
```

## 🧪 Testing Locally

### 1. Start Development Server
```bash
cd web
npm run dev
```

### 2. Test E-Wallet Management

1. Log in to the application
2. Navigate to the "E-Wallets" tab (if visible in your feature settings)
3. Click "Add E-Wallet"
4. Fill in the form:
   - Name: "PayPal"
   - Provider: "PayPal Inc."
   - Account Number: "1234" (optional)
   - Select an icon and color
5. Click "Add"
6. Verify the e-wallet appears in the list
7. Test Edit and Delete functionality

### 3. Test Feature Manager

1. Navigate to "Settings" or "Feature Manager"
2. You should see two columns:
   - **Enabled Features**: Currently visible tabs (drag to reorder)
   - **Available Features**: Hidden tabs (click to enable)
3. Try disabling a feature (must keep at least one enabled)
4. Try dragging to reorder features
5. Click "Save Settings"
6. Refresh the page and verify the tab order changed

### 4. Test Expense Form with E-Wallet

1. Go to "Expenses" tab
2. Click "Add Expense"
3. Select Payment Method: "E-Wallet"
4. Use the autocomplete dropdown to select an e-wallet
5. Complete the form and submit
6. Verify the expense shows the correct e-wallet

### 5. Test Autocomplete Functionality

1. Add multiple e-wallets (at least 5-10)
2. In the Expense form, select "E-Wallet" as payment method
3. Start typing in the dropdown
4. Verify:
   - Results filter as you type
   - You can navigate with arrow keys
   - You can select with Enter key
   - Selected items show a checkmark

## 🌐 i18n / Localization

The following translation keys were added:
- E-Wallet related keys (40+ translations)
- Feature Manager keys
- Autocomplete component keys

All keys are available in:
- English (`en`)
- Traditional Chinese (`zh`)
- Simplified Chinese (`zh-CN`)

**Location:** `/web/src/locales/translations.ts`

## 🎨 Design System

New centralized styling system has been added:

- **Design Tokens:** `/web/src/styles/designTokens.ts`
- **Theme Configuration:** `/web/src/styles/theme.ts`
- **Icon Library:** `/web/src/components/icons/index.tsx`

### Using the Design System in Your Code

```typescript
import { designTokens } from '../styles/designTokens';
import { theme } from '../styles/theme';
import { Icons } from '../components/icons';

// Use design tokens
const buttonStyle = {
  backgroundColor: designTokens.colors.primary[500],
  padding: designTokens.spacing[4],
  borderRadius: designTokens.borderRadius.md,
};

// Use icons
<Icons.Plus size={20} />
<Icons.Edit size={18} />
```

## 🔄 Data Migration

### Existing Users

**No data migration is required.** The new collections will be created automatically when users:
1. First access the E-Wallet management page (defaults will be initialized)
2. First access the Feature Manager (defaults will be initialized)

### Default Data

**Default E-Wallets:**
- PayPal
- Apple Pay
- Google Pay
- Alipay
- WeChat Pay

**Default Feature Settings:**
All standard features enabled in this order:
1. Dashboard
2. Expenses
3. Incomes
4. Categories
5. Budgets
6. Recurring
7. Cards

## ⚠️ Breaking Changes

**None.** This update is fully backward compatible with existing data.

## 🐛 Troubleshooting

### Issue: "Permission denied" when accessing e-wallets
**Solution:** Ensure Firestore rules have been deployed. Run:
```bash
firebase deploy --only firestore:rules
```

### Issue: E-Wallets dropdown shows "No results"
**Solution:** Initialize default e-wallets by visiting the E-Wallet management page.

### Issue: Feature tabs not appearing
**Solution:** Clear browser cache and local storage, then reload the page.

### Issue: Build fails with TypeScript errors
**Solution:** Ensure you've pulled the latest changes and run:
```bash
npm install
npm run build
```

## 📞 Support

If you encounter issues:
1. Check the console for error messages
2. Verify Firebase rules are deployed
3. Check that you're using the latest code
4. Review `/web/src/types/index.ts` for type definitions

## 🔗 Related Documentation

- [agent-priority-rules.md](agent-priority-rules.md) - Development guidelines
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture
- [FEATURES.md](FEATURES.md) - Feature documentation
- [Firebase Console](https://console.firebase.google.com/) - Manage your Firebase project

---

**Last Updated:** 2025-01-12
**Version:** 1.0.0
