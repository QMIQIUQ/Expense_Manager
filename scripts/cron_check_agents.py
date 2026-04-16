#!/usr/bin/env python3
"""
Hermes cron script — 檢查所有進行中的 agent 任務
stdout 會被注入 cron prompt 作為 context
"""
import json, os, sys, subprocess, re
from urllib.request import Request, urlopen

OWNER = "QMIQIUQ"
REPO = "Expense_Manager"
API = f"https://api.github.com/repos/{OWNER}/{REPO}"

def get_token():
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
    return None

TOKEN = get_token()
if not TOKEN:
    print("NO_TOKEN")
    sys.exit(0)

HEADERS = {
    "Authorization": f"token {TOKEN}",
    "Accept": "application/vnd.github+json",
}

def api(path):
    url = f"{API}{path}"
    req = Request(url, headers=HEADERS)
    with urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())

# Get open agent issues
try:
    issues = api("/issues?labels=cloud-agent&state=open&per_page=10")
except Exception as e:
    print(f"API_ERROR: {e}")
    sys.exit(0)

if not issues:
    print("NO_ACTIVE_TASKS")
    sys.exit(0)

results = []
for issue in issues:
    num = issue["number"]
    entry = {
        "number": num,
        "title": issue["title"],
        "state": issue["state"],
        "labels": [l["name"] for l in issue.get("labels", [])],
        "updated_at": issue["updated_at"],
    }
    # Check last comment
    try:
        comments = api(f"/issues/{num}/comments?per_page=3&direction=desc")
        if comments:
            last = comments[-1]
            entry["last_comment"] = {
                "user": last["user"]["login"],
                "body": (last["body"] or "")[:200],
                "at": last["created_at"],
            }
    except Exception:
        pass
    results.append(entry)

print(json.dumps(results, ensure_ascii=False, indent=2))
