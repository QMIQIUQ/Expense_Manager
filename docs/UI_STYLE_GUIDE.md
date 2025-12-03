# UI Style Guide

本文档整合了 Expense Manager 的所有 UI 规范，包括按钮、组件、布局和交互模式。

---

## 目录

1. [设计令牌 (Design Tokens)](#1-设计令牌)
2. [按钮系统](#2-按钮系统)
3. [表单按钮规范](#3-表单按钮规范)
4. [图标按钮](#4-图标按钮)
5. [汉堡菜单 (Hamburger Menu)](#5-汉堡菜单)
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

## 5. 汉堡菜单

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

## 6. 导航标签

标签从用户功能设置中读取。

```
[Dashboard] [Expenses] [Incomes] [Categories] [Budgets] [Recurring] [Payment Methods]
```

### 标签样式

| 状态 | 背景 | 文字 |
|------|------|------|
| 激活 | 紫色渐变 + 阴影 | 白色, 600 字重 |
| 未激活 | `var(--tab-inactive-bg)` | 次要文字 |
| 悬停 | `var(--accent-light)` | 紫色边框 |

### CSS

```css
/* 激活标签 */
.tab.active {
  background: linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%);
  color: #ffffff;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.25);
}

/* 暗色模式激活标签 */
.dark .tab.active {
  box-shadow: 0 0 20px rgba(167, 139, 250, 0.5);
}

/* 未激活标签悬停 */
.tab:not(.active):hover {
  background: var(--accent-light);
  border: 1px solid var(--accent-primary);
  transform: translateY(-1px);
}
```

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

- 除 Expenses 标签外，所有标签都显示
- 模态框/菜单打开时自动隐藏
- 移动端：圆形 56px 按钮
- 桌面端：矩形带标签

---

## 9. 响应式断点

| 断点 | 行为 |
|------|------|
| `< 360px` | 卡片内边距减少 |
| `< 768px` | 标签可滚动，FAB 仅图标 |
| `≥ 768px` | 标签均匀分布，FAB 显示标签 |

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
| QuickAddWidget | `web/src/components/dashboard/widgets/QuickAddWidget.tsx` |
| ExpenseList | `web/src/components/expenses/ExpenseList.tsx` |
| DashboardCustomizer | `web/src/components/dashboard/DashboardCustomizer.tsx` |

---

*整合自: UI_BUTTON_STYLE_GUIDE.md, UI_VISUAL_GUIDE.md, HAMBURGER_MENU_GUIDE.md, UI_IMPROVEMENTS_SUMMARY.md, UI_CHANGES.md*
