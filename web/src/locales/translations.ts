// Translation keys and values for the application
// New structure: each key contains translations for all languages
export const translations = {
  // Common
  save: { en: 'Save', zh: '儲存', 'zh-CN': '保存' },
  cancel: { en: 'Cancel', zh: '取消', 'zh-CN': '取消' },
  delete: { en: 'Delete', zh: '刪除', 'zh-CN': '删除' },
  edit: { en: 'Edit', zh: '編輯', 'zh-CN': '编辑' },
  add: { en: 'Add', zh: '新增', 'zh-CN': '添加' },
  close: { en: 'Close', zh: '關閉', 'zh-CN': '关闭' },
  confirm: { en: 'Confirm', zh: '確認', 'zh-CN': '确认' },
  loading: { en: 'Loading...', zh: '載入中...', 'zh-CN': '加载中...' },
  search: { en: 'Search', zh: '搜尋', 'zh-CN': '搜索' },
  filter: { en: 'Filter', zh: '篩選', 'zh-CN': '筛选' },
  sort: { en: 'Sort', zh: '排序', 'zh-CN': '排序' },

  // Header
  appTitle: { en: '💰 Expense Manager', zh: '💰 支出管理器', 'zh-CN': '💰 支出管理器' },
  welcome: { en: 'Welcome', zh: '歡迎', 'zh-CN': '欢迎' },
  logout: { en: 'Logout', zh: '登出', 'zh-CN': '退出登录' },
  template: { en: '📥 Template', zh: '📥 範本', 'zh-CN': '📥 模板' },
  exportExcel: { en: '📊 Export Excel', zh: '📊 匯出 Excel', 'zh-CN': '📊 导出 Excel' },
  import: { en: '📤 Import', zh: '📤 匯入', 'zh-CN': '📤 导入' },

  // Tabs
  dashboard: { en: 'Dashboard', zh: '儀表板', 'zh-CN': '仪表板' },
  expenses: { en: 'Expenses', zh: '支出', 'zh-CN': '支出' },
  categories: { en: 'Categories', zh: '類別', 'zh-CN': '分类' },
  budgets: { en: 'Budgets', zh: '預算', 'zh-CN': '预算' },
  recurring: { en: 'Recurring', zh: '定期支出', 'zh-CN': '定期支出' },
  profile: { en: '👤 Profile', zh: '👤 個人資料', 'zh-CN': '👤 个人资料' },
  admin: { en: '👑 Admin', zh: '👑 管理員', 'zh-CN': '👑 管理员' },

  // Login
  login: { en: 'Login', zh: '登入', 'zh-CN': '登录' },
  email: { en: 'Email', zh: '電子郵件', 'zh-CN': '电子邮件' },
  password: { en: 'Password', zh: '密碼', 'zh-CN': '密码' },
  loginFailed: { en: 'Failed to log in. Please check your credentials.', zh: '登入失敗。請檢查您的憑證。', 'zh-CN': '登录失败。请检查您的凭据。' },

  // Expense Form
  description: { en: 'Description', zh: '描述', 'zh-CN': '描述' },
  amount: { en: 'Amount', zh: '金額', 'zh-CN': '金额' },
  category: { en: 'Category', zh: '類別', 'zh-CN': '分类' },
  date: { en: 'Date', zh: '日期', 'zh-CN': '日期' },
  time: { en: 'Time', zh: '時間', 'zh-CN': '时间' },
  notes: { en: 'Notes', zh: '備註', 'zh-CN': '备注' },
  descriptionPlaceholder: { en: 'e.g., Grocery shopping', zh: '例如：購物', 'zh-CN': '例如：购物' },
  notesPlaceholder: { en: 'Additional notes (optional)', zh: '額外備註（選填）', 'zh-CN': '额外备注（选填）' },
  selectCategory: { en: 'Select a category', zh: '選擇類別', 'zh-CN': '选择分类' },
  pleaseSelectCategory: { en: 'Please select a category.', zh: '請選擇類別。', 'zh-CN': '请选择分类。' },
  pleaseFillField: { en: 'Please fill in this field.', zh: '請填寫此欄位。', 'zh-CN': '请填写此字段。' },
  addNewExpense: { en: 'Add New Expense', zh: '新增支出', 'zh-CN': '添加支出' },
  editExpense: { en: 'Edit Expense', zh: '編輯支出', 'zh-CN': '编辑支出' },
  addExpense: { en: 'Add Expense', zh: '新增支出', 'zh-CN': '添加支出' },
  total: { en: 'total:', zh: '總計:', 'zh-CN': '总计:' },
  from: { en: 'from:', zh: '從:', 'zh-CN': '从:' },

  // Expense List
  expenseHistory: { en: 'Expense History', zh: '支出記錄', 'zh-CN': '支出记录' },
  searchExpenses: { en: 'Search expenses...', zh: '搜尋支出...', 'zh-CN': '搜索支出...' },
  allCategories: { en: 'All Categories', zh: '所有類別', 'zh-CN': '所有分类' },
  sortByDateDesc: { en: 'Date (Newest)', zh: '日期（最新）', 'zh-CN': '日期（最新）' },
  sortByDateAsc: { en: 'Date (Oldest)', zh: '日期（最舊）', 'zh-CN': '日期（最旧）' },
  sortByAmountDesc: { en: 'Amount (High to Low)', zh: '金額（高至低）', 'zh-CN': '金额（高至低）' },
  sortByAmountAsc: { en: 'Amount (Low to High)', zh: '金額（低至高）', 'zh-CN': '金额（低至高）' },
  noExpenses: { en: 'No expenses found', zh: '找不到支出記錄', 'zh-CN': '找不到支出记录' },
  multiSelect: { en: 'Multi-select', zh: '多選', 'zh-CN': '多选' },
  deleteSelected: { en: 'Delete Selected', zh: '刪除選取項目', 'zh-CN': '删除选中项目' },
  selectAll: { en: 'Select All', zh: '全選', 'zh-CN': '全选' },
  selected: { en: 'selected', zh: '已選取', 'zh-CN': '已选中' },
  items: { en: 'items', zh: '項', 'zh-CN': '项' },
  categoryBreakdown: { en: 'Category Breakdown:', zh: '類別明細:', 'zh-CN': '分类明细:' },
  to: { en: 'to:', zh: '到:', 'zh-CN': '到:' },
  confirmDelete: { en: 'Are you sure you want to delete this expense?', zh: '您確定要刪除此支出嗎？', 'zh-CN': '您确定要删除此支出吗？' },
  confirmBulkDelete: { en: 'Are you sure you want to delete {count} expenses?', zh: '您確定要刪除 {count} 筆支出嗎？', 'zh-CN': '您确定要删除 {count} 笔支出吗？' },

  // Categories
  categoryName: { en: 'Category Name', zh: '類別名稱', 'zh-CN': '分类名称' },
  categoryIcon: { en: 'Icon', zh: '圖示', 'zh-CN': '图标' },
  categoryColor: { en: 'Color', zh: '顏色', 'zh-CN': '颜色' },
  addCategory: { en: 'Add Category', zh: '新增類別', 'zh-CN': '添加分类' },
  editCategory: { en: 'Edit Category', zh: '編輯類別', 'zh-CN': '编辑分类' },
  categoryNamePlaceholder: { en: 'e.g., Food, Transport', zh: '例如：食物、交通', 'zh-CN': '例如：食物、交通' },
  noCategories: { en: 'No categories found', zh: '找不到類別', 'zh-CN': '找不到分类' },
  defaultCategories: { en: 'Default categories initialized', zh: '預設類別已初始化', 'zh-CN': '默认分类已初始化' },

  // Budgets
  budgetManagement: { en: 'Budget Management', zh: '預算管理', 'zh-CN': '预算管理' },
  setBudget: { en: '+ Set Budget', zh: '+ 設定預算', 'zh-CN': '+ 设定预算' },
  noBudgetsYet: { en: 'No budgets set yet. Create your first budget! 💰', zh: '尚未設定預算。建立您的第一個預算！💰', 'zh-CN': '尚未设定预算。创建您的第一个预算！💰' },
  budgetName: { en: 'Budget Name', zh: '預算名稱', 'zh-CN': '预算名称' },
  budgetAmount: { en: 'Budget Amount', zh: '預算金額', 'zh-CN': '预算金额' },
  budgetPeriod: { en: 'Period', zh: '期間', 'zh-CN': '期间' },
  periodMonthly: { en: 'Monthly', zh: '每月', 'zh-CN': '每月' },
  periodYearly: { en: 'Yearly', zh: '每年', 'zh-CN': '每年' },
  addBudget: { en: 'Add Budget', zh: '新增預算', 'zh-CN': '添加预算' },
  editBudget: { en: 'Edit Budget', zh: '編輯預算', 'zh-CN': '编辑预算' },
  noBudgets: { en: 'No budgets found', zh: '找不到預算', 'zh-CN': '找不到预算' },
  spent: { en: 'Spent', zh: '已花費', 'zh-CN': '已花费' },
  remaining: { en: 'Remaining', zh: '剩餘', 'zh-CN': '剩余' },
  exceeded: { en: 'Exceeded', zh: '超支', 'zh-CN': '超支' },

  // Recurring Expenses
  recurringExpense: { en: 'Recurring Expense', zh: '定期支出', 'zh-CN': '定期支出' },
  frequency: { en: 'Frequency', zh: '頻率', 'zh-CN': '频率' },
  freqDaily: { en: 'Daily', zh: '每日', 'zh-CN': '每日' },
  freqWeekly: { en: 'Weekly', zh: '每週', 'zh-CN': '每周' },
  freqMonthly: { en: 'Monthly', zh: '每月', 'zh-CN': '每月' },
  startDate: { en: 'Start Date', zh: '開始日期', 'zh-CN': '开始日期' },
  endDate: { en: 'End Date', zh: '結束日期', 'zh-CN': '结束日期' },
  optional: { en: 'Optional', zh: '選填', 'zh-CN': '选填' },
  active: { en: 'Active', zh: '啟用', 'zh-CN': '启用' },
  inactive: { en: 'Inactive', zh: '停用', 'zh-CN': '停用' },
  addRecurring: { en: 'Add Recurring Expense', zh: '新增定期支出', 'zh-CN': '添加定期支出' },
  editRecurring: { en: 'Edit Recurring Expense', zh: '編輯定期支出', 'zh-CN': '编辑定期支出' },
  noRecurring: { en: 'No recurring expenses found', zh: '找不到定期支出', 'zh-CN': '找不到定期支出' },

  // Dashboard Summary
  totalExpenses: { en: 'Total Expenses', zh: '總支出', 'zh-CN': '总支出' },
  thisMonth: { en: 'This Month', zh: '本月', 'zh-CN': '本月' },
  thisYear: { en: 'This Year', zh: '今年', 'zh-CN': '今年' },
  today: { en: 'Today', zh: '今日', 'zh-CN': '今日' },
  topCategories: { en: 'Top Categories', zh: '熱門類別', 'zh-CN': '热门分类' },
  recentExpenses: { en: 'Recent Expenses', zh: '最近支出', 'zh-CN': '最近支出' },
  spendingTrend: { en: 'Spending Trend', zh: '支出趨勢', 'zh-CN': '支出趋势' },

  // Import/Export
  importExport: { en: 'Import/Export', zh: '匯入/匯出', 'zh-CN': '导入/导出' },
  importData: { en: 'Import Data', zh: '匯入資料', 'zh-CN': '导入数据' },
  exportData: { en: 'Export Data', zh: '匯出資料', 'zh-CN': '导出数据' },
  downloadTemplate: { en: 'Download Template', zh: '下載範本', 'zh-CN': '下载模板' },
  selectFile: { en: 'Select File', zh: '選擇檔案', 'zh-CN': '选择文件' },
  importSuccess: { en: 'Import completed successfully!', zh: '匯入成功！', 'zh-CN': '导入成功！' },
  importError: { en: 'Failed to import data', zh: '匯入資料失敗', 'zh-CN': '导入数据失败' },
  exportSuccess: { en: 'Export completed successfully!', zh: '匯出成功！', 'zh-CN': '导出成功！' },

  // Notifications
  expenseAdded: { en: 'Expense added successfully', zh: '支出已成功新增', 'zh-CN': '支出已成功添加' },
  expenseUpdated: { en: 'Expense updated successfully', zh: '支出已成功更新', 'zh-CN': '支出已成功更新' },
  expenseDeleted: { en: 'Expense deleted successfully', zh: '支出已成功刪除', 'zh-CN': '支出已成功删除' },
  categoryAdded: { en: 'Category added successfully', zh: '類別已成功新增', 'zh-CN': '分类已成功添加' },
  categoryUpdated: { en: 'Category updated successfully', zh: '類別已成功更新', 'zh-CN': '分类已成功更新' },
  categoryDeleted: { en: 'Category deleted successfully', zh: '類別已成功刪除', 'zh-CN': '分类已成功删除' },
  budgetAdded: { en: 'Budget added successfully', zh: '預算已成功新增', 'zh-CN': '预算已成功添加' },
  budgetUpdated: { en: 'Budget updated successfully', zh: '預算已成功更新', 'zh-CN': '预算已成功更新' },
  budgetDeleted: { en: 'Budget deleted successfully', zh: '預算已成功刪除', 'zh-CN': '预算已成功删除' },
  recurringAdded: { en: 'Recurring expense added successfully', zh: '定期支出已成功新增', 'zh-CN': '定期支出已成功添加' },
  recurringUpdated: { en: 'Recurring expense updated successfully', zh: '定期支出已成功更新', 'zh-CN': '定期支出已成功更新' },
  recurringDeleted: { en: 'Recurring expense deleted successfully', zh: '定期支出已成功刪除', 'zh-CN': '定期支出已成功删除' },

  // Errors
  errorLoadingData: { en: 'Failed to load data. Please refresh the page.', zh: '載入資料失敗。請重新整理頁面。', 'zh-CN': '加载数据失败。请刷新页面。' },
  errorSavingData: { en: 'Failed to save data. Please try again.', zh: '儲存資料失敗。請重試。', 'zh-CN': '保存数据失败。请重试。' },
  errorDeletingData: { en: 'Failed to delete data. Please try again.', zh: '刪除資料失敗。請重試。', 'zh-CN': '删除数据失败。请重试。' },

  // User Profile
  userProfile: { en: 'User Profile', zh: '使用者資料', 'zh-CN': '用户资料' },
  displayName: { en: 'Display Name', zh: '顯示名稱', 'zh-CN': '显示名称' },
  updateProfile: { en: 'Update Profile', zh: '更新資料', 'zh-CN': '更新资料' },
  changePassword: { en: 'Change Password', zh: '變更密碼', 'zh-CN': '更改密码' },
  currentPassword: { en: 'Current Password', zh: '目前密碼', 'zh-CN': '当前密码' },
  newPassword: { en: 'New Password', zh: '新密碼', 'zh-CN': '新密码' },
  confirmPassword: { en: 'Confirm Password', zh: '確認密碼', 'zh-CN': '确认密码' },

  // Admin
  adminPanel: { en: 'Admin Panel', zh: '管理員面板', 'zh-CN': '管理员面板' },
  userManagement: { en: 'User Management', zh: '使用者管理', 'zh-CN': '用户管理' },
  totalUsers: { en: 'Total Users', zh: '總使用者數', 'zh-CN': '总用户数' },
  systemSettings: { en: 'System Settings', zh: '系統設定', 'zh-CN': '系统设置' },
} as const;

export type Language = 'en' | 'zh' | 'zh-CN';
export type TranslationKey = keyof typeof translations;
