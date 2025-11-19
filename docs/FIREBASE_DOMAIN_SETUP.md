# Firebase OAuth 授权域名配置

## 问题说明

当应用部署到 GitHub Pages 后，会出现以下错误：

```
Info: The current domain is not authorized for OAuth operations. 
This will prevent signInWithPopup, signInWithRedirect, linkWithPopup and linkWithRedirect from working. 
Add your domain (qmiqiuq.github.io) to the OAuth redirect domains list in the Firebase console.
```

这是因为 Firebase 默认只授权 `localhost` 和你的 Firebase 项目域名。当你部署到自定义域名时，需要手动添加授权。

## 解决步骤

### 1. 打开 Firebase Console

访问：[Firebase Console](https://console.firebase.google.com/)

### 2. 选择你的项目

选择 **expense-manager-41afb** 项目

### 3. 进入 Authentication 设置

1. 在左侧菜单中，点击 **Authentication**（身份验证）
2. 点击顶部的 **Settings** 标签
3. 向下滚动到 **Authorized domains**（授权域名）部分

### 4. 添加 GitHub Pages 域名

点击 **Add domain** 按钮，然后添加以下域名：

```
qmiqiuq.github.io
```

### 5. 保存并等待

- 点击 **Add** 保存
- 更改通常会立即生效，但可能需要几分钟传播

## 已授权的域名列表

配置完成后，你应该有以下授权域名：

1. `localhost` - 本地开发
2. `expense-manager-41afb.firebaseapp.com` - Firebase 默认域名
3. `qmiqiuq.github.io` - GitHub Pages 部署域名

## 验证配置

1. 清除浏览器缓存
2. 重新访问 https://qmiqiuq.github.io/Expense_Manager/
3. 尝试使用 Google 登录
4. 控制台中不应再出现授权域名警告

## 注意事项

### 如果使用自定义域名

如果你为 GitHub Pages 配置了自定义域名（如 `www.example.com`），也需要添加：
- `www.example.com`
- `example.com`

### HTTPS 要求

- GitHub Pages 自动提供 HTTPS
- Firebase OAuth 要求使用 HTTPS（除了 localhost）
- 确保你的域名使用 HTTPS 访问

### 多个环境

如果有多个部署环境（开发、测试、生产），需要为每个域名都添加授权：

**开发环境：**
- `localhost`
- `127.0.0.1`

**预览/测试环境：**
- 如果使用 Netlify/Vercel 预览：添加预览域名
- 如果使用 Firebase Hosting 预览：添加预览 URL

**生产环境：**
- `qmiqiuq.github.io`
- 任何自定义域名

## 其他 OAuth 提供商配置

### Google Sign-In

Google OAuth 已在你的项目中配置，但如果遇到问题：

1. 在 Firebase Console → Authentication → Sign-in method
2. 确保 Google 提供商已启用
3. 检查授权域名是否正确配置

### 其他提供商（可选）

如果将来添加其他 OAuth 提供商（Facebook, Twitter, GitHub 等）：

1. 每个提供商都需要在其开发者控制台配置回调 URL
2. 回调 URL 通常是：`https://expense-manager-41afb.firebaseapp.com/__/auth/handler`
3. 同时确保域名在 Firebase 授权列表中

## 故障排除

### 问题：添加域名后仍然报错

**解决方案：**
1. 清除浏览器缓存和 cookies
2. 使用无痕/隐私模式测试
3. 检查域名拼写是否正确（不要包含 `https://` 或路径）
4. 等待 5-10 分钟让更改传播

### 问题：localhost 登录正常，但生产环境失败

**解决方案：**
1. 确认已添加生产域名到授权列表
2. 检查生产环境的 `.env` 配置是否正确
3. 确认使用 HTTPS 访问生产站点

### 问题：子路径部署（/Expense_Manager/）

GitHub Pages 项目页面使用子路径（如 `/Expense_Manager/`）：
- 只需添加域名 `qmiqiuq.github.io`
- **不需要**包含路径部分
- Firebase OAuth 自动处理子路径

## 快速配置清单

- [ ] 打开 [Firebase Console](https://console.firebase.google.com/)
- [ ] 选择项目：expense-manager-41afb
- [ ] 进入 Authentication → Settings
- [ ] 找到 Authorized domains 部分
- [ ] 点击 Add domain
- [ ] 输入：`qmiqiuq.github.io`
- [ ] 保存更改
- [ ] 清除浏览器缓存
- [ ] 测试 Google 登录功能

## 相关文档

- [Firebase Authentication 文档](https://firebase.google.com/docs/auth/web/start)
- [授权域名配置](https://firebase.google.com/docs/auth/web/redirect-best-practices)
- [GitHub Pages 自定义域名](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)

---

**配置完成后，你的应用就可以在 GitHub Pages 上正常使用 Google OAuth 登录了！** 🎉
