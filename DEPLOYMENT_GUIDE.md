# Deployment Guide

This document explains the deployment configuration for the Expense Manager application.

## Deployment Targets

The application has two separate deployment targets:

### 1. GitHub Pages (Production)
- **Branch**: `main`
- **URL**: https://qmiqiuq.github.io/Expense_Manager/
- **Workflow**: `.github/workflows/deploy.yml`
- **Auto-deploy**: ✅ Enabled (triggers on push to `main` branch)

### 2. Firebase Hosting (Testing)
- **Branch**: `firebase-testing`
- **URL**: https://expense-manager-41afb.web.app/
- **Workflow**: `.github/workflows/firebase-hosting-deploy.yml`
- **Auto-deploy**: ✅ Enabled (triggers on push to `firebase-testing` branch)

### 3. Firebase Preview (Pull Requests)
- **Trigger**: Pull requests to `main` branch
- **Workflow**: `.github/workflows/preview-deploy.yml`
- **Auto-deploy**: ✅ Enabled (creates temporary preview URLs for PRs)

## How to Deploy

### Deploy to GitHub Pages (Production)
1. Push changes to the `main` branch:
   ```bash
   git push origin main
   ```
2. The workflow will automatically build and deploy to GitHub Pages
3. Check the deployment status in the "Actions" tab on GitHub

### Deploy to Firebase Hosting (Testing)
1. Push changes to the `firebase-testing` branch:
   ```bash
   # Create the branch if it doesn't exist
   git checkout -b firebase-testing
   
   # Or switch to it if it exists
   git checkout firebase-testing
   
   # Merge your changes
   git merge main
   
   # Push to trigger deployment
   git push origin firebase-testing
   ```
2. The workflow will automatically build and deploy to Firebase Hosting
3. Check the deployment status in the "Actions" tab on GitHub

### Deploy Preview (For Pull Requests)
1. Create a pull request to the `main` branch
2. The workflow will automatically create a preview deployment
3. A comment will be added to the PR with the preview URL
4. Preview deploys expire after 7 days

## Manual Deployment

All workflows can also be triggered manually:
1. Go to the "Actions" tab on GitHub
2. Select the workflow you want to run
3. Click "Run workflow"
4. Choose the branch and click "Run workflow"

## Environment Variables

All workflows use the following Firebase environment variables (configured as GitHub secrets):
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID` (preview deploy only)

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
- Verify the `firebase-testing` branch exists
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

**Fixed Issues** (2025-12-09):
1. ✅ Fixed GitHub Pages auto-deploy - changed trigger from `main1` to `main` branch
2. ✅ Separated Firebase deployment to `firebase-testing` branch to avoid conflicts with GitHub Pages
3. ✅ Removed environment protection specification to prevent deployment rejection errors
4. ✅ Both deployments now work independently without interfering with each other
