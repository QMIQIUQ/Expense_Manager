# Admin Guide

管理员功能与用户管理指南。

---

## 目录

1. [管理员设置](#1-管理员设置)
2. [用户管理](#2-用户管理)
3. [权限系统](#3-权限系统)
4. [管理面板](#4-管理面板)

---

## 1. 管理员设置

### 创建管理员账户

1. 正常注册账户
2. 在 Firebase Console 中找到用户
3. 手动修改 `users/{userId}` 文档
4. 设置 `role: 'admin'`

### Firestore 用户文档

```javascript
// users/{userId}
{
  email: "admin@example.com",
  displayName: "Admin User",
  role: "admin",  // "admin" 或 "user"
  createdAt: Timestamp,
  lastLogin: Timestamp
}
```

---

## 2. 用户管理

### 功能

- ✅ 查看所有用户列表
- ✅ 查看用户详情
- ✅ 编辑用户信息
- ✅ 删除用户账户
- ✅ 修改用户角色

### 用户列表页面

```
汉堡菜单 → Admin → Users
```

### 用户信息

| 字段 | 说明 |
|------|------|
| Email | 登录邮箱 |
| Display Name | 显示名称 |
| Role | 角色 (admin/user) |
| Created At | 注册时间 |
| Last Login | 最后登录时间 |

---

## 3. 权限系统

### 角色

| 角色 | 权限 |
|------|------|
| `user` | 只能访问自己的数据 |
| `admin` | 可以访问所有用户数据 |

### 前端权限检查

```typescript
import { useAuth } from '../contexts/AuthContext';

const { user, isAdmin } = useAuth();

// 检查是否为管理员
if (isAdmin) {
  // 显示管理功能
}
```

### 后端权限检查 (Firestore Rules)

```javascript
function isAdmin() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}

// 只有管理员可以删除用户
match /users/{userId} {
  allow delete: if isAuthenticated() && isAdmin();
}
```

---

## 4. 管理面板

### 访问路径

```
汉堡菜单 → Admin
```

**注意**: Admin 选项只对管理员可见。

### 面板功能

| 功能 | 说明 |
|------|------|
| 用户管理 | 查看/编辑/删除用户 |
| 数据统计 | 查看系统统计信息 |
| 导出数据 | 导出所有用户数据 |

### UI 位置

管理员入口已从标签栏移至汉堡菜单，以保持界面整洁。

```
┌────────────────────────────────────────────┐
│ Language / 語言        ▶                  │
│ Appearance              ▶                  │
│ Features                ▶                  │
│ Import / Export         ▶                  │
│ ─────────────────────────────────          │
│ Profile                                     │
│ Admin                   ← 管理员可见       │
│ ─────────────────────────────────          │
│ Logout                                      │
└────────────────────────────────────────────┘
```

---

## 安全注意事项

### ✅ 要做

1. 定期审计管理员列表
2. 使用强密码
3. 启用两步验证 (如可用)
4. 记录管理员操作日志

### ❌ 不要做

1. 不要有太多管理员
2. 不要共享管理员账户
3. 不要在不安全网络登录管理账户

---

*整合自: ADMIN_IMPLEMENTATION_SUMMARY.md, ADMIN_SETUP.md, IMPLEMENTATION_SUMMARY_USER_MANAGEMENT.md, USER_MANAGEMENT_FEATURES.md*
