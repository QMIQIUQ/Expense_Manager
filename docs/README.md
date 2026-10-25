# 📚 Expense Manager 文档索引

> 本目录包含 Expense Manager 项目的所有技术文档。

## 🗂️ 文档结构

| 文档 | 说明 | 适用对象 |
|------|------|---------|
| [FEATURES.md](FEATURES.md) | 功能总览与使用指南 | 用户 / 开发者 |
| [FEATURES_AND_PAGES.md](FEATURES_AND_PAGES.md) | 功能入口、目前頁面掛載與主要資料結構 | 開發者 |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 系統分層、資料流與 Firebase 架構 | 開發者 |
| [PERFORMANCE_RELIABILITY_IMPLEMENTATION.md](PERFORMANCE_RELIABILITY_IMPLEMENTATION.md) | IndexedDB outbox、交易防重送、分頁、快取與驗證紀錄 | 開發者 / 維運 |
| [OFFLINE_STORAGE_STARTUP.md](implementation-plans/OFFLINE_STORAGE_STARTUP.md) | 離線快照、啟動載入與 IndexedDB 遷移優化計畫（尚未實作） | 開發者 / QA |
| [LOGIC_METHOD_FLOW.md](LOGIC_METHOD_FLOW.md) | 主要 method、流程及當前 source-level 同步核對 | 開發者 |
| [INCOME_BUDGET_LINK_PLAN.md](INCOME_BUDGET_LINK_PLAN.md) | 收入與每月預算聯動規則、實作邊界與驗收紀錄 | 產品 / 開發者 |
| [LOCAL_FIRST_ACCEPTANCE.md](LOCAL_FIRST_ACCEPTANCE.md) | 既有逐功能本機優先驗收紀錄 | 開發者 / QA |
| [OFFLINE_SYNC_ARCHITECTURE.md](OFFLINE_SYNC_ARCHITECTURE.md) | IndexedDB outbox、領域交易、重播與待處理狀態 | 開發者 |
| [OFFLINE_SYNC_GUIDE.md](OFFLINE_SYNC_GUIDE.md) | 本機先顯示、同步狀態與佇列使用說明 | 使用者 / 開發者 |
| [OFFLINE_FUNCTIONALITY.md](OFFLINE_FUNCTIONALITY.md) | 離線行為、適用範圍與限制摘要 | 使用者 / 開發者 |
| [UI_NAVIGATION_AUDIT.md](UI_NAVIGATION_AUDIT.md) | UI 架構、現行導覽盤點與桌機/手機排列方案 | 產品 / 設計 / 開發 |
| [UI_STYLE_GUIDE.md](UI_STYLE_GUIDE.md) | UI shared tokens、field variants、按鈕/卡片與無障礙規範 | 開發者 |
| [ui-standardization/UI_COMPONENT_INVENTORY_AND_PLAN.md](ui-standardization/UI_COMPONENT_INVENTORY_AND_PLAN.md) | 改動前 `main@a9a9d7c` 基線、已合併至 `main@9fce5d7` 的元件/樣式盤點與 SVG 預覽 | 產品 / 設計 / 開發 |
| [ui-standardization/UI_SCREEN_STYLE_CHECKLIST.md](ui-standardization/UI_SCREEN_STYLE_CHECKLIST.md) | Login、Dashboard、各功能頁與全域浮層的 textbox/label/checkbox/button/card 樣式清單和例外 | 設計 / 開發 / QA |
| [ui-standardization/VISUAL_STANDARDIZATION_SPEC.md](ui-standardization/VISUAL_STANDARDIZATION_SPEC.md) | 共享 UI 尺寸、tokens、主題規則與 SVG 規格預覽 | 產品 / 設計 / 開發 |
| [ui-standardization/UI_STYLE_COVERAGE_MATRIX.md](ui-standardization/UI_STYLE_COVERAGE_MATRIX.md) | 改動前 `main@a9a9d7c` Production TSX/CSS 覆蓋與 token/source 統計，以及 `main@9fce5d7` 的合併範圍 | 設計 / 開發 / QA |
| [ui-standardization/CRUD_FLOW_AUDIT.md](ui-standardization/CRUD_FLOW_AUDIT.md) | 各功能新增、檢視、編輯、刪除與表單 overlay 流程 | 產品 / 設計 / 開發 |
| [ui-standardization/INTERACTION_PATTERN_CANDIDATES.md](ui-standardization/INTERACTION_PATTERN_CANDIDATES.md) | 欄位、按鈕、dialog/drawer、狀態回饋候選與官方參考 | 產品 / 設計 / 開發 |
| [ui-standardization/PATTERN_STANDARDIZATION_PLAN.md](ui-standardization/PATTERN_STANDARDIZATION_PLAN.md) | 已採用幾何的逐階段實作紀錄、保護的流程邏輯及未來 interaction 改版驗收步驟 | 開發者 / QA |
| [implementation-plans/COMPACT_NAVIGATION_V2.md](implementation-plans/COMPACT_NAVIGATION_V2.md) | 已發布的 Compact Navigation V2 實作紀錄；較新的導覽改進建議見 UI 導覽盤點 | 產品 / 設計 / 開發 |
| [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | GitHub Pages 與 Firebase live / preview 部署方式 | 開發者 / 運維 |
| [DARK_MODE_GUIDE.md](DARK_MODE_GUIDE.md) | 深色模式完整指南 | 开发者 |
| [ADMIN_GUIDE.md](ADMIN_GUIDE.md) | 管理员与用户管理 | 管理员 / 开发者 |
| [PAYMENT_METHODS_GUIDE.md](PAYMENT_METHODS_GUIDE.md) | 信用卡与支付方式 | 用户 / 开发者 |
| [BUDGET_GUIDE.md](BUDGET_GUIDE.md) | 预算功能指南 | 用户 / 开发者 |
| [INCOME_REPAYMENT_GUIDE.md](INCOME_REPAYMENT_GUIDE.md) | 收入与还款系统 | 用户 / 开发者 |
| [IMPORT_EXPORT_GUIDE.md](IMPORT_EXPORT_GUIDE.md) | 导入导出功能 | 用户 / 开发者 |
| [FIREBASE_SETUP.md](FIREBASE_SETUP.md) | Firebase 配置与安全 | 开发者 / 运维 |
| [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md) | 开发规范与模式 | 开发者 |
| [TESTING_GUIDE.md](TESTING_GUIDE.md) | 测试指南 | 开发者 / QA |
| [CHANGELOG.md](CHANGELOG.md) | 更新日志 | 所有人 |

## 🚀 快速导航

### 我是用户
- 📱 [功能说明](FEATURES.md) - 了解所有功能
- 💳 [支付方式](PAYMENT_METHODS_GUIDE.md) - 信用卡与电子钱包
- 💰 [预算管理](BUDGET_GUIDE.md) - 预算与月结日
- 📊 [收入还款](INCOME_REPAYMENT_GUIDE.md) - 收入追踪与分帐
- 📶 [本機先顯示與同步](OFFLINE_SYNC_GUIDE.md) - 離線狀態和佇列操作

### 我是开发者
- 🏗️ [架构](ARCHITECTURE.md) - 系统设计
- 🧭 [功能與頁面](FEATURES_AND_PAGES.md) - 功能入口與實際掛載位置
- 🧩 [主要 Method 與流程](LOGIC_METHOD_FLOW.md) - 領域方法和資料流程
- 💰 [收入與預算聯動計畫](INCOME_BUDGET_LINK_PLAN.md) - 收入來源、帳期和預算額度規則
- 📶 [本機優先同步架構](OFFLINE_SYNC_ARCHITECTURE.md) - outbox、交易和重播合約
- 🧾 [離線功能摘要](OFFLINE_FUNCTIONALITY.md) - 功能範圍及限制
- 🧭 [UI 架構與排列盤點](UI_NAVIGATION_AUDIT.md) - 導覽結構、目前問題與改進方案
- 🎨 [UI 元件盤點與統一設計計畫](ui-standardization/UI_COMPONENT_INVENTORY_AND_PLAN.md) - 全站 UI 位置、元件類別、主題與逐檔邏輯邊界
- 🎨 [已實作 UI 規格與預覽](ui-standardization/VISUAL_STANDARDIZATION_SPEC.md) - 共用欄位、按鈕、卡片、dialog 及主題 tokens
- 🗂️ [UI 樣式覆蓋矩陣](ui-standardization/UI_STYLE_COVERAGE_MATRIX.md) - 全部 production TSX/CSS 檔案及 inline/token 統計
- 🧾 [CRUD 表單流程盤點](ui-standardization/CRUD_FLOW_AUDIT.md) - 目前可達功能的新增/檢視/編輯/刪除流程
- 🧩 [互動模式候選](ui-standardization/INTERACTION_PATTERN_CANDIDATES.md) - 元件、overlay、同步回饋選擇及參考
- 🗂️ [樣式逐階段實作計畫](ui-standardization/PATTERN_STANDARDIZATION_PLAN.md) - 需修改的檔案、必保留邏輯和驗收條件
- 📱 [Compact Navigation V2](implementation-plans/COMPACT_NAVIGATION_V2.md) - 已發布的實作紀錄；新建議見 UI 導覽盤點
- 🎨 [UI 规范](UI_STYLE_GUIDE.md) - 样式与组件
- 🚀 [部署指南](DEPLOYMENT_GUIDE.md) - GitHub Pages 與 Firebase Hosting
- 🌙 [深色模式](DARK_MODE_GUIDE.md) - 主题系统
- 📝 [开发指南](DEVELOPMENT_GUIDE.md) - 编码规范

### 我是管理员
- 👤 [管理员指南](ADMIN_GUIDE.md) - 用户管理
- 🔥 [Firebase 设置](FIREBASE_SETUP.md) - 部署配置

---

*最後更新：2026-10-25*
