# Import/Export Feature - Manual Testing Guide

This guide provides step-by-step instructions for manually testing the import/export functionality.

## Prerequisites

1. **Firebase Setup**: Ensure Firebase project is configured
2. **Dependencies**: Run `npm install` in both `/web` and `/tools` directories
3. **Test Data**: Generate test files using the test data generator

## Setup

### 1. Generate Test Data

```bash
cd tools
npm install
npm run generate-test-data  # Generates 100 test records
```

This creates three test files in `/test-data`:
- `test-expenses-100-clean.xlsx` - Clean data
- `test-expenses-100-with-errors.xlsx` - Data with intentional errors
- `test-expenses-100.csv` - CSV format

### 2. Start Application

```bash
cd web
npm install
npm run dev
```

Open browser to `http://localhost:5173` (or the URL shown in terminal)

### 3. Login/Register

- Create a test account or login with existing credentials
- You should see the Dashboard with expense manager

## Test Cases

### Test Case 1: Template Download

**Objective**: Verify template can be downloaded and opened

**Steps**:
1. Click the **📥 Template** button in the header
2. Download should start automatically
3. Open the downloaded file in Excel/Google Sheets

**Expected Results**:
- ✅ File downloads with name format: `expenses-template-YYYYMMDD.xlsx`
- ✅ File contains two sheets: `expenses` and `categories`
- ✅ Expenses sheet has sample data with headers: id, date, description, category, amount, notes
- ✅ Categories sheet has sample categories with colors
- ✅ File opens correctly in Excel/Google Sheets

---

### Test Case 2: Export Excel (Empty Database)

**Objective**: Test export with no existing data

**Steps**:
1. Ensure you have no expenses (or delete all existing ones)
2. Click **📊 Export Excel** button

**Expected Results**:
- ✅ File downloads with name format: `expense-manager-backup-YYYYMMDD.xlsx`
- ✅ File contains two sheets: `expenses` and `categories`
- ✅ Expenses sheet is empty (only headers)
- ✅ Categories sheet contains your categories

---

### Test Case 3: Import Clean Data (Auto-Create Disabled)

**Objective**: Test successful import with existing categories

**Steps**:
1. Click **📤 Import** button
2. Select `test-expenses-100-clean.xlsx`
3. Wait for file to parse
4. Review the preview:
   - Check that 100 expenses are shown
   - Review category mappings
5. **Do NOT check** "Auto-create missing categories"
6. Click **Start Import**
7. Wait for import to complete

**Expected Results**:
- ✅ Preview shows first 20 rows
- ✅ Parse errors: 0
- ✅ Category mappings show all categories matched (✓)
- ✅ Progress bar shows real-time progress
- ✅ Import completes successfully
- ✅ Summary shows:
  - Success: ~100 (some may be skipped if categories don't exist)
  - Skipped: 0 (if all categories exist)
  - Failed: 0
- ✅ Expenses appear in the expense list
- ✅ Dashboard totals update correctly

---

### Test Case 4: Import with Errors (Auto-Create Enabled)

**Objective**: Test error handling and auto-create categories feature

**Steps**:
1. Click **📤 Import** button
2. Select `test-expenses-100-with-errors.xlsx`
3. Wait for file to parse
4. Review the preview and mappings:
   - Some categories should show as "⚠️ Not found"
   - Some parse errors should be listed
5. **Check** "Auto-create missing categories"
6. Click **Start Import**
7. Wait for import to complete

**Expected Results**:
- ✅ Preview shows parse errors (missing fields, invalid amounts)
- ✅ Category mappings show some unmatched categories
- ✅ Warning shown about unmatched categories (before enabling auto-create)
- ✅ Warning disappears when auto-create is enabled
- ✅ Import completes with mixed results
- ✅ Summary shows:
  - Success: ~85-95 (valid records)
  - Skipped: 3-5 (records with missing required fields)
  - Failed: 0-2 (records with critical errors)
- ✅ Error section shows specific row numbers and messages
- ✅ New categories are created automatically
- ✅ Can download error report CSV

---

### Test Case 5: CSV Import

**Objective**: Test CSV file import

**Steps**:
1. Click **📤 Import** button
2. Select `test-expenses-100.csv`
3. Review preview
4. Enable "Auto-create missing categories"
5. Click **Start Import**

**Expected Results**:
- ✅ CSV file parses correctly
- ✅ Preview shows expense data
- ✅ Categories sheet is empty (CSV only has expenses)
- ✅ Import succeeds
- ✅ All expenses are imported

---

### Test Case 6: Export After Import

**Objective**: Verify export includes imported data

**Steps**:
1. After completing Test Case 3 or 4 (with data in database)
2. Click **📊 Export Excel** button
3. Open the downloaded file

**Expected Results**:
- ✅ File contains all imported expenses
- ✅ Expenses sheet includes all data
- ✅ Categories sheet includes all categories (including auto-created ones)
- ✅ Data is correctly formatted
- ✅ Can be re-imported successfully

---

### Test Case 7: Re-import Exported Data

**Objective**: Test roundtrip export → import

**Steps**:
1. Export data (Test Case 6)
2. Delete some expenses from the database
3. Import the exported file
4. Enable "Auto-create missing categories"
5. Complete import

**Expected Results**:
- ✅ File imports successfully
- ✅ All expenses are restored
- ✅ No duplicate categories are created
- ✅ Existing categories are matched correctly

---

### Test Case 8: Large Import (250+ Records)

**Objective**: Test batch processing with large dataset

**Steps**:
1. Generate larger test file:
   ```bash
   cd tools
   node generate-test-data.js 500
   ```
2. Import `test-expenses-500-clean.xlsx`
3. Observe batch progress messages

**Expected Results**:
- ✅ Progress shows multiple batches (e.g., "batch 1/2", "batch 2/2")
- ✅ Progress updates after each batch
- ✅ All 500 records import successfully
- ✅ No performance issues or timeouts
- ✅ Dashboard remains responsive

---

### Test Case 9: Category Name Variations

**Objective**: Test case-insensitive and whitespace-trimming matching

**Steps**:
1. Create test file with these category variations:
   - "food & dining" (lowercase)
   - "FOOD & DINING" (uppercase)
   - "  Food & Dining  " (extra spaces)
   - "Food & Dining" (exact match)
2. Import the file

**Expected Results**:
- ✅ All variations match the same category "Food & Dining"
- ✅ No duplicate categories are created
- ✅ Category mapping shows all as matched (✓)

---

### Test Case 10: Error Report Download

**Objective**: Test error report generation

**Steps**:
1. Import file with errors (Test Case 4)
2. In the import summary, click **📥 Download Error Report**
3. Open the downloaded CSV file

**Expected Results**:
- ✅ CSV file downloads
- ✅ File contains columns: row, message, data
- ✅ Each error is listed with its row number
- ✅ Error messages are descriptive
- ✅ File can be opened in Excel

---

### Test Case 11: Cancel Import

**Objective**: Test canceling import before completion

**Steps**:
1. Click **📤 Import**
2. Select a test file
3. Click **Cancel** in the preview step

**Expected Results**:
- ✅ Modal closes
- ✅ No data is imported
- ✅ Can open import modal again

---

### Test Case 12: Invalid File Upload

**Objective**: Test error handling for invalid files

**Steps**:
1. Click **📤 Import**
2. Try to select a .txt or .pdf file
3. File input should reject it

**Alternative**: Rename a text file to .xlsx and try to upload

**Expected Results**:
- ✅ Only .xlsx and .csv files can be selected
- ✅ If invalid file is forced: Error message shown
- ✅ Modal remains open for retry

---

### Test Case 13: Mobile Responsiveness

**Objective**: Test on mobile device or responsive mode

**Steps**:
1. Open browser developer tools (F12)
2. Enable device emulation (mobile view)
3. Test all import/export features

**Expected Results**:
- ✅ Buttons are visible and clickable
- ✅ Modal fits screen with scrolling
- ✅ Preview table is scrollable horizontally
- ✅ File picker works on mobile
- ✅ Progress bar is visible
- ✅ All text is readable

---

## Acceptance Criteria Verification

Based on the original requirements, verify:

### ✅ AC1: Template and Import
- [ ] User can download `expenses-template.xlsx`
- [ ] User can edit template in Excel (mobile app or desktop)
- [ ] User can upload and import 100 test records
- [ ] Categories are automatically created when "auto-create" is enabled
- [ ] Import completes without errors on clean data

### ✅ AC2: Conflict Strategy
- [ ] Default behavior is "import as new"
- [ ] ID field in import file is ignored
- [ ] Existing data is not modified or deleted
- [ ] No data loss occurs during import

### ✅ AC3: Export Format
- [ ] Export creates .xlsx file
- [ ] File opens in Excel/Google Sheets correctly
- [ ] File contains `expenses` and `categories` sheets
- [ ] All data is present and correctly formatted

### ✅ AC4: End-to-End Flow
- [ ] Can export data
- [ ] Can edit exported file locally
- [ ] Can re-import edited file
- [ ] Data displays correctly after import
- [ ] Complete flow works in Firebase Emulator (if available)

## Test Reporting

After completing all tests, document:

### Passed Tests
- List test cases that passed
- Note any observations

### Failed Tests
- List test cases that failed
- Describe the failure
- Include screenshots if applicable
- Note error messages

### Issues Found
- Describe any bugs or unexpected behavior
- Rate severity (Critical, High, Medium, Low)
- Suggest fixes if possible

### Performance Notes
- Import speed for different file sizes
- UI responsiveness during import
- Memory usage with large files

## Security Considerations

During testing, verify:
- ✅ Only logged-in users can import/export
- ✅ Users can only access their own data
- ✅ File uploads don't cause browser crashes
- ✅ Large files don't freeze the application
- ✅ Error messages don't expose sensitive information

## Summary

After completing all test cases, the import/export feature should:
- Support Excel (.xlsx) and CSV (.csv) formats
- Provide template downloads
- Handle category matching intelligently
- Auto-create missing categories (optional)
- Process large imports in batches
- Provide detailed error reporting
- Work well on mobile devices
- Maintain data integrity
- Be secure and performant

## Notes

- Test with Firebase Emulator first if available
- Always keep a backup before testing with production data
- Report any security vulnerabilities immediately
- Document all issues for the development team
