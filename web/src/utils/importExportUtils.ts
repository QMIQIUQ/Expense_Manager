import * as XLSX from 'xlsx';
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
export const downloadExpenseTemplate = () => {
  const wb = XLSX.utils.book_new();
  
  // Expenses sheet
  const expensesData = [
    ['id', 'date', 'description', 'category', 'amount', 'notes'],
    ['', '2024-01-15', 'Sample expense', 'Food & Dining', '25.50', 'Lunch with team'],
    ['', '2024-01-16', 'Grocery shopping', 'Food & Dining', '120.00', ''],
  ];
  const expensesWs = XLSX.utils.aoa_to_sheet(expensesData);
  XLSX.utils.book_append_sheet(wb, expensesWs, 'expenses');
  
  // Categories sheet
  const categoriesData = [
    ['id', 'name', 'color'],
    ['', 'Food & Dining', '#FF6B6B'],
    ['', 'Transportation', '#4ECDC4'],
    ['', 'Shopping', '#45B7D1'],
    ['', 'Entertainment', '#FFA07A'],
    ['', 'Bills & Utilities', '#98D8C8'],
    ['', 'Healthcare', '#F7DC6F'],
    ['', 'Education', '#BB8FCE'],
    ['', 'Other', '#95A5A6'],
  ];
  const categoriesWs = XLSX.utils.aoa_to_sheet(categoriesData);
  XLSX.utils.book_append_sheet(wb, categoriesWs, 'categories');
  
  // Download
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  XLSX.writeFile(wb, `expenses-template-${date}.xlsx`);
};

// Export expenses and categories to Excel
export const exportToExcel = (expenses: Expense[], categories: Category[]) => {
  const wb = XLSX.utils.book_new();
  
  // Prepare expenses data
  const expensesData = expenses.map(exp => ({
    id: exp.id || '',
    date: exp.date,
    description: exp.description,
    category: exp.category,
    amount: exp.amount,
    notes: exp.notes || '',
  }));
  
  const expensesWs = XLSX.utils.json_to_sheet(expensesData);
  XLSX.utils.book_append_sheet(wb, expensesWs, 'expenses');
  
  // Prepare categories data
  const categoriesData = categories.map(cat => ({
    id: cat.id || '',
    name: cat.name,
    color: cat.color,
  }));
  
  const categoriesWs = XLSX.utils.json_to_sheet(categoriesData);
  XLSX.utils.book_append_sheet(wb, categoriesWs, 'categories');
  
  // Download
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  XLSX.writeFile(wb, `expense-manager-backup-${date}.xlsx`);
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
    // Parse Excel file
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Parse expenses sheet
          if (workbook.SheetNames.includes('expenses')) {
            const expensesSheet = workbook.Sheets['expenses'];
            const expensesJson = XLSX.utils.sheet_to_json<Record<string, unknown>>(expensesSheet);
            
            expenses = expensesJson.map((row, index: number) => {
              // Handle Excel date serial numbers
              let date = row.date;
              if (typeof date === 'number') {
                date = XLSX.SSF.format('yyyy-mm-dd', date);
              }
              
              // Validate required fields
              if (!date || !row.description || !row.category || row.amount === undefined) {
                errors.push(`Expenses row ${index + 2}: Missing required fields`);
              }
              
              return {
                id: (row.id as string) || undefined,
                date: String(date),
                description: String(row.description),
                category: String(row.category),
                amount: parseFloat(String(row.amount)) || 0,
                notes: row.notes ? String(row.notes) : undefined,
              };
            });
          }
          
          // Parse categories sheet
          if (workbook.SheetNames.includes('categories')) {
            const categoriesSheet = workbook.Sheets['categories'];
            const categoriesJson = XLSX.utils.sheet_to_json<Record<string, unknown>>(categoriesSheet);
            
            categories = categoriesJson.map((row) => ({
              id: (row.id as string) || undefined,
              name: String(row.name),
              color: row.color ? String(row.color) : undefined,
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
    const categoryMap = new Map<string, string>(); // name -> id mapping
    
    // Build map of existing categories
    existingCategories.forEach(cat => {
      categoryMap.set(cat.name.toLowerCase().trim(), cat.id!);
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
      
      onProgress?.(
        i,
        totalExpenses,
        `Importing expenses batch ${batchNum}/${totalBatches}...`
      );
      
      // Process batch
      for (let j = 0; j < batch.length; j++) {
        const expRow = batch[j];
        const rowNum = i + j + 2; // +2 for header and 1-indexing
        
        try {
          // Validate category exists
          const categoryName = expRow.category.toLowerCase().trim();
          if (!categoryMap.has(categoryName)) {
            result.errors.push({
              row: rowNum,
              message: `Category not found: "${expRow.category}"`,
              data: expRow,
            });
            result.skipped++;
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
            continue;
          }
          
          // Apply conflict strategy
          if (expRow.id && !options.preserveIds) {
            // Default behavior: ignore ID and create new
            delete expRow.id;
          }
          
          // Create expense
          await expenseService.create({
            userId,
            description: expRow.description,
            amount: expRow.amount,
            category: expRow.category,
            date: expRow.date,
            notes: expRow.notes,
          });
          
          result.success++;
        } catch (error) {
          result.errors.push({
            row: rowNum,
            message: `Failed to import: ${(error as Error).message}`,
            data: expRow,
          });
          result.failed++;
        }
      }
      
      onProgress?.(
        Math.min(i + BATCH_SIZE, totalExpenses),
        totalExpenses,
        `Completed batch ${batchNum}/${totalBatches}`
      );
    }
    
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
