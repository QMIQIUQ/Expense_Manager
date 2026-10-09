# UI Style Guide

本文档整合了 Expense Manager 的所有 UI 规范，包括按钮、组件、布局和交互模式。

---

## 目录

1. [设计令牌 (Design Tokens)](#1-设计令牌)
2. [按钮系统](#2-按钮系统)
3. [表单按钮规范](#3-表单按钮规范)
4. [图标按钮](#4-图标按钮)
5. [漢堡選單與 Portal 操作選單](#5-漢堡選單與-portal-操作選單)
6. [主導覽頁籤](#6-主導覽頁籤)
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

## 5. 漢堡選單與 Portal 操作選單

### 頁首 Hamburger Menu（目前實作）

頁首的漢堡選單由 `Dashboard.tsx` 呈現，面板以 `dashboard-menu-panel` 錨定在漢堡按鈕下方。它包含網路狀態、語言、外觀、功能、匯入/匯出、可選的離線佇列，以及帳戶/管理和登出操作。它是工具與帳戶選單，不是主頁籤的「更多」下拉清單。

語言、外觀、功能與匯入/匯出各自使用 `DashboardMenuSection` 折疊列。觸發列是獨立的原生 `<button>`，整列全寬可點擊，至少 44px 高，並提供 `aria-expanded` 和 `aria-controls`；折疊內容透過 `hidden` 隱藏。按鈕本身承載左右 padding，外層 section 不加水平 padding，確保文字、箭頭、hover 背景和點擊範圍對齊。選單項目也由全寬按鈕承載自己的 hit area；不要在可點擊列外再包一個會觸發相同操作的父層，也不要巢狀放置按鈕。

功能區固定提供「功能設定」入口，再依 `hamburgerFeatures` 顯示使用者配置的功能入口。個人檔案、管理員和登出是各自的整列操作按鈕；管理入口仍遵循權限判斷。此選單與主頁籤清單分開設定，更多互動與組件樹見 [COMPACT_NAVIGATION_V2.md](implementation-plans/COMPACT_NAVIGATION_V2.md)。

### 卡片/元件操作選單：Portal 模式

此 Portal 範例是卡片或元件操作選單在會裁切內容的容器中需要脫離堆疊上下文時的模式；不代表頁首 Hamburger 選單也使用 Portal。

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

## 6. 主導覽頁籤

目前頁籤順序和顯示內容由 `tabFeatures` 提供，使用簡潔的文字按鈕與作用中底線。按鈕列水平可捲動並隱藏捲軸；切換頁籤或排序後，作用中項目會自動捲入可視範圍。頁首使用緊湊版面：桌機單列；768px 以下由 52px 品牌/操作列和 44px 導覽列組成。沒有獨立的「更多」下拉按鈕或固定手機底列。

```
[Dashboard] [Expenses] [Incomes] [Categories] [Budgets] [Recurring] [Payment Methods] [Settings]
```

### 标签样式

| 状态 | 背景 | 文字 |
|------|------|------|
| 作用中：`.compact-navigation-item.is-active` | 透明底；文字與底線使用 `var(--accent-primary)` | 主題色，較高字重 |
| 未作用中：`.compact-navigation-item` | 透明底 | `var(--text-secondary)` |
| 懸停 | `var(--tab-hover-bg)` | `var(--text-primary)` |
| 鍵盤焦點 | 不改變排列 | 以 `:focus-visible` 顯示主題色外框 |

### CSS

```css
/* current navigation item */
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

CSS 來源：`web/src/index.css` 中 `.compact-navigation-*`。主題覆寫應沿用設計 token，不能假設作用中頁籤固定為紫色漸層卡片。

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

- `FloatingExpenseActions` 共用一套渲染，始終分開呈現新增支出與掃描收據兩個按鈕；只有頁面採用不同的支出表單開啟狀態。
- 新增支出按一下即可新增；長按 500ms 進入日期快捷選單。掃描收據使用獨立按鈕，且兩者都有本地化 `aria-label` 和 `title`。
- 主要表單、漢堡/其他選單、匯入流程或 Dashboard 自訂面板開啟時隱藏 FAB，避免遮住正在操作的內容。
- 桌機按鈕固定在左下方，帶文字標籤；≤768px 時改為兩個獨立的 56×56px 圓形圖示按鈕，並以 `env(safe-area-inset-bottom)` 保留安全區域。
- `.floating-expense-actions` 容器保持透明且不攔截點擊；實際按鈕各自接收點擊。主要新增按鈕與次要掃描按鈕須維持不同的背景、邊框和陰影。

---

## 9. 响应式断点

| 断点 | 行为 |
|------|------|
| `≤ 768px` | Dashboard `isMobile` 判斷；頁首改成兩列，FAB 改為圓形圖示按鈕 |
| `≤ 480px` | 主要內容內距縮小 |

768px 是 Dashboard 導覽與 FAB 的切換點；其他較窄斷點由各個內容元件自己的 CSS 定義，不會改變主導覽模式。

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
