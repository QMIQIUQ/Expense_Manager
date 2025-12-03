# Firebase Setup Guide

Firebase 配置、安全规则与部署指南。

---

## 目录

1. [项目配置](#1-项目配置)
2. [Firestore 安全规则](#2-firestore-安全规则)
3. [OAuth 设置](#3-oauth-设置)
4. [Emulator 使用](#4-emulator-使用)
5. [部署指南](#5-部署指南)

---

## 1. 项目配置

### 环境变量

在 `web/.env.local` 中配置：

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

### Firebase 初始化

```typescript
// src/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
```

---

## 2. Firestore 安全规则

### 基础规则

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 辅助函数
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    function isAdmin() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // 用户数据
    match /users/{userId} {
      allow read: if isAuthenticated() && (isOwner(userId) || isAdmin());
      allow create: if isAuthenticated() && isOwner(userId);
      allow update: if isAuthenticated() && isOwner(userId);
      allow delete: if isAuthenticated() && isAdmin();
    }

    // 支出
    match /expenses/{expenseId} {
      allow read: if isAuthenticated() && 
        (resource.data.userId == request.auth.uid || isAdmin());
      allow create: if isAuthenticated() && 
        request.resource.data.userId == request.auth.uid;
      allow update, delete: if isAuthenticated() && 
        (resource.data.userId == request.auth.uid || isAdmin());
    }

    // 收入
    match /incomes/{incomeId} {
      allow read: if isAuthenticated() && 
        (resource.data.userId == request.auth.uid || isAdmin());
      allow create: if isAuthenticated() && 
        request.resource.data.userId == request.auth.uid;
      allow update, delete: if isAuthenticated() && 
        (resource.data.userId == request.auth.uid || isAdmin());
    }

    // 分类
    match /categories/{categoryId} {
      allow read: if isAuthenticated() && 
        (resource.data.userId == request.auth.uid || isAdmin());
      allow create: if isAuthenticated() && 
        request.resource.data.userId == request.auth.uid;
      allow update, delete: if isAuthenticated() && 
        (resource.data.userId == request.auth.uid || isAdmin());
    }

    // 预算
    match /budgets/{budgetId} {
      allow read: if isAuthenticated() && 
        (resource.data.userId == request.auth.uid || isAdmin());
      allow create: if isAuthenticated() && 
        request.resource.data.userId == request.auth.uid;
      allow update, delete: if isAuthenticated() && 
        (resource.data.userId == request.auth.uid || isAdmin());
    }
  }
}
```

### 部署规则

```bash
firebase deploy --only firestore:rules
```

---

## 3. OAuth 设置

### Google OAuth 域名配置

1. 进入 Firebase Console → Authentication → Settings
2. 在 Authorized domains 添加你的域名
3. 确保 `localhost` 用于开发

### 常见错误

**错误**: `auth/unauthorized-domain`

**解决**:
1. 检查 Firebase Console 中的授权域名
2. 确保 `authDomain` 配置正确
3. 清除浏览器缓存

---

## 4. Emulator 使用

### 安装

```bash
npm install -g firebase-tools
firebase init emulators
```

### 启动

```bash
firebase emulators:start
```

### 配置应用使用 Emulator

```typescript
import { connectFirestoreEmulator } from 'firebase/firestore';
import { connectAuthEmulator } from 'firebase/auth';

if (import.meta.env.DEV) {
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectAuthEmulator(auth, 'http://localhost:9099');
}
```

### Emulator 端口

| 服务 | 端口 |
|------|------|
| Auth | 9099 |
| Firestore | 8080 |
| UI | 4000 |

---

## 5. 部署指南

### 首次部署

```bash
# 登录
firebase login

# 初始化项目
firebase init

# 选择:
# - Firestore
# - Hosting
# - Emulators (可选)

# 构建应用
cd web && npm run build

# 部署
firebase deploy
```

### 仅部署 Hosting

```bash
firebase deploy --only hosting
```

### 仅部署规则

```bash
firebase deploy --only firestore:rules
```

---

## 免费层限制

⚠️ 保持在 Firebase 免费层 (Spark Plan) 限制内：

| 资源 | 限制 |
|------|------|
| Firestore 读取 | 50,000 次/天 |
| Firestore 写入 | 20,000 次/天 |
| Firestore 删除 | 20,000 次/天 |
| Firestore 存储 | 1 GB |
| Hosting 存储 | 10 GB |
| Hosting 传输 | 360 MB/天 |
| Auth 用户 | 无限 |

---

## 安全检查清单

- [ ] 所有集合都有安全规则
- [ ] 用户只能访问自己的数据
- [ ] 管理员功能有额外验证
- [ ] 敏感操作有速率限制
- [ ] 生产环境禁用 Emulator 连接
- [ ] API 密钥不在代码中暴露

---

*整合自: DEPLOY_FIRESTORE_RULES.md, FIREBASE_DOMAIN_SETUP.md, FIREBASE_OAUTH_FIX.md, SECURITY_SUMMARY.md, SECURITY_SUMMARY_UI_CHANGES.md*
