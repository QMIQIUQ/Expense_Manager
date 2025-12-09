# Development Guide

开发规范与编码模式指南。

---

## 目录

1. [乐观更新 (Optimistic Update)](#1-乐观更新)
2. [日期处理规范](#2-日期处理规范)
3. [内联编辑模式](#3-内联编辑模式)
4. [Agent 开发规则](#4-agent-开发规则)
5. [代码组织](#5-代码组织)

---

## 1. 乐观更新

所有 CRUD 操作必须使用乐观更新模式。

### 什么是乐观更新？

1. **立即更新 UI** - 用户操作后立即更新界面，不等待服务器响应
2. **后台同步** - 在背景中执行数据库操作
3. **错误回滚** - 如果操作失败，自动恢复到原始状态
4. **通知反馈** - 使用 pending → success/error 状态通知

### 标准实现模式

#### 创建操作

```typescript
const handleAdd = async (data) => {
  // 1. 创建临时 ID
  const tempId = `temp-${Date.now()}`;
  const optimisticItem = { ...data, id: tempId };
  
  // 2. 乐观更新
  setItems(prev => [...prev, optimisticItem]);
  
  // 3. 显示 pending 通知
  const notificationId = showNotification('pending', t('saving'), { 
    duration: 0 
  });
  
  try {
    // 4. 执行数据库操作
    const realId = await service.create(data);
    
    // 5. 替换临时 ID
    setItems(prev => prev.map(item => 
      item.id === tempId ? { ...item, id: realId } : item
    ));
    
    // 6. 更新通知
    updateNotification(notificationId, { 
      type: 'success', 
      message: t('createSuccess'), 
      duration: 3000 
    });
  } catch (error) {
    // 7. 回滚
    setItems(prev => prev.filter(item => item.id !== tempId));
    updateNotification(notificationId, { 
      type: 'error', 
      message: t('errorSavingData'), 
      duration: 5000 
    });
  }
};
```

#### 更新操作

```typescript
const handleUpdate = async (id, updates) => {
  // 1. 保存原始数据
  const original = items.find(item => item.id === id);
  
  // 2. 乐观更新
  setItems(prev => prev.map(item => 
    item.id === id ? { ...item, ...updates } : item
  ));
  
  // 3. 显示 pending 通知
  const notificationId = showNotification('pending', t('saving'), { 
    duration: 0 
  });
  
  try {
    await service.update(id, updates);
    updateNotification(notificationId, { 
      type: 'success', 
      message: t('updateSuccess'), 
      duration: 3000 
    });
  } catch (error) {
    // 回滚
    if (original) {
      setItems(prev => prev.map(item => 
        item.id === id ? original : item
      ));
    }
    updateNotification(notificationId, { 
      type: 'error', 
      message: t('errorSavingData'), 
      duration: 5000 
    });
  }
};
```

#### 删除操作

```typescript
const handleDelete = async (id) => {
  // 1. 保存原始数据
  const deleted = items.find(item => item.id === id);
  
  // 2. 乐观更新
  setItems(prev => prev.filter(item => item.id !== id));
  
  // 3. 显示 pending 通知
  const notificationId = showNotification('pending', t('deleting'), { 
    duration: 0 
  });
  
  try {
    await service.delete(id);
    updateNotification(notificationId, { 
      type: 'success', 
      message: t('deleteSuccess'), 
      duration: 3000 
    });
  } catch (error) {
    // 回滚
    if (deleted) {
      setItems(prev => [...prev, deleted]);
    }
    updateNotification(notificationId, { 
      type: 'error', 
      message: t('errorDeletingData'), 
      duration: 5000 
    });
  }
};
```

### 通知 Duration 规范

| 类型 | Duration | 说明 |
|------|----------|------|
| `pending` | `0` | 不自动消失 |
| `success` | `3000` | 3秒后消失 |
| `error` | `5000` | 5秒后消失 |

### ❌ 常见错误

```typescript
// ❌ 错误 - 直接修改状态
items.push(newItem);
setItems(items);

// ✅ 正确 - 使用回调
setItems(prev => [...prev, newItem]);
```

```typescript
// ❌ 错误 - 忘记回滚
catch (error) {
  showNotification('error', 'Failed');
}

// ✅ 正确 - 必须回滚
catch (error) {
  setItems(prev => prev.filter(item => item.id !== tempId));
  updateNotification(id, { type: 'error', ... });
}
```

---

## 2. 日期处理规范

### 核心原则

1. **存储**: 使用 `YYYY-MM-DD` 字符串格式
2. **显示**: 使用用户本地格式
3. **计算**: 使用 `date-fns` 库

### 日期工具函数

```typescript
// utils/dateUtils.ts

// 格式化为存储格式
export const toStorageFormat = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

// 从存储格式解析
export const fromStorageFormat = (dateStr: string): Date => {
  return parseISO(dateStr);
};

// 格式化为显示格式
export const toDisplayFormat = (dateStr: string, locale: string): string => {
  const date = parseISO(dateStr);
  return format(date, 'PPP', { locale: getLocale(locale) });
};
```

### 避免时区问题

```typescript
// ❌ 错误 - 会有时区问题
new Date('2024-01-15');

// ✅ 正确 - 明确时区
parseISO('2024-01-15');
```

---

## 3. 内联编辑模式

### 编辑状态管理

```typescript
const [editingId, setEditingId] = useState<string | null>(null);
const [editingField, setEditingField] = useState<string | null>(null);

const startEditing = (id: string, field: string) => {
  setEditingId(id);
  setEditingField(field);
};

const stopEditing = () => {
  setEditingId(null);
  setEditingField(null);
};
```

### 内联编辑组件

```tsx
const InlineEdit: React.FC<Props> = ({ 
  value, 
  onSave, 
  onCancel,
  type = 'text' 
}) => {
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSave(localValue);
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <input
      ref={inputRef}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => onSave(localValue)}
    />
  );
};
```

---

## 4. Agent 开发规则

### i18n 规范

- **所有** 用户可见文字必须使用 `t()` 翻译函数
- Key 格式: `namespace.section.element`
- 占位符: `{name}` 格式

```typescript
// ✅ 正确
t('expenses.create.title')
t('common.save')
t('errors.network', { code: 500 })

// ❌ 错误
"Create Expense"
`Error: ${code}`
```

### 深色模式规范

- **禁止** 硬编码颜色: `#fff`, `#000`, `rgb()`, `rgba()`
- **必须** 使用 CSS 变量: `var(--color-*)`

```css
/* ❌ 错误 */
color: #ffffff;
background: rgb(26, 22, 37);

/* ✅ 正确 */
color: var(--text-primary);
background: var(--card-bg);
```

### Firebase 规范

- 开发时必须使用 Emulator
- 禁止直接编辑生产配置
- 保持免费层限制

---

## 5. 代码组织

### 目录结构

```
src/
├── components/          # React 组件
│   ├── common/         # 通用组件
│   ├── dashboard/      # 仪表板组件
│   ├── expenses/       # 支出组件
│   └── ...
├── contexts/           # React Context
├── hooks/              # 自定义 Hooks
├── services/           # 数据服务层
├── types/              # TypeScript 类型
├── utils/              # 工具函数
└── locales/            # 翻译文件
```

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 组件 | PascalCase | `ExpenseList.tsx` |
| Hook | camelCase, use前缀 | `useOptimisticCRUD.ts` |
| 服务 | camelCase, Service后缀 | `expenseService.ts` |
| 类型 | PascalCase | `Expense`, `Budget` |
| 常量 | UPPER_SNAKE_CASE | `MAX_FILE_SIZE` |

### 导入顺序

```typescript
// 1. React/外部库
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

// 2. 内部组件
import { Button } from '../common/Button';

// 3. Hooks/Context
import { useTranslation } from '../../hooks/useTranslation';

// 4. 服务/工具
import { expenseService } from '../../services/expenseService';

// 5. 类型
import type { Expense } from '../../types';

// 6. 样式
import './ExpenseList.css';
```

---

## 相关文件

### 核心代码

| 文件 | 说明 |
|------|------|
| `hooks/useOptimisticCRUD.ts` | 乐观更新 Hook |
| `contexts/NotificationContext.tsx` | 通知系统 |
| `utils/dateUtils.ts` | 日期工具 |
| `components/common/BaseForm.tsx` | 表单基础组件 |

---

*整合自: OPTIMISTIC_UPDATE_IMPLEMENTATION.md, DATE_HANDLING_REFACTORING.md, INLINE_EDITING_IMPLEMENTATION.md, EDITING_MODE_EXPLANATION.md, agent-priority-rules.md, MIGRATION_GUIDE.md*
