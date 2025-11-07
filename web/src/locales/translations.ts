// Translation keys and values for the application
export const translations = {
  en: {
    // Common
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    close: 'Close',
    confirm: 'Confirm',
    loading: 'Loading...',
    search: 'Search',
    filter: 'Filter',
    sort: 'Sort',
    
    // Header
    appTitle: '💰 Expense Manager',
    welcome: 'Welcome',
    logout: 'Logout',
    template: '📥 Template',
    exportExcel: '📊 Export Excel',
    import: '📤 Import',
    
    // Tabs
    dashboard: 'Dashboard',
    expenses: 'Expenses',
    categories: 'Categories',
    budgets: 'Budgets',
    recurring: 'Recurring',
    profile: '👤 Profile',
    admin: '👑 Admin',
    
    // Login
    login: 'Login',
    email: 'Email',
    password: 'Password',
    loginFailed: 'Failed to log in. Please check your credentials.',
    
    // Expense Form
    description: 'Description',
    amount: 'Amount',
    category: 'Category',
    date: 'Date',
    time: 'Time',
    notes: 'Notes',
    descriptionPlaceholder: 'e.g., Grocery shopping',
    notesPlaceholder: 'Additional notes (optional)',
    selectCategory: 'Select a category',
    pleaseSelectCategory: 'Please select a category.',
    pleaseFillField: 'Please fill in this field.',
    addNewExpense: 'Add New Expense',
    editExpense: 'Edit Expense',
    addExpense: 'Add Expense',
    
    // Expense List
    expenseHistory: 'Expense History',
    searchExpenses: 'Search expenses...',
    allCategories: 'All Categories',
    sortByDateDesc: 'Date (Newest)',
    sortByDateAsc: 'Date (Oldest)',
    sortByAmountDesc: 'Amount (High to Low)',
    sortByAmountAsc: 'Amount (Low to High)',
    noExpenses: 'No expenses found',
    multiSelect: 'Multi-select',
    deleteSelected: 'Delete Selected',
    selected: 'selected',
    confirmDelete: 'Are you sure you want to delete this expense?',
    confirmBulkDelete: 'Are you sure you want to delete {count} expenses?',
    
    // Categories
    categoryName: 'Category Name',
    categoryIcon: 'Icon',
    categoryColor: 'Color',
    addCategory: 'Add Category',
    editCategory: 'Edit Category',
    categoryNamePlaceholder: 'e.g., Food, Transport',
    noCategories: 'No categories found',
    defaultCategories: 'Default categories initialized',
    
    // Budgets
    budgetName: 'Budget Name',
    budgetAmount: 'Budget Amount',
    budgetPeriod: 'Period',
    periodMonthly: 'Monthly',
    periodYearly: 'Yearly',
    addBudget: 'Add Budget',
    editBudget: 'Edit Budget',
    noBudgets: 'No budgets found',
    spent: 'Spent',
    remaining: 'Remaining',
    exceeded: 'Exceeded',
    
    // Recurring Expenses
    recurringExpense: 'Recurring Expense',
    frequency: 'Frequency',
    freqDaily: 'Daily',
    freqWeekly: 'Weekly',
    freqMonthly: 'Monthly',
    startDate: 'Start Date',
    endDate: 'End Date',
    optional: 'Optional',
    active: 'Active',
    inactive: 'Inactive',
    addRecurring: 'Add Recurring Expense',
    editRecurring: 'Edit Recurring Expense',
    noRecurring: 'No recurring expenses found',
    
    // Dashboard Summary
    totalExpenses: 'Total Expenses',
    thisMonth: 'This Month',
    thisYear: 'This Year',
    today: 'Today',
    topCategories: 'Top Categories',
    recentExpenses: 'Recent Expenses',
    spendingTrend: 'Spending Trend',
    
    // Import/Export
    importExport: 'Import/Export',
    importData: 'Import Data',
    exportData: 'Export Data',
    downloadTemplate: 'Download Template',
    selectFile: 'Select File',
    importSuccess: 'Import completed successfully!',
    importError: 'Failed to import data',
    exportSuccess: 'Export completed successfully!',
    
    // Notifications
    expenseAdded: 'Expense added successfully',
    expenseUpdated: 'Expense updated successfully',
    expenseDeleted: 'Expense deleted successfully',
    categoryAdded: 'Category added successfully',
    categoryUpdated: 'Category updated successfully',
    categoryDeleted: 'Category deleted successfully',
    budgetAdded: 'Budget added successfully',
    budgetUpdated: 'Budget updated successfully',
    budgetDeleted: 'Budget deleted successfully',
    recurringAdded: 'Recurring expense added successfully',
    recurringUpdated: 'Recurring expense updated successfully',
    recurringDeleted: 'Recurring expense deleted successfully',
    
    // Errors
    errorLoadingData: 'Failed to load data. Please refresh the page.',
    errorSavingData: 'Failed to save data. Please try again.',
    errorDeletingData: 'Failed to delete data. Please try again.',
    
    // User Profile
    userProfile: 'User Profile',
    displayName: 'Display Name',
    updateProfile: 'Update Profile',
    changePassword: 'Change Password',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    confirmPassword: 'Confirm Password',
    
    // Admin
    adminPanel: 'Admin Panel',
    userManagement: 'User Management',
    totalUsers: 'Total Users',
    systemSettings: 'System Settings',
  },
  zh: {
    // Common
    save: '儲存',
    cancel: '取消',
    delete: '刪除',
    edit: '編輯',
    add: '新增',
    close: '關閉',
    confirm: '確認',
    loading: '載入中...',
    search: '搜尋',
    filter: '篩選',
    sort: '排序',
    
    // Header
    appTitle: '💰 支出管理器',
    welcome: '歡迎',
    logout: '登出',
    template: '📥 範本',
    exportExcel: '📊 匯出 Excel',
    import: '📤 匯入',
    
    // Tabs
    dashboard: '儀表板',
    expenses: '支出',
    categories: '類別',
    budgets: '預算',
    recurring: '定期支出',
    profile: '👤 個人資料',
    admin: '👑 管理員',
    
    // Login
    login: '登入',
    email: '電子郵件',
    password: '密碼',
    loginFailed: '登入失敗。請檢查您的憑證。',
    
    // Expense Form
    description: '描述',
    amount: '金額',
    category: '類別',
    date: '日期',
    time: '時間',
    notes: '備註',
    descriptionPlaceholder: '例如：購物',
    notesPlaceholder: '額外備註（選填）',
    selectCategory: '選擇類別',
    pleaseSelectCategory: '請選擇類別。',
    pleaseFillField: '請填寫此欄位。',
    addNewExpense: '新增支出',
    editExpense: '編輯支出',
    addExpense: '新增支出',
    
    // Expense List
    expenseHistory: '支出記錄',
    searchExpenses: '搜尋支出...',
    allCategories: '所有類別',
    sortByDateDesc: '日期（最新）',
    sortByDateAsc: '日期（最舊）',
    sortByAmountDesc: '金額（高至低）',
    sortByAmountAsc: '金額（低至高）',
    noExpenses: '找不到支出記錄',
    multiSelect: '多選',
    deleteSelected: '刪除選取項目',
    selected: '已選取',
    confirmDelete: '您確定要刪除此支出嗎？',
    confirmBulkDelete: '您確定要刪除 {count} 筆支出嗎？',
    
    // Categories
    categoryName: '類別名稱',
    categoryIcon: '圖示',
    categoryColor: '顏色',
    addCategory: '新增類別',
    editCategory: '編輯類別',
    categoryNamePlaceholder: '例如：食物、交通',
    noCategories: '找不到類別',
    defaultCategories: '預設類別已初始化',
    
    // Budgets
    budgetName: '預算名稱',
    budgetAmount: '預算金額',
    budgetPeriod: '期間',
    periodMonthly: '每月',
    periodYearly: '每年',
    addBudget: '新增預算',
    editBudget: '編輯預算',
    noBudgets: '找不到預算',
    spent: '已花費',
    remaining: '剩餘',
    exceeded: '超支',
    
    // Recurring Expenses
    recurringExpense: '定期支出',
    frequency: '頻率',
    freqDaily: '每日',
    freqWeekly: '每週',
    freqMonthly: '每月',
    startDate: '開始日期',
    endDate: '結束日期',
    optional: '選填',
    active: '啟用',
    inactive: '停用',
    addRecurring: '新增定期支出',
    editRecurring: '編輯定期支出',
    noRecurring: '找不到定期支出',
    
    // Dashboard Summary
    totalExpenses: '總支出',
    thisMonth: '本月',
    thisYear: '今年',
    today: '今日',
    topCategories: '熱門類別',
    recentExpenses: '最近支出',
    spendingTrend: '支出趨勢',
    
    // Import/Export
    importExport: '匯入/匯出',
    importData: '匯入資料',
    exportData: '匯出資料',
    downloadTemplate: '下載範本',
    selectFile: '選擇檔案',
    importSuccess: '匯入成功！',
    importError: '匯入資料失敗',
    exportSuccess: '匯出成功！',
    
    // Notifications
    expenseAdded: '支出已成功新增',
    expenseUpdated: '支出已成功更新',
    expenseDeleted: '支出已成功刪除',
    categoryAdded: '類別已成功新增',
    categoryUpdated: '類別已成功更新',
    categoryDeleted: '類別已成功刪除',
    budgetAdded: '預算已成功新增',
    budgetUpdated: '預算已成功更新',
    budgetDeleted: '預算已成功刪除',
    recurringAdded: '定期支出已成功新增',
    recurringUpdated: '定期支出已成功更新',
    recurringDeleted: '定期支出已成功刪除',
    
    // Errors
    errorLoadingData: '載入資料失敗。請重新整理頁面。',
    errorSavingData: '儲存資料失敗。請重試。',
    errorDeletingData: '刪除資料失敗。請重試。',
    
    // User Profile
    userProfile: '使用者資料',
    displayName: '顯示名稱',
    updateProfile: '更新資料',
    changePassword: '變更密碼',
    currentPassword: '目前密碼',
    newPassword: '新密碼',
    confirmPassword: '確認密碼',
    
    // Admin
    adminPanel: '管理員面板',
    userManagement: '使用者管理',
    totalUsers: '總使用者數',
    systemSettings: '系統設定',
  },
  'zh-CN': {
    // Common
    save: '保存',
    cancel: '取消',
    delete: '删除',
    edit: '编辑',
    add: '添加',
    close: '关闭',
    confirm: '确认',
    loading: '加载中...',
    search: '搜索',
    filter: '筛选',
    sort: '排序',
    
    // Header
    appTitle: '💰 支出管理器',
    welcome: '欢迎',
    logout: '退出登录',
    template: '📥 模板',
    exportExcel: '📊 导出 Excel',
    import: '📤 导入',
    
    // Tabs
    dashboard: '仪表板',
    expenses: '支出',
    categories: '分类',
    budgets: '预算',
    recurring: '定期支出',
    profile: '👤 个人资料',
    admin: '👑 管理员',
    
    // Login
    login: '登录',
    email: '电子邮件',
    password: '密码',
    loginFailed: '登录失败。请检查您的凭据。',
    
    // Expense Form
    description: '描述',
    amount: '金额',
    category: '分类',
    date: '日期',
    time: '时间',
    notes: '备注',
    descriptionPlaceholder: '例如：购物',
    notesPlaceholder: '额外备注（选填）',
    selectCategory: '选择分类',
    pleaseSelectCategory: '请选择分类。',
    pleaseFillField: '请填写此字段。',
    addNewExpense: '添加支出',
    editExpense: '编辑支出',
    addExpense: '添加支出',
    
    // Expense List
    expenseHistory: '支出记录',
    searchExpenses: '搜索支出...',
    allCategories: '所有分类',
    sortByDateDesc: '日期（最新）',
    sortByDateAsc: '日期（最旧）',
    sortByAmountDesc: '金额（高至低）',
    sortByAmountAsc: '金额（低至高）',
    noExpenses: '找不到支出记录',
    multiSelect: '多选',
    deleteSelected: '删除选中项目',
    selected: '已选中',
    confirmDelete: '您确定要删除此支出吗？',
    confirmBulkDelete: '您确定要删除 {count} 笔支出吗？',
    
    // Categories
    categoryName: '分类名称',
    categoryIcon: '图标',
    categoryColor: '颜色',
    addCategory: '添加分类',
    editCategory: '编辑分类',
    categoryNamePlaceholder: '例如：食物、交通',
    noCategories: '找不到分类',
    defaultCategories: '默认分类已初始化',
    
    // Budgets
    budgetName: '预算名称',
    budgetAmount: '预算金额',
    budgetPeriod: '期间',
    periodMonthly: '每月',
    periodYearly: '每年',
    addBudget: '添加预算',
    editBudget: '编辑预算',
    noBudgets: '找不到预算',
    spent: '已花费',
    remaining: '剩余',
    exceeded: '超支',
    
    // Recurring Expenses
    recurringExpense: '定期支出',
    frequency: '频率',
    freqDaily: '每日',
    freqWeekly: '每周',
    freqMonthly: '每月',
    startDate: '开始日期',
    endDate: '结束日期',
    optional: '选填',
    active: '启用',
    inactive: '停用',
    addRecurring: '添加定期支出',
    editRecurring: '编辑定期支出',
    noRecurring: '找不到定期支出',
    
    // Dashboard Summary
    totalExpenses: '总支出',
    thisMonth: '本月',
    thisYear: '今年',
    today: '今日',
    topCategories: '热门分类',
    recentExpenses: '最近支出',
    spendingTrend: '支出趋势',
    
    // Import/Export
    importExport: '导入/导出',
    importData: '导入数据',
    exportData: '导出数据',
    downloadTemplate: '下载模板',
    selectFile: '选择文件',
    importSuccess: '导入成功！',
    importError: '导入数据失败',
    exportSuccess: '导出成功！',
    
    // Notifications
    expenseAdded: '支出已成功添加',
    expenseUpdated: '支出已成功更新',
    expenseDeleted: '支出已成功删除',
    categoryAdded: '分类已成功添加',
    categoryUpdated: '分类已成功更新',
    categoryDeleted: '分类已成功删除',
    budgetAdded: '预算已成功添加',
    budgetUpdated: '预算已成功更新',
    budgetDeleted: '预算已成功删除',
    recurringAdded: '定期支出已成功添加',
    recurringUpdated: '定期支出已成功更新',
    recurringDeleted: '定期支出已成功删除',
    
    // Errors
    errorLoadingData: '加载数据失败。请刷新页面。',
    errorSavingData: '保存数据失败。请重试。',
    errorDeletingData: '删除数据失败。请重试。',
    
    // User Profile
    userProfile: '用户资料',
    displayName: '显示名称',
    updateProfile: '更新资料',
    changePassword: '更改密码',
    currentPassword: '当前密码',
    newPassword: '新密码',
    confirmPassword: '确认密码',
    
    // Admin
    adminPanel: '管理员面板',
    userManagement: '用户管理',
    totalUsers: '总用户数',
    systemSettings: '系统设置',
  },
};

export type Language = 'en' | 'zh' | 'zh-CN';
export type TranslationKey = keyof typeof translations.en;
