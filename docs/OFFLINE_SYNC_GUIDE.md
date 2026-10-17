# 離線狀態使用說明

## 查看連線及待處理狀態

Dashboard 頁首的網路狀態區會顯示瀏覽器連線狀態。出現待處理數字時，表示 app queue 尚有操作等待重播；它不會顯示 Firestore SDK IndexedDB 自行保存的待同步寫入數。

## 手動同步

網路恢復後，app 會自動嘗試重播 app queue。頁首狀態區顯示待處理筆數時，點該筆數會手動呼叫同步。同步完成後，仍存在的數字表示有尚未完成的 app queue 操作。

漢堡選單裡的「重新上傳」按鈕目前只呼叫資料載入，沒有直接呼叫 queue sync，且會暫時把筆數顯示為 0；不能用這個訊息確認已上傳。此程式路徑需修正。

## 操作結果

- 畫面先更新表示 UI 已樂觀更新或使用本機快取，不一定代表 Firebase 已確認。
- 部分功能遇到網路錯誤後會提示已儲存離線；其他功能可能等待 Firestore SDK 自行同步，或在錯誤時回復畫面。
- Expense 操作達 app queue 重試上限時會保留並提示需人工重試。Budget 操作可能被伺服器端配置驗證拒絕並回復畫面。其他 queue entity 的重試次數達上限後可能會被移除。
- 登出後，屬於其他帳戶或舊格式的 expense/budget queue 操作可能留在本機；切回原帳戶後才可能重播。

## 清除佇列

Dashboard 漢堡選單的「清除佇列」會立即刪除全部 `offlineQueue` 內容，沒有額外確認步驟，也無法復原。這不會清除 Firestore SDK 的本機待同步寫入，也不代表 Firebase 已同步完畢。只有在確定 app queue 中操作都可丟棄時才按下。

若操作持續失敗，保留佇列並確認網路與目前登入帳戶；高重試的 Expense 通知提供重試入口。開發者可參考[離線同步架構](OFFLINE_SYNC_ARCHITECTURE.md)及[邏輯與 Method 流程](LOGIC_METHOD_FLOW.md)檢查具體 entity 路由。
