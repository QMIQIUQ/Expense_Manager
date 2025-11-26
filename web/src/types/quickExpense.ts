// Quick Expense Types - 快速支出预设

import { PaymentMethodType } from './index';

export interface QuickExpensePreset {
  id: string;
  userId: string;
  name: string;           // 显示名称，如 "早餐"、"咖啡"
  amount: number;         // 金额
  categoryId: string;     // 分类ID
  description?: string;   // 可选的描述
  paymentMethod?: PaymentMethodType;
  cardId?: string;
  ewalletId?: string;
  bankId?: string;
  icon?: string;          // 自定义图标 emoji
  order: number;          // 排序顺序
  createdAt: Date;
  updatedAt: Date;
}

// 新建快速支出预设的输入
export interface QuickExpensePresetInput {
  name: string;
  amount: number;
  categoryId: string;
  description?: string;
  paymentMethod?: PaymentMethodType;
  cardId?: string;
  ewalletId?: string;
  bankId?: string;
  icon?: string;
}

// 默认的快速支出预设示例
export const DEFAULT_QUICK_EXPENSE_ICONS = [
  '☕', '🍜', '🍱', '🚌', '🚇', '⛽', '🛒', '💊', '🎬', '🍺'
];
