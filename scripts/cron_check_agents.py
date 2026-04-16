#!/usr/bin/env python3
"""Hermes cron script — 檢查進行中的 agent 任務，stdout 注入 cron prompt"""
import json, subprocess, sys

OWNER = "QMIQIUQ"
REPO = "Expense_Manager"

def gh_api(ep):
    try:
        r = subprocess.run(["gh", "api", ep], capture_output=True, text=True, timeout=15)
        return json.loads(r.stdout) if r.returncode == 0 and r.stdout.strip() else None
    except Exception:
        return None

issues = gh_api(f"/repos/{OWNER}/{REPO}/issues?labels=cloud-agent&state=open&per_page=10")
if not issues:
    print("NO_ACTIVE_TASKS")
    sys.exit(0)

results = []
for issue in issues:
    num = issue["number"]
    entry = {
        "number": num, "title": issue["title"], "state": issue["state"],
        "labels": [l["name"] for l in issue.get("labels", [])],
        "updated_at": issue["updated_at"],
    }
    comments = gh_api(f"/repos/{OWNER}/{REPO}/issues/{num}/comments?per_page=3&direction=desc")
    if comments and isinstance(comments, list) and comments:
        last = comments[-1]
        entry["last_comment"] = {"user": last["user"]["login"], "body": (last.get("body") or "")[:200], "at": last["created_at"]}
    results.append(entry)

print(json.dumps(results, ensure_ascii=False, indent=2))
