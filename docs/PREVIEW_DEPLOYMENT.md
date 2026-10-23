# Preview Deployment Guide (预览部署指南)

## Overview (概述)

This project supports preview deployments for feature branches, allowing you to test changes without affecting the production deployment.

本项目支持功能分支的预览部署，允许您在不影响生产部署的情况下测试更改。

## How It Works (工作原理)

### Deployment Environments (部署环境)

1. **Production (生产环境)**
   - Branch: `main1`
   - Deployment: GitHub Pages
   - URL: `https://qmiqiuq.github.io/Expense_Manager/`
   - Workflow: `.github/workflows/deploy.yml`

2. **Live Firebase (实时 Firebase)**
   - Branch: `main`
   - Deployment: Firebase Hosting (live channel)
   - URL: Your Firebase hosting URL
   - Workflow: `.github/workflows/firebase-hosting-deploy.yml`

3. **Preview (预览环境)** ⭐
   - Branches: `copilot/**`, `feature/**`, or any pull request
   - Deployment: Firebase Hosting (preview channels)
   - URL: Unique preview URL generated for each branch
   - Workflow: `.github/workflows/preview-deploy.yml`
   - Expires: 7 days after last update

## Using Preview Deployments (使用预览部署)

### For the Current PWA Branch (当前 PWA 分支)

The `copilot/add-pwa-support` branch will automatically deploy to a preview channel when you push changes.

当您推送更改时，`copilot/add-pwa-support` 分支将自动部署到预览频道。

**Steps (步骤):**

1. **Trigger Deployment (触发部署)**
   ```bash
   # The workflow runs automatically on push
   # Or manually trigger from GitHub Actions tab
   git push origin copilot/add-pwa-support
   ```

2. **View Deployment Status (查看部署状态)**
   - Go to: https://github.com/QMIQIUQ/Expense_Manager/actions
   - Click on "Firebase Hosting — Preview Deploy"
   - Find the latest workflow run for your branch

3. **Get Preview URL (获取预览 URL)**
   - The preview URL will be displayed in the workflow logs
   - Look for the Firebase action output in the "Deploy to Firebase Preview Channel" step
   - URL format: `https://expense-manager-41afb--pr-<number>-<hash>.web.app`
   - If this is a pull request, the URL will also be posted as a comment on the PR

4. **Test Your Changes (测试更改)**
   - Open the preview URL in your browser
   - Test all PWA features (install, offline, etc.)
   - Each preview URL is isolated from production

### For Pull Requests (拉取请求)

When you create a pull request to `main`, a preview deployment is automatically created and the URL is commented on the PR.

当您创建到 `main` 的拉取请求时，将自动创建预览部署，并在 PR 上评论 URL。

## Manual Trigger (手动触发)

You can manually trigger a preview deployment from the GitHub Actions tab:

您可以从 GitHub Actions 标签手动触发预览部署：

1. Go to: https://github.com/QMIQIUQ/Expense_Manager/actions
2. Select "Firebase Hosting — Preview Deploy" workflow
3. Click "Run workflow"
4. Select your branch
5. Click "Run workflow" button

## Preview URL Expiration (预览 URL 过期)

Preview deployments expire after 7 days of the last update. This helps keep Firebase hosting costs down.

预览部署在最后一次更新后 7 天过期。这有助于降低 Firebase 托管成本。

- **Expiration**: 7 days after last deployment
- **Re-deployment**: Push new changes or manually trigger workflow
- **Clean up**: Expired previews are automatically removed

## Troubleshooting (故障排除)

### Preview Deployment Not Starting (预览部署未启动)

**Check:**
- Ensure your branch name matches the pattern: `copilot/**` or `feature/**`
- Verify Firebase secrets are configured in repository settings:
  - `FIREBASE_SERVICE_ACCOUNT` (required for Firebase GitHub Action)
  - All VITE_FIREBASE_* secrets for build
- Check GitHub Actions is enabled for the repository
- Ensure Node.js 24.x is being used for the web build (`.nvmrc`); Cloud Functions remain on Node.js 22

### Preview URL Not Working (预览 URL 不工作)

**Check:**
- Wait for deployment to complete (usually 2-5 minutes)
- Check workflow logs for errors
- Verify Firebase project has hosting enabled
- Ensure preview hasn't expired (7 days)

### Need to Test on a Different Branch (需要在不同分支上测试)

**Option 1: Rename branch to match pattern**
```bash
git checkout -b copilot/my-feature
git push origin copilot/my-feature
```

**Option 2: Manually trigger workflow**
- Use workflow_dispatch as described above
- Select any branch

## Firebase Preview Channels (Firebase 预览频道)

Preview channels are temporary hosting URLs that allow you to share your changes:

预览频道是临时托管 URL，允许您共享更改：

### Benefits (优势)
- ✅ Isolated from production
- ✅ Unique URL for each branch/PR
- ✅ Automatic deployment on push
- ✅ Easy sharing for testing
- ✅ No impact on main deployment
- ✅ Automatic cleanup after 7 days

### Limitations (限制)
- ⚠️ Expires after 7 days
- ⚠️ Requires Firebase service account secret
- ⚠️ Limited to Firebase hosting features

## Testing PWA on Preview (在预览上测试 PWA)

The preview deployment includes all PWA features:

预览部署包含所有 PWA 功能：

1. **Service Worker**: Fully functional
2. **Offline Support**: Works as expected
3. **Install Prompt**: Available (HTTPS enabled)
4. **Caching**: All strategies active
5. **Manifest**: Properly configured

**Important**: Firebase hosting provides HTTPS by default, so PWA features work perfectly on preview URLs.

重要提示：Firebase 托管默认提供 HTTPS，因此 PWA 功能在预览 URL 上完美运行。

## Cost Considerations (成本考虑)

Firebase offers generous free tier for preview channels:

Firebase 为预览频道提供慷慨的免费套餐：

- **Free Tier**: 10 GB/month bandwidth
- **Preview Channels**: Count toward hosting quota
- **Auto-expiration**: Helps manage costs
- **Recommendation**: Delete old previews if needed

## Related Documentation (相关文档)

- [PWA_GUIDE.md](./PWA_GUIDE.md) - PWA features and testing
- [PWA_TESTING.md](./PWA_TESTING.md) - Testing procedures
- [Firebase Hosting Docs](https://firebase.google.com/docs/hosting/test-preview-deploy)

## Example Workflow (示例工作流程)

```bash
# 1. Create or checkout your feature branch
git checkout copilot/add-pwa-support

# 2. Make changes and commit
git add .
git commit -m "Add PWA features"

# 3. Push to trigger preview deployment
git push origin copilot/add-pwa-support

# 4. Wait 2-5 minutes for deployment

# 5. Check GitHub Actions for preview URL
# Visit: https://github.com/QMIQIUQ/Expense_Manager/actions

# 6. Open preview URL and test

# 7. Share URL with team for feedback
```

## Questions? (问题?)

If you need help with preview deployments, check:

如果您需要预览部署方面的帮助，请检查：

1. GitHub Actions logs for detailed error messages
2. Firebase console for deployment status
3. Repository secrets configuration
4. Branch name matches pattern

---

**Happy Testing! (祝测试愉快!)** 🚀
