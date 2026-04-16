#!/usr/bin/env python3
"""
GitHub Agent Monitor — 查詢 Copilot cloud agent 任務狀態
用法:
  python3 agent_monitor.py status [issue_number]   # 查單一 issue/PR 狀態
  python3 agent_monitor.py active                   # 列出所有進行中的 agent 任務
  python3 agent_monitor.py trigger <title> [body] [agent]  # 觸發新任務
  python3 agent_monitor.py poll <issue_number> [interval_sec]  # 持續輪詢直到完成
"""
import json, os, sys, time, subprocess, re
from urllib.request import Request, urlopen
from urllib.error import HTTPError

OWNER = "QMIQIUQ"
REPO = "Expense_Manager"
API = f"https://api.github.com/repos/{OWNER}/{REPO}"

def get_token():
    # Try gh auth first, fallback to git-credentials
    try:
        r = subprocess.run(["gh", "auth", "token"], capture_output=True, text=True, timeout=5)
        if r.returncode == 0 and r.stdout.strip():
            return r.stdout.strip()
    except Exception:
        pass
    cred_path = os.path.expanduser("~/.git-credentials")
    if os.path.exists(cred_path):
        with open(cred_path) as f:
            for line in f:
                m = re.search(r":([^@]+)@github\.com", line)
                if m:
                    return m.group(1)
    raise RuntimeError("No GitHub token found")

TOKEN = get_token()
HEADERS = {
    "Authorization": f"token {TOKEN}",
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
}

def api(path, method="GET", data=None):
    url = path if path.startswith("http") else f"{API}{path}"
    body = json.dumps(data).encode() if data else None
    req = Request(url, data=body, headers=HEADERS, method=method)
    if body:
        req.add_header("Content-Type", "application/json")
    try:
        with urlopen(req, timeout=30) as resp:
            return json.loads(resp.read())
    except HTTPError as e:
        err = e.read().decode()
        print(f"API error {e.code}: {err[:300]}", file=sys.stderr)
        raise

def get_issue_status(issue_num):
    """Get comprehensive status of an issue/PR."""
    issue = api(f"/issues/{issue_num}")
    is_pr = bool(issue.get("pull_request"))

    result = {
        "number": issue_num,
        "title": issue["title"],
        "state": issue["state"],
        "is_pr": is_pr,
        "labels": [l["name"] for l in issue.get("labels", [])],
        "created_at": issue["created_at"],
        "updated_at": issue["updated_at"],
        "user": issue["user"]["login"],
    }

    # Get comments (last 10)
    comments = api(f"/issues/{issue_num}/comments?per_page=10&direction=desc")
    result["recent_comments"] = [
        {
            "user": c["user"]["login"],
            "body": c["body"][:300] if c["body"] else "",
            "created_at": c["created_at"],
        }
        for c in comments[-5:]
    ]

    # If PR, get extra info
    if is_pr:
        pr = api(f"/pulls/{issue_num}")
        result["pr"] = {
            "state": pr["state"],
            "draft": pr.get("draft", False),
            "mergeable": pr.get("mergeable"),
            "head": pr["head"]["ref"],
            "base": pr["base"]["ref"],
            "changed_files": pr.get("changed_files", 0),
            "additions": pr.get("additions", 0),
            "deletions": pr.get("deletions", 0),
        }

    # Check linked PRs via timeline events
    try:
        events = api(f"/issues/{issue_num}/timeline?per_page=50")
        linked_prs = []
        for ev in events:
            if ev.get("event") == "cross-referenced" and ev.get("source", {}).get("issue", {}).get("pull_request"):
                pr_num = ev["source"]["issue"]["number"]
                pr_title = ev["source"]["issue"]["title"]
                pr_state = ev["source"]["issue"]["state"]
                linked_prs.append({"number": pr_num, "title": pr_title, "state": pr_state})
        result["linked_prs"] = linked_prs
    except Exception:
        result["linked_prs"] = []

    # Check recent workflow runs
    try:
        runs = api(f"/actions/runs?per_page=5")
        result["recent_runs"] = [
            {
                "id": r["id"],
                "name": r["name"],
                "status": r["status"],
                "conclusion": r.get("conclusion"),
                "created_at": r["created_at"],
            }
            for r in runs.get("workflow_runs", [])[:3]
        ]
    except Exception:
        result["recent_runs"] = []

    return result

def detect_completion(status):
    """Determine if an agent task is 'done'."""
    # Done conditions:
    # 1. Issue closed
    if status["state"] == "closed":
        return True, "Issue closed"
    # 2. Linked PR merged
    for pr in status.get("linked_prs", []):
        if pr["state"] == "closed":
            return True, f"Linked PR #{pr['number']} closed/merged"
    # 3. PR merged
    if status.get("is_pr") and status.get("pr", {}).get("state") == "closed":
        return True, "PR closed/merged"
    return False, None

def format_status(status, verbose=False):
    """Pretty print status."""
    lines = []
    kind = "PR" if status["is_pr"] else "Issue"
    lines.append(f"📋 #{status['number']} — {status['title']}")
    lines.append(f"   類型: {kind} | 狀態: {status['state']}")
    lines.append(f"   標籤: {', '.join(status['labels']) or 'none'}")
    lines.append(f"   更新: {status['updated_at']}")

    if status.get("pr"):
        p = status["pr"]
        lines.append(f"   PR: {p['head']}→{p['base']} | +{p['additions']}/-{p['deletions']} ({p['changed_files']} files)")
        if p["draft"]:
            lines.append("   ⚠️ Draft PR")

    if status.get("linked_prs"):
        for pr in status["linked_prs"]:
            lines.append(f"   🔗 PR #{pr['number']}: {pr['title']} [{pr['state']}]")

    if verbose and status.get("recent_comments"):
        lines.append("   💬 最近留言:")
        for c in status["recent_comments"][-3:]:
            body_preview = c["body"].replace("\n", " ")[:120]
            lines.append(f"      - {c['user']}: {body_preview}")

    done, reason = detect_completion(status)
    if done:
        lines.append(f"   ✅ 已完成: {reason}")
    else:
        lines.append("   ⏳ 進行中")

    return "\n".join(lines)

def cmd_status(issue_num):
    status = get_issue_status(int(issue_num))
    print(format_status(status, verbose=True))

def cmd_active():
    """List all open issues with agent labels."""
    issues = api("/issues?labels=cloud-agent&state=open&per_page=20")
    if not issues:
        print("沒有進行中的 agent 任務")
        return
    for issue in issues:
        status = {
            "number": issue["number"],
            "title": issue["title"],
            "state": issue["state"],
            "is_pr": bool(issue.get("pull_request")),
            "labels": [l["name"] for l in issue.get("labels", [])],
            "updated_at": issue["updated_at"],
            "linked_prs": [],
            "recent_comments": [],
        }
        print(format_status(status))
        print()

def cmd_trigger(title, body="", agent="my-agent"):
    """Trigger a new agent task via repository_dispatch."""
    payload = {
        "event_type": "cloud_agent_request",
        "client_payload": {
            "action": "prepare",
            "agent": agent,
            "title": title,
            "body": body or title,
        }
    }
    api("/dispatches", method="POST", data=payload)
    print(f"✅ 已觸發 agent 任務: {title}")
    print(f"   Agent: {agent}")
    print("   等待 workflow 建立 issue...")
    # Wait a bit and find the new issue
    time.sleep(8)
    issues = api(f"/issues?labels=cloud-agent&state=open&sort=created&direction=desc&per_page=3")
    for issue in issues:
        if title.lower() in issue["title"].lower():
            print(f"   → Issue #{issue['number']}: {issue['title']}")
            return issue["number"]
    if issues:
        print(f"   → 最新 Issue #{issues[0]['number']}: {issues[0]['title']}")
        return issues[0]["number"]
    return None

def cmd_poll(issue_num, interval=120):
    """Poll an issue until completion."""
    issue_num = int(issue_num)
    interval = int(interval)
    print(f"🔄 開始監控 #{issue_num}，每 {interval} 秒檢查一次...")
    last_update = None
    while True:
        try:
            status = get_issue_status(issue_num)
            current_update = status["updated_at"]

            if current_update != last_update:
                print(f"\n[{time.strftime('%H:%M:%S')}] 狀態更新:")
                print(format_status(status, verbose=True))
                last_update = current_update

            done, reason = detect_completion(status)
            if done:
                print(f"\n🎉 任務完成: {reason}")
                return status
        except Exception as e:
            print(f"⚠️ 查詢失敗: {e}", file=sys.stderr)

        time.sleep(interval)

# --- JSON output for cron/Hermes integration ---
def cmd_check_json(issue_num):
    """Output JSON status for cron scripts."""
    status = get_issue_status(int(issue_num))
    done, reason = detect_completion(status)
    output = {
        "number": status["number"],
        "title": status["title"],
        "state": status["state"],
        "done": done,
        "reason": reason,
        "labels": status["labels"],
        "linked_prs": status.get("linked_prs", []),
        "last_comment": status["recent_comments"][-1] if status.get("recent_comments") else None,
        "updated_at": status["updated_at"],
    }
    print(json.dumps(output, ensure_ascii=False))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    cmd = sys.argv[1]
    args = sys.argv[2:]

    if cmd == "status" and args:
        cmd_status(args[0])
    elif cmd == "active":
        cmd_active()
    elif cmd == "trigger" and args:
        num = cmd_trigger(args[0], args[1] if len(args) > 1 else "", args[2] if len(args) > 2 else "my-agent")
        if num and "--poll" in args:
            cmd_poll(num)
    elif cmd == "poll" and args:
        cmd_poll(args[0], args[1] if len(args) > 1 else 120)
    elif cmd == "check" and args:
        cmd_check_json(args[0])
    else:
        print(__doc__)
        sys.exit(1)
