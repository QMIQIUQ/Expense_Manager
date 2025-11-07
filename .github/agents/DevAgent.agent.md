---
# Agent 設定範本（放在 .github/agent-config.yaml 或 .copilot/agent-config.yaml）
agent:
  name: "expense-manager-i18n-agent"
  description: "協助檢查 PR 的 i18n/翻譯、遵循專案風格、Firebase 預設 free tier、以及自動執行 build 驗證的開發輔助 agent"
triggers:
  - on: pull_request
  - on: push
  - on: manual
i18n:
  detect_paths:
    - "src/locales"
    - "locales"
    - "i18n"
  file_extensions:
    - ".json"
    - ".yaml"
    - ".yml"
  translation_functions:
    - "t"
    - "translate"
  key_style: "namespace.section.element" # 範例命名慣例
  plural_support: true
  placeholder_style: "{name}" # 專案占位符風格
firebase:
  enforce_free_tier: true
  require_emulator_for_local: true
  disallowed_production_changes_in_pr: true
build:
  command: "npm run build"
  test_command: "npm test"
  lint_command: "npm run lint"
  require_success: true
reports:
  comment_on_pr: true
  create_check_run: true
  create_issue_on_blocker: true
permissions:
  read_repo: true
  write_repo: false # 預設不自動推送檔案或開 PR，需團隊允許可改為 true
  create_issues: true
notifications:
  mention_on_blocker: "@team-i18n"
  slack_channel: "#dev-i18n" # 可選
escalation:
  create_issue_if:
    build_fails: true
    firebase_requires_payment: true
  notify: "@repo-maintainers"
options:
  enable_machine_translation_suggestions: false
  auto_open_translation_pr_if_minor: false
  max_files_to_auto_patch: 5
notes: 
 - 若要開啟自動推 PR 功能，請將 permissions.write_repo 設為 true 並在此文件中註明審核者列表。
  - 請在 repo root 放置一份 i18n-style.md 描述命名慣例與占位符慣例以協助 agent 驗證。
---
Define what this custom agent accomplishes for the user, when to use it, and the edges it won't cross. Specify its ideal inputs/outputs, the tools it may call, and how it reports progress or asks for help.