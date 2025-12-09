# PWA GitHub Pages Installation Fix

## 問題描述 (Problem Description)

PWA應用在GitHub Pages (`https://qmiqiuq.github.io/Expense_Manager/`) 上無法安裝，但在Firebase Hosting上可以正常安裝。

The PWA app could not be installed on GitHub Pages (`https://qmiqiuq.github.io/Expense_Manager/`), but it worked correctly on Firebase Hosting.

## 根本原因 (Root Cause)

GitHub Pages將應用部署到子目錄 `/Expense_Manager/`，但PWA manifest中的 `scope` 和 `start_url` 被硬編碼為 `/`，導致瀏覽器無法安裝PWA，因為scope與實際部署URL不匹配。

GitHub Pages deploys the app to a subdirectory `/Expense_Manager/`, but the PWA manifest had hardcoded `scope: '/'` and `start_url: '/'`, preventing the browser from installing the PWA because the scope didn't match the actual deployment URL.

## 解決方案 (Solution)

更新PWA配置，使 `scope` 和 `start_url` 根據 `DEPLOY_BASE` 環境變量動態設置。

Updated the PWA configuration to dynamically set `scope` and `start_url` based on the `DEPLOY_BASE` environment variable.

### 修改的文件 (Modified Files)

1. **web/vite.config.ts**
   - 將 `base` 提取為變量
   - 使用動態 `base` 值設置 manifest 的 `scope` 和 `start_url`

2. **web/index.html**
   - 移除手動添加的 manifest link（vite-plugin-pwa 會自動注入）

3. **web/public/manifest.json**
   - 更新為使用相對路徑（`./` 而不是 `/`）

4. **docs/PWA_GUIDE.md**
   - 添加GitHub Pages部署說明
   - 添加PWA安裝問題排查指南

5. **docs/PWA_IMPLEMENTATION_SUMMARY.md**
   - 更新manifest配置文檔
   - 添加已知限制說明

## 如何部署 (How to Deploy)

### GitHub Pages部署 (Deploying to GitHub Pages)

```bash
cd web
DEPLOY_BASE=/Expense_Manager/ npm run build
```

在Windows PowerShell上：
```powershell
cd web
$env:DEPLOY_BASE = '/Expense_Manager/'; npm run build; Remove-Item Env:DEPLOY_BASE
```

生成的manifest將包含：
- `"scope": "/Expense_Manager/"`
- `"start_url": "/Expense_Manager/"`

### Firebase Hosting部署 (Deploying to Firebase Hosting)

```bash
cd web
npm run build
```

生成的manifest將包含：
- `"scope": "/"`
- `"start_url": "/"`

## 驗證修復 (Verifying the Fix)

1. **檢查生成的manifest**
   ```bash
   cd web/dist
   cat manifest.webmanifest
   ```
   
   確認 `scope` 和 `start_url` 的值正確。

2. **在瀏覽器中測試**
   - 打開DevTools → Application → Manifest
   - 驗證 `scope` 和 `start_url` 與部署URL匹配
   - 點擊安裝按鈕應該可以正常工作

## 測試結果 (Test Results)

✅ 使用 `DEPLOY_BASE=/Expense_Manager/` 構建成功
✅ 生成的manifest包含正確的scope和start_url
✅ 使用默認base path構建成功（Firebase）
✅ 代碼審查通過（0個問題）
✅ 安全檢查通過（0個漏洞）

## 下一步 (Next Steps)

1. **合併PR** - 將此修復合併到main分支
2. **重新部署到GitHub Pages** - 使用正確的DEPLOY_BASE環境變量構建
3. **測試PWA安裝** - 在GitHub Pages上驗證PWA安裝功能

## 文檔更新 (Documentation Updates)

- ✅ PWA_GUIDE.md - 添加GitHub Pages部署說明和故障排除
- ✅ PWA_IMPLEMENTATION_SUMMARY.md - 更新配置文檔和已知限制
- ✅ PWA_GITHUB_PAGES_FIX.md - 創建此修復說明文檔

## 參考 (References)

- [PWA Manifest Specification](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [vite-plugin-pwa Documentation](https://vite-pwa-org.netlify.app/)

---

**修復完成日期 (Fix Completed):** 2025-12-09
**修復狀態 (Status):** ✅ 完成並準備部署 (Complete and Ready for Deployment)
