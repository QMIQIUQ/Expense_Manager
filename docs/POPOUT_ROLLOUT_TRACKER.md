# Pop-out（PopupModal）導入追蹤表

> 目的：集中追蹤「哪些表單/功能還沒改成 pop-out」，並提供一個**低層 UI/行為改動**時必看的清單，方便你快速開 TODO、避免漏改或回歸。

最後更新：2025-12-12

---

## 定義

- **Pop-out**：指使用 `web/src/components/common/PopupModal.tsx` 來呈現表單/對話框（overlay + ESC 關閉 + scroll lock + 一致的 UI/交互）。
- **BaseForm-in-PopupModal 建議模式**：
  - `hideHeader={true}`（避免 PopupModal header + BaseForm header 雙標題）
  - `hideFooter={true}`（避免 PopupModal footer + BaseForm footer 雙按鈕列）
  - `chromeless={true}`（PopupModal 外層不再畫卡片/陰影/內距，只保留 overlay/定位/關閉邏輯，讓 BaseForm 成為唯一可見容器）

> 參考：`docs/FEATURES_AND_PAGES.md` 的「Recommended pattern: PopupModal + BaseForm」。

---

## 什麼算「低層功能變動」？（變動後必檢查本文件並開 TODO）

只要你修改到下列任一類檔案/能力，就應該回來看本追蹤表，並對「尚未導入 pop-out」的項目建立 TODO（至少跑一次手動驗證/補齊改造）：

### A. Pop-out/表單框架能力
- `web/src/components/common/PopupModal.tsx`
- `web/src/components/common/BaseForm.tsx`
- `web/src/components/common/Modal.tsx`
- `web/src/components/ConfirmModal.tsx`

### B. 表單共用元件（容易影響所有表單 UX）
- `web/src/components/common/DatePicker.tsx`
- `web/src/components/common/TimePicker.tsx`
- `web/src/components/common/InlineLoading.tsx`
- `web/src/components/common/SearchBar.tsx`

### C. 共用樣式/Token（會造成 pop-out 視覺回歸）
- `web/src/index.css`
- `web/src/styles/**`
- `.form-card`、`.btn`、`.btn-accent-light`、`.btn-icon*` 等共用 class

### D. i18n / 可及性規則（會讓測試或 UI 出現 regression）
- `web/src/locales/**`、`web/src/locales/translations.ts`
- label/for/id 綁定規則、aria-label、鍵盤操作（ESC/Focus trap）相關修正

---

## Pop-out 導入追蹤（未完成清單）

> 狀態說明：
> - ⬜ 未開始
> - 🟡 進行中
> - ✅ 已完成（已改成 pop-out 並通過 build/test/lint）

| 模組/功能 | Create form（新增） | Edit form（編輯） | 目前呈現方式 | 目標呈現方式 | 入口檔案/位置 | 備註 |
|---|---:|---:|---|---|---|---|
| 支出 Expense | 🟡 | ✅（列表 Edit 已 pop-out） | Create：Dashboard 使用 bottom sheet（已是 modal 形式） | 考慮統一用 PopupModal | Create：`web/src/pages/Dashboard.tsx`（bottom sheet）<br/>`web/src/pages/tabs/ExpensesTab.tsx` | Dashboard 的 bottom sheet 是行動端友好的設計，可保留 |
| 收入 Income | ✅ | ✅（列表 Edit 已 pop-out） | ~~Create：inline~~ 已改為 PopupModal | Create：改為 `PopupModal` pop-out | `web/src/pages/tabs/IncomesTab.tsx` | 已完成 pop-out 導入 |
| 定期付款 Scheduled Payments | ✅ | ✅ | ~~Create/Edit：inline~~ 已改為 pop-out | Create/Edit：改為 pop-out（建議 Create/Edit 都同一套） | `web/src/components/scheduledPayments/ScheduledPaymentManager.tsx` | 已完成 pop-out 導入 |
| 定期支出 Recurring Expenses | ✅ | ✅ | ~~Create/Edit：inline~~ 已改為 pop-out | Create/Edit：改為 pop-out | `web/src/components/recurring/RecurringExpenseManager.tsx` | 已完成 pop-out 導入 |
| 電子錢包 EWallet | ✅ | ✅ | ~~Create：inline / Edit：inline~~ 已改為 pop-out | Create/Edit：改為 pop-out | `web/src/components/ewallet/EWalletManager.tsx` | 已完成 pop-out 導入 |
| 銀行 Bank | ✅ | ✅ | ~~Create：inline / Edit：inline~~ 已改為 pop-out | Create/Edit：改為 pop-out | `web/src/components/banks/BankManager.tsx` | 已完成 pop-out 導入 |

---

## 每個項目「完成」的驗收條件（打 ✅ 前必過）

1. **Create / Edit 入口都使用 pop-out**（符合該列的目標）
2. 若內容使用 `BaseForm`：
   - `PopupModal` 必須 `hideHeader + hideFooter + chromeless`
   - 視覺上只能看到一層卡片（不雙框）
3. 所有 user-visible 文案都走 `t()`（不得新增硬字串）
4. 不新增 hardcoded 顏色（需 `var(--color-*)`）
5. 互動：ESC 可關閉、按鈕 loading/disabled（如有 async submit）
6. `npm run build`、`npm run test:run -- --watch=false`、`npm run lint` 全部通過

---

## 低層改動後的 TODO 模板（直接複製貼到 PR/Issue）

- [ ] 重新檢查 `docs/POPOUT_ROLLOUT_TRACKER.md` 未完成項目是否需要同步更新
- [ ] Expense Create（ExpensesTab / Dashboard）pop-out 導入/驗證
- [ ] Income Create（IncomesTab）pop-out 導入/驗證
- [ ] ScheduledPayment Create/Edit pop-out 導入/驗證
- [ ] Recurring Create/Edit pop-out 導入/驗證
- [ ] EWallet Create/Edit pop-out 導入/驗證
- [ ] Bank Create/Edit pop-out 導入/驗證

---

## 備註

- 這份文件是「追蹤 pop-out 導入」用，不等同於功能說明書。
- 若你想把所有表單統一成 `BaseForm`，可以在上述每項的備註欄再加一欄「BaseForm 化」的第二階段追蹤。