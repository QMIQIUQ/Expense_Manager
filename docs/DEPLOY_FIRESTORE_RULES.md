# Deploy Firestore Rules Locally

## Quick Fix for "Missing or insufficient permissions" Error

The error you're seeing is because the Firestore security rules haven't been updated to allow access to the new `incomes` collection.

## Solution: Deploy Updated Firestore Rules

### Option 1: Using Firebase Console (Easiest)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Firestore Database** in the left menu
4. Click on the **Rules** tab at the top
5. Copy and paste the entire content from `web/firestore.rules` file
6. Click **Publish** button

### Option 2: Using Firebase CLI

If you have Firebase CLI installed:

```bash
# Navigate to the web directory
cd web

# Deploy only Firestore rules
firebase deploy --only firestore:rules

# Or if you want to deploy everything
firebase deploy
```

### Option 3: Manual Copy-Paste from File

The updated rules are in: `web/firestore.rules`

Key addition for Income feature (lines 70-81):
```javascript
// Incomes collection
match /incomes/{incomeId} {
  allow read: if isAuthenticated() && (isOwner(resource.data.userId) || isAdmin());
  allow create: if isAuthenticated() && 
                  isOwner(request.resource.data.userId) &&
                  request.resource.data.amount is number &&
                  request.resource.data.amount > 0;
  allow update: if isAuthenticated() && 
                   (isOwner(resource.data.userId) || isAdmin()) &&
                   request.resource.data.amount is number &&
                   request.resource.data.amount > 0;
  allow delete: if isAuthenticated() && (isOwner(resource.data.userId) || isAdmin());
}
```

## Verify Rules Are Applied

After deploying, you should see in the Firebase Console under Firestore Rules:
- ✅ `categories` collection rules
- ✅ `expenses` collection rules
- ✅ `budgets` collection rules
- ✅ `recurringExpenses` collection rules
- ✅ `cards` collection rules
- ✅ `incomes` collection rules (NEW)

## Testing Locally

Once the rules are deployed:

1. **Start the development server:**
   ```bash
   cd web
   npm run dev
   ```

2. **Access the app:**
   - Open your browser to the URL shown (usually `http://localhost:5173`)
   - Log in with your account

3. **Test the Incomes tab:**
   - Click on the "Incomes" tab
   - Try to add a new income
   - The Firebase permission error should be gone

## Troubleshooting

### Still getting permission errors?

1. **Check if rules are published:**
   - Go to Firebase Console → Firestore Database → Rules
   - Verify the `incomes` collection rules are present
   - Check the "Last published" timestamp

2. **Clear browser cache:**
   ```
   - Chrome: Ctrl+Shift+R (Cmd+Shift+R on Mac)
   - Or open in incognito/private window
   ```

3. **Verify authentication:**
   - Make sure you're logged in
   - Check browser console for auth errors

4. **Check Firebase project:**
   - Verify you're using the correct Firebase project
   - Check `web/src/config/firebase.ts` for project config

### Rules Not Taking Effect?

Sometimes rules take a minute to propagate. Wait 1-2 minutes and try again.

## What Changed?

**Before:** Only `expenses`, `categories`, `budgets`, `recurringExpenses`, and `cards` collections had rules.

**After:** Added complete CRUD rules for `incomes` collection with validation:
- Users can only read/write their own incomes
- Admins can access all incomes
- Income amount must be a positive number
- Proper userId validation on create/update

## Complete Firestore Rules Structure

Your Firestore now has rules for:
1. ✅ **users** - User profile and admin status
2. ✅ **categories** - Expense categories
3. ✅ **expenses** - Expense records with payment methods
4. ✅ **budgets** - Budget tracking
5. ✅ **recurringExpenses** - Recurring expense templates
6. ✅ **cards** - Credit card management
7. ✅ **incomes** - Income tracking (NEW)

## Need Help?

If you still encounter issues after deploying the rules:
1. Check the browser console for detailed error messages
2. Verify your Firebase project is in Blaze (pay-as-you-go) plan if using advanced features
3. Check that your Firebase user has proper authentication enabled
