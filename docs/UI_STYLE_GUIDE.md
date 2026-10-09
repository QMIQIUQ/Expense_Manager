# UI Style Guide

本文档整合了 Expense Manager 的所有 UI 规范，包括按钮、组件、布局和交互模式。

> 頁面層級、目前導覽和推薦排列方案請見 [UI 架構與導覽排列盤點](UI_NAVIGATION_AUDIT.md)。本指南提供元件外觀與互動原則；目前程式的導覽和建議改版需分開理解。

---

## 目录

1. [设计令牌 (Design Tokens)](#1-设计令牌)
2. [按钮系统](#2-按钮系统)
3. [表单按钮规范](#3-表单按钮规范)
4. [图标按钮](#4-图标按钮)
5. [卡片操作菜单（⋮）](#5-卡片操作菜单)
6. [导航标签](#6-导航标签)
7. [卡片与容器](#7-卡片与容器)
8. [浮动按钮 (FAB)](#8-浮动按钮)
9. [响应式断点](#9-响应式断点)
10. [无障碍访问](#10-无障碍访问)

---

## 1. 设计令牌

所有颜色必须使用 CSS 变量，禁止硬编码十六进制值。

### 主色调

| 变量 | 亮色模式 | 暗色模式 | 用途 |
|------|---------|---------|------|
| `--accent-primary` | #7c3aed | #a78bfa | 主按钮、链接 |
| `--accent-secondary` | #8b5cf6 | #c4b5fd | 次要强调 |
| `--accent-hover` | #6d28d9 | #8b5cf6 | 悬停状态 |
| `--accent-light` | #ede9fe | #3a3654 | 按钮背景 |

### 状态颜色

| 变量 | 用途 |
|------|------|
| `--success-bg/text` | 成功提示 |
| `--warning-bg/text` | 警告提示 |
| `--error-bg/text` | 错误提示 |
| `--info-bg/text` | 信息提示 |

### 结构颜色

| 变量 | 用途 |
|------|------|
| `--card-bg` | 卡片背景 |
| `--bg-secondary` | 次要背景 |
| `--bg-tertiary` | 第三层背景 |
| `--border-color` | 边框颜色 |
| `--text-primary` | 主文字 |
| `--text-secondary` | 次要文字 |

---

## 2. 按钮系统

### 基础按钮类

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 500;
  font-size: 14px;
  transition: all 0.2s ease;
}

.btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px var(--shadow);
}
```

### 按钮变体

| 类名 | 背景 | 文字 | 用途 |
|------|------|------|------|
| `.btn-primary` | `--accent-primary` | 白色 | 主要操作 |
| `.btn-secondary` | `--bg-secondary` | `--text-primary` | 取消/关闭 |
| `.btn-danger` | `--error-bg` | `--error-text` | 删除操作 |
| `.btn-success` | `--success-bg` | `--success-text` | 确认操作 |

---

## 3. 表单按钮规范

所有表单（创建/编辑）应遵循 `BaseForm` 组件的按钮样式。

### 标准表单按钮

```tsx
<div className="flex gap-3 pt-2">
  <button
    type="submit"
    style={{
      flex: 1,
      backgroundColor: 'var(--accent-light)',
      color: 'var(--accent-primary)',
      padding: '8px 16px',
      borderRadius: '6px',
      fontWeight: 600,
      fontSize: '14px',
    }}
  >
    {t('save')}
  </button>
  <button
    type="button"
    onClick={onCancel}
    style={{
      backgroundColor: 'var(--bg-secondary)',
      color: 'var(--text-primary)',
      padding: '8px 20px',
      borderRadius: '6px',
      fontWeight: 600,
      fontSize: '14px',
    }}
  >
    {t('cancel')}
  </button>
</div>
```

### 表单按钮规格

| 属性 | 保存按钮 | 取消按钮 |
|------|---------|---------|
| 背景 | `var(--accent-light)` | `var(--bg-secondary)` |
| 文字 | `var(--accent-primary)` | `var(--text-primary)` |
| 内边距 | `8px 16px` | `8px 20px` |
| 圆角 | `6px` | `6px` |
| 字重 | `600` | `600` |
| Flex | `flex: 1` | 固定宽度 |

### 悬停效果

```css
/* 亮色模式 */
.inline-btn-save:hover:not(:disabled) {
  filter: brightness(0.95);
}

/* 暗色模式 */
.dark .inline-btn-save:hover:not(:disabled) {
  filter: brightness(1.1);
}
```

---

## 4. 图标按钮

用于内联操作（编辑/删除/链接）。

### 布局规则

```css
.btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px;  /* 仅图标 */
  /* padding: 8px 12px; 带标签 */
  border-radius: 8px;
  border: none;
  background-color: transparent;
}
```

### 图标按钮变体

| 意图 | 背景 | 颜色 |
|------|------|------|
| Primary | `var(--accent-light)` | `var(--accent-primary)` |
| Danger | `var(--error-bg)` | `var(--error-text)` |
| Success | `var(--success-bg)` | `var(--success-text)` |
| Neutral | `rgba(148,163,184,0.18)` | `var(--text-secondary)` |

### 示例

```tsx
<button className="btn-icon btn-icon-primary" aria-label={t('edit')}>
  <EditIcon size={18} />
</button>
```

---

## 5. 卡片操作菜单（⋮）

本節的 Portal 範例用於卡片內的項目操作選單（例如編輯/刪除），觸發圖示通常是 `⋮`。它**不是** `Dashboard.tsx` 頁首的 `☰` 工具選單；目前頁首選單的折疊列由 `DashboardMenuSection` 呈現（見第 6 節）。本節描述現行元件，導覽改版建議請看 [UI 導覽盤點](UI_NAVIGATION_AUDIT.md)。

### ⭐ 推荐：Portal 模式

在 **所有** 卡片/组件中使用 Portal 模式以避免 z-index 问题。

```tsx
import ReactDOM from 'react-dom';

const FloatingMenu: React.FC<Props> = ({ anchorId, children, onClose }) => {
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const anchor = document.getElementById(anchorId);
    if (!anchor) return;
    
    const updatePosition = () => {
      const rect = anchor.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    };
    
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchorId]);

  if (!position) return null;

  return ReactDOM.createPortal(
    <div
      ref={menuRef}
      className="floating-menu"
      style={{
        position: 'fixed',
        top: position.top,
        right: position.right,
        zIndex: 10000,
      }}
    >
      {children}
    </div>,
    document.body
  );
};
```

### CSS 样式

```css
.floating-menu {
  min-width: 140px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.dark .floating-menu {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.15s;
}

.menu-item:hover {
  background: var(--hover-bg);
}

.dark .menu-item:hover {
  background: linear-gradient(90deg, rgba(124, 58, 237, 0.15), rgba(167, 139, 250, 0.2));
}

.menu-item.danger {
  color: var(--error-text);
}

/* 触发按钮 */
.card-menu-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: var(--accent-light);
  color: var(--accent-primary);
  border-radius: 6px;
  cursor: pointer;
  font-size: 18px;
  font-weight: bold;
  line-height: 1;
}

.card-menu-btn:hover {
  background: var(--accent-primary);
  color: white;
}
```

### Portal 模式优势

| 优势 | 说明 |
|------|------|
| 逃离堆叠上下文 | 渲染到 `document.body`，避免父元素限制 |
| 无溢出问题 | 父元素的 `overflow: hidden` 不会裁剪菜单 |
| 一致的 z-index | 始终在最上层 `zIndex: 10000` |
| 精确定位 | 使用 `getBoundingClientRect()` |

### ✅ 要做

1. 使用 `⋮` 字符作为触发按钮
2. 为锚点元素分配唯一 `id`
3. 支持 ESC 键关闭
4. 点击外部关闭菜单
5. 使用 `e.stopPropagation()`

### ❌ 不要做

1. 在复杂布局中使用 `position: absolute`
2. 仅依赖 `z-index` 解决可见性问题
3. 使用透明背景
4. 忘记点击外部处理器

---

## 6. 導覽頁籤

目前主要頁籤依使用者功能設定顯示與排序；預設功能與響應式行為以 [UI 導覽盤點](UI_NAVIGATION_AUDIT.md) 為準。Dashboard 的目前導覽元件如下：

- `CompactNavigation`（`web/src/components/navigation/CompactNavigation.tsx`）讀取 `tabFeatures`，以 `.compact-navigation-item` 呈現可水平捲動的主頁籤；切換頁籤或排序後會將作用中項目捲入可視範圍。
- `DashboardMenuSection`（`web/src/components/navigation/DashboardMenuSection.tsx`）呈現漢堡選單內的折疊列。觸發列是全寬原生按鈕，並提供 `aria-expanded`、`aria-controls`；各操作按鈕自行承載完整點擊範圍。
- `FloatingExpenseActions`（`web/src/components/navigation/FloatingExpenseActions.tsx`）保留新增支出與掃描收據兩個分開的浮動操作。

主頁籤保持水平捲動，所有寬度都不會改為漢堡選單或固定手機底列。頁首選單內容、點擊區結構及桌機/手機現況請見 [UI 導覽盤點](UI_NAVIGATION_AUDIT.md)。

### 目前導覽選擇器與行為

| CSS 選擇器 | 現行行為 |
|-----------|---------|
| `.compact-navigation` | 主頁籤容器；桌面高度 56px，≤768px 時放在第二列並縮至 44px |
| `.compact-navigation-scroll` | 橫向可捲動的頁籤列；使用者可滑動，捲軸隱藏 |
| `.compact-navigation-item` | 透明底、次要文字色；懸停時套用 `--tab-hover-bg` 和主要文字色 |
| `.compact-navigation-item.is-active` | 主要主題色文字與底線，不使用卡片底色 |
| `.compact-navigation-item:focus-visible` | 以主題色外框標示鍵盤焦點 |

```
[Dashboard] [Expenses] [Incomes] [Categories] [Budgets] [Recurring] [Payment Methods] [Settings]
```

### 樣式狀態與主題

| 狀態 | 背景 | 文字 |
|------|------|------|
| 作用中：`.compact-navigation-item.is-active` | 透明底；底線使用 `var(--accent-primary)` | `var(--accent-primary)`，較高字重 |
| 未作用中：`.compact-navigation-item` | 透明底 | `var(--text-secondary)` |
| 未作用中且懸停 | `var(--tab-hover-bg)` | `var(--text-primary)` |
| 鍵盤焦點：`.compact-navigation-item:focus-visible` | 不改變排列 | 以 `var(--accent-primary)` 顯示外框 |

主頁籤顏色由主題 token 決定，不應假設所有主題都是紫色背景配白字。`ThemeContext` 提供 `light`、`dark`、`system`、`cat`、`cat-dark` 五種 `ThemeMode`；`system` 跟隨作業系統色彩偏好，`cat` 和 `cat-dark` 使用 Warm Kitty 配色，並覆寫主題 token。變數定義位於 `web/src/index.css` 和 `web/src/cat-theme.css`。

### 目前 CSS 選擇器

```css
.compact-navigation-item.is-active {
  color: var(--accent-primary);
  font-weight: 650;
}

.compact-navigation-item.is-active::after {
  position: absolute;
  right: 10px;
  bottom: 1px;
  left: 10px;
  height: 2px;
  border-radius: 2px;
  background: var(--accent-primary);
  content: '';
}

.compact-navigation-item:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}
```

CSS 來源：`web/src/index.css` 中 `.compact-navigation-*`。`web/src/index.css` 仍保留 `.dashboard-tabs` / `.dashboard-tab` 與 `≥640px` 等寬規則；它們是舊版頁籤樣式，不是 `Dashboard.tsx` 目前掛載的主導覽。避免將這組舊選擇器記成現行元件樣式。

---

## 7. 卡片与容器

### 层级系统

| 层级 | 用途 | 亮色 | 暗色 |
|------|------|------|------|
| Level 0 | 主背景 | #ffffff | #0a0a0f |
| Level 1 | 卡片/模态框 | #ffffff | #1a1625 |
| Level 2 | 嵌套容器 | #f5f5f5 | #252338 |
| Level 3 | 交互元素 | #f0f0f0 | #3a3654 |
| Level 4 | 边框/分割线 | #e5e7eb | #48484a |

### 卡片样式

```css
.card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 2px 8px var(--shadow);
}
```

---

## 8. 浮动按钮

### 桌面版

```
┌──────────────────────┐
│ + Add New Expense    │
└──────────────────────┘
```

### 移动版

```
┌──────┐
│  +   │
└──────┘
```

### 规则

- Expenses 和其他 Dashboard 頁面都會顯示兩個操作：新增支出與掃描收據；目前各自有對應的 FAB 渲染分支。
- Expenses 頁用 `showAddSheet` 開啟支出表單；其他頁面用 `showAddExpenseForm`。兩者共用 `StepByStepExpenseForm`。
- 漢堡選單、其他選單、匯入彈窗、支出表單或 Dashboard 自訂面板開啟時，FAB 會隱藏。
- 長按新增支出按鈕會開啟日期快捷選單。
- `isMobile` 在視窗寬度 `≤768px` 時成立：新增和掃描按鈕均為 56px 圓形圖示按鈕；較寬時為帶文字的橢圓按鈕。
- 圖示按鈕需保留本地化 `aria-label` 和可見的 `title`；掃描入口標示為掃描收據。

---

## 9. 響應式斷點

| 寬度/判斷 | 目前行為 |
|------|------|
| 所有寬度 | 主頁籤列可水平捲動，捲軸隱藏 |
| `≥ 640px` | 舊版 `.dashboard-tab` CSS 會平均伸展；不適用於目前的 `CompactNavigation` |
| `≤ 768px` | FAB 使用僅圖示的圓形按鈕（由 Dashboard `isMobile` 判斷） |
| `≤ 480px` | 內容內距縮小 |
| `≤ 360px` / `≤ 320px` | 頁籤最小寬度、按鈕內距及字級縮小 |

640px 和 768px 是不同用途的切換點，不應合併解讀成同一個裝置模式。改版時請以具體版面需求重新定義斷點，並在短標籤、長語系和超窄螢幕下檢查溢出。

---

## 10. 无障碍访问

### 对比度要求

| 元素 | 亮色模式 | 暗色模式 | 级别 |
|------|---------|---------|------|
| 主文字 | 16.1:1 | 14.5:1 | AAA ✅ |
| 次要文字 | 5.3:1 | 6.1:1 | AA ✅ |
| 按钮文字 | 8.5:1 | 9.2:1 | AAA ✅ |

### 规则

- 所有仅图标按钮 **必须** 有 `aria-label`
- 图标与背景对比度至少 3:1
- 保持焦点状态可见，避免 `outline: none`
- 汉堡按钮需要 `aria-expanded` 和 `aria-controls`

---

## 参考实现

| 组件 | 文件路径 |
|------|---------|
| BaseForm | `web/src/components/common/BaseForm.tsx` |
| CompactNavigation | `web/src/components/navigation/CompactNavigation.tsx` |
| DashboardMenuSection | `web/src/components/navigation/DashboardMenuSection.tsx` |
| FloatingExpenseActions | `web/src/components/navigation/FloatingExpenseActions.tsx` |
| QuickAddWidget | `web/src/components/dashboard/widgets/QuickAddWidget.tsx` |
| ExpenseList | `web/src/components/expenses/ExpenseList.tsx` |
| DashboardCustomizer | `web/src/components/dashboard/DashboardCustomizer.tsx` |

---

*整合自: UI_BUTTON_STYLE_GUIDE.md, UI_VISUAL_GUIDE.md, HAMBURGER_MENU_GUIDE.md, UI_IMPROVEMENTS_SUMMARY.md, UI_CHANGES.md*
