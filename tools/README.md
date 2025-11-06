# Tools Directory

This directory contains utility scripts for managing the Expense Manager application.

## Available Tools

### 1. Admin User Management
- `create-admin.js` - Create admin users
- `update-user.js` - Update user information
- `delete-user.js` - Delete users

### 2. Test Data Generator

**`generate-test-data.js`** - Generate test Excel files for import/export feature testing

#### Usage

```bash
# Install dependencies first
npm install

# Generate 100 test records (default)
npm run generate-test-data

# Generate custom number of records
node generate-test-data.js 250
```

#### What It Generates

The script creates three test files in the `test-data/` directory:

1. **test-expenses-{count}-clean.xlsx**
   - Clean data with all required fields
   - Use for testing successful import flow
   - Includes both expenses and categories sheets

2. **test-expenses-{count}-with-errors.xlsx**
   - Contains intentional errors for testing:
     - Missing required fields
     - Unknown categories
     - Invalid amounts
     - Case variations in category names
     - Extra whitespace
   - Use for testing error handling and auto-create categories feature

3. **test-expenses-{count}.csv**
   - CSV format of expense data
   - Use for testing CSV import functionality

#### Test Data Features

- Realistic expense descriptions per category
- Random dates within last 90 days
- Amounts ranging from $5 to $500
- 8 default categories with colors
- Optional notes on 30% of records
- Sorted by date (newest first)

#### Testing Workflow

1. **Generate test data:**
   ```bash
   cd tools
   npm install
   node generate-test-data.js 100
   ```

2. **Start the web application:**
   ```bash
   cd ../web
   npm install
   npm run dev
   ```

3. **Test import flow:**
   - Click "📥 Template" to download template
   - Click "📤 Import" to test import
   - Upload one of the generated test files:
     - `test-expenses-100-clean.xlsx` for successful import
     - `test-expenses-100-with-errors.xlsx` for error testing
     - `test-expenses-100.csv` for CSV testing

4. **Test scenarios:**
   - Import with auto-create categories disabled → Some expenses should be skipped
   - Import with auto-create categories enabled → All valid expenses imported
   - Review error report for problematic rows
   - Verify category matching (case-insensitive, trimmed)

5. **Test export:**
   - After import, click "📊 Export Excel"
   - Verify exported file contains all data
   - Check that it can be re-imported

## Dependencies

- **firebase-admin**: For admin operations (create-admin, update-user, delete-user)
- **xlsx**: For Excel file generation (generate-test-data)

## Installation

```bash
npm install
```

## Notes

- Test data files are generated in the `/test-data` directory
- This directory is in `.gitignore` and won't be committed
- Generated files use current date for realistic testing
- All scripts use CommonJS module format
