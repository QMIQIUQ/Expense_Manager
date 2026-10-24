# UI Style Guide

本文檔是 Expense Manager 目前採用的 UI 樣式規範。共用控制尺寸、字級、間距、圓角與 focus 規則由 CSS/TypeScript/Tailwind tokens 提供，紫色與 Warm Kitty 色盤仍由各主題提供。

> 頁面掛載、完整 TSX 檔案覆蓋及 token 統計請見 [UI 元件盤點](ui-standardization/UI_COMPONENT_INVENTORY_AND_PLAN.md) 和 [UI 樣式覆蓋矩陣](ui-standardization/UI_STYLE_COVERAGE_MATRIX.md)。目前規格與預覽見 [視覺統一規格](ui-standardization/VISUAL_STANDARDIZATION_SPEC.md)。導覽排列建議請見 [UI 架構與導覽排列盤點](UI_NAVIGATION_AUDIT.md)。

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

## 1. Design tokens

The shared source is web/src/styles/ui-system.css, imported after the base and theme styles. It owns shared geometry and component defaults. index.css and cat-theme.css remain the source of theme colors; ThemeContext continues to own the selected font family and root font scale. New UI must use semantic tokens instead of literal values.

### Theme colors

| Token family | Purpose |
|---|---|
| --accent-* | Primary interactive color, links, selected tabs and focus |
| --text-* | Primary, secondary and tertiary text |
| --bg-*, --card-bg, --input-bg | Page, surface and control backgrounds |
| --border-* | Control, surface and divider borders |
| --success-*, --warning-*, --error-*, --info-* | State colors and feedback |

Light, dark, system, Warm Kitty light and Warm Kitty dark keep their existing palette values. Do not hard-code a theme color into a shared component.

### Shared geometry and type

| Token | Current value / use |
|---|---|
| --ui-control-height | 44px standard field and action target |
| --ui-control-height-compact | 36px icon and compact action target |
| --ui-radius-control | 8px inputs and standard buttons |
| --ui-radius-card | 12px card and tab container |
| --ui-radius-dialog | 16px modal surface |
| --ui-radius-pill / --ui-radius-circle | Tags/chips and circular controls |
| --ui-font-xs through --ui-font-5xl | Rem-based type ramp |
| --ui-space-1 through --ui-space-24 | Four-pixel spacing rhythm with two-pixel half steps |
| --ui-focus-ring | Theme accent focus ring |
| --ui-layer-* | Dropdown, sticky, fixed, modal, popover and tooltip layers |

The source matrix includes exact-value aliases named --ui-font-…, --ui-radius-… and --ui-space-… for pre-existing fixed inline/CSS declarations. These aliases preserve established page spacing; pixel font aliases are rem-based and continue to respond to ThemeContext font scaling. Use the semantic tokens above for new or rewritten UI instead of adding another alias.

### Native controls

Text, date and number inputs, selects and textareas keep native element types and form behavior. They share the same border, text color, accent focus, control radius and minimum target height. Visible checkbox and radio controls remain native at 18px with the active theme accent. Hidden native checkbox inputs used by custom switches keep their visually hidden geometry and drive a separate theme-aware track. File and color inputs keep their specialized native presentation. The styling layer does not replace native values, event handlers, refs, autofill, IME or date behavior.

### Field and label variants

The shared native-control rule is the default: 44px minimum height, 14px text at the default root scale, 8px vertical/12px horizontal padding, 1px theme-aware border, 8px radius, and the theme-accent `:focus-visible` ring. Textareas may grow beyond their 88px minimum. Components with legacy inline or utility geometry can opt into the named classes below; preserve caller-owned width, margin, value, and event handlers.

| Variant | Intended use | Rule |
|---|---|---|
| `.ui-control--standard` | Ordinary text, number, select and multiline fields | 44px minimum height, 14px text, 8px × 12px padding, 1px border and 8px radius. |
| `.ui-control--compact` | Dense filters, toolbars and nested settings | Keeps the 44px target and 14px text; uses 4px × 8px padding, 1px border and 8px radius. |
| `.ui-control--prominent` | Main amount or mobile-first entry fields | 52px minimum height, 16px text, 12px × 16px padding and 2px border; theme colors and focus treatment remain shared. |
| `.ui-control--date` | DatePicker input with a trailing calendar button | 44px target and standard typography; reserves 44px on the trailing edge for the calendar control. |
| Specialized composition | Autocomplete, currency selector and embedded ledger controls | Preserve interaction and inner/outer sizing together; verify computed sizes before changing either layer. |

Use `.ui-control--full-width` only when the field should fill its container. `.ui-form-label` is the standard 14px field label; `.ui-form-label--secondary` is the 12px secondary/help role. `.ui-field-error` provides the shared error color and 12px type. Set `aria-invalid` on the field and connect help/error content with `aria-describedby` where appropriate; the shared visual class does not create that relationship automatically. Keep an existing specialized label or error hierarchy when it carries distinct meaning.

`.ui-action--compact` aligns dense action buttons to the shared 44px target with 14px type, 8px × 12px padding and 8px radius. It does not change a button's type, callback, disabled guard, loading state or semantic color.

`BudgetForm` custom switches retain the native checkbox as the checked-state and keyboard control; `.ui-switch-track` is only the theme-aware visual companion. Visible checkboxes and radio controls use the shared 18px size, while `.sr-only` switch inputs are excluded from that geometry rule.

The current main baseline and branch implementation status are in [UI 元件盤點與統一設計決策稿](ui-standardization/UI_COMPONENT_INVENTORY_AND_PLAN.md) and the [UI 樣式覆蓋矩陣](ui-standardization/UI_STYLE_COVERAGE_MATRIX.md). The illustrated SVGs, including the [欄位 variants preview](ui-standardization/previews/field-variants.svg), are design previews, not authenticated browser captures. Source findings do not substitute for checking computed styles at mobile and desktop widths.

---

## 2. Button system

All action buttons inherit the application font and control radius. The .btn and modal/form action families use a 44px minimum target and the shared 14px action size. Icon-only actions use the compact 36px target; pill buttons and chips use the pill token.

| Variant | Visual role | Existing pattern |
|---|---|---|
| Primary | Main save/add/confirm action using the active theme accent | .btn-primary, BaseForm and modal primary actions |
| Secondary | Cancel, close or low-emphasis action on a neutral surface | .btn-secondary, modal secondary actions |
| Danger | Destructive action using the existing error palette | .btn-danger, modal danger actions |
| Success / warning | Domain status or explicitly successful/warning actions | Existing semantic classes |
| Icon | Compact icon-only action with its accessible label retained | .btn-icon*, close and menu actions |
| Pill | Compact tag or filter affordance | .btn-pill, category/tag/status chips |

Do not change a button's type, callback, disabled guard or loading state to make its appearance consistent.

---

## 3. Form button rules

BaseForm remains the shared form frame. Its primary and secondary actions retain the current 80:20 flex ratio and use the same 44px target, control radius and action font token as modal actions. A custom form can keep its existing footer layout when the screen requires it, but its action styles must use the shared button variants/tokens.

Labels, required markers, help and errors keep their existing relationship to the field. Use an associated native label and preserve id, name, value, onChange, onBlur, ref, inputMode, type and ARIA attributes. Do not replace a native input, checkbox, select or tab with a clickable div.

---
## 4. 图标按钮

用于内联操作（编辑/删除/链接）。

### 布局规则

```css
.btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--ui-space-1-5);
  padding: var(--ui-space-2);  /* 仅圖示 */
  /* padding: var(--ui-space-2) var(--ui-space-3); 帶標籤 */
  min-width: var(--ui-control-height-compact);
  min-height: var(--ui-control-height-compact);
  border-radius: var(--ui-radius-control);
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
  border-radius: var(--ui-radius-control);
  box-shadow: var(--ui-shadow-card);
  overflow: hidden;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: var(--ui-space-2);
  width: 100%;
  padding: var(--ui-space-3) var(--ui-space-4);
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: var(--ui-font-md-sm);
  cursor: pointer;
  text-align: left;
  transition: background-color var(--ui-transition-fast);
}

.menu-item:hover {
  background: var(--hover-bg);
}

.menu-item.danger {
  color: var(--error-text);
}

/* 触发按钮 */
.card-menu-btn {
  position: absolute;
  top: var(--ui-space-2);
  right: var(--ui-space-2);
  min-width: var(--ui-control-height-compact);
  min-height: var(--ui-control-height-compact);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: var(--accent-light);
  color: var(--accent-primary);
  border-radius: var(--ui-radius-control);
  cursor: pointer;
  font-size: var(--ui-font-lg);
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
  right: var(--ui-space-2-5);
  bottom: var(--ui-space-1px);
  left: var(--ui-space-2-5);
  height: 2px;
  border-radius: var(--ui-radius-2px);
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
| Level 0 | 主背景 | `var(--bg-primary)` | `var(--bg-primary)` |
| Level 1 | 卡片/模态框 | `var(--card-bg)` | `var(--card-bg)` |
| Level 2 | 嵌套容器 | `var(--bg-secondary)` | `var(--bg-secondary)` |
| Level 3 | 交互元素 | `var(--hover-bg)` | `var(--hover-bg)` |
| Level 4 | 边框/分割线 | `var(--border-color)` | `var(--border-color)` |

### 卡片样式

```css
.card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--ui-radius-card);
  box-shadow: var(--ui-shadow-card);
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
| 主文字、次要文字及按鈕文字 | 依當前主題 token 測量 | 依當前主題 token 測量 | 本文件不宣稱尚未重新量測的比例；變更色盤後需逐主題驗證 |

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
