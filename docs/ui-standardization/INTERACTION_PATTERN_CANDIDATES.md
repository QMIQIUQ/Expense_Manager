# UI 互動樣式候選與參考

> 本文件供尚未決定的資訊結構與互動選擇使用；候選是設計方向，不代表已採用或要引入第三方元件庫。共用控制高度/字級/radius/spacing 已在 production 採用，這些圖中的 alternative layout/interaction 不代表本輪已實作。比較基準為 `origin/main` app source，2026-10-25。語意與鍵盤行為優先依 WAI-ARIA APG，再用設計系統參考視覺與版面慣例。

## 1. 比較圖

![支出 CRUD 流程現況與候選](previews/crud-flow-comparison.svg)

![表單對話框與危險操作模式比較](previews/dialog-confirmation-comparison.svg)

![Overlay 與同步回饋模式比較](previews/overlay-feedback-comparison.svg)

目前五張樣式與功能預覽仍保留於 [UI 元件盤點](UI_COMPONENT_INVENTORY_AND_PLAN.md)。三張新增草圖比較目前分散的視覺形式與兩種候選，不是 production screenshot。

## 2. 表單與基礎控制

| 控制 | 現況 | 候選 A | 候選 B | 候選 C | 選擇時的行為條件 |
|---|---|---|---|---|---|
| Textbox / currency / date | 原生 `input`、全域 class、Tailwind、inline style 混用 | 一般/compact 共用 TextField API，label、hint、error、prefix/suffix、focus 狀態一致 | 一般欄位 token 統一，特殊日期/金額保留獨立 wrapper | 保留原生欄位尺寸差異，只統一 label、error、focus 和 disabled | 原生輸入、name/id/ref、瀏覽器 autofill、IME、decimal/currency precision、date 時區語意不變；錯誤用 `aria-describedby` 關聯。 |
| Textarea / 描述 | 自訂行高、inline 尺寸或 form CSS | 同 TextField 外框，依內容自動/固定最小高度 | compact 多行與一般多行兩級 | 各頁保留自訂高度，統一 focus/error | 不自動 trim 或改寫文字；計數和限制只依既有規則。 |
| Select / searchable selection | 原生 select、icon grid、`AutocompleteDropdown` source variant 並存 | 原生 select 為簡單清單；長分類/標籤使用 searchable combobox | 最近項目 tile + 搜尋所有選項 | 所有可搜尋欄位都用 combobox | select、combobox、menu、listbox 語意不能混用；保留分類排序、最近使用、tag 封存資料、payment method ID。 |
| Checkbox / switch | 原生 checkbox、toggle-like row、inline state 風格不同 | checkbox 用於多選/獨立真值；switch 僅用於立即生效的二元設定 | 統一為有 label 的控制列，型態依語意區分 | 只統一顏色與 focus，保留各頁 layout | 保留 checked 狀態、keyboard Space、label 可點擊區；非同步設定須清楚呈現 pending / disabled，不把 `div` 當輸入元件。 |
| Radio / segmented / tabs | 各功能按鈕式選項、SubTabs、編輯 tabs 和 stepper 並存 | 快速互斥選項用 radio group；頁面區域切換用 tabs；密集 2–3 個即時模式可 segmented | 全部維持按鈕外觀，aria semantics 按用途定義 | 單頁表單使用 disclosure 區段代替部分 tabs | 單選不一定是 tabs；tabs 需要方向鍵/選中語意，stepper 需要前後/完成語意，disclosure 是展開區塊。 |
| Button | 原生、`.btn*`、BaseForm inline、modal 專用、icon-only 多族群 | primary/secondary/tertiary/danger/icon，按意圖統一 | primary + secondary + danger 三階，次要動作低對比 | 保留各頁 variant，統一高度、focus、loading | 不改 handler、type（submit/button）、disabled、loading 去重；危險 action 不只靠紅色辨識。 |
| Chips / tags / badges | tag picker、status badge、filter chips 形狀和密度不同 | 靜態狀態用 badge；可移除所選值用 chip；可切換篩選用 toggle chip | 提供 compact/list 與 form 兩種密度 | 依主題沿用既有色系，統一高度與語意 | 不能把只供展示的 badge 做成看似按鈕，也不能只靠顏色表示已封存、付款或同步狀態。 |

## 3. 表單容器與 Overlay

| Pattern | 現況 | 候選 A：Centered dialog | 候選 B：Drawer / mobile sheet | 候選 C：Inline workspace | 適合範圍與風險 |
|---|---|---|---|---|---|
| 一般 CRUD form | `PopupModal` / `BaseForm` / 自訂全頁有不同 header/footer | 中小型表單置中；標題、可捲動 body、固定 footer | 桌機右側 drawer；手機底部/全高 sheet | 在清單頂部或行內展開 | A 保持現有低風險；B 保留清單上下文但窄視窗/鍵盤要仔細處理；C 適合輕量 quick edit，不適合多步支出或長表單。 |
| 複雜支出新增/編輯 | 新增 stepper，編輯 3 tabs，receipt/OCR 可進入草稿流程 | 置中大 dialog，body 分段 | 桌機寬 drawer / 手機全螢幕表單 | 獨立全頁工作區 | 候選需對照建/編/receipt 三種流程，不能只用相同空表；編輯 revision 和收據 draft 在切換容器後要保留。 |
| Delete confirmation | `ConfirmModal` 適用單筆、多筆、關聯選項 | 短描述 alert dialog，動作明確 | 對批次關聯較多時先用完整確認頁/抽屜 | 列內 undo 只在後端與同步語意能安全支援時評估 | 不可逆刪除要清楚說明名稱、數量、關聯影響；不要用一般 dialog 混淆危險操作。 |
| Menu / autocomplete / date picker | 下拉及浮層由多個自訂元件提供 | 維持 anchor popover，按用途用 menu / listbox / combobox | 手機改成全寬 sheet 或原生 picker | 欄位內聯顯示日期/篩選選項 | menu 是命令清單，listbox 是選項，combobox 是可輸入搜尋；焦點回復與 viewport reposition 必須檢查。 |

**目前 overlay 的實際限制：**`PopupModal` 目前支援 Portal、Escape、遮罩關閉及 body scroll lock；JSX dialog 容器沒有 `role="dialog"`、`aria-modal` / `aria-labelledby`，元件也沒有初始焦點、focus trap 或焦點返回邏輯。`ConfirmModal` 同樣沒有 alertdialog semantics；確認時先呼叫 `onCancel` 關閉，再以 `setTimeout(..., 0)` 呼叫 `onConfirm`，不等待 mutation 結果或顯示 modal 內 loading。候選的 WAI-ARIA semantics、焦點管理和等待結果行為都是待選/待實作，不是目前功能。單純在圖上畫出 dialog 不代表現行程式已符合 APG。

![目前與兩種 overlay 方向](previews/dialog-confirmation-comparison.svg)

## 4. 載入、錯誤與同步回饋

| 狀態 | 現況/需要辨識的狀態 | 候選樣式 | 內容/行為要求 |
|---|---|---|---|
| Local accepted | 操作已完整提交至 local durable outbox，雲端可能尚未完成 | row inline status + 短暫 toast，或頂部持續狀態列 | 用「已儲存於本機，等待同步」表達；不要標成「同步完成」。 |
| Syncing | worker 正執行或 queue 仍有 pending | 靜態 progress/icon + queue 數量，必要時明確操作入口 | 狀態由事件/subscription 更新；不能新增 storage polling。 |
| Cloud confirmed | mutation receipt / executor 確認完成 | 成功 inline feedback 或短 toast | 只有收到遠端成功後才可顯示完成；重播必須保留穩定 ID 和因果順序。 |
| needs-attention / conflict | 永久錯誤或 5 次失敗後仍保留 outbox，F17 revision 衝突 | 持續可見的錯誤 alert + 檢視/重試/解決入口 | 不自動丟棄操作或覆寫較新遠端值；保留 pending payload。 |
| Form validation | 本機欄位錯誤或 server transaction 拒絕 | 欄位下方 error + 表單頂部摘要（多錯誤時） | 欄位 label/error 關聯，焦點移到第一個錯誤；server 拒絕不得翻譯成一般輸入錯誤。 |
| Offline / unavailable | browser online/offline 和 Firebase/權限服務狀態可能不同 | 簡短網路狀態 + 可恢復操作說明 | 網路圖示不能等同服務/授權成功；一般資料保留可本機提交，server-required 操作說明需上線。 |
| Long-running import/export/OCR | 進度、分列結果、OCR 待確認草稿 | task progress inline + 完成/部分完成結果 | 保留取消、部分成功、檔案處理和重新查看能力；不得只以消失的 toast 告知結果。 |

![同步狀態回饋比較](previews/overlay-feedback-comparison.svg)

## 5. 官方與設計系統參考

參考頁面於 2026-10-25 查閱。WAI-ARIA APG 指導控制語意與鍵盤互動；下列設計系統提供視覺和內容模式參考。這些來源都不是把整套元件庫引入 Expense Manager 的建議。

| 參考 | 適用內容 | 來源 |
|---|---|---|
| WAI-ARIA Dialog / Alert Dialog | modal 焦點、命名、取消/確認語意 | [Dialog (Modal)](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)、[Alert Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/alertdialog/) |
| WAI-ARIA Alert | 非模態錯誤/狀態訊息 | [Alert Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/alert/) |
| WAI-ARIA Combobox / Checkbox | 搜尋選取、核取控制鍵盤行為 | [Combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)、[Checkbox](https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/) |
| WAI-ARIA Menu Button / Disclosure / Tabs | 工具選單、展開內容、真正的頁籤切換 | [Menu Button](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/)、[Disclosure](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/)、[Tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) |
| U.S. Web Design System | modal 和 status alert 的內容層級/回饋 | [Modal](https://designsystem.digital.gov/components/modal/)、[Alert](https://designsystem.digital.gov/components/alert/) |
| Carbon Design System | modal 尺寸、按鈕與破壞性操作模式 | [Modal usage](https://carbondesignsystem.com/components/modal/usage/) |
| Material Design 3 | dialog 內容/動作與語境 | [Dialogs](https://m3.material.io/components/dialogs/overview) |
| Fluent 2 | 表單與整體 web pattern 參考 | [Fluent 2](https://fluent2.microsoft.design/) |
| Ant Design / MUI | Form、Dialog/Drawer、Snackbar 元件配置案例 | [Ant Design Form](https://ant.design/components/form/)、[Drawer](https://ant.design/components/drawer/)、[MUI Dialog](https://mui.com/material-ui/react-dialog/)、[MUI Drawer](https://mui.com/material-ui/react-drawer/)、[MUI Snackbar](https://mui.com/material-ui/react-snackbar/) |

## 6. 選擇記錄

此表預留使用者決策。填寫前不要將任何候選視為標準；也可選擇保留目前做法並指定例外。

| 決策 | 候選 A | 候選 B | 候選 C | 選擇 / 例外 |
|---|---|---|---|---|
| 一般 CRUD 容器 | 中央 dialog | 桌機 drawer / 手機 sheet | inline workspace | 待選 |
| 支出編輯 | 現有 3 tabs | 4 tabs（附件獨立） | 單頁分區 | 待選 |
| 分類選擇 | icon tiles | 最近項目 + 搜尋 | searchable select | 待選 |
| 欄位密度 | 44px 觸控高度 | 40px compact | 一般/compact 兩級 | 待選 |
| 確認刪除 | 短 alert dialog | 顯示關聯/數量的詳情 dialog | 批次先開詳情頁 | 待選 |
| 同步回饋 | inline + toast | 頂部持續狀態列 | row status + queue 頁 | 待選 |
