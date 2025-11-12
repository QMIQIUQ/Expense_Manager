# Grab Earnings Feature - Complete Implementation Guide

## Overview

This document provides comprehensive documentation for the Grab earnings tracking feature implemented in the Expense Manager application. This feature allows Grab drivers to track their earnings, monitor performance, and compare income against expenses.

## Design Decision: Option B (Dedicated Page) ✅

We chose **Option B: Dedicated Grab Earnings Page** over Option A (filter in existing Income page) for the following reasons:

### Why Option B?

1. **Clean Separation of Concerns**
   - Grab earnings have unique fields (trip_type, platform_fees, tips, gross/net breakdown)
   - These fields don't fit well into the generic Income model
   - Specialized UI provides better UX for Grab-specific features

2. **Performance Benefits**
   - Separate collection allows optimized queries for Grab data
   - No need to filter generic income data
   - Better indexing strategies

3. **Scalability**
   - Easy to add Grab-specific features in the future (e.g., CSV import from Grab statements)
   - Can add more driver-specific analytics without cluttering Income page
   - Feature toggle allows users to opt-in

4. **User Experience**
   - Dedicated dashboard with Grab-specific metrics (gross, fees, tips, net)
   - Target achievement tracking (income vs expense comparison)
   - Daily earning targets based on remaining days in month
   - Clear visual separation from other income sources

## Data Model

### GrabEarning Interface

```typescript
interface GrabEarning {
  id?: string;                    // Firestore document ID
  userId: string;                 // User who owns this record
  date: string;                   // YYYY-MM-DD format
  grossAmount: number;            // Total fare shown to customer
  platformFees: number;           // Commission/service fees deducted by Grab
  tips: number;                   // Tips received from customer
  netAmount: number;              // Calculated: gross - fees + tips
  tripType: 'ride' | 'delivery' | 'other';  // Type of trip
  tripIdOrRef?: string;           // Optional Grab trip reference number
  payoutDate?: string;            // YYYY-MM-DD when payment received
  payoutReference?: string;       // Bank transaction reference
  notes?: string;                 // Additional notes
  linkedExpenseId?: string;       // Optional link to related expense (fuel, etc.)
  createdAt: Date;                // Record creation timestamp
  updatedAt: Date;                // Last update timestamp
}
```

### Trip Types

- **ride**: Passenger rides (GrabCar, GrabBike)
- **delivery**: Food and parcel delivery (GrabFood, GrabExpress)
- **other**: Other Grab services

### Net Amount Calculation

The net amount is automatically calculated using the formula:
```
netAmount = grossAmount - platformFees + tips
```

This calculation is performed:
- Automatically in the form (real-time)
- On the server during create/update operations
- During monthly statistics aggregation

## Feature Toggle System

### Implementation

The feature toggle system uses Firestore to store user preferences:

```typescript
// Collection: feature_toggles
// Document ID: userId
{
  grabEarningsEnabled: boolean
}
```

### Usage

1. **Enable Feature**:
   - Navigate to Profile tab
   - Toggle "Grab Earnings Feature" switch ON
   - Grab tab becomes visible in navigation

2. **Disable Feature**:
   - Toggle switch OFF
   - Grab tab is hidden
   - Data remains in database (can be re-enabled later)

### Benefits

- Per-user control (not all users need Grab tracking)
- Gradual feature rollout capability
- Easy A/B testing
- Data is preserved even when feature is disabled

## API/Service Methods

### grabEarningsService

#### create(earning)
Creates a new Grab earning record.
- Validates net amount calculation
- Returns document ID

```typescript
const id = await grabEarningsService.create({
  userId: currentUser.uid,
  date: '2025-11-12',
  grossAmount: 100,
  platformFees: 20,
  tips: 5,
  netAmount: 85,
  tripType: 'ride',
});
```

#### getAll(userId)
Retrieves all Grab earnings for a user, ordered by date (descending).

```typescript
const earnings = await grabEarningsService.getAll(userId);
```

#### getByMonth(userId, month)
Retrieves earnings for a specific month (YYYY-MM format).

```typescript
const novEarnings = await grabEarningsService.getByMonth(userId, '2025-11');
```

#### getByDateRange(userId, startDate, endDate)
Retrieves earnings within a date range.

```typescript
const earnings = await grabEarningsService.getByDateRange(
  userId,
  '2025-11-01',
  '2025-11-15'
);
```

#### update(id, updates)
Updates an existing earning. Automatically recalculates net amount if gross, fees, or tips are changed.

```typescript
await grabEarningsService.update(id, {
  platformFees: 25, // netAmount will be recalculated
});
```

#### delete(id)
Deletes a Grab earning record.

```typescript
await grabEarningsService.delete(id);
```

#### getMonthlyStats(userId, month)
Calculates aggregate statistics for a month.

```typescript
const stats = await grabEarningsService.getMonthlyStats(userId, '2025-11');
// Returns: {
//   totalGross: 1000,
//   totalFees: 200,
//   totalTips: 50,
//   totalNet: 850,
//   tripCount: 10,
//   byTripType: {
//     ride: { count: 7, gross: 700, net: 595 },
//     delivery: { count: 3, gross: 300, net: 255 }
//   }
// }
```

## UI Components

### 1. GrabEarningForm
Form component for adding/editing Grab earnings.

**Features**:
- Auto-calculation of net amount
- Date picker (defaults to today)
- Trip type selector
- Optional fields for payout info and notes
- Expense linking capability
- Real-time validation

### 2. GrabEarningList
Displays list of Grab earnings with filtering.

**Features**:
- Filter by trip type (ride/delivery/other/all)
- Filter by month
- Inline editing
- Delete with confirmation
- Shows gross, fees, tips, net breakdown
- Visual indicators for trip types (🚗 🛵 📦)

### 3. GrabDashboardCards
Statistics dashboard showing monthly overview.

**Features**:
- Total gross, fees, tips, net cards
- Average per trip calculation
- Trip count display
- Target achievement widget
- Income vs expense comparison
- Daily target remaining calculator

### 4. GrabEarningsTab
Main container component integrating all Grab features.

**Features**:
- Dashboard cards at top
- Add new earning button
- Earnings list with filters
- Comprehensive monthly view

## Dashboard Integration

### Combined Income Calculation

The main dashboard now includes Grab earnings in the total income calculation:

```typescript
combinedMonthlyIncome = monthlyIncome + monthlyGrabNet
netCashflow = combinedMonthlyIncome - monthlyExpenses
```

This means:
- Monthly Income card shows combined regular income + Grab earnings
- Net Cashflow reflects all income sources
- Financial overview is comprehensive

### Display

When Grab feature is enabled and there are Grab earnings:
- Monthly Income card shows breakdown:
  ```
  Monthly Income
  $1,500
  Incomes: $1,000 + Grab: $500
  ```

## Target Achievement Features

### Break-Even Calculation

Shows how much more income is needed to cover monthly expenses:

```typescript
remainingToBreakEven = max(0, monthlyExpenses - monthlyGrabNet)
```

### Daily Target

Calculates how much needs to be earned per day to break even:

```typescript
daysLeft = daysInMonth - currentDay + 1
needPerDay = remainingToBreakEven / daysLeft
```

### Progress Bar

Visual indicator showing progress toward breaking even:
- Green: Income exceeds expenses (surplus)
- Blue: Progress bar showing percentage of goal achieved

### Success State

When monthly income exceeds expenses:
- Shows "Target Met! 🎉" message
- Displays surplus amount
- Green success styling

## Web Research Summary

Based on comprehensive research from industry sources, Grab drivers commonly need:

### Core Features (Implemented)
1. ✅ Daily job & income tracking
2. ✅ Net income calculation (gross - fees + tips)
3. ✅ Goal setting & progress visualization
4. ✅ Trip type breakdown
5. ✅ Monthly statistics and summaries
6. ✅ Expense linking capability

### Commission & Fee Structure (Supported)
- ✅ Platform fees (15-25% typical)
- ✅ Tips tracking (100% to driver)
- ✅ Gross vs net breakdown
- ✅ Transaction-level detail

### Future Enhancements (Not Yet Implemented)
- [ ] CSV import from Grab statements
- [ ] Export to Excel/PDF
- [ ] Tax report generation
- [ ] Mileage tracking
- [ ] Incentive/bonus tracking
- [ ] Cancellation fee tracking
- [ ] Peak hour analysis
- [ ] Heat map of high-earning areas

### Research Sources
1. [GitHub - Grab Driver Tracker Enhanced](https://github.com/bihunx/Grab-Driver-Tracker-Enhanced)
2. [Grab Official - Improved Earnings Structure](https://www.grab.com/my/improved-earnings-structure/)
3. [Gridwise - Earnings Tracker](https://gridwise.io/features/earnings/)
4. [Grab Technology Features](https://www.nst.com.my/business/2023/09/950792/)
5. [Grab Earnings Breakdown](https://organizeforliving.com/what-percentage-do-grab-drivers-get/)
6. [Tax Guide for Rideshare Drivers](https://www.filelater.com/resources/maximizing-deductions-for-rideshare-drivers-a-tax-guide/)

## Security

### Firestore Rules

```javascript
// Grab earnings collection
match /grab-earnings/{earningId} {
  allow read: if isAuthenticated() && 
                (isOwner(resource.data.userId) || isAdmin());
  allow create: if isAuthenticated() && 
                  isOwner(request.resource.data.userId) &&
                  request.resource.data.grossAmount is number &&
                  request.resource.data.grossAmount >= 0 &&
                  request.resource.data.platformFees is number &&
                  request.resource.data.platformFees >= 0 &&
                  request.resource.data.tips is number &&
                  request.resource.data.tips >= 0 &&
                  request.resource.data.netAmount is number;
  allow update: if isAuthenticated() && 
                   (isOwner(resource.data.userId) || isAdmin()) &&
                   // ... same validations as create
  allow delete: if isAuthenticated() && 
                   (isOwner(resource.data.userId) || isAdmin());
}

// Feature toggles collection
match /feature_toggles/{userId} {
  allow read: if isAuthenticated() && 
                 (isOwner(userId) || isAdmin());
  allow create, update: if isAuthenticated() && 
                           (isOwner(userId) || isAdmin());
  allow delete: if isAdmin();
}
```

### Key Security Features
- User can only access their own earnings
- Admins have override access
- Numeric validation on all amount fields
- Non-negative amounts enforced
- Feature toggles are user-specific

## Installation & Setup

### 1. Install Dependencies

Already included in package.json (no additional dependencies needed).

### 2. Deploy Firestore Rules

```bash
cd web
firebase deploy --only firestore:rules
```

### 3. Create Firestore Indexes

If prompted by the app, create indexes via the Firebase Console or:

```bash
firebase deploy --only firestore:indexes
```

Likely needed indexes:
- `grab-earnings`: (userId, date DESC)
- `grab-earnings`: (userId, date >= , date <=, date DESC)

### 4. Enable Feature for Users

Users can enable the feature in their Profile:
1. Login to app
2. Go to Profile tab
3. Toggle "Grab Earnings Feature" ON

Or enable programmatically:
```typescript
await featureToggleService.setFeature(userId, 'grabEarningsEnabled', true);
```

## Testing Guide

### Manual Testing Scenarios

#### Scenario 1: First Time Setup
1. Login to application
2. Navigate to Profile tab
3. Enable "Grab Earnings Feature"
4. Verify "🚗 Grab Earnings" tab appears
5. Click on Grab Earnings tab
6. Verify empty state message displays

#### Scenario 2: Add Grab Earning
1. Click "Add Grab Earning" button
2. Fill in form:
   - Date: Today
   - Trip Type: Ride
   - Gross Amount: 100
   - Platform Fees: 20
   - Tips: 5
3. Verify Net Amount auto-calculates to 85
4. Click Save
5. Verify earning appears in list
6. Verify dashboard cards update

#### Scenario 3: Target Achievement
1. Add expenses for current month (e.g., $500)
2. Add Grab earnings for current month (e.g., $300)
3. Navigate to Grab Earnings tab
4. Verify "Target Achievement" shows:
   - Monthly Expense: $500
   - Monthly Grab Earnings: $300
   - Remaining to Break Even: $200
   - Daily Target: $200 / days_left

#### Scenario 4: Monthly Filtering
1. Add earnings from different months
2. Use month filter dropdown
3. Verify only selected month's earnings display
4. Verify totals update accordingly

#### Scenario 5: Trip Type Filtering
1. Add earnings with different trip types
2. Use trip type filter
3. Verify filtering works correctly

#### Scenario 6: Edit and Delete
1. Click Edit on an earning
2. Modify values
3. Verify net amount recalculates
4. Save and verify changes persist
5. Delete an earning
6. Confirm deletion
7. Verify earning removed and stats updated

### Edge Cases to Test

1. **Zero Values**: Earning with $0 gross, fees, or tips
2. **Large Values**: Very large earning amounts
3. **Month Boundaries**: Earnings on first/last day of month
4. **No Expenses**: Target achievement when expenses = 0
5. **Surplus**: When income exceeds expenses
6. **Empty State**: No earnings yet
7. **Disabled Feature**: Toggle feature off and verify tab disappears

## Troubleshooting

### Issue: Grab tab not visible
**Solution**: Ensure feature is enabled in Profile settings

### Issue: Permission denied when adding earnings
**Solution**: Deploy updated Firestore rules

### Issue: Net amount not calculating
**Solution**: Check that grossAmount, platformFees, and tips are valid numbers

### Issue: Index error when loading earnings
**Solution**: Create required Firestore indexes via console link

### Issue: Data not updating in real-time
**Solution**: Check browser console for errors; refresh page

## Future Enhancements

### Phase 2 Features
1. **CSV Import**
   - Parse Grab statement CSV files
   - Automatic trip mapping
   - Bulk import capability

2. **Export Functionality**
   - Export to Excel
   - Export to PDF
   - Tax report generation

3. **Advanced Analytics**
   - Hourly earning trends
   - Peak hour identification
   - Day-of-week analysis
   - Trip distance vs earnings correlation

4. **Enhanced Expense Linking**
   - Fuel cost per trip
   - Maintenance cost allocation
   - ROI calculation

5. **Incentive Tracking**
   - Bonus tracking
   - Streak bonuses
   - Promotion earnings
   - Cancellation fees

6. **Payout Management**
   - Payout status tracking
   - Bank reconciliation
   - Pending vs paid view
   - Payment history

## Support

For issues or questions:
1. Check this documentation
2. Review Firestore console for data integrity
3. Check browser console for JavaScript errors
4. Verify Firestore rules are deployed

## License

This feature is part of the Expense Manager application and follows the same license terms.
