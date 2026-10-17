# 系統架構

> 本文件按目前程式碼描述執行時架構。功能入口以 [`FEATURES_AND_PAGES.md`](FEATURES_AND_PAGES.md) 為準；主要 method、業務流程與靜態檢查發現集中在 [`LOGIC_METHOD_FLOW.md`](LOGIC_METHOD_FLOW.md)；離線保存和 Firebase 同步細節見 [`OFFLINE_SYNC_ARCHITECTURE.md`](OFFLINE_SYNC_ARCHITECTURE.md)。最後核對：2026-10-17。

## 執行層次

| 層 | 主要位置 | 職責 |
|---|---|---|
| 啟動與共用 Provider | `web/src/main.tsx` | 註冊 PWA Service Worker，掛載 Theme、Language、Auth、Notification、UserSettings Provider。 |
| PWA 外殼與路由 | `web/src/App.tsx`, `contexts/PWAContext.tsx` | 提供安裝/更新能力；`/` 登入、`/login` 轉回 `/`、`/dashboard` 經 `PrivateRoute` 保護，其餘路徑轉回 `/`。 |
| 應用外殼與事件協調 | `web/src/pages/Dashboard.tsx` | 保存共用資料狀態、主頁籤、頁首選單、表單狀態；將 UI 操作接到 service、樂觀更新、快取和離線佇列。 |
| 頁面與功能元件 | `web/src/pages/tabs/`, `web/src/components/` | 顯示財務紀錄、預算、支付方式、定期付款、分析、設定、管理等 UI。 |
| 應用服務與領域邏輯 | `web/src/services/`, `web/src/domain/`, `web/src/utils/` | 執行 Firestore CRUD/transactions、金額與匯率計算、快取與重播、OCR、匯入匯出、摘要資料。 |
| 雲端及權限邊界 | `web/src/config/firebase.ts`, `web/firestore.rules`, `web/functions/` | 初始化 Firebase Auth、Firestore、Functions；Security Rules 限定用戶資料存取，Callable Functions 執行需伺服器權限的管理工作。 |

## 啟動、身份與資料讀取

1. `main.tsx` 註冊 Service Worker 並掛載全域 Provider。
2. `AuthProvider` 監聽 `onAuthStateChanged`；登入、註冊後確保 `users/{uid}` metadata 存在。`PrivateRoute` 決定是否可進入 Dashboard。
3. Dashboard 的 `loadData()` 對支出、收入、分類、預算、還款、轉帳、定期付款及付款紀錄呼叫 `dataService.getDataWithRevalidate()`。
4. 有應用快取且在線時，先回傳快取並在背景讀 Firestore；資料有變時才更新快取和 React state。離線時使用快取；無快取時此讀取路徑回傳空陣列。
5. Dashboard 對支出與預算載入結果套用尚未同步的 app queue，再更新快取和畫面。

## 資料保存層次

資料有兩種不同的瀏覽器端保存：

- **Firestore SDK 持久快取**：`config/firebase.ts` 使用 `initializeFirestore()`、`persistentLocalCache()` 和 `persistentMultipleTabManager()`。Firestore SDK 可在 IndexedDB 本機維護 Firestore 文件快取和待確認寫入，並在連線恢復後自行同步。SDK 寫入 Promise 可能等到雲端確認後才完成。
- **應用資料快取與重播佇列**：`sessionCache` 將讀取資料寫入 `sessionStorage`，並嘗試複製到 `localStorage`；`offlineQueue` 將特定 CRUD 操作寫入 `localStorage`。這是應用層快取/佇列，和 Firestore SDK 的 IndexedDB 快取分開管理。

因此「先在畫面/本機看到資料」不等於「Firebase 已確認」。一般資料異動必須先更新畫面，並透過 `writeLocalFirst` / `writeLocalFirstBatch`（或包裝它的 `useOptimisticCRUD`）將完整操作持久化，再呼叫 Firebase。所有資料讀取都會套用 pending operations，並防止較早的背景回應覆蓋本機變更。這是根目錄 `AGENTS.md` 的必要規則；詳情見[離線同步架構](OFFLINE_SYNC_ARCHITECTURE.md)及[逐功能驗收](LOCAL_FIRST_ACCEPTANCE.md)。

## 一般寫入資料流

```text
表單/列表
  → Dashboard handler
  → React state + sessionCache/localStorage 快取的樂觀更新
  → writeLocalFirst / writeLocalFirstBatch → durable offlineQueue
       ├─ 已知離線或前序操作未完成 → 本機接受，保留 queue
       └─ domain service / Firestore SDK
            ├─ 雲端確認 → 移除 queue、必要時刷新資料/帳戶餘額
            ├─ 可重試網路錯誤 → 保留 queue → syncService 依帳戶順序重播
            └─ 永久錯誤 → 移除失敗操作並回復畫面/快取
```

## 主要資料集合

以各 service、`web/src/constants/collections.ts`、Security Rules 與 Functions 為準。常用集合包括 `expenses`、`incomes`、`categories`、`budgets`、`transfers`、`repayments`、`cards`、`banks`、`ewallets`、`scheduledPayments`、`scheduledPaymentRecords`、`userSettings`、`featureSettings`、`dashboardLayouts`、`quickExpensePresets`。朋友支出使用 `friendConnections`、`friendRequests`、`friendSpendingSummaries`、`friendSpendingSummaryStates` 等集合/子集合。

`userId` 欄位、Firestore Rules 和必要時的 transaction 一起決定所有權及跨文件一致性。任何文件上的集合名稱都應回到 service 與 Rules 核對，不要只依 UI 名稱推斷。

## 進一步閱讀

- [功能入口與頁面掛載](FEATURES_AND_PAGES.md)
- [主要 method 與端到端流程](LOGIC_METHOD_FLOW.md)
- [離線操作、佇列與 Firebase 同步](OFFLINE_SYNC_ARCHITECTURE.md)
- [離線狀態使用說明](OFFLINE_SYNC_GUIDE.md)
