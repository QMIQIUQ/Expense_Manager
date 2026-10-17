# 離線功能概覽

本頁提供離線流程摘要。程式分層、方法路由、Firebase IndexedDB 快取、app queue 重試與目前的靜態檢查發現，請看[離線保存與 Firebase 同步架構](OFFLINE_SYNC_ARCHITECTURE.md)。

## 使用者可見行為

- Dashboard 透過網路狀態指示器顯示 browser online/offline 狀態、app queue 筆數和 app queue 同步進度。
- Dashboard 載入時會先用應用快取顯示資料，並在網路可用時背景 revalidate。
- `useOptimisticCRUD` 接入的部分功能會先更新畫面；特定網路錯誤發生後，如該 handler 有正確設定 queue entity，才會顯示已儲存離線並等待 app queue 重播。
- Firestore Web SDK 另有 IndexedDB 持久快取，維護其本機讀取資料及待同步寫入。這些 SDK pending writes 不會列入 Dashboard app queue 筆數。
- 頁首 pending badge 可手動執行 app queue 同步。佇列項目需在連線恢復且登入對應帳戶後才可重播。
- 「清除離線操作」會清除全部 app queue；無法復原該佇列內容，且不會清除 Firestore SDK 自己管理的 IndexedDB 寫入。

## 限制

目前 app queue 只涵蓋部分 entity，不保證每個離線操作都走同一種保存方式。個別 handler 的 queue payload/重播目標也有待修正的差異；重試達上限時，Expense 會保留並標示需注意，Budget 有拒絕回滾流程，其餘 entity 可能會從 app queue 移除。請勿把 queue 筆數為 0 當作所有 Firebase 寫入均已確認。

相關文件：

- [離線同步架構](OFFLINE_SYNC_ARCHITECTURE.md) — 實際執行路徑、重試策略和已知缺口。
- [主要 Method 與端到端流程](LOGIC_METHOD_FLOW.md) — 支出、收入、轉帳、預算及定期付款資料流程。
- [離線狀態使用說明](OFFLINE_SYNC_GUIDE.md) — 一般使用者如何查看和執行同步。
