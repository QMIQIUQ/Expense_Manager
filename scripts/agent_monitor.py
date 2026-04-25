#!/usr/bin/env python3
"""
GitHub Agent Monitor — 用 gh CLI 查詢 Copilot cloud agent 任務狀態
用法:
  python3 agent_monitor.py status <issue_number>    # 查單一 issue/PR 狀態
  python3 agent_monitor.py active                    # 列出所有進行中的 agent 任務
  python3 agent_monitor.py trigger <title> [body] [agent]  # 觸發新任務
  python3 agent_monitor.py poll <issue_number> [interval]  # 持續輪詢直到完成
  python3 agent_monitor.py check <issue_number>      # JSON output for cron
"""
import json, os, sys, time, subprocess

OWNER = "QMIQIUQ"
REPO = "Expense_Manager"

def gh_api(endpoint, method="GET", data=None):
    """Call GitHub API via gh CLI — avoids urllib connection issues on Termux."""
    cmd = ["gh", "api", endpoint, "--method", method]
    if data:
        cmd.extend(["--input", "-"])
    try:
        r = subprocess.run(
            cmd,
            capture_output=True, text=True, timeout=15,
            input=json.dumps(data) if data else None,
        )
        if r.returncode != 0:
            # 204 No Content returns empty
            if not r.stdout.strip():
                return {}
            print(f"gh api error: {r.stderr[:200]}", file=sys.stderr)
            return {}
        if not r.stdout.strip():
            return {}
        return json.loads(r.stdout)
    except subprocess.TimeoutExpired:
        print(f"gh api timeout: {endpoint}", file=sys.stderr)
        return {}
    except json.JSONDecodeError:
        return {}

def api(path):
    ep = f"/repos/{OWNER}/{REPO}{path}" if not path.startswith("/repos") else path
    return gh_api(ep)

def api_post(path, data):
    ep = f"/repos/{OWNER}/{REPO}{path}"
    return gh_api(ep, method="POST", data=data)

def get_issue_status(issue_num):
    issue = api(f"/issues/{issue_num}")
    if not issue:
        return None
    is_pr = bool(issue.get("pull_request"))

    result = {
        "number": issue_num,
        "title": issue.get("title", "?"),
        "state": issue.get("state", "?"),
        "is_pr": is_pr,
        "labels": [l["name"] for l in issue.get("labels", [])],
        "created_at": issue.get("created_at", ""),
        "updated_at": issue.get("updated_at", ""),
        "user": issue.get("user", {}).get("login", "?"),
    }

    # Comments
    comments = api(f"/issues/{issue_num}/comments?per_page=5&direction=desc")
    if isinstance(comments, list):
        result["recent_comments"] = [
            {"user": c["user"]["login"], "body": (c.get("body") or "")[:300], "created_at": c["created_at"]}
            for c in comments[-3:]
        ]
    else:
        result["recent_comments"] = []

    # PR details
    if is_pr:
        pr = api(f"/pulls/{issue_num}")
        if pr:
            result["pr"] = {
                "state": pr.get("state"), "draft": pr.get("draft", False),
                "head": pr.get("head", {}).get("ref", "?"), "base": pr.get("base", {}).get("ref", "?"),
                "changed_files": pr.get("changed_files", 0),
                "additions": pr.get("additions", 0), "deletions": pr.get("deletions", 0),
            }

    result["linked_prs"] = []

    # Recent workflow runs
    runs = api("/actions/runs?per_page=3")
    if runs and "workflow_runs" in runs:
        result["recent_runs"] = [
            {"id": r["id"], "name": r["name"], "status": r["status"], "conclusion": r.get("conclusion")}
            for r in runs["workflow_runs"][:3]
        ]
    else:
        result["recent_runs"] = []

    return result

def detect_completion(status):
    if status["state"] == "closed":
        return True, "Issue closed"
    if status.get("is_pr") and status.get("pr", {}).get("state") == "closed":
        return True, "PR closed/merged"
    return False, None

def format_status(status, verbose=False):
    lines = []
    kind = "PR" if status.get("is_pr") else "Issue"
    lines.append(f"📋 #{status['number']} — {status['title']}")
    lines.append(f"   類型: {kind} | 狀態: {status['state']}")
    lines.append(f"   標籤: {', '.join(status.get('labels', [])) or 'none'}")
    lines.append(f"   更新: {status.get('updated_at', '?')}")

    if status.get("pr"):
        p = status["pr"]
        lines.append(f"   PR: {p['head']}→{p['base']} | +{p['additions']}/-{p['deletions']} ({p['changed_files']} files)")

    if verbose and status.get("recent_comments"):
        lines.append("   💬 最近留言:")
        for c in status["recent_comments"][-3:]:
            body_preview = c["body"].replace("\n", " ")[:120]
            lines.append(f"      - {c['user']}: {body_preview}")

    done, reason = detect_completion(status)
    lines.append(f"   ✅ 已完成: {reason}" if done else "   ⏳ 進行中")
    return "\n".join(lines)

def cmd_status(issue_num):
    status = get_issue_status(int(issue_num))
    if status:
        print(format_status(status, verbose=True))
    else:
        print(f"❌ 無法取得 #{issue_num} 的狀態")

def cmd_active():
    issues = api("/issues?labels=cloud-agent&state=open&per_page=20")
    if not issues or not isinstance(issues, list):
        print("沒有進行中的 agent 任務")
        return
    for issue in issues:
        s = {
            "number": issue["number"], "title": issue["title"], "state": issue["state"],
            "is_pr": bool(issue.get("pull_request")),
            "labels": [l["name"] for l in issue.get("labels", [])],
            "updated_at": issue["updated_at"], "linked_prs": [], "recent_comments": [],
        }
        print(format_status(s))
        print()

def cmd_trigger(title, body="", agent="my-agent"):
    payload = {
        "event_type": "cloud_agent_request",
        "client_payload": {"action": "prepare", "agent": agent, "title": title, "body": body or title},
    }
    api_post("/dispatches", payload)
    print(f"✅ 已觸發 agent 任務: {title}")
    print(f"   Agent: {agent}")
    print("   等待 workflow 建立 issue...")
    time.sleep(8)
    issues = api("/issues?labels=cloud-agent&state=open&sort=created&direction=desc&per_page=3")
    if isinstance(issues, list):
        for issue in issues:
            if title.lower() in issue["title"].lower():
                print(f"   → Issue #{issue['number']}: {issue['title']}")
                return issue["number"]
        if issues:
            print(f"   → 最新 Issue #{issues[0]['number']}: {issues[0]['title']}")
            return issues[0]["number"]
    return None

def cmd_poll(issue_num, interval=120):
    issue_num = int(issue_num)
    interval = int(interval)
    print(f"🔄 開始監控 #{issue_num}，每 {interval} 秒檢查一次...")
    last_update = None
    while True:
        status = get_issue_status(issue_num)
        if status:
            current = status["updated_at"]
            if current != last_update:
                print(f"\n[{time.strftime('%H:%M:%S')}] 狀態更新:")
                print(format_status(status, verbose=True))
                last_update = current
            done, reason = detect_completion(status)
            if done:
                print(f"\n🎉 任務完成: {reason}")
                return status
        time.sleep(interval)

def cmd_check_json(issue_num):
    status = get_issue_status(int(issue_num))
    if not status:
        print(json.dumps({"error": "not found"}))
        return
    done, reason = detect_completion(status)
    print(json.dumps({
        "number": status["number"], "title": status["title"], "state": status["state"],
        "done": done, "reason": reason, "labels": status["labels"],
        "last_comment": status["recent_comments"][-1] if status.get("recent_comments") else None,
        "updated_at": status["updated_at"],
    }, ensure_ascii=False))

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
