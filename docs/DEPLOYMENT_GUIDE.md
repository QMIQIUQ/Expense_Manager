# Deployment Guide

This document explains the deployment configuration for the Expense Manager application.

## Deployment Targets

The application has production and preview deployments. GitHub Pages and Firebase live hosting are both triggered by `main`; `firebase-testing` uses a temporary Firebase Hosting preview channel.

### 1. GitHub Pages (Production)
- **Branch**: `main`
- **URL**: https://qmiqiuq.github.io/Expense_Manager/
- **Workflow**: `.github/workflows/deploy.yml`
- **Auto-deploy**: ✅ Enabled (triggers on push to `main` branch)

### 2. Firebase Hosting (Live and Testing Preview)
- **Workflow**: `.github/workflows/firebase-hosting-deploy.yml`
- **Production branch / channel**: `main` → `live`
- **Production URL**: https://expense-manager-41afb.web.app/
- **Testing branch / channel**: `firebase-testing` → `compact-navigation-v2`
- **Testing URL**: use the action's `channel_url` shown in the workflow run summary; this URL is temporary and expires after 7 days
- **Auto-deploy**: ✅ Enabled (triggers on push to `main` or `firebase-testing`)

The Firebase Hosting preview channel changes the deployed frontend only. Both `main` and `firebase-testing` builds use the configured Firebase project and backend; a preview is not an isolated database.

### 3. Firebase Preview (Pull Requests)
- **Trigger**: Pull requests to `main` branch
- **Workflow**: `.github/workflows/preview-deploy.yml`
- **Auto-deploy**: ✅ Enabled (creates temporary preview URLs for PRs)

## How to Deploy

### Deploy production (`main`)
1. Push reviewed changes to the `main` branch:
   ```bash
   git push origin main
   ```
2. `.github/workflows/deploy.yml` deploys GitHub Pages, and `.github/workflows/firebase-hosting-deploy.yml` deploys Firebase Hosting to `live`.
3. Check both workflow runs in the GitHub "Actions" tab. Firebase's visitor-facing production URL is https://expense-manager-41afb.web.app/.

### Deploy a Firebase UI preview (`firebase-testing`)
1. Push the reviewed changes to `firebase-testing`:
   ```bash
   git push origin firebase-testing
   ```
2. The shared Firebase workflow deploys to the `compact-navigation-v2` preview channel for seven days; it does not deploy to `live`.
3. Open the workflow run summary and use its **Website URL** (`channel_url`) to visit the preview. Do not use the production `web.app` URL to identify the preview.
4. Remember that this preview uses the configured Firebase backend shared with production. Avoid test actions that would create, alter, or delete real user records.

### Deploy Preview (For Pull Requests)
1. Create a pull request to the `main` branch
2. The workflow will automatically create a preview deployment
3. A comment will be added to the PR with the preview URL
4. Preview deploys expire after 7 days

## Manual Deployment

GitHub Pages can also be triggered manually:
1. Go to the "Actions" tab on GitHub
2. Select "Deploy web to GitHub Pages"
3. Click "Run workflow"
4. Choose `main` and click "Run workflow". Firebase Hosting is push-triggered by the shared Firebase workflow; PR previews are triggered by pull requests to `main`.

## Environment Variables

Firebase Hosting builds use the following environment variables (configured as GitHub secrets). GitHub Pages uses the Firebase app configuration values needed by its build, but does not deploy to Firebase:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID` (Firebase PR preview workflow only)

Additional secrets:
- `FIREBASE_SERVICE_ACCOUNT` - Required for Firebase deployments
- `GITHUB_TOKEN` - Automatically provided by GitHub Actions

## Troubleshooting

### GitHub Pages not deploying
- Verify the `main` branch exists and has the latest changes
- Check the "Actions" tab for workflow errors
- Ensure GitHub Pages is enabled in repository settings
- Verify the `deploy.yml` workflow is configured correctly
- If you see "Branch is not allowed to deploy" error, check that environment protection rules in repository settings don't restrict the deployment branch

### Firebase not deploying
- Verify the expected source branch exists (`main` for live or `firebase-testing` for the temporary channel)
- Check that `FIREBASE_SERVICE_ACCOUNT` secret is configured
- Ensure Firebase project ID is correct in the workflow file
- Check the "Actions" tab for deployment errors

### Permission errors
- GitHub Pages deployment requires:
  - `contents: read`
  - `pages: write`
  - `id-token: write`
- Firebase deployment requires:
  - `contents: read`
  - Valid Firebase service account credentials

## Recent Changes

**Deployment routing verified** (2026-10-09):
- `main` deploys GitHub Pages and Firebase Hosting `live`.
- `firebase-testing` deploys Firebase Hosting `compact-navigation-v2` with a 7-day expiry.
- Pull requests targeting `main` use the Firebase PR preview workflow.
- The Firebase action summary separates the visitor-facing Website URL from the Firebase Console details link.
