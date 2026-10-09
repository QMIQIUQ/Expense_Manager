# Project instructions

## Default branch and Firebase test deployment

- Unless the user requests a different destination, use `firebase-testing` as the default branch for project changes and push the task's finished commits to `origin/firebase-testing`. This branch triggers `.github/workflows/firebase-hosting-deploy.yml`.
- Keep production changes on `main` only when the user explicitly requests a production deployment. Do not push task changes to `main` by default.
- Before switching branches or pushing, preserve unrelated working-tree changes. Commit only changes for the current task; never include, reset, overwrite, or force-push unrelated user work. If the task cannot be placed on `firebase-testing` safely, explain the issue and ask before pushing.
- After pushing, check the Firebase Hosting workflow run. When deployment succeeds, give the user the deployed test site link: [Expense Manager Firebase test site](https://expense-manager-41afb.web.app/). If the workflow fails or has not completed, say so clearly and do not claim the site has been updated.
