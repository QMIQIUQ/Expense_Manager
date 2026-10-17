# Expense Manager 文档索引

> 本目录包含 Expense Manager 的产品、开发及运维文件。功能入口和当前挂载位置按 `web/src` 核对。

## 文档结构

| 文档 | 说明 | 适用对象 |
|---|---|---|
| [FEATURES.md](FEATURES.md) | 功能总览与使用指南 | 使用者 / 开发者 |
| [FEATURES_AND_PAGES.md](FEATURES_AND_PAGES.md) | 功能入口、页面挂载与主要数据结构 | 开发者 |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 系统分层、路由和 Firebase 资料保存 | 开发者 |
| [LOGIC_METHOD_FLOW.md](LOGIC_METHOD_FLOW.md) | 主要 service methods、端到端流程和静态逻辑检查结果 | 开发者 |
| [OFFLINE_SYNC_ARCHITECTURE.md](OFFLINE_SYNC_ARCHITECTURE.md) | Firestore IndexedDB 快取、app queue、重试和同步流程 | 开发者 |
| [OFFLINE_SYNC_GUIDE.md](OFFLINE_SYNC_GUIDE.md) | 离线状态、手动同步和清除佇列说明 | 使用者 / 开发者 |
| [OFFLINE_FUNCTIONALITY.md](OFFLINE_FUNCTIONALITY.md) | 离线功能摘要及限制 | 使用者 / 开发者 |
| [UI_NAVIGATION_AUDIT.md](UI_NAVIGATION_AUDIT.md) | UI 架构、现行导航盘点与桌机/手机排列方案 | 产品 / 设计 / 开发 |
| [UI_STYLE_GUIDE.md](UI_STYLE_GUIDE.md) | UI 组件与样式规范 | 开发者 |
| [implementation-plans/COMPACT_NAVIGATION_V2.md](implementation-plans/COMPACT_NAVIGATION_V2.md) | Compact Navigation V2 实作记录 | 产品 / 设计 / 开发 |
| [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | GitHub Pages 与 Firebase live/preview 部署 | 开发者 / 运维 |
| [DARK_MODE_GUIDE.md](DARK_MODE_GUIDE.md) | 深色模式指南 | 开发者 |
| [ADMIN_GUIDE.md](ADMIN_GUIDE.md) | 管理员与用户管理 | 管理员 / 开发者 |
| [PAYMENT_METHODS_GUIDE.md](PAYMENT_METHODS_GUIDE.md) | 信用卡与支付方式 | 使用者 / 开发者 |
| [BUDGET_GUIDE.md](BUDGET_GUIDE.md) | 预算功能指南 | 使用者 / 开发者 |
| [INCOME_REPAYMENT_GUIDE.md](INCOME_REPAYMENT_GUIDE.md) | 收入与还款系统 | 使用者 / 开发者 |
| [IMPORT_EXPORT_GUIDE.md](IMPORT_EXPORT_GUIDE.md) | 导入导出功能 | 使用者 / 开发者 |
| [FIREBASE_SETUP.md](FIREBASE_SETUP.md) | Firebase 配置与安全 | 开发者 / 运维 |
| [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md) | 开发规范 | 开发者 |
| [TESTING_GUIDE.md](TESTING_GUIDE.md) | 测试指南 | 开发者 / QA |
| [CHANGELOG.md](CHANGELOG.md) | 更新日志 | 所有人 |

## 快速导航

### 使用者

- [功能说明](FEATURES.md)
- [支付方式](PAYMENT_METHODS_GUIDE.md)
- [预算管理](BUDGET_GUIDE.md)
- [收入与还款](INCOME_REPAYMENT_GUIDE.md)
- [离线状态使用说明](OFFLINE_SYNC_GUIDE.md)

### 开发者

- [系统架构](ARCHITECTURE.md)
- [主要 Method 与业务流程](LOGIC_METHOD_FLOW.md)
- [离线保存与 Firebase 同步](OFFLINE_SYNC_ARCHITECTURE.md)
- [功能入口与页面挂载](FEATURES_AND_PAGES.md)
- [UI 架构与导航盘点](UI_NAVIGATION_AUDIT.md)
- [部署指南](DEPLOYMENT_GUIDE.md)
- [开发指南](DEVELOPMENT_GUIDE.md)
- [测试指南](TESTING_GUIDE.md)

### 管理员

- [管理员指南](ADMIN_GUIDE.md)
- [Firebase 设置](FIREBASE_SETUP.md)

---

*最后更新：2026-10-17*
