#!/usr/bin/env node

/**
 * Test Data Generator for Import/Export Feature
 * 
 * This script generates test Excel files with sample expense data
 * for testing the import functionality.
 * 
 * Usage:
 *   node generate-test-data.js [count]
 * 
 * Where count is the number of expense records to generate (default: 100)
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Sample categories
const CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Bills & Utilities',
  'Healthcare',
  'Education',
  'Other',
];

// Sample descriptions by category
const DESCRIPTIONS = {
  'Food & Dining': [
    'Grocery shopping',
    'Restaurant dinner',
    'Coffee shop',
    'Fast food lunch',
    'Takeout order',
  ],
  'Transportation': [
    'Gas station fill-up',
    'Uber ride',
    'Public transit pass',
    'Parking fee',
    'Car maintenance',
  ],
  'Shopping': [
    'Clothing purchase',
    'Online shopping',
    'Home supplies',
    'Electronics',
    'Gift items',
  ],
  'Entertainment': [
    'Movie tickets',
    'Concert tickets',
    'Streaming subscription',
    'Gaming purchase',
    'Sports event',
  ],
  'Bills & Utilities': [
    'Electricity bill',
    'Water bill',
    'Internet service',
    'Phone bill',
    'Insurance payment',
  ],
  'Healthcare': [
    'Doctor visit',
    'Pharmacy purchase',
    'Dental checkup',
    'Medical supplies',
    'Health insurance',
  ],
  'Education': [
    'Textbooks',
    'Online course',
    'School supplies',
    'Tuition payment',
    'Library fees',
  ],
  'Other': [
    'Miscellaneous expense',
    'Donation',
    'Pet supplies',
    'Home repair',
    'Bank fees',
  ],
};

// Generate random date within last 90 days
function randomDate() {
  const today = new Date();
  const daysAgo = Math.floor(Math.random() * 90);
  const date = new Date(today);
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

// Generate random amount between min and max
function randomAmount(min = 5, max = 500) {
  return (Math.random() * (max - min) + min).toFixed(2);
}

// Get random item from array
function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Generate expense records
function generateExpenses(count) {
  const expenses = [];
  
  for (let i = 0; i < count; i++) {
    const category = randomItem(CATEGORIES);
    const description = randomItem(DESCRIPTIONS[category]);
    
    expenses.push({
      id: '', // Empty for new records
      date: randomDate(),
      description: description,
      category: category,
      amount: parseFloat(randomAmount()),
      notes: Math.random() > 0.7 ? `Test note ${i + 1}` : '',
    });
  }
  
  // Sort by date descending
  expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  return expenses;
}

// Generate category records
function generateCategories() {
  return [
    { id: '', name: 'Food & Dining', color: '#FF6B6B' },
    { id: '', name: 'Transportation', color: '#4ECDC4' },
    { id: '', name: 'Shopping', color: '#45B7D1' },
    { id: '', name: 'Entertainment', color: '#FFA07A' },
    { id: '', name: 'Bills & Utilities', color: '#98D8C8' },
    { id: '', name: 'Healthcare', color: '#F7DC6F' },
    { id: '', name: 'Education', color: '#BB8FCE' },
    { id: '', name: 'Other', color: '#95A5A6' },
  ];
}

// Generate test data with some intentional issues for testing error handling
function generateTestDataWithErrors(count) {
  const expenses = generateExpenses(count);
  
  // Add some records with missing fields
  if (count >= 10) {
    expenses[5].description = ''; // Missing description
    expenses[8].category = ''; // Missing category
    expenses[12].amount = 0; // Invalid amount
    
    // Add some with unknown categories
    expenses[3].category = 'New Category 1';
    expenses[7].category = 'New Category 2';
    
    // Add some with different case variations
    expenses[4].category = 'food & dining';
    expenses[9].category = 'TRANSPORTATION';
    expenses[11].category = '  Shopping  '; // Extra spaces
  }
  
  return expenses;
}

// Main function
function main() {
  const count = parseInt(process.argv[2]) || 100;
  const outputDir = path.join(__dirname, '../test-data');
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  console.log(`Generating ${count} test expense records...`);
  
  // Generate clean test data
  const cleanExpenses = generateExpenses(count);
  const categories = generateCategories();
  
  const cleanWorkbook = XLSX.utils.book_new();
  const expensesSheet = XLSX.utils.json_to_sheet(cleanExpenses);
  const categoriesSheet = XLSX.utils.json_to_sheet(categories);
  
  XLSX.utils.book_append_sheet(cleanWorkbook, expensesSheet, 'expenses');
  XLSX.utils.book_append_sheet(cleanWorkbook, categoriesSheet, 'categories');
  
  const cleanFilename = path.join(outputDir, `test-expenses-${count}-clean.xlsx`);
  XLSX.writeFile(cleanWorkbook, cleanFilename);
  console.log(`✅ Created: ${cleanFilename}`);
  
  // Generate test data with errors
  const errorExpenses = generateTestDataWithErrors(count);
  const errorWorkbook = XLSX.utils.book_new();
  const errorExpensesSheet = XLSX.utils.json_to_sheet(errorExpenses);
  const errorCategoriesSheet = XLSX.utils.json_to_sheet(categories);
  
  XLSX.utils.book_append_sheet(errorWorkbook, errorExpensesSheet, 'expenses');
  XLSX.utils.book_append_sheet(errorWorkbook, errorCategoriesSheet, 'categories');
  
  const errorFilename = path.join(outputDir, `test-expenses-${count}-with-errors.xlsx`);
  XLSX.writeFile(errorWorkbook, errorFilename);
  console.log(`✅ Created: ${errorFilename}`);
  
  // Generate CSV version (expenses only)
  const csvExpenses = generateExpenses(count);
  const csvContent = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(csvExpenses));
  const csvFilename = path.join(outputDir, `test-expenses-${count}.csv`);
  fs.writeFileSync(csvFilename, csvContent);
  console.log(`✅ Created: ${csvFilename}`);
  
  // Print statistics
  console.log('\n📊 Test Data Statistics:');
  console.log(`   Total records: ${count}`);
  console.log(`   Categories: ${categories.length}`);
  console.log(`   Date range: ${cleanExpenses[cleanExpenses.length - 1].date} to ${cleanExpenses[0].date}`);
  console.log(`   Total amount: $${cleanExpenses.reduce((sum, exp) => sum + exp.amount, 0).toFixed(2)}`);
  
  console.log('\n📁 Files created in:', outputDir);
  console.log('   1. Clean data file (for successful import testing)');
  console.log('   2. Error data file (for error handling testing)');
  console.log('   3. CSV file (for CSV import testing)');
  
  console.log('\n🧪 Testing Tips:');
  console.log('   - Use clean file to test normal import flow');
  console.log('   - Use error file to test error handling and auto-create categories');
  console.log('   - Use CSV file to test CSV parsing');
  console.log('   - Try importing with and without "auto-create categories" option');
}

// Run if called directly
if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

module.exports = { generateExpenses, generateCategories };
