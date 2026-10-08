# Project instructions

## Required ChatGPT collaboration

For every task in this repository, use the [Codex with ChatGPT · Expense_Manager](plugin://dev-6ac7d0a2072c8191b3491e53ed81eef9@created-by-me-remote) plugin as part of the work:

1. At the start of the task, send the goal to the plugin and obtain its plan before making project changes.
2. Carry out the approved plan in the local workspace.
3. After making changes, ask the plugin to review the result and continue its review and revision loop until it reports completion or a blocker.

If the plugin is unavailable in the current session, pause project work and tell the user. Continue without it only if the user explicitly authorizes a fallback.

## Default branch and Firebase test deployment

- Unless the user requests a different destination, use `firebase-testing` as the default branch for project changes and push the task's finished commits to `origin/firebase-testing`. This branch triggers `.github/workflows/firebase-hosting-deploy.yml`.
- Keep production changes on `main` only when the user explicitly requests a production deployment. Do not push task changes to `main` by default.
- Before switching branches or pushing, preserve unrelated working-tree changes. Commit only changes for the current task; never include, reset, overwrite, or force-push unrelated user work. If the task cannot be placed on `firebase-testing` safely, explain the issue and ask before pushing.
- After pushing, check the Firebase Hosting workflow run. When deployment succeeds, give the user the deployed test site link: [Expense Manager Firebase test site](https://expense-manager-41afb.web.app/). If the workflow fails or has not completed, say so clearly and do not claim the site has been updated.
