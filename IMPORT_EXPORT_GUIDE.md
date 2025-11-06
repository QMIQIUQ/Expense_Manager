# Import/Export Feature Guide

## Overview

The Expense Manager now supports importing and exporting expense and category data using Excel (.xlsx) and CSV files. This feature is mobile-friendly and designed for easy data management.

## Features

### 1. Download Template
- Click the **📥 Template** button to download a pre-formatted Excel template
- Template includes two sheets:
  - **expenses**: Sample expense data with proper headers
  - **categories**: Sample category data with color codes
- Template filename format: `expenses-template-YYYYMMDD.xlsx`

### 2. Export to Excel
- Click the **📊 Export Excel** button to export all your data
- Creates an Excel workbook with two sheets:
  - **expenses**: All your expense records
  - **categories**: All your category definitions
- Export filename format: `expense-manager-backup-YYYYMMDD.xlsx`
- Compatible with Microsoft Excel, Google Sheets, and LibreOffice

### 3. Import from Excel/CSV
- Click the **📤 Import** button to open the import dialog
- Supports both .xlsx and .csv file formats
- Features include:
  - File preview (first 20 rows)
  - Parse error detection
  - Category name matching (case-insensitive)
  - Auto-create missing categories option
  - Progress tracking with batch processing
  - Detailed import summary
  - Error report download

## Data Format

### Expense Data Format

| Column | Required | Format | Example |
|--------|----------|--------|---------|
| id | No | String (leave empty for new) | - |
| date | Yes | YYYY-MM-DD | 2024-01-15 |
| description | Yes | Text | Grocery shopping |
| category | Yes | Text (category name) | Food & Dining |
| amount | Yes | Number | 120.50 |
| notes | No | Text | Weekly groceries |

### Category Data Format

| Column | Required | Format | Example |
|--------|----------|--------|---------|
| id | No | String (leave empty for new) | - |
| name | Yes | Text | Food & Dining |
| color | No | Hex color code | #FF6B6B |

## Import Process

### Step 1: Select File
1. Click **📤 Import** button
2. Choose a .xlsx or .csv file from your device
3. File is automatically parsed and validated

### Step 2: Preview & Configure
- **Preview Table**: Shows first 20 rows of expense data
- **Category Mapping**: 
  - Shows which categories match existing ones (✓)
  - Highlights unmatched categories (⚠️)
- **Import Options**:
  - ☐ Auto-create missing categories
    - When unchecked: Expenses with unknown categories will be skipped
    - When checked: New categories are automatically created
- **Parse Errors**: Displays any issues found during file parsing

### Step 3: Import Progress
- Real-time progress bar
- Batch processing (250 records per batch)
- Status messages for each batch

### Step 4: Import Summary
- Success count: Successfully imported records
- Skipped count: Records skipped (e.g., invalid data, missing categories)
- Failed count: Records that failed to import
- Error details with row numbers
- Download error report as CSV for fixing issues

## Important Notes

### Category Matching
- Category names are matched case-insensitively
- Whitespace is automatically trimmed
- Example: "food & dining", "Food & Dining", and "  FOOD & DINING  " all match the same category

### Conflict Strategy
- Default behavior: Import as new records
- ID field in import file is ignored (preserves existing data)
- No existing records are modified or deleted during import

### Data Validation
- Amount must be a positive number
- Date must be in YYYY-MM-DD format or Excel date serial
- Description and category are required fields
- Empty rows are automatically skipped

### Batch Processing
- Large imports are processed in batches of 250 records
- Progress is shown after each batch completes
- If one batch fails, other batches continue processing

### Error Handling
- Parse errors are shown before import starts
- Write errors are collected during import
- All errors include row numbers for easy troubleshooting
- Error report can be downloaded as CSV

## Best Practices

### For Large Imports
1. Test with a small sample first (10-20 rows)
2. Verify category names match existing categories
3. Enable "Auto-create missing categories" if needed
4. Review the preview carefully before importing
5. Keep a backup of your original data

### Mobile Usage
1. Edit templates in Excel mobile app or Google Sheets
2. Save as .xlsx or .csv format
3. Upload directly from your mobile device
4. Modal is optimized for small screens with scrolling

### Data Organization
1. Use consistent category names across all expenses
2. Use standard date format (YYYY-MM-DD)
3. Keep amounts as numbers (no currency symbols)
4. Leave the id column empty for new records

## Troubleshooting

### Import Shows Errors
- Check that all required fields are filled
- Verify date format is YYYY-MM-DD
- Ensure amounts are valid numbers
- Match category names exactly (case-insensitive)

### Categories Not Matching
- Enable "Auto-create missing categories" option
- Or update category names in your file to match existing ones
- Check for extra spaces or typos

### File Won't Upload
- Ensure file extension is .xlsx or .csv
- Check file is not corrupted
- Try re-saving the file in Excel/Sheets
- Maximum file size depends on device memory

## Security & Privacy

- All imports are restricted to your user account
- Firestore security rules prevent unauthorized data access
- File processing happens client-side in your browser
- No data is sent to external servers during import/export
- Only authenticated users can import/export data

## Known Limitations

- Maximum batch size: 250 records per batch
- Excel date serials are automatically converted
- Only supports .xlsx and .csv formats
- Import replaces ID-based matching (always creates new records by default)

## Technical Details

### Dependencies
- **xlsx**: Excel file reading/writing (SheetJS)
- **papaparse**: CSV parsing

### Security Note
The xlsx library has known vulnerabilities (Prototype Pollution, ReDoS) that affect handling of malicious files. Since users only upload their own files, the risk is minimal. However, never import files from untrusted sources.

### Performance
- Client-side processing for better privacy
- Batch writes for efficient Firestore operations
- Progress tracking prevents UI freezing
- Works well with up to 1000+ records on modern devices

## Future Enhancements

- [ ] PDF export support
- [ ] Advanced filtering before export
- [ ] Import from Google Sheets URL
- [ ] Scheduled automatic exports
- [ ] Custom field mapping
- [ ] Merge strategies for duplicate detection
- [ ] Support for budget and recurring expense import
