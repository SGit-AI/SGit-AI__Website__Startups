#!/usr/bin/env python3
"""startups.sgit.ai: the whole site, generated from the files that are the source of truth.

    python3 admin/build/build.py        # every page, every twin, llms.txt, the sitemap, the review's derived layers
    node admin/build/validate.js        # the gate
    node admin/build/test_finder.mjs    # the finder's rules against the finder's file

Sources (never edited by this script):
  admin/content/finder/finder.json       the finder: stages, questions, signals, routes, rules (copied to finder/finder.json)
  admin/content/finder/prompt.md         the prompt for Claude or ChatGPT (copied to finder/finder-prompt.md)
  admin/content/finder/record.md         the record template (copied to finder/finder-record.md)
  admin/content/finder/examples/*.md     published records, with permission, when there are any
  admin/content/plans.json               the business plans published as vaults on sgit.ai
  admin/content/pages/*.md               pages written as markdown (vaults, participant)
  admin/content/briefs/*.md              the brief verbatim and the initial prompt
  admin/content/articles/NN__<slug>.md   articles co-written with Dinis, in Dinis's voice
  admin/content/agent-articles/NN__*.md  agent articles, one per significant body of work, in the agent's own voice
  admin/content/decisions/NNN__*.md      Dinis's decisions, in his words
  admin/content/versions.json            the site's release history, narrated
  admin/content/vault.json               the vaults (none yet)
  admin/content/storyboards/             cast.json, NN__<slug>.json storyboards, kit.json (the vendored kit release), feedback.md;
                                         admin/build/storyboards.mjs validates them with the kit's formats.js and writes the derived files
  team/<role>/role.md, issues/, briefs/  the roles
  REALITY.md, BRIEF-CORRECTIONS.md       the reality file and the corrections file, rendered under admin/
  review/intent/*.json                   the review folder's intent; review/tools/derive.py writes the derived layers
  admin/build/version.txt                the site's version

Every page gets a markdown twin at the same path with .md, converted from the page's own body by to_markdown, so the
two cannot drift; an article's twin is its source file. llms.txt lists every twin.
"""
import hashlib
import html
import json
import re
import shutil
import sys
from html.parser import HTMLParser
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import markdown  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "review/tools"))
from derive import Derive  # noqa: E402

VERSION = (ROOT / "admin/build/version.txt").read_text().strip()
HOST = (ROOT / "CNAME").read_text().strip()
BASE = f"https://{HOST}/"
SITE = HOST
REPO = "https://github.com/SGit-AI/SGit-AI__Website__Startups"
ICON = ("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 32 32%27%3E%3Crect width=%2732%27 height=%2732%27 rx=%276%27 fill=%27%23123c3a%27/%3E"
        "%3Ccircle cx=%2716%27 cy=%2716%27 r=%279%27 fill=%27none%27 stroke=%27%235fd3c4%27 stroke-width=%273%27 stroke-dasharray=%2742 14%27/%3E"
        "%3Cpath d=%27M22 7l5 3-4 4z%27 fill=%27%235fd3c4%27/%3E%3C/svg%3E")

NAV_GROUPS = [
    ("Find your startup", [("The finder", "finder/index.html"), ("Walk the interview", "finder/interview.html"), ("The stages and questions", "finder/stages.html"),
                           ("The routes and rules", "finder/routes.html"), ("The prompt for Claude or ChatGPT", "finder/prompt.html"), ("The record", "finder/record.html")]),
    ("Build on vaults", [("Build your startup on vaults", "vaults/index.html"), ("Business plans to build on", "plans/index.html")]),
    ("Storyboards", [("Storyboards", "storyboards/index.html"), ("The cast", "storyboards/cast/index.html"), ("Design experiments", "storyboards/design/index.html"), ("Feedback to storyboards.sgit.ai", "storyboards/feedback/index.html")]),
    ("Articles", [("Articles", "articles/index.html"), ("Decisions", "decisions/index.html"), ("The briefs", "briefs/index.html")]),
    ("The team", [("The team", "team/index.html"), ("The vault", "vault/index.html"), ("The review", "review/index.html"), ("What exists", "admin/reality.html"), ("Admin", "admin/index.html")]),
]

written = []
twins = []


# ------------------------------------------------------------------ helpers
def md(text):
    return markdown.markdown(text, extensions=["extra", "sane_lists", "toc", "attr_list"], output_format="html5")


def esc(s):
    return html.escape(str(s), quote=True)


def write(rel, text):
    p = ROOT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding="utf-8")
    written.append(rel)


def up_for(rel):
    return "../" * (len(rel.split("/")) - 1)


def frontmatter(text):
    m = re.match(r"---\s*\n(.*?)\n---\s*\n?(.*)$", text, re.S)
    return (m.group(1), m.group(2)) if m else ("", text)


def fm_get(fm, key):
    m = re.search(rf"^{key}\s*:\s*(.*)$", fm, re.M)
    return m.group(1).strip().strip('"') if m else ""


def sha(s):
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


# ---- the markdown twin: a projection of the page's own body ------------------------------------------------------
class _ToMarkdown(HTMLParser):
    """Rendered HTML to markdown, enough for every page this site writes: headings, paragraphs, lists, links, emphasis,
    code, tables, blockquotes, definition lists, images. Internal links to .html become links to the .md twin."""
    BLOCK = {"p", "div", "section", "article", "aside", "nav", "header", "footer", "ul", "ol", "table", "blockquote", "pre", "dl", "h1", "h2", "h3", "h4", "hr", "tr", "li", "dt", "dd", "details", "summary", "figure"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out = []
        self.stack = []
        self.list_stack = []
        self.href = None
        self.cell = None
        self.row = []
        self.rows = []
        self.in_pre = False
        self.skip = 0

    def _nl(self, n=2):
        s = "".join(self.out).rstrip(" ")
        while s.endswith("\n\n\n"):
            s = s[:-1]
        self.out = [s]
        if not s.endswith("\n" * n):
            self.out.append("\n" * (n - (len(s) - len(s.rstrip("\n")))))

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ("script", "style", "sg-finder", "svg", "button", "noscript"):
            self.skip += 1; return
        if self.skip:
            return
        if self.cell is not None:  # inline markup inside a table cell stays in the cell
            if tag == "a":
                self.href = a.get("href", ""); self.cell.append("[")
            elif tag in ("b", "strong"):
                self.cell.append("**")
            elif tag in ("i", "em"):
                self.cell.append("*")
            elif tag == "code":
                self.cell.append("`")
            elif tag == "br":
                self.cell.append(" ")
            return
        if tag in ("h1", "h2", "h3", "h4"):
            self._nl(); self.out.append("#" * int(tag[1]) + " ")
        elif tag == "p":
            self._nl()
        elif tag in ("ul", "ol"):
            self._nl(); self.list_stack.append([tag, 0])
        elif tag == "li":
            self._nl(1)
            kind, n = self.list_stack[-1] if self.list_stack else ("ul", 0)
            if self.list_stack:
                self.list_stack[-1][1] += 1
            self.out.append("  " * (len(self.list_stack) - 1) + (f"{self.list_stack[-1][1]}. " if kind == "ol" else "- "))
        elif tag == "a":
            self.href = a.get("href", ""); self.out.append("[")
        elif tag in ("b", "strong"):
            self.out.append("**")
        elif tag in ("i", "em"):
            self.out.append("*")
        elif tag == "code" and not self.in_pre:
            self.out.append("`")
        elif tag == "pre":
            self._nl(); self.out.append("```\n"); self.in_pre = True
        elif tag == "blockquote":
            self._nl(); self.out.append("> ")
        elif tag == "br":
            self.out.append("\n")
        elif tag == "hr":
            self._nl(); self.out.append("---"); self._nl()
        elif tag == "img":
            self.out.append(f"![{a.get('alt', '')}]({a.get('src', '')})")
        elif tag == "table":
            self._nl(); self.rows = []
        elif tag == "tr":
            self.row = []
        elif tag in ("td", "th"):
            self.cell = []
        elif tag == "dt":
            self._nl(1); self.out.append("**")
        elif tag == "dd":
            self.out.append(" ")
        elif tag == "summary":
            self._nl(); self.out.append("**")
        elif tag == "span" and a.get("class") == "k":
            self._nl(); self.out.append("*")
        elif tag in ("div", "section", "article", "aside", "details", "figure", "dl"):
            self._nl()
        self.stack.append((tag, a.get("class", "")))

    def handle_endtag(self, tag):
        if tag in ("script", "style", "sg-finder", "svg", "button", "noscript"):
            self.skip = max(0, self.skip - 1); return
        if self.skip:
            return
        if self.cell is not None and tag not in ("td", "th"):
            if tag == "a":
                href = self.href or ""
                if href and not re.match(r"^(https?:|mailto:|data:|#|//)", href) and href.endswith(".html"):
                    href = href[:-5] + ".md"
                self.cell.append(f"]({href})"); self.href = None
            elif tag in ("b", "strong"):
                self.cell.append("**")
            elif tag in ("i", "em"):
                self.cell.append("*")
            elif tag == "code":
                self.cell.append("`")
            return
        cls = ""
        if self.stack and self.stack[-1][0] == tag:
            cls = self.stack.pop()[1]
        if tag == "span" and cls == "k":
            self.out.append("*"); self._nl(1)
        if tag in ("h1", "h2", "h3", "h4", "p", "blockquote", "dd", "li"):
            self._nl(2 if tag != "li" else 1)
        elif tag in ("ul", "ol"):
            if self.list_stack:
                self.list_stack.pop()
            self._nl()
        elif tag == "a":
            href = self.href or ""
            if href and not re.match(r"^(https?:|mailto:|data:|#|//)", href) and href.endswith(".html"):
                href = href[:-5] + ".md"
            self.out.append(f"]({href})"); self.href = None
        elif tag in ("b", "strong"):
            self.out.append("**")
        elif tag in ("i", "em"):
            self.out.append("*")
        elif tag == "code" and not self.in_pre:
            self.out.append("`")
        elif tag == "pre":
            self._nl(1); self.out.append("```"); self._nl(); self.in_pre = False
        elif tag in ("td", "th"):
            self.row.append(" ".join("".join(self.cell).split())); self.cell = None
        elif tag == "tr":
            self.rows.append(self.row); self.row = []
        elif tag == "table":
            if self.rows:
                width = max(len(r) for r in self.rows)
                rows = [r + [""] * (width - len(r)) for r in self.rows]
                self.out.append("| " + " | ".join(rows[0]) + " |\n|" + "---|" * width + "\n")
                for r in rows[1:]:
                    self.out.append("| " + " | ".join(r) + " |\n")
            self._nl()
        elif tag == "dt":
            self.out.append("**")
        elif tag == "summary":
            self.out.append("**"); self._nl()
        elif tag in ("div", "section", "article", "aside", "details", "figure", "dl"):
            self._nl()

    def handle_data(self, data):
        if self.skip:
            return
        if self.cell is not None:
            self.cell.append(data); return
        if self.in_pre:
            self.out.append(data); return
        text = re.sub(r"\s+", " ", data)
        if text.strip() == "" and (not self.out or "".join(self.out[-1:]).endswith("\n")):
            return
        self.out.append(text)

    def result(self):
        s = "".join(self.out)
        s = re.sub(r"[ \t]+\n", "\n", s)
        s = re.sub(r"\n{3,}", "\n\n", s)
        return s.strip() + "\n"


def to_markdown(body):
    p = _ToMarkdown()
    p.feed(body)
    return p.result()


def twin_text(rel, title, description, body_md):
    url = BASE + ("" if rel == "index.html" else rel)
    return (f"# {title}, {SITE}\n\n> {description}\n\n*Source: <{url}> · site {VERSION} · this file is generated from the same content as the page, "
            f"so the two cannot drift. Every page on this site has a `.md` twin; internal links below point at them.*\n\n---\n\n{body_md}\n\n---\n\n"
            f"*[Site index for agents]({BASE}llms.txt) · [HTML version]({url})*\n")


# ------------------------------------------------------------------ the page
def page(rel, title, body, description, crumbs=(), extra_head="", wide=False, twin=None, module=None, noindex=False):
    up = up_for(rel)
    here = rel.split("/")[0] if "/" in rel else ""
    ishere = lambda href: bool(here) and href.split("/")[0] == here
    nav = "".join(
        f'<div class="ni"><a class="nl{" here" if any(ishere(h) for _, h in items) else ""}" href="{up}{items[0][1]}">{esc(group)}<span class="caret" aria-hidden="true">&#9662;</span></a>'
        f'<div class="sub">{"".join(f"""<a class="sl{' here' if h == rel else ''}" href="{up}{h}">{esc(label)}</a>""" for label, h in items)}</div></div>'
        for group, items in NAV_GROUPS)
    crumb = ""
    if crumbs:
        items = [f'<a href="{up}index.html">{SITE}</a>']
        for label, href in crumbs[:-1]:
            items.append(f'<a href="{up}{href}">{esc(label)}</a>')
        items.append(f"<b>{esc(crumbs[-1][0])}</b>")
        crumb = '<div class="crumbs">' + " &rarr; ".join(items) + "</div>"
    canonical = BASE + ("" if rel == "index.html" else rel)
    twin_rel = rel[:-5] + ".md"
    twin_link = "" if noindex else f'<link rel="alternate" type="text/markdown" href="{twin_rel.split("/")[-1]}" title="This page as markdown">\n'
    mod = f'<script type="module" src="{up}{module}"></script>\n' if module else ""
    doc = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)} &middot; {SITE}</title>
<meta name="description" content="{esc(description)}">
<link rel="canonical" href="{canonical}">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(description)}">
<meta property="og:url" content="{canonical}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="{SITE}">
{twin_link}<link rel="icon" href="{ICON}">
<link rel="stylesheet" href="{up}assets/site.css">
{extra_head}<link rel="stylesheet" href="{up}assets/themes.css">
<script src="{up}assets/site.js"></script>
{mod}</head>
<body>
<nav class="site"><div class="row">
<a class="brand" href="{up}index.html">startups<span>.sgit.ai</span></a>
<button class="nav-toggle" type="button" aria-expanded="false" aria-label="Menu">Menu</button>
<div class="nav-items">{nav}</div>
<div class="nav-tools"><div class="theme-pick"></div><span class="ver">site <a href="{up}admin/versions.html" title="Site release history">{VERSION}</a></span></div>
</div></nav>
<main><div class="inner{" wide" if wide else ""}">
{crumb}
{body}
</div></main>
<footer class="site"><div class="row">
<span>startups.sgit.ai: find your startup, then build it on vaults. By Dinis Cruz and this site's agents. Content CC BY 4.0; code under the repository licence. <a href="{up}about/participant.html">Participant disclosure</a>.</span>
<span>Part of <a href="https://sgit.ai">sgit.ai</a> &middot; <a href="{REPO}">GitHub</a> &middot; <a href="{up}admin/reality.html">what exists</a> &middot; <a href="{up}admin/versions.html">release history</a> &middot; <a href="{up}llms.txt">llms.txt</a>{"" if noindex else f' &middot; <a href="{twin_rel.split("/")[-1]}">this page as markdown</a>'}</span>
</div></footer>
</body>
</html>
"""
    write(rel, doc)
    if not noindex:
        text = twin if twin is not None else twin_text(rel, title, description, to_markdown(body))
        write(twin_rel, text)
        twins.append((twin_rel, title))


# ------------------------------------------------------------------ pages from markdown
def build_md_pages():
    out = {}
    targets = {"vaults": ("vaults/index.html", (("Build on vaults", "vaults/index.html"),)),
               "participant": ("about/participant.html", (("About", "about/participant.html"), ("Participant disclosure", "about/participant.html")))}
    for name, (rel, crumbs) in targets.items():
        fm, text = frontmatter((ROOT / f"admin/content/pages/{name}.md").read_text(encoding="utf-8"))
        title, desc, kicker = fm_get(fm, "title"), fm_get(fm, "description"), fm_get(fm, "kicker")
        body = f'<article class="doc">{f"<p class=\"kicker\">{esc(kicker)}</p>" if kicker else ""}<h1>{esc(title)}</h1><p class="lede">{esc(desc)}</p><div class="body">{md(text)}</div></article>'
        page(rel, title, body, desc, crumbs=crumbs)
        out[name] = (rel, title, desc)
    return out


# ------------------------------------------------------------------ the finder
def load_finder():
    return json.loads((ROOT / "admin/content/finder/finder.json").read_text(encoding="utf-8"))


def finder_counts(f):
    return {"stages": len(f["stages"]), "questions": len(f["questions"]), "signals": len(f["signals"]), "routes": len(f["routes"]), "rules": len(f["rules"]), "entries": len(f["entries"])}


def loop_svg():
    """The loop, drawn: ship, give it away, take it away, do they miss it. Colours are the band's tokens."""
    boxes = [(190, 30, "Ship it"), (316, 120, "Give it away"), (190, 210, "Take it away"), (64, 120, "Do they miss it?")]
    s = ['<svg viewBox="0 0 380 240" role="img" aria-label="The loop: ship it, give it away, take it away, do they miss it; yes means charge, no means ship again">']
    s.append('<circle cx="190" cy="120" r="78" fill="none" stroke="var(--brand-accent)" stroke-width="2" stroke-dasharray="6 5"/>')
    for i, (cx, cy, label) in enumerate(boxes):
        s.append(f'<rect x="{cx - 62}" y="{cy - 16}" width="124" height="32" rx="8" fill="var(--brand-accent)"/>')
        s.append(f'<text x="{cx}" y="{cy + 5}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--brand)">{esc(label)}</text>')
    s.append('<text x="190" y="116" text-anchor="middle" font-size="11" fill="var(--brand-dim)">yes: charge</text>')
    s.append('<text x="190" y="132" text-anchor="middle" font-size="11" fill="var(--brand-dim)">no: ship again</text>')
    s.append("</svg>")
    return "".join(s)


def build_finder():
    f = load_finder()
    c = finder_counts(f)
    for name, out in (("finder.json", "finder.json"), ("prompt.md", "finder-prompt.md"), ("record.md", "finder-record.md")):
        shutil.copyfile(ROOT / "admin/content/finder" / name, ROOT / "finder" / out)
        written.append(f"finder/{out}")
    entries = "".join(f'<div class="card"><span class="k">{esc(e["id"])}</span><h3>{esc(e["label"])}</h3><p>{esc(e["what"])}</p></div>' for e in f["entries"])
    stages = "".join(f'<li><h3>{esc(s["title"])}</h3><p>{esc(s["ask"])}</p></li>' for s in f["stages"])

    # ---- the front page of the finder
    body = f"""<p class="kicker">Find your startup &middot; finder {esc(f["version"])} &middot; {esc(f["status"])}</p>
<h1>Find your startup</h1>
<p class="lede">An interview that helps you zoom in on what to ship, to whom, by when. The questions change with your answers; the route at the end is picked by a rule you can read; the output is your own description of what you should be focusing on. It can be run by Claude or ChatGPT interviewing you, or walked on this site.</p>
<div class="note"><b>The rule of the finder.</b> {esc(f["rule_of_the_finder"])}</div>
<h2 id="run">Three ways to run it</h2>
<div class="cards">
<a class="card" href="prompt.html"><span class="k">With Claude or ChatGPT</span><h3>Paste the prompt</h3><p>The model interviews you one question at a time, or reads the documents you give it first, applies the rules in the open and writes your record. This is the version the memo asks for first.</p><span class="more">The prompt &rarr;</span></a>
<a class="card" href="interview.html"><span class="k">On this site</span><h3>Walk the interview</h3><p>The same stages and questions in the browser. Your answers stay in this browser; the route and the record are computed from them, and you copy the record out. No conversation, no follow-up: that is the model's part.</p><span class="more">Walk it &rarr;</span></a>
<a class="card" href="stages.html"><span class="k">Read it first</span><h3>Every stage, question and rule</h3><p>The interview is one data file. Read the stages and what each question is for, then the routes and the eight rules that pick between them.</p><span class="more">The stages &rarr;</span></a>
</div>
<h2 id="spectrum">Where you are: the spectrum</h2>
<p>The finder works along the whole spectrum, from the person who has not figured out where their startup is to the person with a good plan who is not shipping it. The first question is which of these you are, and it decides what comes next.</p>
<div class="cards spectrum">{entries}</div>
<h2 id="stages">The seven stages</h2>
<ol class="stages">{stages}</ol>
<h2 id="test">One test runs through it</h2>
<p>Everything maps to one question: can you ship it, can you get it into the hands of users, now? Not a plan for a thing: the thing, usable by a stranger, so that you can give it away, take it away, and find out whether they missed it. The model is <a href="https://newsroom.sgit.ai/articles/the-question-is-whether-they-miss-it.html">the most important question is whether they miss it</a>, and <a href="../vaults/index.html">the vaults page</a> is the substrate that makes the loop cheap.</p>
<h2 id="made">How it is made</h2>
<p>The interview is one file, <a href="finder.json"><code>finder.json</code></a>: {c["stages"]} stages, {c["questions"]} questions, {c["signals"]} signals, {c["routes"]} routes and {c["rules"]} rules, first match wins. The prompt tells a model to follow it; the interview page reads it; this page and the next two print it; <code>admin/build/test_finder.mjs</code> proves it on every release. Nothing about the interview is written anywhere else, which is <a href="../decisions/index.html#it-works-for-humans-and-for-agents">decision 002</a>. The questions and the rules are a first reading of <a href="../briefs/01__find-your-startup.html">the memo</a>, and the first interviews will change them; the file carries its own version so a record says which it was made with.</p>
<h2 id="not">What this does not claim</h2>
<ul>
<li><b>It has not been run with anyone yet.</b> The first interview, Dinis's own, is <a href="../team/interviewer/index.html">the interviewer's first issue</a>.</li>
<li><b>It is not a verdict</b> on your idea, and it is not written to be one.</li>
<li><b>The page does not hold a conversation.</b> It asks the questions as written. The follow-up when an answer is vague, and the reading of documents, are the model's, through the prompt.</li>
<li><b>The storyboard version and the programmatic version do not exist.</b> The memo names both as later.</li>
</ul>
<p class="small dim">The loop, the spectrum, the excuses and the rules are also drawn, as short strips, in <a href="../storyboards/index.html">the storyboards section</a>, an experiment on pages of its own. The finder is the brief's own ask: <a href="../articles/find-your-startup.html">Find your startup</a>, in Dinis's words, with the brief for the roles at its end. The agent surface is <a href="../llms.txt">llms.txt</a>.</p>
"""
    page("finder/index.html", "Find your startup", body, "An interview that helps you zoom in on what to ship, to whom, by when; run by Claude or ChatGPT, or walked on this site; the output in your own words.", crumbs=(("Find your startup", "finder/index.html"),))

    # ---- the interview page
    body = f"""<h1>Walk the interview</h1>
<p class="lede">The {c["stages"]} stages, in the browser. Your answers stay in this browser (nothing is sent anywhere); the route on the right is picked by the rules as you answer, with the rule named; the last stage writes your record as markdown to copy or save. For the conversation the page cannot have, take the record to <a href="prompt.html">a model with the prompt</a>.</p>
<sg-finder src="finder.json" rules="finder-rules.js"></sg-finder>
<noscript><div class="note warn">This page needs JavaScript to walk the stages. Without it, <a href="stages.html">the stages and questions</a> are the same content as a page, and <a href="prompt.html">the prompt</a> runs the interview in a model.</div></noscript>
<p class="small dim">The component is <code>assets/components/sg-finder/</code>, three files in the shape <a href="https://coding.sgit.ai/javascript/index.html">coding.sgit.ai</a> documents, on a base component kept in this repository; the rules it applies are <a href="finder-rules.js"><code>finder-rules.js</code></a>, the same module the release test runs. Answers are kept under <code>startups.finder.v1</code> in this browser's storage until you clear them.</p>
"""
    page("finder/interview.html", "Walk the interview", body, "The finder's stages walked in the browser; answers stay in this browser; the record is yours to copy.", crumbs=(("Find your startup", "finder/index.html"), ("Walk the interview", "finder/interview.html")), wide=True, module="assets/components/sg-finder/sg-finder.js")

    # ---- the stages and questions
    def q_html(q):
        opts = ""
        if q["kind"] == "choice":
            opts = '<ul class="opts">' + "".join(f'<li>{esc(o["label"])} <code>{esc(" ".join(f"{k}={v}" for k, v in o.get("signals", {}).items()))}</code></li>' for o in q["options"]) + "</ul>"
        scope = ""
        if q.get("for"):
            scope = f' <span class="badge">only for {esc(", ".join(q["for"]))}</span>'
        if q.get("not_for"):
            scope = f' <span class="badge">not for {esc(", ".join(q["not_for"]))}</span>'
        return f'<div class="question"><span class="id">{esc(q["id"])}</span><p class="ask">{esc(q["ask"])}{scope}</p><p class="why">{esc(q["why"])}</p>{opts}</div>'
    secs = []
    for i, s in enumerate(f["stages"], 1):
        qs = [q for q in f["questions"] if q["stage"] == s["id"]]
        secs.append(f'<section id="{esc(s["id"])}"><h2>{i}. {esc(s["title"])}</h2><p>{esc(s["ask"])}</p><p class="dim">{esc(s["why"])}</p>{"".join(q_html(q) for q in qs)}</section>')
    sig_rows = "".join(f'<tr><td><code>{esc(s["id"])}</code></td><td>{esc(s["what"])}</td><td>{esc(", ".join(s["values"]))}</td></tr>' for s in f["signals"])
    body = f"""<h1>The stages and questions</h1>
<p class="lede">The interview as it is asked, from <a href="finder.json"><code>finder.json</code></a> {esc(f["version"])}: {c["stages"]} stages in order, {c["questions"]} questions, each with the reason it is asked and, for a choice, the signal each answer sets. A question marked <i>only for</i> or <i>not for</i> names the entries it applies to.</p>
{"".join(secs)}
<h2 id="signals">The signals</h2>
<p>What the answers set, and what <a href="routes.html">the rules</a> read. A signal is a property of the interview, not a judgement of the person.</p>
<div class="tablewrap"><table><thead><tr><th>Signal</th><th>What it is</th><th>Values</th></tr></thead><tbody>{sig_rows}</tbody></table></div>
<p class="small dim">Changing a question is changing the file: the librarian keeps it, the test proves it, and the release note says what changed. Ids never change meaning, because they appear in records people keep.</p>
"""
    page("finder/stages.html", "The stages and questions", body, "Every stage and question of the finder, with the reason for each and the signals the answers set.", crumbs=(("Find your startup", "finder/index.html"), ("The stages and questions", "finder/stages.html")))

    # ---- the routes and rules
    routes = "".join(f'<div class="route" id="{esc(r["id"])}"><h3>{esc(r["title"])} <code class="small">{esc(r["id"])}</code></h3><p class="when">When: {esc(r["when"])}</p><p>{esc(r["what"])}</p><ol>{"".join(f"<li>{esc(n)}</li>" for n in r["next"])}</ol></div>' for r in f["routes"])
    rule_rows = "".join(f'<tr><td>{esc(r["id"])}</td><td>{esc(" and ".join(f"{k} is {" or ".join(v)}" for k, v in r["if"].items())) or "<i>otherwise</i>"}</td><td><a href="#{esc(r["then"])}">{esc(next(x["title"] for x in f["routes"] if x["id"] == r["then"]))}</a></td><td>{esc(r["because"])}</td></tr>' for r in f["rules"])
    body = f"""<h1>The routes and rules</h1>
<p class="lede">{c["routes"]} routes, each a direction of travel with its next steps, and the {c["rules"]} rules that pick one from the signals, applied in order, first match wins, the last one a default. The record shows which rule fired, so you can disagree with the rule rather than with a verdict.</p>
<h2 id="rules">The rules</h2>
<div class="tablewrap"><table class="rules"><thead><tr><th>Rule</th><th>If</th><th>Then</th><th>Because</th></tr></thead><tbody>{rule_rows}</tbody></table></div>
<p class="small dim">Deterministic on purpose: the same answers give the same route on the page, in a model and in the test. What a model adds is the conversation that gets to honest answers, and the record in your words.</p>
<h2 id="routes">The routes</h2>
{routes}
<p class="small dim">Old school is a route, not a failure: some startups cannot reach a first user without capital, and the honest thing is to say so and plan for it. Ship the component is the author's own path, three or four startups and a number of components later.</p>
"""
    page("finder/routes.html", "The routes and rules", body, "The finder's routes, each with its next steps, and the rules that pick one from the signals.", crumbs=(("Find your startup", "finder/index.html"), ("The routes and rules", "finder/routes.html")))

    # ---- the prompt
    prompt_md = (ROOT / "admin/content/finder/prompt.md").read_text(encoding="utf-8")
    prompt_body = prompt_md.split("\n---\n", 1)[1].strip()
    body = f"""<h1>The prompt for Claude or ChatGPT</h1>
<p class="lede">Copy the block below into Claude, ChatGPT or any assistant that can hold a conversation, with <a href="finder.json"><code>finder.json</code></a> pasted after it (or its address, if the assistant can fetch). The model interviews you one question at a time, or reads the documents you give it first; it applies the rules in the open; it writes your record in your words. This is the version the memo asks for first: for now, assume it needs an LLM to run it.</p>
<h2 id="prompt">The prompt</h2>
<pre>{esc(prompt_body)}</pre>
<p><a href="finder-prompt.md">finder-prompt.md</a> is the same text as a file. <a href="finder-record.md">finder-record.md</a> is the template it fills.</p>
<h2 id="documents">Documents instead of answers</h2>
<p>The other way in: give the model a plan, a deck, your notes, whatever you have, with the prompt. It reads them first and fills in every answer it can find, then shows you the answers one stage at a time to confirm or change. An answer it took from a document is marked as such in the record. Both ways end in the same place: the rule that fired, the route, and your own description of what to focus on.</p>
<h2 id="agents">For an agent</h2>
<ul>
<li>The interview: <code>{BASE}finder/finder.json</code> (stages, questions, signals, routes, rules; version {esc(f["version"])})</li>
<li>The prompt: <code>{BASE}finder/finder-prompt.md</code></li>
<li>The record template: <code>{BASE}finder/finder-record.md</code></li>
<li>The rules as code: <code>{BASE}finder/finder-rules.js</code>, an ES module with no dependencies; <code>route(finder, signals)</code> returns the rule and the route</li>
<li>Every page as markdown: <code>{BASE}llms.txt</code></li>
</ul>
<p class="small dim">The prompt keeps what you say in the conversation: it tells the model to suggest saving the record as a file and to start the next session from it. Nothing from an interview reaches this site unless you publish it; <a href="record.html">the record page</a> says how.</p>
"""
    page("finder/prompt.html", "The prompt for Claude or ChatGPT", body, "The prompt that runs the finder in Claude or ChatGPT, the documents mode, and the files an agent reads.", crumbs=(("Find your startup", "finder/index.html"), ("The prompt", "finder/prompt.html")))

    # ---- the record
    record_md = (ROOT / "admin/content/finder/record.md").read_text(encoding="utf-8")
    examples = sorted((ROOT / "admin/content/finder/examples").glob("[0-9][0-9]__*.md")) if (ROOT / "admin/content/finder/examples").exists() else []
    ex_html = ""
    for ex in examples:
        fm, text = frontmatter(ex.read_text(encoding="utf-8"))
        ex_html += f'<section id="{esc(ex.stem.split("__", 1)[1])}"><h3>{esc(fm_get(fm, "title"))}</h3><p class="small dim">{esc(fm_get(fm, "whose"))} &middot; run {esc(fm_get(fm, "run"))} &middot; {esc(fm_get(fm, "date"))}</p><div class="doc"><div class="body">{md(text)}</div></div></section>'
    body = f"""<h1>The record</h1>
<p class="lede">The finder's output: your startup, in your own words. One page, with the thing in a sentence, the first user, what exists, the smallest thing you will ship and when, the five people and the take-away date, the money, the route with the rule that picked it, what you are not doing, and your focus line. The next record supersedes it and says what changed.</p>
<h2 id="template">The template</h2>
<pre>{esc(record_md)}</pre>
<p><a href="finder-record.md">finder-record.md</a> as a file. The interview page writes the same shape from your answers; the prompt tells a model to fill it.</p>
<h2 id="examples">Examples</h2>
{ex_html or '<p>None published yet. The first will be Dinis&rsquo;s own, as <a href="../briefs/01__find-your-startup.html">the memo</a> says: "maybe I&rsquo;ll show some examples, I&rsquo;ll do it myself". It is <a href="../team/interviewer/index.html">the interviewer&rsquo;s first issue</a>. A record is published only with its owner&rsquo;s say-so, under <code>admin/content/finder/examples/</code>, and says whose it is and how it was run.</p>'}
<h2 id="keep">Keeping yours</h2>
<p>A record is yours. The page keeps your answers in your browser and nowhere else; a model keeps them in the conversation. Save the markdown as a file, and start the next interview from it: the point of the record is that it can be checked later against what you did.</p>
"""
    page("finder/record.html", "The record", body, "The finder's output, your startup in your own words: the template, the published examples, and how to keep yours.", crumbs=(("Find your startup", "finder/index.html"), ("The record", "finder/record.html")))
    return f, c


# ------------------------------------------------------------------ the plans
def build_plans():
    d = json.loads((ROOT / "admin/content/plans.json").read_text(encoding="utf-8"))
    rows = "".join(f'<tr><td><a href="{esc(p["url"])}"><b>{esc(p["title"])}</b></a><span class="date">{esc(p["date"])}</span></td><td>{esc(p["business"])}</td><td>{esc(p["money"])}</td><td>{esc(p["vault"])}</td></tr>' for p in d["plans"])
    contains = "".join(f"<tr><td><b>{esc(k)}</b></td><td>{esc(v)}</td></tr>" for k, v in d["every_plan_contains"])
    body = f"""<p class="kicker">For founders &middot; published as vaults on sgit.ai &middot; take one and run it</p>
<h1>Business plans to build on sgit</h1>
<p class="lede">Businesses we think should exist on top of sgit, each written up as a vault in enough detail for somebody else to start. {len(d["plans"])} plans as of {esc(d["read_on"])}, each with the plan as an app and as documents, the numbers marked as hypotheses, the facts with their sources, and prototypes enough to serve the first customer. <b>We are looking for business partners to build them.</b> Where nobody does, we may build one ourselves. Either way the plan is public, on the same terms as the code.</p>
<div class="note">The plans live in their vaults on sgit.ai and are linked, not copied: every plan's page there prints its public read key, and a vault is right where a copy would drift. This page is generated from <code>admin/content/plans.json</code>, one row per plan. If you have just <a href="../finder/index.html">found your startup</a> and it is one of these, the plan is the head start.</div>
<h2 id="plans">The plans</h2>
<div class="tablewrap"><table class="plans"><thead><tr><th>Plan</th><th>The business</th><th>How it makes money</th><th>What is in the vault</th></tr></thead><tbody>{rows}</tbody></table></div>
<h2 id="take">How to take one</h2>
<ol>
<li><b>Open it.</b> Every plan's page on sgit.ai prints its public read key. Open it in the browser with nothing installed, or clone it with <code>sgit clone</code>.</li>
<li><b>Read the one-page version.</b> Every plan starts at <code>plan/00-START-HERE.md</code>, with a reading order after it.</li>
<li><b>Test the numbers.</b> Every price and every hour is a first guess, and every plan says so. The first ten customers are the test.</li>
<li><b>Keep what you build.</b> The plans are offered on the same terms as the code behind them: take it, run it, change it.</li>
<li><b>Send back what broke.</b> It is the one thing we ask, and it makes the next plan better.</li>
</ol>
<h2 id="contains">What every plan contains</h2>
<div class="tablewrap"><table><tbody>{contains}</tbody></table></div>
<p><b>Want to build one of these, or want one written for your idea?</b> The plans start as a voice memo and become a vault the same day. If you want to run one of the businesses above, with us or on your own, or you have one that should exist on this stack, <a href="https://sgit.ai/about/index.html">say so</a>. A plan written on this site would be a row here and a vault of its own; none exists yet.</p>
<p class="small dim">This page moved here from <a href="{esc(d["source"])}">sgit.ai/startups/business-plans.html</a> on {esc(d["read_on"])}; the rows were read from that page at site v0.7.87.</p>
"""
    page("plans/index.html", "Business plans to build on sgit", body, f"{len(d['plans'])} complete business plans published as vaults on sgit.ai, for other people to build companies on: how to take one, and what every plan contains.", crumbs=(("Build on vaults", "vaults/index.html"), ("Business plans", "plans/index.html")))
    return d


# ------------------------------------------------------------------ briefs, articles, decisions
def build_briefs():
    files = sorted((ROOT / "admin/content/briefs").glob("*.md"))
    cards, llms = [], []
    for f in files:
        text = f.read_text(encoding="utf-8")
        title = re.search(r"^# (.+)$", text, re.M).group(1).strip()
        rest = text.split("\n", 1)[1]
        rel = f"briefs/{f.stem}.html"
        short = title.split(":")[0]
        is_transcript = f.stem.startswith("01__")
        body = f'<article class="doc{" transcript" if is_transcript else ""}"><h1>{esc(title)}</h1><div class="body">{md(rest)}</div></article>'
        page(rel, short, body, f"{short}: the brief this site is built from, published verbatim.", crumbs=(("The briefs", "briefs/index.html"), (short, rel)), twin=text)
        kind = "note" if "__note-" in f.stem else "the brief"
        cards.append(f'<div class="card"><span class="k">{kind} {f.stem[:2]}</span><h3><a href="{f.stem}.html">{esc(short)}</a></h3><p>{esc(title.split(":", 1)[1].strip() if ":" in title else "")}</p><a class="more" href="{f.stem}.html">Read it &rarr;</a></div>')
        llms.append((rel, short))
    body = f"""<h1>The briefs</h1>
<p class="lede">What this site is built from: Dinis's voice memo of 20 October 2026, published verbatim as transcribed, and the message that started the session that built the site. The brief is never edited to look right afterwards; where the work departed from it, <a href="../admin/corrections.html">the corrections file</a> says so.</p>
<div class="cards">{"".join(cards)}</div>
<div class="note">The memo asks for a finder that works for humans and for agents, LLM-driven first, not passing judgement, and for the site to take over the startups material. <a href="../articles/find-your-startup.html">The first article</a> says the same in Dinis's voice with the brief for the roles; <a href="../decisions/index.html">the decisions</a> are the three the memo contains.</div>
<p class="small dim">The captured markdown is in <code>admin/content/briefs/</code>. The guidance the memo points at is <a href="https://sgit.ai/docs/guidance/repositories.html">Every sgit repository</a>, which asks a new repository to publish its brief in full with the initial prompt.</p>
"""
    page("briefs/index.html", "The briefs", body, "The voice memo and the initial prompt this site is made from, verbatim.", crumbs=(("The briefs", "briefs/index.html"),))
    return llms


def render_articles(src, outdir, agent):
    out = []
    for f in sorted((ROOT / "admin/content" / src).glob("[0-9][0-9]__*.md")):
        fm, text = frontmatter(f.read_text(encoding="utf-8"))
        slug = f.stem.split("__", 1)[1]
        a = {k: fm_get(fm, k) for k in ("title", "date", "author", "summary", "version", "tags", "status")}
        if a["status"] != "published":
            continue
        rel = f"{outdir}/{slug}.html"
        hook = a["title"].split(":")[0]
        if agent:
            kicker = "agent article"
            byline = f'By <code>{esc(a["author"])}</code>, an agent of this site, in its own voice, about work it did. Decisions it quotes are attributed to Dinis by name; the editorial responsibility is Dinis&rsquo;s.'
        else:
            kicker = "article"
            byline = f'By {esc(a["author"])}, co-written with this site&rsquo;s journalist, <code>startups.journalist</code>, in {esc(a["author"])}&rsquo;s voice; the editorial responsibility is {esc(a["author"])}&rsquo;s.'
        body = (f'<article class="doc"><p class="kicker">{kicker} &middot; {esc(a["date"])} &middot; site {esc(a["version"])} &middot; <a href="{slug}.md">markdown</a></p><h1>{esc(a["title"])}</h1><p class="byline">{byline}</p>'
                f'<div class="src"><b>Abstract.</b> {esc(a["summary"])}</div><div class="body">{md(text)}</div></article>')
        page(rel, hook, body, a["summary"][:300], crumbs=(("Articles", "articles/index.html"), (hook, rel)), twin=f.read_text(encoding="utf-8"))
        out.append((rel, a))
    return out


def build_articles():
    co = render_articles("articles", "articles", agent=False)
    ag = render_articles("agent-articles", "agent-articles", agent=True)

    def li(rel, a):
        title = a["title"].split(":", 1)
        by = f' &middot; <code>{esc(a["author"])}</code>' if rel.startswith("agent-articles/") else ""
        return f'<li><a href="../{rel}"><b>{esc(title[0])}</b></a>: {esc(title[1].strip() if len(title) > 1 else "")} <span class="small dim">({esc(a["date"])}, site {esc(a["version"])}{by})</span></li>'
    body = f"""<h1>Articles</h1>
<p class="lede">How the work on this site is communicated: as articles, in two streams. Each page links its markdown twin, which is the file to hand to an agent.</p>
<h2 id="co-written">Co-written with Dinis</h2>
<p class="small dim">In Dinis&rsquo;s voice, from his memos, written up with this site&rsquo;s journalist. They are the briefs: an idea, a task or a review researched, counted and written up before any role acts on it, ending with a brief a role can execute. The shape is the newsroom&rsquo;s. Sources in <code>admin/content/articles/</code>.</p>
<ol class="articles">{"".join(li(r, a) for r, a in co)}</ol>
<h2 id="agents">By the agents</h2>
<p class="small dim">In the agent&rsquo;s own voice: every agent writes one when it has finished a significant body of work, with what it did, the changes, and what it leaves for the other roles. When it refers to a human decision it names who made it. Sources in <code>admin/content/agent-articles/</code>; the decisions they record are on <a href="../decisions/index.html">the decisions page</a>.</p>
<ol class="articles">{"".join(li(r, a) for r, a in ag) or "<li class='dim'>none yet</li>"}</ol>
<p class="small dim">The journalist&rsquo;s mandate is <a href="../team/journalist/index.html">its role</a>.</p>
"""
    page("articles/index.html", "Articles", body, "This site's articles: co-written with Dinis, and by the agents about their work.", crumbs=(("Articles", "articles/index.html"),))
    build_decisions()
    return co + ag


def build_decisions():
    rows, secs = [], []
    for f in sorted((ROOT / "admin/content/decisions").glob("[0-9][0-9][0-9]__*.md")):
        text = f.read_text(encoding="utf-8")
        title = re.search(r"^# (.+)$", text, re.M).group(1).strip()
        num, slug = f.stem.split("__", 1)
        decided = re.search(r"^\*\*Decided\.\*\*\s*(.+)$", text, re.M)
        rows.append(f'<tr><td><a href="#{slug}">{num}</a></td><td>{esc(decided.group(1) if decided else "")}</td><td>{esc(title)}</td></tr>')
        secs.append(f'<section id="{slug}"><h2>{num} &middot; {esc(title)}</h2>{md(text.split(chr(10), 1)[1])}</section>')
    body = f"""<h1>Decisions</h1>
<p class="lede">Dinis&rsquo;s decisions on what the finder is and how this site works, one record each, in the order made, in his words. A decision is never deleted; a later one supersedes it and says so.</p>
<div class="tablewrap"><table><thead><tr><th>#</th><th>Decided</th><th>Decision</th></tr></thead><tbody>{"".join(rows)}</tbody></table></div>
<div class="doc"><div class="body">{"".join(secs)}</div></div>
<p class="small dim">The sources are in <code>admin/content/decisions/</code>. Each names the article that recorded it.</p>
"""
    page("decisions/index.html", "Decisions", body, "Dinis's decisions on what the finder is and how this site works, in his words.", crumbs=(("Decisions", "decisions/index.html"),))


# ------------------------------------------------------------------ team
def build_team():
    roles = []
    for d in sorted((ROOT / "team").iterdir()):
        if not d.is_dir() or not (d / "role.md").exists():
            continue
        text = (d / "role.md").read_text(encoding="utf-8")
        title = re.search(r"^# (.+)$", text, re.M).group(1).strip()
        claim = re.search(r"\*\*Central claim\.\*\*\s*(.+)", text)
        claim = claim.group(1).strip() if claim else ""
        issues = {st: sorted(p.name for p in (d / "issues" / st).glob("*.md")) for st in ("open", "blocked", "done")}
        briefs = sorted(p.name for p in (d / "briefs").glob("*.md")) if (d / "briefs").exists() else []
        debriefs = sorted(p.name for p in (d / "debriefs").glob("*.md")) if (d / "debriefs").exists() else []
        rel = f"team/{d.name}/index.html"
        lists = ""
        for st in ("open", "blocked", "done"):
            items = "".join(f'<li><a href="issues/{st}/{esc(n)}">{esc(n[:-3])}</a></li>' for n in issues[st]) or "<li class='dim'>none</li>"
            lists += f"<h3>Issues: {st} ({len(issues[st])})</h3><ul>{items}</ul>"
        bl = "".join(f'<li><a href="briefs/{esc(n)}">{esc(n[:-3])}</a></li>' for n in briefs) or "<li class='dim'>none yet</li>"
        dl = "".join(f'<li><a href="debriefs/{esc(n)}">{esc(n[:-3])}</a></li>' for n in debriefs) or "<li class='dim'>none yet</li>"
        body = (f'<article class="doc"><div class="body">{md(text)}</div>'
                f'<h2 id="work">The work environment</h2><p class="small dim">The folder is the status: an issue moves between open/, blocked/ and done/ with a <code>git mv</code>. '
                f'Another role may read this folder; only this role writes into it. Briefs arrive here; debriefs are what the role reports back, stamped with the version.</p>'
                f'{lists}<h3>Briefs</h3><ul>{bl}</ul><h3>Debriefs</h3><ul>{dl}</ul></article>')
        page(rel, title, body, f"{title}: its mandate, what it refuses, and its work.", crumbs=(("The team", "team/index.html"), (title, rel)))
        roles.append((d.name, title, claim, sum(len(v) for v in issues.values()), len(issues["open"]), len(issues["blocked"]), len(issues["done"])))
    cards = "".join(f'<div class="card"><span class="k">role</span><h3><a href="{n}/index.html">{esc(t)}</a></h3><p>{esc(c)}</p><p class="small">{o} open, {b} blocked, {dn} done</p><a class="more" href="{n}/index.html">The role &rarr;</a></div>' for n, t, c, k, o, b, dn in roles)
    body = f"""<h1>The team</h1>
<p class="lede">The roles that run this site, one folder each, after <a href="https://gen-z-developers.sgit.ai/team/index.html">the roles of gen-z-developers.sgit.ai</a> and <a href="https://sgit.ai/team/index.html">how sgit.ai is run</a>. Each role names what it refuses; a role definition that would read the same in any other repository has failed its brief. The journalist writes the articles that brief the others; the interviewer runs the finder with people; the librarian keeps the finder as data; the engineer keeps the site buildable, gated and released.</p>
<div class="cards role-grid">{cards}</div>
<div class="note">No session has yet run as a role: the first release was built by one session acting as all four, and the engineer's agent article says which decisions were whose. The issues are the first board. Work for a role arrives as a brief in its <code>briefs/</code> folder; only the role writes into its <code>issues/</code>.</div>
<p class="small dim">The pattern is <code>team/ISSUES.md</code>: <code>role.md</code> with Identity, Foundation, Primary Responsibilities and Core Workflows; <code>issues/open|blocked|done/</code> where the folder is the status; <code>briefs/</code> and <code>debriefs/</code>, stamped with the site version.</p>
"""
    page("team/index.html", "The team", body, "The roles that run this site: journalist, interviewer, librarian, engineer.", crumbs=(("The team", "team/index.html"),))
    return roles


# ------------------------------------------------------------------ vault
def build_vault():
    v = json.loads((ROOT / "admin/content/vault.json").read_text(encoding="utf-8"))
    would = "".join(f"<li><code>{esc(k)}</code>: {esc(w)}</li>" for k, w in v["would_hold"].items())
    body = f"""<h1>The vault</h1>
<p class="lede">None yet, and this page says so rather than describing one in the present tense. The sibling sites keep their working versions in a public, zero-knowledge encrypted vault with the read key published; this site has nothing that needs one as of {VERSION}.</p>
<h2>Why not yet</h2>
<ul>
<li><b>The finder's records belong to the people who make them.</b> The page keeps answers in the browser; a model keeps them in the conversation. Nothing reaches this site unless somebody publishes it.</li>
<li><b>The business plans live in their own vaults</b> on sgit.ai, each with its read key on its page there.</li>
<li><b>The roles' work is in the repository</b>, as issues, briefs and debriefs.</li>
</ul>
<h2>What a vault would hold</h2>
<ul>{would}</ul>
<h2>The rule, and the gate</h2>
<p>When a vault exists, only its <b>read</b> key goes on this page and in <code>admin/content/vault.json</code>; the write key is held by Dinis and exists nowhere in this repository. The release gate refuses any file carrying a private sgit key, the same rule sgit's own scanner uses, and the release script scans every staged diff; <a href="../admin/index.html">the admin page</a> lists the checks. The method for publishing one is <a href="https://sgit.ai/demos/vaults/publishing.html">on sgit.ai</a>.</p>
"""
    page("vault/index.html", "The vault", body, "No vault yet, why, and what one would hold.", crumbs=(("The vault", "vault/index.html"),))
    return v


# ------------------------------------------------------------------ storyboards
def kit_head():
    """The storyboard kit's files, vendored, loaded with the manifest's integrity strings (same origin, so no crossorigin).
    Classic scripts in order: fonts, styles, Rough.js, the security pack, this site's pack, the kit. The prefs key is this
    site's own so the viewer's settings are not shared with another site's."""
    kit = json.loads((ROOT / "admin/content/storyboards/kit.json").read_text(encoding="utf-8"))
    base = f"assets/vendor/storyboards/{kit['release']}/"
    man = json.loads((ROOT / base / "manifest.json").read_text(encoding="utf-8"))
    integ = {f["path"]: f["integrity"] for f in man["files"]}
    def tag(rel, up):
        if rel.endswith(".css"):
            return f'<link rel="stylesheet" href="{up}{base}{rel}" integrity="{integ[rel]}">'
        return f'<script src="{up}{base}{rel}" integrity="{integ[rel]}"></script>'
    def head(up):
        return "\n".join([tag("fonts.css", up), tag("storyboard.css", up), tag("vendor/rough-4.6.6.js", up), tag("props/security.js", up),
                          f'<script src="{up}assets/storyboards/startups-props.js"></script>',
                          "<script>window.StoryboardPrefsKey = 'startups.storyboards.v1';</script>", tag("storyboard.js", up)]) + "\n"
    return kit, head


def build_storyboards():
    import subprocess
    r = subprocess.run(["node", str(ROOT / "admin/build/storyboards.mjs")], capture_output=True, text=True)
    if r.returncode:
        sys.exit("build: storyboards.mjs failed\n" + r.stderr + r.stdout)
    st = json.loads(r.stdout)
    kit, head = kit_head()
    cast = json.loads((ROOT / "admin/content/storyboards/cast.json").read_text(encoding="utf-8"))
    for name in ("cast.json",):
        written.append(f"storyboards/{name}")
    for b in st["boards"]:
        for f in ("storyboard.json", "bundle.json", "graph.json", "script.md"):
            written.append(f"storyboards/{b['slug']}/{f}")
    api = f"{kit['host']}/{kit['path']}/"

    # ---- one page per storyboard: the kit's viewer, wired from the same markup storyboards.sgit.ai writes
    tools = ('<div class="sb-tools" role="toolbar" aria-label="How to view the panels"><span class="sb-views" role="group" aria-label="View">'
             '<button type="button" data-view="deck" title="One panel at a time (d)">Deck</button><button type="button" data-view="grid" title="Every panel on one page (g)">Grid</button>'
             '<button type="button" data-view="script" title="The storyboard as text (t)">Script</button></span>'
             '<label class="sb-for-grid">Per row <select class="sb-cols"><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option></select></label>'
             '<label title="Panels play as they arrive (a)"><input type="checkbox" class="sb-anim"> Animation</label>'
             '<label class="sb-for-grid" title="Each panel\'s script under it (x)"><input type="checkbox" class="sb-showtext"> Text</label>'
             '<button type="button" class="sb-playall sb-for-grid" title="Play the panels one after another (p)">Play in order</button>'
             '<input type="search" class="sb-filter sb-for-list" placeholder="Filter: a word, a name, a mood" aria-label="Filter the panels"></div>')
    deck = ('<div class="sb-deck" hidden><div class="sb-track"></div><div class="sb-bar"><button type="button" class="sb-prev" aria-label="Previous panel">&larr;</button>'
            '<span class="sb-count"></span><button type="button" class="sb-next" aria-label="Next panel">&rarr;</button><button type="button" class="sb-replay" title="Play this panel (p)">&#9654; Play</button>'
            '<button type="button" class="sb-notes-toggle" title="Notes (n)">Notes</button><button type="button" class="sb-full" title="Full screen (f)">Full screen</button></div><div class="sb-notes"></div></div>')
    for i, b in enumerate(st["boards"]):
        sb = json.loads((ROOT / "storyboards" / b["slug"] / "storyboard.json").read_text(encoding="utf-8"))
        rel = f"storyboards/{b['slug']}/index.html"
        script = (ROOT / "storyboards" / b["slug"] / "script.md").read_text(encoding="utf-8")
        payload = json.dumps({"storyboard": sb, "cast": cast}, ensure_ascii=False).replace("</", "<\\/")
        prev = st["boards"][i - 1] if i else None
        nxt = st["boards"][i + 1] if i + 1 < len(st["boards"]) else None
        panels = "".join(f'<li><a href="#scene-{j + 1}">{j + 1}.</a> {esc(sc.get("caption") or sc.get("punchline") or sc.get("title") or "")} <span class="small dim">({esc(sc.get("kind", "scene"))})</span></li>' for j, sc in enumerate(sb["scenes"]))
        body = f"""<p class="kicker">storyboard {i + 1} of {len(st["boards"])} &middot; {b["panels"]} panels &middot; <span class="badge proposed">{esc(sb.get("status", "draft"))}</span> &middot; drawn by the kit {esc(kit["release"])}</p>
<h1>{esc(sb["title"])}</h1>
<p class="lede">{esc(sb.get("subtitle", ""))}</p>
<p class="small dim">{esc(sb.get("by", ""))}. {esc(sb.get("rule", ""))}</p>
<div class="sb-viewer">{tools}{deck}<div class="sb-grid" hidden></div><div class="sb-script" hidden></div><script type="application/json" class="sb-data">{payload}</script></div>
<h2 id="take">Take it with you</h2>
<p>The same storyboard in the shapes the kit gives it. The pictures are drawn in your browser from the data; nothing here is an image file.</p>
<div class="cards">
<a class="card" href="storyboard.json"><span class="k">storyboard.json</span><h3>The data</h3><p>As written in <code>admin/content/storyboards/</code>.</p></a>
<a class="card" href="bundle.json"><span class="k">bundle.json</span><h3>With its cast</h3><p>What an embed fetches: the storyboard, the cast and the packs it names.</p></a>
<a class="card" href="index.md"><span class="k">index.md</span><h3>The script</h3><p>Every panel as text, made by the kit's formats.js; this page's markdown twin.</p></a>
<a class="card" href="graph.json"><span class="k">graph.json</span><h3>The graph</h3><p>{b["stats"].get("panels", b["panels"])} panels as nodes and the edges that carry the meaning: says, shows, quotes, next.</p></a>
</div>
<h2 id="embed">Put it on another page</h2>
<p>Two lines, from any site, with the kit pinned to the release this site vendors. The embed knows the kit's own props and the security pack; this site's pack (the five, the tag, the door, the parcel) is not loadable by the embed yet, so those props are left out of the drawing there (<a href="../feedback/index.html">ask 4</a>).</p>
<pre>&lt;script src="{esc(api)}embed.js" defer&gt;&lt;/script&gt;
&lt;sg-storyboard src="{BASE}storyboards/{b["slug"]}/bundle.json" view="deck"&gt;&lt;/sg-storyboard&gt;</pre>
<h2 id="panels">The panels</h2>
<ol>{panels}</ol>
<div class="prevnext">{f'<a href="../{prev["slug"]}/index.html">&larr; {esc(prev["title"])}</a>' if prev else '<a href="../index.html">&larr; All storyboards</a>'}{f'<a href="../{nxt["slug"]}/index.html">{esc(nxt["title"])} &rarr;</a>' if nxt else '<a href="../design/index.html">The design experiments &rarr;</a>'}</div>
"""
        twin = twin_text(rel, sb["title"], sb.get("subtitle", ""), script)
        page(rel, sb["title"], body, sb.get("subtitle", "")[:300], crumbs=(("Storyboards", "storyboards/index.html"), (sb["title"], rel)), extra_head=head("../../"), wide=True, twin=twin)

    # ---- the cast
    rows = "".join(f'<tr><td><b>{esc(c["name"])}</b><br><span class="small dim">{esc(c["id"])} &middot; {esc(c.get("pronouns", ""))}{(" &middot; " + str(c["age"])) if c.get("age") else ""}</span></td><td>{esc(c.get("role", ""))}</td><td>{esc(c.get("stands_for", ""))}</td><td><i>{esc(c.get("line", ""))}</i></td><td>{esc(c.get("from", "this site"))}</td></tr>' for c in cast["characters"])
    cast_payload = json.dumps({"cast": cast}, ensure_ascii=False).replace("</", "<\\/")
    body = f"""<h1>The cast</h1>
<p class="lede">{len(cast["characters"])} characters, one per way in on the finder's spectrum plus the voice of the site and the agent that runs the interview. Three are shared with <a href="https://storyboards.sgit.ai/gen-z-developers/cast.html">the book's cast</a>, look unchanged, so the family of sites reads the same; four are this site's own. Every look is data in <a href="../cast.json"><code>cast.json</code></a>, drawn by the kit; nothing is an image.</p>
<div class="sb-cast"><div class="sb-cast-grid">{"".join(f'<div class="card"><svg data-who="{esc(c["id"])}" data-poses="stand,point,wave,think" data-moods="happy,determined,happy,thinking" role="img" aria-label="{esc(c["name"])} in four poses"></svg><h3>{esc(c["name"])}</h3><p>{esc(c.get("role", ""))}</p><p class="small"><i>{esc(c.get("line", ""))}</i></p></div>' for c in cast["characters"])}</div><script type="application/json" class="sb-data">{cast_payload}</script></div>
<h2 id="who">Who they are</h2>
<div class="tablewrap"><table><thead><tr><th>Character</th><th>Role</th><th>Stands for</th><th>Line</th><th>From</th></tr></thead><tbody>{rows}</tbody></table></div>
<h2 id="sheet">The model sheet</h2>
<p>Every character in every mood and every pose the kit knows, so a storyboard's author can pick by eye.</p>
<div class="sb-sheet"><script type="application/json" class="sb-data">{cast_payload}</script></div>
<p class="small dim">The cast is a proposal for Dinis (<code>cast.json</code>, <code>what</code>). Characters use the pronouns their cast entry gives. A character's badge (explorer, villager, town planner) is a centre of gravity, not a box, as the book describes it.</p>
"""
    page("storyboards/cast/index.html", "The cast", body, "The characters of this site's storyboards: one per way in on the finder's spectrum, the Guide and the Finder.", crumbs=(("Storyboards", "storyboards/index.html"), ("The cast", "storyboards/cast/index.html")), extra_head=head("../../"), wide=True)

    # ---- the design experiments
    strip = lambda slug, **kw: f'<sg-strip src="../{slug}/bundle.json" href="../{slug}/index.html" ' + " ".join(f'{k}="{v}"' for k, v in kw.items()) + "></sg-strip>"
    body = f"""<h1>Design experiments</h1>
<p class="lede">The same storyboards, drawn by the same kit, laid out differently. Dinis's brief: the storyboards are a nice thing to have on this site rather than the main thing, they are quite big as they come, and the design is the thing to explore: layouts, schemas, colours, characters. Each experiment below names what it changes and what it costs, and feeds <a href="../feedback/index.html">the brief back to the storyboards team</a>. Switch the theme in the top bar to see the ink experiment.</p>
<h2 id="kit">0. As the kit draws it</h2>
<p>The deck: one panel at a time in a dark frame, a toolbar, a bar, notes, full screen. Right for a storyboard page; heavy for a figure in a page of prose. <a href="../do-they-miss-it/index.html">Open the first strip in the deck.</a></p>
<h2 id="strip">1. A strip, three per row, as the kit draws each panel</h2>
<p>The <code>sg-strip</code> component draws each panel with <code>drawScene</code> into its own grid: no toolbar, no frame, a number and nothing else under each panel. A click opens the deck at that panel. The bubbles are the kit's; at a third of the measure the four-line ones are hard to read.</p>
{strip("do-they-miss-it", cols=3)}
<h2 id="silent">2. Silent panels, the lines under them</h2>
<p>The same strip with the speech taken out of a copy of each scene before drawing, and printed under the panel. The picture carries the setting, the people and their moods; the text carries the words. Small panels become legible, and the lines are selectable text. The cost: the panel no longer says who speaks first without the text.</p>
{strip("do-they-miss-it", cols=3, mode="silent")}
<h2 id="captions">3. Captions outside too</h2>
<p>The yellow caption box is the kit's narrator voice. Outside the panel it reads as a figure caption, and the panel is only the drawing.</p>
{strip("five-ways-in", cols=4, mode="silent", captions="out")}
<h2 id="ink">4. Theme ink</h2>
<p>The kit draws on cream paper with dark ink in every theme, like a printed picture, on purpose. This experiment maps the kit's two constants and its white fills to this site's tokens after drawing, so the panel follows Night, Paper, Blueprint or Ember. It is a remap of the output, not a kit option: the hachure fills and the coloured props keep their colours, which is why it is here and not on the front page. Ask 1 in the brief is the kit doing this properly.</p>
{strip("the-route-is-a-rule", cols=3, mode="silent", ink="theme")}
<h2 id="sizes">5. One per row, with the script beside it</h2>
<p>At the full measure a panel reads as the kit intends, bubbles included, and the lines under it become a transcript. Two panels a row is the shape a strip in prose wants; one is a figure.</p>
{strip("it-is-not-ready-yet", cols=2, panels="2-3")}
<h2 id="figure">6. A figure in prose</h2>
<div class="twocol">
<div>{strip("it-is-not-ready-yet", cols=1, panels="4", mode="silent", captions="out")}</div>
<div><p>One panel beside a paragraph, silent, caption as a figure caption. This is the shape the finder's pages would use if the storyboards left this section: the evidence panel of <a href="../it-is-not-ready-yet/index.html">It is not ready yet</a> quoting the rule of the finder, word for word from <code>finder.json</code>, beside the paragraph that explains it.</p><p>The quote in the panel is checked by the build against the file: a line marked <code>from_finder</code> must equal a string in <code>finder.json</code>, or the build fails. The same rule the book's site applied to its chapters.</p></div>
</div>
<h2 id="try">7. Try the combinations</h2>
<p>Every switch above, live, on the spectrum strip.</p>
{strip("five-ways-in", cols=4, controls="")}
<h2 id="what">What these do not settle</h2>
<ul>
<li><b>Panel format.</b> Everything is 16:10, the kit's one shape. A square or a 4:5 portrait would hold two people and a prop better in a strip (ask 6).</li>
<li><b>Text scale.</b> Silent panels dodge the problem; a kit option would solve it (ask 7).</li>
<li><b>The characters.</b> The cast page shows them; whether Rui, Inês and Ana are the right four, and whether the Finder should look like an agent or like a page, is for Dinis.</li>
<li><b>Where they go.</b> Nothing on the finder's pages embeds a strip yet; this section is the experiment. Decision 004.</li>
</ul>
"""
    page("storyboards/design/index.html", "Design experiments", body, "The storyboards laid out differently: strips, silent panels, captions outside, theme ink, sizes, a figure in prose.", crumbs=(("Storyboards", "storyboards/index.html"), ("Design experiments", "storyboards/design/index.html")), extra_head=head("../../"), wide=True, module="assets/components/sg-strip/sg-strip.js")

    # ---- the feedback brief
    fm, text = frontmatter((ROOT / "admin/content/storyboards/feedback.md").read_text(encoding="utf-8"))
    body = f'<article class="doc"><p class="kicker">{esc(fm_get(fm, "kicker"))}</p><h1>{esc(fm_get(fm, "title"))}</h1><p class="lede">{esc(fm_get(fm, "description"))}</p><div class="body">{md(text)}</div></article>'
    page("storyboards/feedback/index.html", fm_get(fm, "title"), body, fm_get(fm, "description"), crumbs=(("Storyboards", "storyboards/index.html"), ("Feedback", "storyboards/feedback/index.html")))

    # ---- the index
    cards = "".join(f'<div class="card"><span class="k">storyboard {i + 1} &middot; {b["panels"]} panels</span><h3><a href="{b["slug"]}/index.html">{esc(b["title"])}</a></h3><p>{esc(b["subtitle"])}</p><a class="more" href="{b["slug"]}/index.html">Open the deck &rarr;</a></div>' for i, b in enumerate(st["boards"]))
    strips = "".join(f'<h3 id="{b["slug"]}"><a href="{b["slug"]}/index.html">{esc(b["title"])}</a></h3><sg-strip src="{b["slug"]}/bundle.json" href="{b["slug"]}/index.html" cols="{min(b["panels"], 4)}" mode="silent" captions="out"></sg-strip>' for b in st["boards"])
    body = f"""<p class="kicker">An experiment, on a page of its own &middot; decision 004 &middot; kit {esc(kit["release"])} from api.storyboards.sgit.ai, vendored</p>
<h1>Storyboards</h1>
<p class="lede">This site's concepts as storyboards: the loop, the spectrum, the excuses and the rules, drawn by code from data with <a href="https://storyboards.sgit.ai/">the storyboards kit</a>. {len(st["boards"])} strips, {st["panels"]} panels, {st["characters"]} characters. Short on purpose: a nice thing to have beside the pages, not the main thing. The <a href="design/index.html">design experiments</a> try other layouts; <a href="feedback/index.html">the brief</a> sends what was learnt back.</p>
<div class="cards">{cards}</div>
<h2 id="strips">The strips, silent, captions as text</h2>
<p>Each strip as the design experiments ended up drawing it: the panels small, the words under them as text, a click opening the deck. The lines a character speaks from <code>finder.json</code> are the file's, word for word, and the build checks them.</p>
{strips}
<h2 id="how">How they are made</h2>
<ul>
<li><b>Data.</b> One JSON file per storyboard and one cast in <code>admin/content/storyboards/</code>, in <a href="https://api.storyboards.sgit.ai/docs/format.html">the kit's format</a>, validated by its <code>formats.js</code> on every build. <a href="cast/index.html">The cast</a> is three characters shared with the book and four of this site's own.</li>
<li><b>Drawing.</b> The kit's release {esc(kit["release"])}, vendored byte for byte under <code>assets/vendor/storyboards/</code> with its manifest; the gate recomputes every hash. This site adds a prop pack (the five, a price tag, a door, a parcel) and the <code>sg-strip</code> component.</li>
<li><b>Quotes.</b> A line marked <code>from_finder</code> must be in <code>finder.json</code> word for word (decision 002: nothing about the interview is written twice).</li>
<li><b>Shapes.</b> Each storyboard has its data, its bundle for an embed, its graph and its script as the page's markdown twin.</li>
</ul>
<p class="small dim">The storyboards began on <a href="https://gen-z-developers.sgit.ai/storyboards/index.html">the book's site</a>, moved to <a href="https://storyboards.sgit.ai/">storyboards.sgit.ai</a> on 20 October 2026, and this is the first site to draw its own with the kit from outside. Status: a proposal for Dinis; the cast and every panel are drafts.</p>
"""
    page("storyboards/index.html", "Storyboards", body, "This site's concepts as storyboards drawn by code: the loop, the spectrum, the excuses and the rules; an experiment with the storyboards kit.", crumbs=(("Storyboards", "storyboards/index.html"),), extra_head=head("../"), wide=True, module="assets/components/sg-strip/sg-strip.js")
    return st


# ------------------------------------------------------------------ the review folder
def build_review(pages):
    d = Derive(ROOT)
    stats = d.write(pages=pages, version=VERSION)
    stories = json.loads((ROOT / "review/intent/stories.json").read_text(encoding="utf-8"))
    gaps = json.loads((ROOT / "review/join/gaps.json").read_text(encoding="utf-8"))
    files = json.loads((ROOT / "review/graph/files.json").read_text(encoding="utf-8"))
    have = {s["path"] for s in json.loads((ROOT / "review/graph/surfaces.json").read_text(encoding="utf-8"))["surfaces"]}

    def ex(e):
        ok = e["surface"] in have or (ROOT / e["surface"]).exists()
        return f'<li>{esc(e["example"])} <span class="badge {"exists" if ok else "missing"}">{"exists" if ok else "missing"}</span> <code>{esc(e["surface"])}</code></li>'
    tree = "".join(f'<section id="{esc(s["id"])}"><h3>{esc(s["title"])} <span class="badge proposed">proposed</span></h3><p class="small dim">from {esc(s["source"]["doc"])}, {esc(s["source"]["section"])}</p>'
                   + "".join(f'<p><b>{esc(r["rule"])}</b></p><ul>{"".join(ex(e) for e in r["examples"])}</ul>' for r in s["rules"]) + "</section>" for s in stories["stories"])
    gap_rows = "".join(f'<tr><td><code>{esc(g["intent"])}</code></td><td><code>{esc(g["surface"])}</code></td><td>{esc(g["how"])}</td></tr>' for g in gaps["gaps"]) or '<tr><td colspan="3">none</td></tr>'
    by_lang = {}
    for f in files["files"]:
        by_lang[f["language"]] = by_lang.get(f["language"], 0) + 1
    body = f"""<h1>The review</h1>
<p class="lede">The project as layered graphs, after <a href="https://sgit.ai/docs/briefs/code-review-graphs-in-the-repository.html">the review brief</a>: the intent, top down from the brief, as stories, rules and examples that name the surface each touches; the tree, bottom up, as files and surfaces; and the join between them. A subset, and it says so: no methods, no change files, no navigator yet.</p>
<p><span class="stat"><b>{int(stats["coverage"] * 100)}%</b><span>coverage</span></span><span class="stat"><b>{stats["matches"]}</b><span>examples with a surface</span></span><span class="stat"><b>{stats["gaps"]}</b><span>gaps</span></span><span class="stat"><b>{stats["files"]}</b><span>source files</span></span><span class="stat"><b>{stats["surfaces"]}</b><span>surfaces</span></span></p>
<p class="small dim">Coverage is the share of intent examples and flow steps whose surface exists in the tree. Every intent node is <i>proposed</i>: written by the engineer agent from the memo, not yet read back and accepted by Dinis. Source files by language: {esc(", ".join(f"{k} {v}" for k, v in sorted(by_lang.items())))}.</p>
<h2 id="intent">The intent</h2>
{tree}
<h2 id="gaps">The gaps</h2>
<div class="tablewrap"><table><thead><tr><th>Intent</th><th>Surface asked for</th><th>Finding</th></tr></thead><tbody>{gap_rows}</tbody></table></div>
<h2 id="files">The folder</h2>
<ul>
<li><code>review/intent/</code>: <a href="intent/stories.json">stories.json</a>, <a href="intent/flows.json">flows.json</a>, <a href="intent/components.json">components.json</a>, <a href="intent/deploy.json">deploy.json</a></li>
<li><code>review/graph/</code>: <a href="graph/files.json">files.json</a> (every source file with its hash; the gate recomputes them), <a href="graph/surfaces.json">surfaces.json</a></li>
<li><code>review/join/</code>: <a href="join/matches.json">matches.json</a>, <a href="join/gaps.json">gaps.json</a></li>
<li><code>review/tools/derive.py</code> writes the derived files; <a href="README.md">README.md</a> and <a href="BRIEF-CORRECTIONS.md">BRIEF-CORRECTIONS.md</a> say what is and is not here; <code>review/self/</code> is a README until the navigator exists.</li>
</ul>
<p class="small dim">The navigator as web components is <a href="../team/engineer/index.html">the engineer&rsquo;s first issue</a>.</p>
"""
    page("review/index.html", "The review", body, "The project as layered graphs: the intent from the brief, the tree, the join and the gaps.", crumbs=(("The review", "review/index.html"),))
    return stats


# ------------------------------------------------------------------ admin, home, agent surface
def build_admin(stats):
    vs = json.loads((ROOT / "admin/content/versions.json").read_text(encoding="utf-8"))
    if vs["releases"][-1]["version"] != VERSION:
        sys.exit(f"build: version.txt says {VERSION} but the newest row in admin/content/versions.json is {vs['releases'][-1]['version']}; add a row")
    rows = "".join(f'<tr><td><b>{esc(r["version"])}</b></td><td>{esc(r["date"])}</td><td>{esc(r["what"])}</td></tr>' for r in reversed(vs["releases"]))
    page("admin/versions.html", "Release history", f'<h1>Release history</h1><p class="lede">Every release of this site, narrated: a reader should understand the change without opening the diff. Every push to <code>dev</code> is a release, tagged <code>vX.Y.Z</code> by CI, which refuses a release whose <code>version.txt</code> disagrees with the commit subject.</p><div class="tablewrap"><table><thead><tr><th>Site</th><th>Date</th><th>What changed, and why</th></tr></thead><tbody>{rows}</tbody></table></div>',
         "Every release of startups.sgit.ai, narrated.", crumbs=(("Admin", "admin/index.html"), ("Release history", "admin/versions.html")))
    for name, rel, title, desc in (("REALITY.md", "admin/reality.html", "What exists", "What exists on startups.sgit.ai, by domain, and what does not yet."),
                                   ("BRIEF-CORRECTIONS.md", "admin/corrections.html", "Where the brief was wrong", "Where the brief was departed from, what was found, and what was done instead.")):
        text = (ROOT / name).read_text(encoding="utf-8")
        body = f'<article class="doc"><div class="body">{md(text.split(chr(10), 1)[1])}</div></article><p class="small dim">Rendered from <code>{name}</code> at the repository root; the file is the source.</p>'
        page(rel, title, f"<h1>{esc(title)}</h1>" + body, desc, crumbs=(("Admin", "admin/index.html"), (title, rel)))
    page("admin/index.html", "Admin and engineering", f"""<h1>Admin and engineering</h1>
<p class="lede">How this site is built, the gate it passes, and the rules it keeps.</p>
<h2>The chain</h2>
<pre>python3 admin/build/build.py        # every page and twin, llms.txt, the sitemap, the review's derived layers
node admin/build/validate.js        # the gate, below
node admin/build/test_finder.mjs    # the finder's rules against finder.json, with sample answers
node admin/build/test_interview.mjs # the interview page and the storyboards in a real browser (Playwright; skips without it)
node admin/build/test_storyboards.mjs # the vendored kit against its manifest, the storyboards against the validator and finder.json
python3 admin/build/release.py --what "one sentence" [--minor] [--dev]   # fetch, bump, build, validate, test, tripwire, commit, push, verify live</pre>
<h2>The gate</h2>
<p>Every check fails the build; CI runs the gate and the finder test before it tags a release.</p>
<ol>
<li><b>Version agreement:</b> <code>admin/build/version.txt</code> against the badge on every page, the newest row of the release history, and <code>llms.txt</code>.</li>
<li><b>Internal links resolve, and no page is an orphan:</b> every relative href and src points at a file; every page is reachable from the front page by links.</li>
<li><b>A markdown twin for every page, and every twin in llms.txt.</b></li>
<li><b>Canonical and og:url</b> on every page, on the host in <code>CNAME</code>.</li>
<li><b>Nothing from another origin:</b> no script, stylesheet or image is fetched from outside this site.</li>
<li><b>The key tripwire:</b> no private sgit key, private-key block, cloud, model-provider, GitHub, Slack or Google key shape anywhere in the tree. The release script scans the staged diff too, and the secret part of any key kept in <code>admin/credentials/</code>.</li>
<li><b>Div balance</b> on every page.</li>
<li><b>No em-dash</b> in any page or twin.</li>
<li><b>The sitemap and the tree agree</b> in both directions.</li>
<li><b>The finder's published file is its source:</b> <code>finder/finder.json</code> equals <code>admin/content/finder/finder.json</code>; the deep checks are the finder test.</li>
<li><b>The review folder is fresh:</b> every source file's hash matches <code>review/graph/files.json</code>, and the coverage on the review page is the join's.</li>
<li><b>Every script parses:</b> <code>node --check</code> on every JavaScript file, <code>py_compile</code> on every Python file.</li>
<li><b>The vendored storyboard kit is the release:</b> every file under <code>assets/vendor/storyboards/&lt;release&gt;/</code> hashes to its manifest; the storyboards validate with the kit's own validator and every line marked from_finder is in <code>finder.json</code> (the storyboards test).</li>
</ol>
<p class="small dim">Not here, and said so: a linter or a formatter, as on every sibling site; the Type_Safe guards and crypto vectors of the guidance's list, which have no code to guard here. <a href="corrections.html">The corrections file</a> records both.</p>
<h2>The rules</h2>
<ul>
<li><b>Markdown and JSON are the source of truth.</b> Every page is written by <code>build.py</code>; a generated page is never hand-edited.</li>
<li><b>Every release is narrated</b> in <a href="versions.html">the release history</a>, and the version in <code>admin/build/version.txt</code> must match the commit subject <code>site vX.Y.Z: ...</code>.</li>
<li><b>Count, don't remember.</b> The finder's counts, the review's coverage and the plans' count on their pages are read from the files at build time.</li>
<li><b>No key in the tree.</b> The credentials tier is <code>admin/credentials/</code>, ignored by git; its README says the rules.</li>
<li><b>What exists is in <a href="reality.html">the reality file</a></b>, changed in the same commit as the thing it describes.</li>
</ul>
<h2>Where things are</h2>
<ul>
<li><code>admin/content/</code>: the authored data (finder, plans, briefs, articles, decisions, pages, versions, vault). <code>admin/build/</code>: the build, the gate, the test, the release script.</li>
<li><code>finder/</code>: the published finder (the file, the prompt, the record, the rules module) and its pages. <code>assets/components/</code>: the base and the finder components.</li>
<li><code>team/</code>: the roles, their issues, briefs and debriefs. <code>review/</code>: the review folder.</li>
<li><code>.github/workflows/deploy-pages.yml</code>: validate, tag, deploy to GitHub Pages from <code>dev</code>, the same pipeline as the sibling sites.</li>
</ul>
<p><a href="versions.html">Release history</a> &middot; <a href="reality.html">What exists</a> &middot; <a href="corrections.html">Corrections</a> &middot; <a href="{REPO}">the repository</a></p>
""", "How startups.sgit.ai is built, and the gate it passes.", crumbs=(("Admin", "admin/index.html"),))


def build_home(finder, counts, plans, briefs, articles, roles, stats, mdpages):
    entries = "".join(f'<div class="card"><span class="k">{esc(e["id"])}</span><h3>{esc(e["label"])}</h3><p>{esc(e["what"])}</p></div>' for e in finder["entries"])
    co = [(r, a) for r, a in articles if r.startswith("articles/")]
    ag = [(r, a) for r, a in articles if r.startswith("agent-articles/")]
    body = f"""<section class="hero">
<div class="hero-text">
<p class="kicker">For founders &middot; by Dinis Cruz and this site's agents &middot; the startups section of sgit.ai, now a site of its own</p>
<h1>Find your startup. Then ship it.</h1>
<p class="sub">An interview that helps you zoom in on what to ship, to whom, by when; and the substrate that makes shipping it cheap enough to do this week.</p>
<p>Most people have a good idea. What they are not doing is shipping. The finder is a who-done-it of questions that ends in your own description of what to focus on, with the route picked by a rule you can read. It is not a verdict on your idea; it does not pass judgement. The answer may be: ship the smallest version to five people by Friday. It may be: go old school, raise first.</p>
<p class="ctas"><a class="btn primary" href="finder/prompt.html">Run it in Claude or ChatGPT</a> <a class="btn" href="finder/interview.html">Walk it on this site</a> <a class="btn" href="vaults/index.html">Build on vaults</a></p>
</div>
<div class="loop">{loop_svg()}</div>
</section>
<h2 id="spectrum">Where are you?</h2>
<p class="lede">The finder works along the whole spectrum. The first question is which of these you are; it decides what comes next.</p>
<div class="cards spectrum">{entries}</div>
<h2 id="sections">What is here</h2>
<div class="cards">
<div class="card big"><span class="k">Find your startup &middot; finder {esc(finder["version"])}</span><h3><a href="finder/index.html">The finder: {counts["stages"]} stages, {counts["questions"]} questions, {counts["routes"]} routes, {counts["rules"]} rules</a></h3><p>One file holds the interview; a prompt runs it in a model, a page walks it in the browser, a test proves it. Humans and agents read the same thing. The output is a record in your words, with the rule that picked the route.</p>
<p class="stats"><span class="stat"><b>{counts["stages"]}</b><span>stages</span></span><span class="stat"><b>{counts["questions"]}</b><span>questions</span></span><span class="stat"><b>{counts["signals"]}</b><span>signals</span></span><span class="stat"><b>{counts["routes"]}</b><span>routes</span></span></p>
<span class="more"><a href="finder/index.html">The finder &rarr;</a> &nbsp; <a href="finder/stages.html">The stages &rarr;</a> &nbsp; <a href="finder/routes.html">The routes and rules &rarr;</a> &nbsp; <a href="finder/record.html">The record &rarr;</a></span></div>
<a class="card" href="vaults/index.html"><span class="k">Build on vaults</span><h3>Day one without a database, hosting, an account or an install</h3><p>What a vault removes, the loop from first vault to first customer, what you still bring, and the measured cost base. Moved here from sgit.ai.</p><span class="more">Build your startup on vaults &rarr;</span></a>
<a class="card" href="plans/index.html"><span class="k">Business plans</span><h3>{len(plans["plans"])} plans, published as vaults, to take and run</h3><p>Each with the numbers marked as hypotheses, the facts with their sources, and prototypes enough to serve the first customer. We are looking for partners to build them.</p><span class="more">The plans &rarr;</span></a>
<a class="card" href="articles/index.html"><span class="k">Articles</span><h3>The brief, in Dinis's voice</h3><p>What the finder is and why, ending with the brief for the roles; the memo verbatim; the decisions in his words; the agents' accounts of their work.</p><span class="more">Articles &rarr;</span></a>
<a class="card" href="team/index.html"><span class="k">The team</span><h3>Journalist, interviewer, librarian, engineer</h3><p>Each with what it refuses and its first issues. No session has run as a role yet; the first release was one session as all four.</p><span class="more">The roles &rarr;</span></a>
<a class="card" href="storyboards/index.html"><span class="k">Storyboards &middot; an experiment</span><h3>The loop, the spectrum, the excuses and the rules, drawn</h3><p>Short strips drawn by code from data with the storyboards kit, a cast of seven, and a page of design experiments. On a page of their own, by decision.</p><span class="more">Storyboards &rarr;</span></a>
<a class="card" href="admin/reality.html"><span class="k">What exists</span><h3>The reality file, by domain</h3><p>What is on this site and what is not: a feature that is not in the file does not exist. Review coverage {int(stats["coverage"] * 100)}%, {stats["gaps"]} gaps named.</p><span class="more">What exists &rarr;</span></a>
</div>
<div class="twocol">
<div><h2>The articles</h2>
<ol>{"".join(f'<li><a href="{rel}">{esc(a["title"].split(":")[0])}</a>: {esc(a["title"].split(":", 1)[1].strip())}</li>' for rel, a in co)}</ol>
<p class="small dim">By the agents: {", ".join(f'<a href="{rel}">{esc(a["title"].split(":")[0])}</a>' for rel, a in ag) or "none yet"}. <a href="briefs/index.html">The briefs</a>: the memo and the initial prompt, verbatim.</p></div>
<div><h2>What this site does not claim</h2>
<ul>
<li><b>The finder has not been run with anyone.</b> The questions and rules are a first reading of one memo; the first interview is the interviewer's first issue.</li>
<li><b>It does not judge your idea.</b> By decision; the right startup is the one you are passionate about.</li>
<li><b>sgit.ai's startups pages still exist.</b> The section moved here on 20 October 2026; until the old pages carry a notice, both exist.</li>
<li><b>The review folder is partial</b> and the vault does not exist. <a href="admin/reality.html">The reality file</a> says exactly what does.</li>
</ul></div>
</div>
<p class="small dim">Built from <a href="briefs/01__find-your-startup.html">the voice memo of 20 October 2026</a> and <a href="https://sgit.ai/docs/guidance/repositories.html">the guidance for every sgit repository</a>. Part of <a href="https://sgit.ai/network/index.html">the sgit.ai network</a>. The agent surface is <a href="llms.txt">llms.txt</a>.</p>
"""
    page("index.html", "Find your startup, then ship it", body,
         "startups.sgit.ai: an interview that helps a founder zoom in on what to ship, to whom, by when, run by Claude or ChatGPT or walked on the site; and the vault substrate and business plans to build it on.", wide=True)


def build_agent_surface(finder, counts, briefs, articles, plans):
    page("404.html", "Not here", '<h1>Not here</h1><p>That page is not on this site. <a href="index.html">The front page</a>, <a href="finder/index.html">the finder</a>, <a href="vaults/index.html">build on vaults</a>.</p>', "Page not found.",
         extra_head='<meta name="robots" content="noindex">\n', noindex=True)
    write("robots.txt", f"User-agent: *\nAllow: /\nSitemap: {BASE}sitemap.xml\n")
    pages = [w for w in written if w.endswith(".html") and w != "404.html"]
    write("sitemap.xml", '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
          + "".join(f"  <url><loc>{BASE}{'' if p == 'index.html' else p}</loc></url>\n" for p in sorted(pages)) + "</urlset>\n")
    every = "\n".join(f"- [{t}]({BASE}{rel})" for rel, t in sorted(twins))
    write("llms.txt", f"""# startups.sgit.ai

> Find your startup, then ship it. An interview (the finder) that helps a founder zoom in on what to ship, to whom, by when, run by Claude or ChatGPT or walked on the site, with the output in the founder's own words; the vault substrate that makes shipping cheap; and the business plans published as vaults to build on. By Dinis Cruz and this site's agents. Site {VERSION}.

## The rule of the finder
{finder["rule_of_the_finder"]}

## For an agent running the finder
- The interview as data: {BASE}finder/finder.json (version {finder["version"]}: {counts["stages"]} stages, {counts["questions"]} questions, {counts["signals"]} signals, {counts["routes"]} routes, {counts["rules"]} rules, first match wins)
- The prompt to follow: {BASE}finder/finder-prompt.md
- The record template to fill: {BASE}finder/finder-record.md
- The rules as code: {BASE}finder/finder-rules.js (an ES module; route(finder, signals) returns the rule and the route)
- Every stage and question, with the reason for each: {BASE}finder/stages.md
- The routes and the rules: {BASE}finder/routes.md

## Sections
- [Find your startup]({BASE}finder/index.md): what the finder is, the spectrum, the three ways to run it, what it does not claim
- [Walk the interview]({BASE}finder/interview.md): the stages in the browser (needs a browser; the markdown twin is the explanation)
- [Build your startup on vaults]({BASE}vaults/index.md): what a vault removes on day one, the loop, what you still bring, the evidence; moved from sgit.ai/startups
- [Business plans to build on sgit]({BASE}plans/index.md): {len(plans["plans"])} plans published as vaults on sgit.ai, how to take one, what every plan contains
- [Articles]({BASE}articles/index.md): co-written with Dinis, and by the agents; [decisions]({BASE}decisions/index.md) in his words; [the briefs]({BASE}briefs/index.md) verbatim
- [Storyboards]({BASE}storyboards/index.md): the loop, the spectrum, the excuses and the rules as short strips drawn by code; [the cast]({BASE}storyboards/cast/index.md); [design experiments]({BASE}storyboards/design/index.md); [feedback to storyboards.sgit.ai]({BASE}storyboards/feedback/index.md); each storyboard's script is its page's twin and its data is beside it (storyboard.json, bundle.json, graph.json)
- [The team]({BASE}team/index.md): journalist, interviewer, librarian, engineer; [the vault]({BASE}vault/index.md) (none yet); [the review]({BASE}review/index.md)
- [What exists]({BASE}admin/reality.md): the reality file; [corrections]({BASE}admin/corrections.md); [admin]({BASE}admin/index.md); [release history]({BASE}admin/versions.md)
- [Participant disclosure]({BASE}about/participant.md)

## The articles
{chr(10).join(f"- [{a['title']}]({BASE}{rel[:-5]}.md)" for rel, a in articles)}

## The briefs
{chr(10).join(f"- [{t}]({BASE}{rel[:-5]}.md)" for rel, t in briefs)}

## Every page, as markdown
{every}

## The source
- The repository: {REPO}
- The sibling sites this one follows: https://gen-z-developers.sgit.ai/ and https://newsroom.sgit.ai/
- The guidance: https://sgit.ai/docs/guidance/repositories.html
- The operating model: https://newsroom.sgit.ai/articles/the-question-is-whether-they-miss-it.html
""")


def main():
    mdpages = build_md_pages()
    finder, counts = build_finder()
    plans = build_plans()
    briefs = build_briefs()
    articles = build_articles()
    roles = build_team()
    build_vault()
    storyboards = build_storyboards()
    # the review's derived layers need the list of pages so far, plus the ones written after; derive is run twice so that
    # surfaces.json lists every page, including review/index.html itself and the admin pages
    stats = build_review([w for w in written if w.endswith(".html")])
    build_admin(stats)
    build_home(finder, counts, plans, briefs, articles, roles, stats, mdpages)
    build_agent_surface(finder, counts, briefs, articles, plans)
    stats2 = Derive(ROOT).write(pages=[w for w in written if w.endswith(".html") and w != "404.html"], version=VERSION)
    if stats2["coverage"] != stats["coverage"]:
        # the second derivation saw the pages the first could not; rewrite the review page with the final figure
        stats = build_review([w for w in written if w.endswith(".html") and w != "404.html"])
        build_home(finder, counts, plans, briefs, articles, roles, stats, mdpages)
        build_agent_surface(finder, counts, briefs, articles, plans)
    n_pages = len({w for w in written if w.endswith(".html")})
    print(f"build: {VERSION}, {n_pages} pages, {len(set(twins))} twins, finder {finder['version']} ({counts['questions']} questions), review coverage {stats['coverage']}")


if __name__ == "__main__":
    main()
