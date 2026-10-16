/**
 * Budget Templates - Predefined budget sets for quick setup
 * Phase 3.2 Implementation
 */

import { DEFAULT_CATEGORY_NAMES } from '../types';
import type { BudgetTemplate } from '../types';

// Built-in templates
export const BUILT_IN_TEMPLATES: BudgetTemplate[] = [
  {
    id: 'template-student',
    name: 'Student',
    description: 'Budget template for students with limited income',
    icon: '🎓',
    isBuiltIn: true,
    totalBudget: 800,
    budgets: [
      { categoryName: DEFAULT_CATEGORY_NAMES.foodAndDining, amount: 30, isPercentage: true, alertThreshold: 80 },
      { categoryName: DEFAULT_CATEGORY_NAMES.transportation, amount: 15, isPercentage: true, alertThreshold: 80 },
      { categoryName: DEFAULT_CATEGORY_NAMES.entertainment, amount: 10, isPercentage: true, alertThreshold: 75 },
      { categoryName: DEFAULT_CATEGORY_NAMES.education, amount: 20, isPercentage: true, alertThreshold: 90 },
      { categoryName: DEFAULT_CATEGORY_NAMES.shopping, amount: 10, isPercentage: true, alertThreshold: 70 },
      { categoryName: DEFAULT_CATEGORY_NAMES.other, amount: 15, isPercentage: true, alertThreshold: 80 },
    ],
  },
  {
    id: 'template-worker',
    name: 'Worker',
    description: 'Budget template for working professionals',
    icon: '💼',
    isBuiltIn: true,
    totalBudget: 3000,
    budgets: [
      { categoryName: DEFAULT_CATEGORY_NAMES.foodAndDining, amount: 20, isPercentage: true, alertThreshold: 80 },
      { categoryName: DEFAULT_CATEGORY_NAMES.transportation, amount: 10, isPercentage: true, alertThreshold: 80 },
      { categoryName: DEFAULT_CATEGORY_NAMES.entertainment, amount: 10, isPercentage: true, alertThreshold: 75 },
      { categoryName: DEFAULT_CATEGORY_NAMES.shopping, amount: 15, isPercentage: true, alertThreshold: 75 },
      { categoryName: DEFAULT_CATEGORY_NAMES.billsAndUtilities, amount: 10, isPercentage: true, alertThreshold: 90 },
      { categoryName: DEFAULT_CATEGORY_NAMES.healthcare, amount: 5, isPercentage: true, alertThreshold: 90 },
      { categoryName: DEFAULT_CATEGORY_NAMES.savings, amount: 20, isPercentage: true, alertThreshold: 100 },
      { categoryName: DEFAULT_CATEGORY_NAMES.other, amount: 10, isPercentage: true, alertThreshold: 80 },
    ],
  },
  {
    id: 'template-family',
    name: 'Family',
    description: 'Budget template for families with children',
    icon: '👨‍👩‍👧‍👦',
    isBuiltIn: true,
    totalBudget: 5000,
    budgets: [
      { categoryName: DEFAULT_CATEGORY_NAMES.foodAndDining, amount: 25, isPercentage: true, alertThreshold: 85 },
      { categoryName: DEFAULT_CATEGORY_NAMES.transportation, amount: 10, isPercentage: true, alertThreshold: 80 },
      { categoryName: DEFAULT_CATEGORY_NAMES.education, amount: 15, isPercentage: true, alertThreshold: 90 },
      { categoryName: DEFAULT_CATEGORY_NAMES.entertainment, amount: 5, isPercentage: true, alertThreshold: 70 },
      { categoryName: DEFAULT_CATEGORY_NAMES.healthcare, amount: 10, isPercentage: true, alertThreshold: 90 },
      { categoryName: DEFAULT_CATEGORY_NAMES.billsAndUtilities, amount: 10, isPercentage: true, alertThreshold: 90 },
      { categoryName: DEFAULT_CATEGORY_NAMES.shopping, amount: 10, isPercentage: true, alertThreshold: 75 },
      { categoryName: DEFAULT_CATEGORY_NAMES.savings, amount: 10, isPercentage: true, alertThreshold: 100 },
      { categoryName: DEFAULT_CATEGORY_NAMES.other, amount: 5, isPercentage: true, alertThreshold: 80 },
    ],
  },
  {
    id: 'template-travel',
    name: 'Travel',
    description: 'Budget template for travel and vacation',
    icon: '✈️',
    isBuiltIn: true,
    totalBudget: 2000,
    budgets: [
      { categoryName: DEFAULT_CATEGORY_NAMES.transportation, amount: 30, isPercentage: true, alertThreshold: 85 },
      { categoryName: DEFAULT_CATEGORY_NAMES.foodAndDining, amount: 25, isPercentage: true, alertThreshold: 80 },
      { categoryName: DEFAULT_CATEGORY_NAMES.entertainment, amount: 20, isPercentage: true, alertThreshold: 75 },
      { categoryName: DEFAULT_CATEGORY_NAMES.shopping, amount: 15, isPercentage: true, alertThreshold: 70 },
      { categoryName: DEFAULT_CATEGORY_NAMES.other, amount: 10, isPercentage: true, alertThreshold: 80 },
    ],
  },
  {
    id: 'template-frugal',
    name: 'Frugal',
    description: 'Minimalist budget focused on saving',
    icon: '🐷',
    isBuiltIn: true,
    totalBudget: 1500,
    budgets: [
      { categoryName: DEFAULT_CATEGORY_NAMES.foodAndDining, amount: 25, isPercentage: true, alertThreshold: 75 },
      { categoryName: DEFAULT_CATEGORY_NAMES.transportation, amount: 10, isPercentage: true, alertThreshold: 75 },
      { categoryName: DEFAULT_CATEGORY_NAMES.billsAndUtilities, amount: 15, isPercentage: true, alertThreshold: 90 },
      { categoryName: DEFAULT_CATEGORY_NAMES.savings, amount: 40, isPercentage: true, alertThreshold: 100 },
      { categoryName: DEFAULT_CATEGORY_NAMES.other, amount: 10, isPercentage: true, alertThreshold: 70 },
    ],
  },
];

/**
 * Get all available templates (built-in + user custom)
 */
export function getAllTemplates(userTemplates: BudgetTemplate[] = []): BudgetTemplate[] {
  return [...BUILT_IN_TEMPLATES, ...userTemplates];
}

/**
 * Get a template by ID
 */
export function getTemplateById(id: string, userTemplates: BudgetTemplate[] = []): BudgetTemplate | undefined {
  return getAllTemplates(userTemplates).find((t) => t.id === id);
}

/**
 * Calculate budget amounts from a template and total budget
 */
export function calculateBudgetsFromTemplate(
  template: BudgetTemplate,
  totalBudget: number
): Array<{ categoryName: string; amount: number; alertThreshold: number }> {
  return template.budgets.map((b) => ({
    categoryName: b.categoryName,
    amount: b.isPercentage ? Math.round((totalBudget * b.amount) / 100) : b.amount,
    alertThreshold: b.alertThreshold,
  }));
}

/**
 * Get template name translations
 */
export function getTemplateTranslationKey(templateId: string): string {
  const keyMap: Record<string, string> = {
    'template-student': 'templateStudent',
    'template-worker': 'templateWorker',
    'template-family': 'templateFamily',
    'template-travel': 'templateTravel',
    'template-frugal': 'templateFrugal',
  };
  return keyMap[templateId] || 'budgetTemplate';
}

/**
 * Get template description translations
 */
export function getTemplateDescriptionKey(templateId: string): string {
  const keyMap: Record<string, string> = {
    'template-student': 'templateStudentDesc',
    'template-worker': 'templateWorkerDesc',
    'template-family': 'templateFamilyDesc',
    'template-travel': 'templateTravelDesc',
    'template-frugal': 'templateFrugalDesc',
  };
  return keyMap[templateId] || 'budgetTemplateDesc';
}
