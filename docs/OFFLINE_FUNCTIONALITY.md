# 離線功能概覽

> 程式碼核對基準：`main@a9a9d7c`（2026-10-25）。本頁分開說明必要行為與目前使用者可見的離線狀態；共用規範存在不代表每一個舊 handler 都已接入相同 queue 路徑。

本頁提供離線流程摘要。程式分層、方法路由、Firebase IndexedDB 快取、app queue 重試與目前的靜態檢查發現，請看[離線保存與 Firebase 同步架構](OFFLINE_SYNC_ARCHITECTURE.md)及[主要 Method 流程](LOGIC_METHOD_FLOW.md)。

## 使用者可見行為

- Dashboard 透過網路狀態指示器顯示 browser online/offline 狀態、app queue 筆數和 app queue 同步進度。
- Dashboard 載入時會先用應用快取顯示資料，並在網路可用時背景 revalidate。
- 一般資料異動的必要契約是先更新畫面/快取，再把完整 owner、穩定 ID 和 payload 持久化到 IndexedDB app outbox，才回報本機接受；`writeLocalFirst` / `writeLocalFirstBatch` 是共用實作。不同功能是否已接入此路徑及 entity executor，請以[主要 Method 流程](LOGIC_METHOD_FLOW.md)和當前 handler 為準，不要只根據表單/清單已更新就推斷已排入 app queue。
- `offlineQueue` 使用 IndexedDB outbox；重播由 `syncService` 執行。可重試寫入會保留操作並在背景處理，不等待 Firebase SDK 的寫入 Promise 才宣告本機接受。
- Firestore Web SDK 另有 IndexedDB 持久快取，維護其本機讀取資料及待同步寫入。這些 SDK pending writes 不會列入 Dashboard app queue 筆數。
- 頁首 pending badge 可手動執行 app queue 同步。佇列項目需在連線恢復且登入對應帳戶後才可重播。
- 「清除離線操作」會清除全部 app queue；無法復原該佇列內容，且不會清除 Firestore SDK 自己管理的 IndexedDB 寫入。

## 限制

App queue 的可用 entity 和重試處理由 handler / `syncService` executor 決定；目前最大重試次數為 5，需處理的操作會保留為 `needs-attention`，並依 entity 及錯誤類型執行拒絕回復。認證、管理員/好友授權、整體預算限額與缺少必要匯率仍需前置驗證。請勿把 app queue 筆數為 0 當作 Firestore SDK 的全部寫入都已確認。逐項範圍與驗收證據見[逐功能驗收](LOCAL_FIRST_ACCEPTANCE.md)。

相關文件：

- [離線同步架構](OFFLINE_SYNC_ARCHITECTURE.md) — 實際執行路徑、重試策略和已知缺口。
- [主要 Method 與端到端流程](LOGIC_METHOD_FLOW.md) — 支出、收入、轉帳、預算及定期付款資料流程。
- [離線狀態使用說明](OFFLINE_SYNC_GUIDE.md) — 一般使用者如何查看和執行同步。
- [UI 同步狀態候選](ui-standardization/INTERACTION_PATTERN_CANDIDATES.md) — 本機接受、同步中、雲端確認與需處理狀態的視覺語意；候選尚未選定。
