// Lazy-load exceljs only when needed to avoid large initial bundles
// and to sidestep Vite dev optimize cache issues.
// We'll import within functions: const ExcelJS = await import('exceljs')
import Papa from 'papaparse';
import { Expense, Category } from '../types';
import { categoryService } from '../services/categoryService';
import { expenseService } from '../services/expenseService';

// Types for import operations
export interface ImportOptions {
  autoCreateCategories: boolean;
  conflictStrategy: 'import-as-new' | 'overwrite' | 'skip';
  preserveIds: boolean;
}

export interface ImportResult {
  success: number;
  skipped: number;
  failed: number;
  errors: Array<{ row: number; message: string; data?: unknown }>;
}

export interface CategoryMapping {
  original: string;
  matched: Category | null;
  willCreate: boolean;
}

// Parse expense row from Excel/CSV
interface ExpenseRow {
  id?: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  notes?: string;
}

interface CategoryRow {
  id?: string;
  name: string;
  color?: string;
}

// Generate and download expense template
export const downloadExpenseTemplate = async () => {
  const ExcelJS = await import('exceljs');
  const wb = new ExcelJS.Workbook();

  // Expenses sheet
  const expensesWs = wb.addWorksheet('expenses');
  expensesWs.addRow(['id', 'date', 'description', 'category', 'amount', 'notes']);
  expensesWs.addRow(['', '2024-01-15', 'Sample expense', 'Food & Dining', '25.50', 'Lunch with team']);
  expensesWs.addRow(['', '2024-01-16', 'Grocery shopping', 'Food & Dining', '120.00', '']);

  // Categories sheet
  const categoriesWs = wb.addWorksheet('categories');
  categoriesWs.addRow(['id', 'name', 'color']);
  const catRows = [
    ['', 'Food & Dining', '#FF6B6B'],
    ['', 'Transportation', '#4ECDC4'],
    ['', 'Shopping', '#45B7D1'],
    ['', 'Entertainment', '#FFA07A'],
    ['', 'Bills & Utilities', '#98D8C8'],
    ['', 'Healthcare', '#F7DC6F'],
    ['', 'Education', '#BB8FCE'],
    ['', 'Other', '#95A5A6'],
  ];
  catRows.forEach(r => categoriesWs.addRow(r));

  // Download
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `expenses-template-${date}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

// Export expenses and categories to Excel
export const exportToExcel = async (expenses: Expense[], categories: Category[]) => {
  const ExcelJS = await import('exceljs');
  const wb = new ExcelJS.Workbook();

  // Expenses sheet
  const expensesWs = wb.addWorksheet('expenses');
  expensesWs.addRow(['id', 'date', 'description', 'category', 'amount', 'notes']);
  expenses.forEach(exp => {
    expensesWs.addRow([
      exp.id || '',
      exp.date,
      exp.description,
      exp.category,
      exp.amount,
      exp.notes || '',
    ]);
  });

  // Categories sheet
  const categoriesWs = wb.addWorksheet('categories');
  categoriesWs.addRow(['id', 'name', 'color']);
  categories.forEach(cat => {
    categoriesWs.addRow([
      cat.id || '',
      cat.name,
      cat.color || '',
    ]);
  });

  // Download
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `expense-manager-backup-${date}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

// Parse uploaded file (xlsx or csv)
export const parseUploadedFile = async (
  file: File
): Promise<{ expenses: ExpenseRow[]; categories: CategoryRow[]; errors: string[] }> => {
  const errors: string[] = [];
  let expenses: ExpenseRow[] = [];
  let categories: CategoryRow[] = [];
  
  if (file.name.endsWith('.csv')) {
    // Parse CSV file
    return new Promise((resolve) => {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          expenses = results.data.map((row, index: number) => {
            // Validate required fields
            if (!row.date || !row.description || !row.category || !row.amount) {
              errors.push(`Row ${index + 2}: Missing required fields`);
            }
            return {
              id: row.id || undefined,
              date: row.date,
              description: row.description,
              category: row.category,
              amount: parseFloat(row.amount) || 0,
              notes: row.notes || undefined,
            };
          });
          resolve({ expenses, categories: [], errors });
        },
        error: (error) => {
          errors.push(`CSV parsing error: ${error.message}`);
          resolve({ expenses: [], categories: [], errors });
        },
      });
    });
  } else {
    // Parse Excel file using exceljs
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const ExcelJS = await import('exceljs');
          const wb = new ExcelJS.Workbook();
          await wb.xlsx.load(arrayBuffer);

          // Helper to read a worksheet by headers
          const readSheetByHeaders = (sheetName: string): { headers: string[]; rows: any[][] } | null => {
            const ws = wb.getWorksheet(sheetName);
            if (!ws) return null;
            const headerRow = ws.getRow(1);
            const headers = (headerRow.values as any[]).slice(1).map(v => String(v));
            const rows: any[][] = [];
            for (let r = 2; r <= ws.rowCount; r++) {
              const row = ws.getRow(r);
              if (!row || row.cellCount === 0) continue;
              const values = (row.values as any[]).slice(1);
              // Skip fully empty rows
              if (values.every(v => v === null || v === undefined || v === '')) continue;
              rows.push(values);
            }
            return { headers, rows };
          };

          // Parse expenses sheet
          const expensesSheet = readSheetByHeaders('expenses');
          if (expensesSheet) {
            const { headers, rows } = expensesSheet;
            const colIndex = (name: string) => headers.findIndex(h => h.toLowerCase() === name) ;
            const idIdx = colIndex('id');
            const dateIdx = colIndex('date');
            const descIdx = colIndex('description');
            const catIdx = colIndex('category');
            const amtIdx = colIndex('amount');
            const notesIdx = colIndex('notes');

            expenses = rows.map((vals, i) => {
              let rawDate = vals[dateIdx];
              let dateStr = '';
              if (rawDate instanceof Date) {
                dateStr = rawDate.toISOString().split('T')[0];
              } else if (typeof rawDate === 'number') {
                // Excel serial date to JS date
                const excelEpoch = new Date(1899, 11, 30);
                const jsDate = new Date(excelEpoch.getTime() + rawDate * 86400000);
                dateStr = jsDate.toISOString().split('T')[0];
              } else if (typeof rawDate === 'string') {
                dateStr = rawDate;
              }

              if (!dateStr || !vals[descIdx] || !vals[catIdx] || vals[amtIdx] === undefined) {
                errors.push(`Expenses row ${i + 2}: Missing required fields`);
              }

              return {
                id: vals[idIdx] ? String(vals[idIdx]) : undefined,
                date: String(dateStr),
                description: String(vals[descIdx] ?? ''),
                category: String(vals[catIdx] ?? ''),
                amount: parseFloat(String(vals[amtIdx] ?? '0')) || 0,
                notes: vals[notesIdx] ? String(vals[notesIdx]) : undefined,
              } as ExpenseRow;
            });
          }

          // Parse categories sheet
          const categoriesSheet = readSheetByHeaders('categories');
          if (categoriesSheet) {
            const { headers, rows } = categoriesSheet;
            const idIdx = headers.findIndex(h => h.toLowerCase() === 'id');
            const nameIdx = headers.findIndex(h => h.toLowerCase() === 'name');
            const colorIdx = headers.findIndex(h => h.toLowerCase() === 'color');

            categories = rows.map(vals => ({
              id: vals[idIdx] ? String(vals[idIdx]) : undefined,
              name: String(vals[nameIdx] ?? ''),
              color: vals[colorIdx] ? String(vals[colorIdx]) : undefined,
            }));
          }

          resolve({ expenses, categories, errors });
        } catch (error) {
          errors.push(`Excel parsing error: ${(error as Error).message}`);
          resolve({ expenses: [], categories: [], errors });
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }
};

// Match category names with existing categories
export const matchCategories = (
  uploadedCategoryNames: string[],
  existingCategories: Category[]
): Map<string, CategoryMapping> => {
  const mappings = new Map<string, CategoryMapping>();
  
  uploadedCategoryNames.forEach(name => {
    const trimmedName = name.trim();
    const matched = existingCategories.find(
      cat => cat.name.toLowerCase().trim() === trimmedName.toLowerCase()
    );
    
    mappings.set(trimmedName, {
      original: trimmedName,
      matched: matched || null,
      willCreate: !matched,
    });
  });
  
  return mappings;
};

// Import expenses and categories with batched writes
export const importData = async (
  userId: string,
  expenseRows: ExpenseRow[],
  categoryRows: CategoryRow[],
  existingCategories: Category[],
  options: ImportOptions,
  onProgress?: (current: number, total: number, message: string) => void
): Promise<ImportResult> => {
  const result: ImportResult = {
    success: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };
  
  try {
    // Step 1: Process categories first
    const categoryMap = new Map<string, string>(); // name (lowercase) -> id mapping
    const categoryIdToName = new Map<string, string>(); // id -> original name mapping
    
    // Build map of existing categories
    existingCategories.forEach(cat => {
      const lowerName = cat.name.toLowerCase().trim();
      categoryMap.set(lowerName, cat.id!);
      categoryIdToName.set(cat.id!, cat.name);
    });
    
    // Import new categories if auto-create is enabled
    if (options.autoCreateCategories && categoryRows.length > 0) {
      onProgress?.(0, categoryRows.length, 'Creating categories...');
      
      for (let i = 0; i < categoryRows.length; i++) {
        const catRow = categoryRows[i];
        const normalizedName = catRow.name.toLowerCase().trim();
        
        if (!categoryMap.has(normalizedName)) {
          try {
            const newCatId = await categoryService.create({
              userId,
              name: catRow.name,
              icon: '📦',
              color: catRow.color || '#95A5A6',
              isDefault: false,
            });
            categoryMap.set(normalizedName, newCatId);
            categoryIdToName.set(newCatId, catRow.name); // Store reverse mapping
            result.success++;
          } catch (error) {
            result.errors.push({
              row: i + 2,
              message: `Failed to create category: ${(error as Error).message}`,
              data: catRow,
            });
            result.failed++;
          }
        }
        onProgress?.(i + 1, categoryRows.length, 'Creating categories...');
      }
    }
    
    // Step 2: Check for missing categories in expenses
    const uniqueCategories = new Set(expenseRows.map(e => e.category.toLowerCase().trim()));
    const missingCategories: string[] = [];
    
    uniqueCategories.forEach(catName => {
      if (!categoryMap.has(catName)) {
        if (options.autoCreateCategories) {
          // Will create during import
          missingCategories.push(catName);
        } else {
          result.errors.push({
            row: 0,
            message: `Category not found: "${catName}". Enable auto-create or add this category first.`,
          });
        }
      }
    });
    
    // Create missing categories if auto-create is enabled
    if (options.autoCreateCategories && missingCategories.length > 0) {
      for (const catName of missingCategories) {
        try {
          // Find original case-sensitive name from expense rows
          const originalName = expenseRows.find(
            e => e.category.toLowerCase().trim() === catName
          )?.category || catName;
          
          const newCatId = await categoryService.create({
            userId,
            name: originalName,
            icon: '📦',
            color: '#95A5A6',
            isDefault: false,
          });
          categoryMap.set(catName, newCatId);
          categoryIdToName.set(newCatId, originalName); // Store reverse mapping
        } catch (error) {
          result.errors.push({
            row: 0,
            message: `Failed to auto-create category "${catName}": ${(error as Error).message}`,
          });
        }
      }
    }
    
    // Step 3: Import expenses in batches
    const BATCH_SIZE = 250;
    const totalExpenses = expenseRows.length;
    
    for (let i = 0; i < totalExpenses; i += BATCH_SIZE) {
      const batch = expenseRows.slice(i, Math.min(i + BATCH_SIZE, totalExpenses));
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(totalExpenses / BATCH_SIZE);
      
      
      // Process batch
      for (let j = 0; j < batch.length; j++) {
        const expRow = batch[j];
        const rowNum = i + j + 2; // +2 for header and 1-indexing
          const currentProgress = i + j + 1; // Current item being processed (1-indexed)
        
        try {
          // Validate category exists
          const categoryNameLower = expRow.category.toLowerCase().trim();
          if (!categoryMap.has(categoryNameLower)) {
            result.errors.push({
              row: rowNum,
              message: `Category not found: "${expRow.category}"`,
              data: expRow,
            });
            result.skipped++;
                        // Update progress even for skipped items
                        onProgress?.(
                          currentProgress,
                          totalExpenses,
                          `Importing expenses batch ${batchNum}/${totalBatches}... (${currentProgress}/${totalExpenses})`
                        );
            continue;
          }
          
          // Validate amount
          if (isNaN(expRow.amount) || expRow.amount <= 0) {
            result.errors.push({
              row: rowNum,
              message: 'Invalid amount',
              data: expRow,
            });
            result.skipped++;
            // Update progress even for skipped items
            onProgress?.(
              currentProgress,
              totalExpenses,
              `Importing expenses batch ${batchNum}/${totalBatches}... (${currentProgress}/${totalExpenses})`
            );
            continue;
          }
          
          // Apply conflict strategy by creating new object without ID
          // (avoiding mutation of original expRow)
          // Get category ID and find the proper category name
          const categoryId = categoryMap.get(categoryNameLower)!;
          
          // Find the original category name (with proper casing) using reverse mapping
          const categoryDisplayName = categoryIdToName.get(categoryId) || expRow.category;

          // Build expense data and omit undefined fields (Firestore forbids undefined)
          const expenseData: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'> = {
            userId,
            description: expRow.description,
            amount: Number(expRow.amount),
            category: categoryDisplayName, // Use category NAME, not ID
            date: expRow.date,
          };

          if (expRow.notes !== undefined && expRow.notes !== null && String(expRow.notes).trim() !== '') {
            expenseData.notes = String(expRow.notes);
          }

          // Create expense
          await expenseService.create(expenseData);
          
                    // Update progress after each successful import
                    onProgress?.(
                      currentProgress,
                      totalExpenses,
                      `Importing expenses batch ${batchNum}/${totalBatches}... (${currentProgress}/${totalExpenses})`
                    );
          
          result.success++;
        } catch (error) {
          result.errors.push({
            row: rowNum,
            message: `Failed to import: ${(error as Error).message}`,
            data: expRow,
          });
          result.failed++;
          // Update progress even for failed items
          onProgress?.(
            currentProgress,
            totalExpenses,
            `Importing expenses batch ${batchNum}/${totalBatches}... (${currentProgress}/${totalExpenses})`
          );
        }
      }
    }
    // Final progress update when complete
    onProgress?.(
      totalExpenses,
      totalExpenses,
      `Import complete (${totalExpenses}/${totalExpenses})`
    );
    
    return result;
  } catch (error) {
    result.errors.push({
      row: 0,
      message: `Import failed: ${(error as Error).message}`,
    });
    return result;
  }
};

// Export errors to CSV
export const exportErrorsToCSV = (errors: Array<{ row: number; message: string; data?: unknown }>) => {
  const csvData = errors.map(err => ({
    row: err.row,
    message: err.message,
    data: err.data ? JSON.stringify(err.data) : '',
  }));
  
  const csv = Papa.unparse(csvData);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `import-errors-${Date.now()}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
