# 離線功能概覽

本頁提供離線流程摘要。程式分層、方法路由、Firebase IndexedDB 快取、app queue 重試與目前的靜態檢查發現，請看[離線保存與 Firebase 同步架構](OFFLINE_SYNC_ARCHITECTURE.md)。

## 使用者可見行為

- Dashboard 透過網路狀態指示器顯示 browser online/offline 狀態、app queue 筆數和 app queue 同步進度。
- Dashboard 載入時會先用應用快取顯示資料，並在網路可用時背景 revalidate。
- 所有一般資料異動都必須先更新畫面，並在呼叫 Firebase 前保存完整操作至 app queue。已知離線時不會等待 SDK 寫入 Promise；重新載入或背景讀取仍會套用待同步資料。
- Firestore Web SDK 另有 IndexedDB 持久快取，維護其本機讀取資料及待同步寫入。這些 SDK pending writes 不會列入 Dashboard app queue 筆數。
- 頁首 pending badge 可手動執行 app queue 同步。佇列項目需在連線恢復且登入對應帳戶後才可重播。
- 「清除離線操作」會清除全部 app queue；無法復原該佇列內容，且不會清除 Firestore SDK 自己管理的 IndexedDB 寫入。

## 限制

app queue 涵蓋主要 CRUD、排序及一般偏好設定。重試達上限的操作保留為 needs-attention，較晚操作等待前序完成；Budget 另有伺服器驗證拒絕回復。認證、管理員/好友授權、整體預算限額與缺少必要匯率仍需前置驗證。請勿把 app queue 筆數為 0 當作 Firestore SDK 的全部寫入都已確認。逐項範圍與測試證據見[逐功能驗收](LOCAL_FIRST_ACCEPTANCE.md)。

相關文件：

- [離線同步架構](OFFLINE_SYNC_ARCHITECTURE.md) — 實際執行路徑、重試策略和已知缺口。
- [主要 Method 與端到端流程](LOGIC_METHOD_FLOW.md) — 支出、收入、轉帳、預算及定期付款資料流程。
- [離線狀態使用說明](OFFLINE_SYNC_GUIDE.md) — 一般使用者如何查看和執行同步。
- [UI 同步狀態候選](ui-standardization/INTERACTION_PATTERN_CANDIDATES.md) — 本機接受、同步中、雲端確認與需處理狀態的視覺語意；候選尚未選定。
