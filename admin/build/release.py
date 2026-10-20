#!/usr/bin/env python3
"""admin/build/release.py: one script, every release, in this order: fetch, bump, build, validate, test, tripwire, commit, push, verify.

    python3 admin/build/release.py --what "one sentence: what changed, and why"        # the next patch
    python3 admin/build/release.py --what "..." --minor                                 # a deliberate .0
    python3 admin/build/release.py --what "..." --dev                                   # also push dev (a release)
    python3 admin/build/release.py --tripwire                                           # only the staged-diff scan

A clean push is not a release: the script polls the live site for the new version and says so if it never appears.
The version is one number in one place (admin/build/version.txt) and the commit subject carries it: "site vX.Y.Z: what".
The tripwire scans the staged diff for key shapes, and for the secret part of every key kept in admin/credentials/
(read to know what to look for, never printed). Bash is kept out of this on purpose; see coding.sgit.ai on Bash.
"""
import argparse
import json
import re
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

ROOT    = Path(__file__).resolve().parents[2]
VERSION = ROOT / "admin/build/version.txt"
HISTORY = ROOT / "admin/content/versions.json"
HOST    = (ROOT / "CNAME").read_text().strip()

# fields of a JSON file in admin/credentials/ that are published on purpose (the feedback lane's public key and where it
# is); every other field's value is a secret the staged diff must not carry
PUBLIC_FIELDS = {"what", "v", "endpoint", "vault", "public", "fingerprint", "created", "rotated"}

# the shapes the gate refuses, and the release script scans the staged diff for
KEY_SHAPES = [
    (re.compile(r"sgit_private_\S+"),                              "a private sgit key"),
    (re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),            "a private key block"),
    (re.compile(r"\bAKIA[0-9A-Z]{16}\b"),                          "an AWS access key id"),
    (re.compile(r"\bsk-or-v1-[0-9a-f]{20,}"),                      "an OpenRouter key"),
    (re.compile(r"\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{24,}"),        "a model-provider key"),
    (re.compile(r"\bgh[pousr]_[A-Za-z0-9]{30,}\b"),                "a GitHub token"),
    (re.compile(r"\bgithub_pat_[A-Za-z0-9_]{40,}\b"),              "a GitHub fine-grained token"),
    (re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{10,}"),                "a Slack token"),
    (re.compile(r"\bAIza[0-9A-Za-z_-]{35}\b"),                     "a Google API key"),
]


class Release:

    def __init__(self, args):
        self.args = args

    # ---- git and shell
    def run(self, *cmd, check=True, capture=True):
        r = subprocess.run(cmd, cwd=ROOT, text=True, capture_output=capture)
        if check and r.returncode:
            sys.exit(f"release: `{' '.join(cmd)}` failed\n{r.stdout}{r.stderr}")
        return (r.stdout or "").strip()

    def branch(self):
        return self.run("git", "rev-parse", "--abbrev-ref", "HEAD")

    # ---- the steps
    def fetch(self):
        self.run("git", "fetch", "origin", "dev", "--tags", check=False)

    def bump(self):
        cur = VERSION.read_text().strip()
        m = re.fullmatch(r"v(\d+)\.(\d+)\.(\d+)", cur)
        if not m:
            sys.exit(f"release: version.txt carries {cur!r}, not vX.Y.Z")
        a, b, c = map(int, m.groups())
        tags = [t for t in self.run("git", "tag", "--list", "v*").split() if re.fullmatch(r"v\d+\.\d+\.\d+", t)]
        newest = max(tags, key=lambda t: tuple(map(int, t[1:].split(".")))) if tags else None
        if newest and tuple(map(int, newest[1:].split("."))) > (a, b, c):
            a, b, c = map(int, newest[1:].split("."))
        new = f"v{a}.{b + 1}.0" if self.args.minor else f"v{a}.{b}.{c + 1}"
        VERSION.write_text(new)
        hist = json.loads(HISTORY.read_text(encoding="utf-8"))
        if hist["releases"][-1]["version"] != new:
            hist["releases"].append({"version": new, "date": time.strftime("%Y-%m-%d"), "what": self.args.what})
            HISTORY.write_text(json.dumps(hist, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"release: {cur} -> {new}")
        return new

    def build(self):
        self.run(sys.executable, "admin/build/build.py", capture=False)
        self.run("node", "admin/build/validate.js", capture=False)
        self.run("node", "admin/build/test_finder.mjs", capture=False)
        self.run("node", "admin/build/test_storyboards.mjs", capture=False)
        self.run("node", "admin/build/test_feedback.mjs", capture=False)
        self.run("node", "admin/build/test_feedback_pane.mjs", capture=False)  # real lane with the owner keys; skips without Playwright
        self.run("node", "admin/build/test_interview.mjs", capture=False)  # skips where Playwright is not installed

    def tripwire(self):
        """The staged diff, against the key shapes and the secret parts of any locally held key."""
        self.run("git", "add", "-A")
        diff = self.run("git", "diff", "--cached", "-U0", "--no-color", check=False)
        # the two files that name the shapes are skipped, hunk by hunk; everything else staged is scanned
        skip, lines = False, []
        for l in diff.splitlines():
            if l.startswith("diff --git "):
                skip = l.endswith((" b/admin/build/validate.js", " b/admin/build/release.py"))
            elif not skip and l.startswith("+") and not l.startswith("+++"):
                lines.append(l[1:])
        added = "\n".join(lines)
        found = []
        for rx, what in KEY_SHAPES:
            for m in rx.finditer(added):
                if "sgit_public_read_" in m.group(0):
                    continue
                found.append(f"{what}: {m.group(0)[:10]}...")
        for p in (ROOT / "admin/credentials").glob("*"):
            if p.name == "README.md" or not p.is_file():
                continue
            text = p.read_text(errors="ignore")
            try:                                     # a JSON owner file: every field is scanned except the ones public by design
                data = json.loads(text)
                if isinstance(data, dict):
                    text = "\n".join(str(v) for k, v in data.items() if k not in PUBLIC_FIELDS)
            except ValueError:
                pass
            for token in re.findall(r"[A-Za-z0-9_\-:]{24,}", text):
                secret = token.split(":")[0][-24:]
                if secret and secret in added:
                    found.append(f"the secret part of a key held in admin/credentials/{p.name}")
        if found:
            sys.exit("release: the tripwire found " + "; ".join(found) + "\nnothing was committed")
        print("release: tripwire clean")

    def commit_and_push(self, version):
        subject = f"site {version}: {self.args.what}"
        msg = subject + (f"\n\n{self.args.body}" if self.args.body else "")
        self.run("git", "commit", "-q", "-m", msg)
        br = self.branch()
        self.push(br)
        if self.args.dev and br != "dev":
            self.run("git", "push", "origin", f"{br}:dev")  # no -u: the branch keeps tracking itself
        print(f"release: pushed {subject!r} to {br}" + (" and dev" if self.args.dev else ""))

    def push(self, br):
        for wait in (0, 2, 4, 8, 16):
            if wait:
                time.sleep(wait)
            r = subprocess.run(["git", "push", "-u", "origin", br], cwd=ROOT, text=True, capture_output=True)
            if r.returncode == 0:
                return
            print(f"release: push failed ({r.stderr.strip().splitlines()[-1] if r.stderr.strip() else r.returncode}); retrying")
        sys.exit("release: push failed five times")

    def verify_live(self, version, minutes=10):
        if not (self.args.dev or self.branch() == "dev"):
            print("release: not a push to dev, so not polling the live site")
            return
        url = f"https://{HOST}/admin/build/version.txt?{int(time.time())}"
        deadline = time.time() + minutes * 60
        while time.time() < deadline:
            try:
                live = urllib.request.urlopen(url, timeout=20).read().decode().strip()
                if live == version:
                    print(f"release: live at https://{HOST}/ serves {version}")
                    return
            except Exception:
                pass
            time.sleep(20)
        sys.exit(f"release: the live site did not serve {version} within {minutes} minutes; the push went, the deploy did not show")

    def go(self):
        if self.args.tripwire:
            self.tripwire(); return
        if not self.args.what:
            sys.exit("release: --what \"one sentence\" is required")
        self.fetch()
        version = self.bump()
        self.build()
        self.tripwire()
        self.commit_and_push(version)
        self.verify_live(version)


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--what", help="one sentence for the release history and the commit subject")
    ap.add_argument("--body", help="text for the commit message after the subject, such as attribution trailers")
    ap.add_argument("--minor", action="store_true", help="bump the middle number (only when Dinis says a change is major)")
    ap.add_argument("--dev", action="store_true", help="also push the branch to dev, which is a release")
    ap.add_argument("--tripwire", action="store_true", help="only scan the staged diff")
    Release(ap.parse_args()).go()
