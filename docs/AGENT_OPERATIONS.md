# GitHub Cloud Agent Operations for Expense_Manager

This repo now has a minimal bridge for chat-driven GitHub cloud-agent work.

## What exists
- `.github/agents/my-agent.agent.md`
- `.github/agents/UXUI.agent.md`
- `.github/agents/DevAgent.agent.md`
- `.github/workflows/copilot-agent-bridge.yml`
- `.github/ISSUE_TEMPLATE/agent_task.yml`
- `.github/pull_request_template.md`
- `.github/agent-config.yaml`

## Supported agent names
- `my-agent` — backend / service implementation
- `uxui-agent` — UI / UX and component work
- `expense-manager-i18n-agent` — review / build / Firebase guardrails

## Recommended first-version flow
1. User requests a change in chat.
2. Chat/orchestrator calls the bridge workflow with `workflow_dispatch` or `repository_dispatch`.
3. The bridge workflow can also react to a newly opened GitHub issue.
4. The bridge creates or updates a task issue and labels it for cloud-agent routing.
5. The workflow posts a standardized `@copilot`-style comment that points at the correct custom agent file.
6. A GitHub cloud agent or reviewer can take the issue/PR from there.
7. When a PR exists, the normal preview and deploy workflows continue to work.
8. Chat/orchestrator can re-run the bridge in `report` mode to summarize issue/PR state back into chat without opening GitHub.
9. If needed, the bridge can also read the latest comments and changed-file count for a quick status snapshot.

## Trigger examples

### From GitHub CLI
```bash
gh workflow run copilot-agent-bridge.yml \
  -f action=prepare \
  -f agent=my-agent \
  -f title='Add voice expense flow' \
  -f body='Parse voice text into an expense, confirm it, and write it to Firestore.'
```

### From GitHub CLI, read back a result snapshot
```bash
gh workflow run copilot-agent-bridge.yml \
  -f action=report \
  -f agent=my-agent \
  -f issue_number=123
```

### From GitHub API / external service
```bash
POST /repos/QMIQIUQ/Expense_Manager/dispatches
{
  "event_type": "cloud_agent_request",
  "client_payload": {
    "action": "prepare",
    "agent": "uxui-agent",
    "title": "Add voice capture button",
    "body": "Build a mobile-friendly voice button and confirmation sheet."
  }
}
```

## Reading results back in chat
Use one or more of these sources:
- PR body and comments
- workflow step summary
- issue comments
- preview deployment URL
- GitHub Actions logs
- bridge `report` mode output

## Branch / PR conventions
- Feature branches: `copilot/<short-task-name>` or `feature/<short-task-name>`
- PRs should fill `.github/pull_request_template.md`
- If UI changed, include a preview URL
- If Firebase changed, include rule / emulator notes

## Safety rules
- Do not auto-merge until build/test/lint are green.
- Do not expose secrets in comments or logs.
- Keep the bridge label `copilot-ready` on tasks that should be visible to cloud agents.
- Prefer issue-based tracking for long-running work.
