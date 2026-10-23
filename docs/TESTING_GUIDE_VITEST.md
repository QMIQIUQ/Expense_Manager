# 測試指南 (Testing Guide)

本專案使用 **Vitest** + **React Testing Library** 進行自動化測試。

## 📦 測試框架

- **Vitest** - 快速的單元測試框架（與 Vite 深度整合）
- **React Testing Library** - React 元件測試工具
- **jsdom** - 模擬瀏覽器環境
- **@testing-library/user-event** - 模擬用戶互動

---

## 🚀 快速開始

### 安裝依賴（已完成）
```bash
cd web
npm install
```

### 執行測試

#### 1. 監視模式（開發時使用）
```bash
npm test
```
- 自動偵測檔案變更並重新執行測試
- 互動式介面，可選擇執行特定測試

#### 2. 單次執行（CI/CD 使用）
```bash
npm run test:run
```
- 執行所有測試後退出
- 適合用於 GitHub Actions 或部署前檢查

#### 3. UI 模式（視覺化介面）
```bash
npm run test:ui
```
- 開啟瀏覽器視覺化測試介面
- 可查看測試結果、執行時間、覆蓋率等

#### 4. 測試覆蓋率報告
```bash
npm run test:coverage
```
- 生成 HTML 覆蓋率報告（位於 `coverage/` 目錄）
- 可用瀏覽器開啟 `coverage/index.html` 查看詳細報告

---

## 📁 測試檔案結構

```
web/
├── src/
│   ├── components/
│   │   ├── expenses/
│   │   │   ├── ExpenseForm.tsx
│   │   │   └── ExpenseForm.test.tsx     ← 元件測試
│   │   └── categories/
│   │       ├── CategoryForm.tsx
│   │       └── CategoryForm.test.tsx
│   ├── utils/
│   │   ├── dateUtils.ts
│   │   └── dateUtils.test.ts            ← 工具函數測試
│   └── test/
│       ├── setup.ts                      ← 全局測試設定
│       └── test-utils.tsx                ← 自訂 render 函數
├── vitest.config.ts                      ← Vitest 配置
└── package.json
```

---

## 📝 撰寫測試範例

### 1. 元件測試 (Component Test)

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../test/test-utils';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('handles button click', async () => {
    const mockFn = vi.fn();
    render(<MyComponent onClick={mockFn} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
});
```

### 2. 工具函數測試 (Utility Test)

```typescript
import { describe, it, expect } from 'vitest';
import { formatCurrency } from './utils';

describe('formatCurrency', () => {
  it('formats positive numbers', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });

  it('handles zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });
});
```

### 3. 異步測試 (Async Test)

```typescript
import { describe, it, expect, waitFor } from 'vitest';
import { render, screen } from '../test/test-utils';
import AsyncComponent from './AsyncComponent';

describe('AsyncComponent', () => {
  it('loads data', async () => {
    render(<AsyncComponent />);
    
    await waitFor(() => {
      expect(screen.getByText('Loaded!')).toBeInTheDocument();
    });
  });
});
```

---

## 🔧 測試工具函數

### 使用自訂 render
專案提供了 `test-utils.tsx`，已包含所有必要的 Provider：

```typescript
import { render, screen } from '../test/test-utils'; // ← 使用此行
// 不要用：import { render } from '@testing-library/react';

render(<MyComponent />); // 自動包含 Router + Language Provider
```

### 常用查詢方法

```typescript
// 推薦（語義化查詢）
screen.getByRole('button', { name: /submit/i });
screen.getByLabelText(/email/i);
screen.getByPlaceholderText('Enter name');

// 文字查詢
screen.getByText('Hello');
screen.getByDisplayValue('John');

// 測試 ID（最後手段）
screen.getByTestId('custom-element');
```

---

## 🎯 測試最佳實踐

### ✅ DO（建議）

1. **測試用戶行為，不是實作細節**
   ```typescript
   // ✅ Good
   expect(screen.getByRole('button')).toBeInTheDocument();
   
   // ❌ Bad
   expect(wrapper.find('.button-class')).toHaveLength(1);
   ```

2. **使用語義化查詢**
   - 優先順序：`getByRole` > `getByLabelText` > `getByPlaceholderText` > `getByText` > `getByTestId`

3. **測試關鍵功能**
   - 表單驗證
   - 按鈕點擊行為
   - 資料渲染
   - 錯誤處理

4. **Mock 外部依賴**
   ```typescript
   vi.mock('firebase/auth', () => ({
     getAuth: vi.fn(),
     signInWithEmailAndPassword: vi.fn(),
   }));
   ```

### ❌ DON'T（避免）

1. **不要測試第三方套件**
   ```typescript
   // ❌ 不需要測試 React Router 是否正常工作
   ```

2. **不要測試 CSS 樣式**
   ```typescript
   // ❌ 避免
   expect(element).toHaveStyle('color: red');
   ```

3. **不要過度 Mock**
   ```typescript
   // ❌ 如果可以用真實邏輯，就不要 Mock
   ```

---

## 🧪 已完成的測試範例

### ExpenseForm 測試
- ✅ 表單渲染
- ✅ 驗證錯誤顯示
- ✅ 表單提交（新增/編輯）
- ✅ 金額輸入格式化
- ✅ 付款方式切換

### CategoryForm 測試
- ✅ 表單渲染
- ✅ 名稱驗證
- ✅ 表單提交
- ✅ 編輯模式

### dateUtils 測試
- ✅ 日期格式化
- ✅ 時間格式化
- ✅ 貨幣格式化

---

## 🔍 調試測試

### 查看元素結構
```typescript
import { screen } from '@testing-library/react';

screen.debug(); // 印出整個 DOM
screen.debug(screen.getByRole('button')); // 印出特定元素
```

### 查看可用的角色
```typescript
screen.logTestingPlaygroundURL(); // 生成互動式查詢建議
```

---

## 🚨 常見問題

### Q1: 測試找不到元件？
**A:** 檢查是否使用了 `test-utils.tsx` 的 render：
```typescript
import { render } from '../test/test-utils'; // ✅
```

### Q2: Firebase 錯誤？
**A:** Firebase 已在 `setup.ts` 中 Mock，無需額外處理。

### Q3: 異步操作失敗？
**A:** 使用 `waitFor` 或 `findBy*`：
```typescript
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});
```

---

## 📊 CI/CD 整合

### GitHub Actions 範例
```yaml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v7.0.1
      - uses: actions/setup-node@v7.1.0
        with:
          node-version-file: .nvmrc
      - run: npm ci
        working-directory: web
      - run: npm run test:run
        working-directory: web
```

---

## 📚 參考資源

- [Vitest 官方文檔](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library 查詢優先級](https://testing-library.com/docs/queries/about/#priority)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)

---

## 🎓 學習路徑

1. **入門** → 先執行現有測試：`npm test`
2. **實踐** → 為新元件撰寫簡單測試
3. **進階** → 學習 Mock、異步測試、覆蓋率優化
4. **整合** → 設定 CI/CD 自動化測試

---

**Happy Testing! 🧪✨**
