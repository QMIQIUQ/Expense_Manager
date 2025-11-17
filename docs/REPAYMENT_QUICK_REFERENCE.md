# 還款功能快速參考 / Repayment Feature Quick Reference

## 快速開始 / Quick Start

### 中文版

#### 1️⃣ 新增還款
```
支出頁面 → 找到支出 → 點擊 💰 → 新增還款
填寫：金額、日期、付款人（選填）、備註（選填）
```

#### 2️⃣ 查看還款
```
點擊 💰 → 看到：
- 原始金額：$100
- 已還款：$60
- 剩餘：$40
- 還款記錄列表
```

#### 3️⃣ 超額還款
```
支出 $100 → 還款 $120 →
系統自動：
- 記錄還款 $120
- 建立收入 $20（多還的部分）
- 顯示「多還金額已轉為收入」
```

#### 4️⃣ 電子錢包儲值
```
收入頁面 → 新增收入
金額：$100
類別：電子錢包儲值
用途：信用卡轉電子錢包
```

### English Version

#### 1️⃣ Add Repayment
```
Expenses → Find expense → Click 💰 → Add Repayment
Fill: Amount, Date, Payer (optional), Note (optional)
```

#### 2️⃣ View Repayments
```
Click 💰 → See:
- Original: $100
- Repaid: $60
- Remaining: $40
- Repayment history list
```

#### 3️⃣ Excess Repayment
```
Expense $100 → Repayment $120 →
System auto:
- Record repayment $120
- Create income $20 (excess)
- Show "Excess converted to income"
```

#### 4️⃣ E-Wallet Reload
```
Incomes → Add Income
Amount: $100
Category: E-Wallet Reload
Purpose: Credit card to e-wallet
```

---

## 常見情境 / Common Scenarios

### 🍽️ 朋友聚餐 / Dinner with Friends

**中文：**
```
情境：您付了 $300，三個朋友要分攤
1. 建立支出：$300
2. 朋友 A 還 $100 → 點 💰 → 新增還款
3. 朋友 B 還 $100 → 點 💰 → 新增還款
4. 朋友 C 還 $100 → 點 💰 → 新增還款
結果：顯示「已全額還款 ✓」
```

**English:**
```
Scenario: You paid $300, 3 friends split
1. Create expense: $300
2. Friend A pays $100 → Click 💰 → Add
3. Friend B pays $100 → Click 💰 → Add
4. Friend C pays $100 → Click 💰 → Add
Result: "Fully Repaid ✓"
```

### 💼 公司報銷 / Company Reimbursement

**中文：**
```
情境：墊付商務費用
1. 建立支出：$500（商務費用）
2. 公司報銷：$550
3. 新增還款：$550
結果：
- 還款記錄：$550
- 自動建立收入：$50（津貼）
```

**English:**
```
Scenario: Business expense advance
1. Create expense: $500 (business)
2. Company reimburses: $550
3. Add repayment: $550
Result:
- Repayment: $550
- Auto income: $50 (allowance)
```

### 💳 分期付款 / Installment Payment

**中文：**
```
情境：大筆採購分期付款
1. 建立支出：$1000（總額）
2. 第一期：$300 → 新增還款
3. 第二期：$300 → 新增還款
4. 第三期：$400 → 新增還款
追蹤：隨時查看剩餘金額
```

**English:**
```
Scenario: Large purchase with installments
1. Create expense: $1000 (total)
2. Month 1: $300 → Add repayment
3. Month 2: $300 → Add repayment
4. Month 3: $400 → Add repayment
Track: View remaining balance anytime
```

---

## 按鈕圖示 / Button Icons

| 圖示 / Icon | 中文 / Chinese | English |
|-------------|---------------|---------|
| 💰 | 還款 | Repayment |
| ✏️ | 編輯 | Edit |
| 🗑️ | 刪除 | Delete |
| ✓ | 已完成 | Completed |
| ✕ | 關閉 | Close |

---

## 欄位說明 / Field Descriptions

### 還款表單 / Repayment Form

| 欄位 / Field | 必填 / Required | 說明 / Description |
|--------------|-----------------|-------------------|
| 金額 / Amount | ✓ | 還款金額（正數）/ Repayment amount (positive) |
| 日期 / Date | ✓ | 還款日期 / Date of repayment |
| 付款人 / Payer | - | 誰付款的 / Who made payment |
| 備註 / Note | - | 額外說明 / Additional notes |

### 收入類別 / Income Categories

| 類別 / Category | 用途 / Use Case |
|-----------------|----------------|
| 一般收入 / Default | 薪資、獎金 / Salary, bonus |
| 電子錢包儲值 / E-Wallet | 信用卡轉帳 / Card transfer |
| 其他 / Other | 其他類型 / Other types |

---

## 狀態顯示 / Status Display

### 中文版

```
┌─────────────────────────┐
│ 原始支出：$100.00       │
│ 已還款：  $ 60.00       │
│ 剩餘：    $ 40.00       │
└─────────────────────────┘

┌─────────────────────────┐
│ 原始支出：$100.00       │
│ 已還款：  $100.00       │
│ ✓ 已全額還款            │
└─────────────────────────┘

┌─────────────────────────┐
│ 原始支出：$100.00       │
│ 已還款：  $120.00       │
│ 多還金額：$ 20.00       │
└─────────────────────────┘
```

### English Version

```
┌─────────────────────────┐
│ Original:  $100.00      │
│ Repaid:    $ 60.00      │
│ Remaining: $ 40.00      │
└─────────────────────────┘

┌─────────────────────────┐
│ Original:  $100.00      │
│ Repaid:    $100.00      │
│ ✓ Fully Repaid          │
└─────────────────────────┘

┌─────────────────────────┐
│ Original:  $100.00      │
│ Repaid:    $120.00      │
│ Excess:    $ 20.00      │
└─────────────────────────┘
```

---

## 操作流程 / Workflow

### 基本流程 / Basic Flow

```
查看支出
   ↓
點擊 💰
   ↓
查看還款記錄
   ↓
點擊「新增還款」
   ↓
填寫表單
   ↓
儲存
   ↓
查看更新後的餘額
```

### 超額處理 / Excess Handling

```
新增還款
   ↓
系統計算總額
   ↓
總額 > 支出？
   ↓ 是
自動建立收入
   ↓
顯示通知
   ↓
更新顯示
```

---

## 快捷鍵 / Shortcuts

| 動作 / Action | 中文 / Chinese | English |
|---------------|----------------|---------|
| 開啟還款視窗 | 點擊 💰 | Click 💰 |
| 關閉視窗 | ESC 或點擊 ✕ | ESC or Click ✕ |
| 新增還款 | 點擊按鈕 | Click button |
| 儲存 | Enter（表單內） | Enter (in form) |

---

## 提示與技巧 / Tips & Tricks

### 中文版

✅ **最佳實踐**
- 即時記錄還款，避免遺忘
- 填寫付款人姓名方便追蹤
- 使用備註記錄額外資訊
- 定期檢查剩餘金額

⚠️ **注意事項**
- 還款金額必須為正數
- 超額還款會自動建立收入
- 刪除還款會重新計算餘額
- 編輯還款不會建立新記錄

💡 **進階技巧**
- 搭配收入類別追蹤電子錢包
- 使用多筆還款記錄複雜情況
- 利用日期欄位追蹤付款時間
- 備註欄位可記錄轉帳資訊

### English Version

✅ **Best Practices**
- Record repayments immediately
- Include payer names for tracking
- Use notes for additional context
- Check remaining balance regularly

⚠️ **Important Notes**
- Amount must be positive
- Excess auto-creates income
- Deleting recalculates balance
- Editing doesn't create new record

💡 **Advanced Tips**
- Use income categories for e-wallets
- Multiple repayments for complex cases
- Date field tracks payment timing
- Note field for transfer details

---

## 疑難排解 / Troubleshooting

### 常見問題 / FAQ

**Q: 💰 按鈕不顯示**
A: 確認已登入且在支出頁面

**Q: Q: Cannot add repayment**
A: Check amount is positive

**Q: 超額未轉收入**
A: 檢查瀏覽器控制台

**Q: Excess not converting**
A: Check browser console

---

## 鍵盤導航 / Keyboard Navigation

```
Tab        → 下一個欄位 / Next field
Shift+Tab  → 上一個欄位 / Previous field
Enter      → 提交表單 / Submit form
Escape     → 關閉視窗 / Close modal
```

---

## 資料驗證 / Data Validation

| 欄位 / Field | 規則 / Rule |
|--------------|-------------|
| 金額 / Amount | > 0 |
| 日期 / Date | 有效日期 / Valid date |
| 付款人 / Payer | 文字（選填）/ Text (optional) |
| 備註 / Note | 文字（選填）/ Text (optional) |

---

## 版本資訊 / Version Info

**版本 / Version:** 1.0.0
**發布日期 / Release:** 2025-11-15
**支援語言 / Languages:** 繁中 / 簡中 / EN

---

## 聯絡支援 / Contact Support

📖 詳細文件 / Documentation:
- `REPAYMENT_FEATURE_GUIDE.md`
- `REPAYMENT_ARCHITECTURE.md`
- `IMPLEMENTATION_SUMMARY_REPAYMENT.md`

🔧 技術問題 / Technical Issues:
- 查看瀏覽器控制台 / Check console
- 檢查 Firestore 規則 / Check rules
- 確認網路連線 / Verify connection
