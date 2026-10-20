#!/usr/bin/env python3
"""review/tools/derive.py: the derived layers of the review folder, bottom up from the tree.

    python3 review/tools/derive.py          # standalone: graph/files.json, graph/surfaces.json, join/matches.json, join/gaps.json

Files: every source file (the rule in SOURCE_DIRS and SOURCE_EXT, plus the root files in ROOT_FILES), with its sha256,
language, size and line count. The gate (admin/build/validate.js) recomputes the same hashes and fails if they differ,
which is the review brief's freshness check. Surfaces: every page the build wrote and every data file the site
publishes. Join: each intent example's surface against the tree; the coverage figure is the share with a match.
Methods and classes are not derived (the corrections file says why). Regenerated, never edited.
"""
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT        = Path(__file__).resolve().parents[2]
SOURCE_DIRS = [".github", "admin/build", "admin/content", "admin/credentials", "assets", "finder", "review/intent", "review/tools", "team"]
SOURCE_EXT  = {".py", ".js", ".mjs", ".css", ".html", ".json", ".md", ".yml", ".txt"}
ROOT_FILES  = ["README.md", "CLAUDE.md", "REALITY.md", "BRIEF-CORRECTIONS.md", "LICENSES.md", "CNAME", "robots.txt", "review/README.md", "review/BRIEF-CORRECTIONS.md", "review/self/README.md"]
GENERATED   = {"finder/finder.json", "finder/finder-prompt.md", "finder/finder-record.md"}  # copies the build writes from admin/content/finder/
LANG        = {".py": "python", ".js": "javascript", ".mjs": "javascript", ".css": "css", ".html": "html", ".json": "json", ".md": "markdown", ".yml": "yaml", ".txt": "text"}


class Derive:

    def __init__(self, root=ROOT):
        self.root = root

    def source_files(self):
        out = []
        for d in SOURCE_DIRS:
            base = self.root / d
            if not base.exists():
                continue
            for p in sorted(base.rglob("*")):
                rel = p.relative_to(self.root).as_posix()
                if p.is_file() and p.suffix in SOURCE_EXT and rel not in GENERATED and not rel.endswith(".html" if d == "team" else "\0") and "__pycache__" not in rel:
                    out.append(rel)
        for f in ROOT_FILES:
            if (self.root / f).exists():
                out.append(f)
        return sorted(set(out))

    def files(self):
        rows = []
        for rel in self.source_files():
            b = (self.root / rel).read_bytes()
            rows.append({"path": rel, "sha256": hashlib.sha256(b).hexdigest(), "language": LANG.get(Path(rel).suffix, "text"),
                         "size": len(b), "lines": b.count(b"\n") + (1 if b and not b.endswith(b"\n") else 0)})
        return rows

    def surfaces(self, pages=None):
        if pages is None:
            pages = sorted(p.relative_to(self.root).as_posix() for p in self.root.rglob("*.html")
                           if ".git" not in p.parts and "node_modules" not in p.parts and not p.relative_to(self.root).as_posix().startswith("assets/"))
        data = ["finder/finder.json", "finder/finder-prompt.md", "finder/finder-record.md", "finder/finder-rules.js", "llms.txt", "sitemap.xml", "admin/build/version.txt",
                "admin/build/validate.js", "admin/build/test_finder.mjs", "admin/build/release.py", ".github/workflows/deploy-pages.yml",
                "assets/themes.css", "assets/components/sg-finder/sg-finder.js"]
        rows = [{"id": p, "kind": "page", "path": p} for p in pages]
        rows += [{"id": d, "kind": "data" if not d.endswith((".js", ".mjs", ".py", ".yml", ".css")) else "code", "path": d} for d in data if (self.root / d).exists()]
        twins = [p[:-5] + ".md" for p in pages if p != "404.html"]
        rows += [{"id": t, "kind": "twin", "path": t} for t in twins if (self.root / t).exists()]
        return rows

    def join(self, surfaces):
        have = {s["path"] for s in surfaces}
        intent = json.loads((self.root / "review/intent/stories.json").read_text(encoding="utf-8"))
        flows = json.loads((self.root / "review/intent/flows.json").read_text(encoding="utf-8"))
        matches, gaps = [], []
        for st in intent["stories"]:
            for ru in st["rules"]:
                for ex in ru["examples"]:
                    node = f"{st['id']}/{ru['id']}/{ex['id']}"
                    target = ex["surface"]
                    exists = target in have or (self.root / target).exists()
                    (matches if exists else gaps).append({"intent": node, "surface": target, "how": "surface exists in the tree" if exists else "no file at that path"})
        for fl in flows["flows"]:
            for step in fl["steps"]:
                node = f"flow:{fl['id']}/{step['n']}"
                target = step["surface"]
                exists = target in have or (self.root / target).exists()
                (matches if exists else gaps).append({"intent": node, "surface": target, "how": "surface exists in the tree" if exists else "no file at that path"})
        total = len(matches) + len(gaps)
        coverage = round(len(matches) / total, 3) if total else 0.0
        return matches, gaps, coverage

    def write(self, pages=None, version=None):
        now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        prov = {"tool": "review/tools/derive.py", "version": "0.1.0", "site": version, "derived_at": now}
        files = self.files()
        surfaces = self.surfaces(pages)
        matches, gaps, coverage = self.join(surfaces)
        (self.root / "review/graph").mkdir(parents=True, exist_ok=True)
        (self.root / "review/join").mkdir(parents=True, exist_ok=True)
        self._dump("review/graph/files.json", {"what": "Every source file, with its hash; the gate recomputes these and fails if they differ (freshness).", "provenance": prov, "files": files})
        self._dump("review/graph/surfaces.json", {"what": "What the site exposes: pages, their twins, data and code files a reader or an agent can fetch.", "provenance": prov, "surfaces": surfaces})
        self._dump("review/join/matches.json", {"what": "Each intent example or flow step whose surface exists in the tree.", "provenance": prov, "coverage": coverage, "matches": matches})
        self._dump("review/join/gaps.json", {"what": "Intent whose surface nothing in the tree provides yet, each a finding.", "provenance": prov, "coverage": coverage, "gaps": gaps})
        return {"files": len(files), "surfaces": len(surfaces), "matches": len(matches), "gaps": len(gaps), "coverage": coverage}

    def _dump(self, rel, obj):
        (self.root / rel).write_text(json.dumps(obj, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    print(json.dumps(Derive().write(), indent=1))
