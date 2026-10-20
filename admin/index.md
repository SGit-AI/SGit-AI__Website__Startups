# Admin and engineering, startups.sgit.ai

> How startups.sgit.ai is built, and the gate it passes.

*Source: <https://startups.sgit.ai/admin/index.html> · site v0.1.2 · this file is generated from the same content as the page, so the two cannot drift. Every page on this site has a `.md` twin; internal links below point at them.*

---

# Admin and engineering

How this site is built, the gate it passes, and the rules it keeps.

## The chain

```
python3 admin/build/build.py        # every page and twin, llms.txt, the sitemap, the review's derived layers
node admin/build/validate.js        # the gate, below
node admin/build/test_finder.mjs    # the finder's rules against finder.json, with sample answers
node admin/build/test_interview.mjs # the interview page in a real browser (Playwright; skips without it)
python3 admin/build/release.py --what "one sentence" [--minor] [--dev]   # fetch, bump, build, validate, test, tripwire, commit, push, verify live
```

## The gate

Every check fails the build; CI runs the gate and the finder test before it tags a release.

1. **Version agreement:** `admin/build/version.txt` against the badge on every page, the newest row of the release history, and `llms.txt`.
2. **Internal links resolve, and no page is an orphan:** every relative href and src points at a file; every page is reachable from the front page by links.
3. **A markdown twin for every page, and every twin in llms.txt.**
4. **Canonical and og:url** on every page, on the host in `CNAME`.
5. **Nothing from another origin:** no script, stylesheet or image is fetched from outside this site.
6. **The key tripwire:** no private sgit key, private-key block, cloud, model-provider, GitHub, Slack or Google key shape anywhere in the tree. The release script scans the staged diff too, and the secret part of any key kept in `admin/credentials/`.
7. **Div balance** on every page.
8. **No em-dash** in any page or twin.
9. **The sitemap and the tree agree** in both directions.
10. **The finder's published file is its source:** `finder/finder.json` equals `admin/content/finder/finder.json`; the deep checks are the finder test.
11. **The review folder is fresh:** every source file's hash matches `review/graph/files.json`, and the coverage on the review page is the join's.
12. **Every script parses:** `node --check` on every JavaScript file, `py_compile` on every Python file.

Not here, and said so: a linter or a formatter, as on every sibling site; the Type_Safe guards and crypto vectors of the guidance's list, which have no code to guard here. [The corrections file](corrections.md) records both.

## The rules

- **Markdown and JSON are the source of truth.** Every page is written by `build.py`; a generated page is never hand-edited.
- **Every release is narrated** in [the release history](versions.md), and the version in `admin/build/version.txt` must match the commit subject `site vX.Y.Z: ...`.
- **Count, don't remember.** The finder's counts, the review's coverage and the plans' count on their pages are read from the files at build time.
- **No key in the tree.** The credentials tier is `admin/credentials/`, ignored by git; its README says the rules.
- **What exists is in [the reality file](reality.md)**, changed in the same commit as the thing it describes.

## Where things are

- `admin/content/`: the authored data (finder, plans, briefs, articles, decisions, pages, versions, vault). `admin/build/`: the build, the gate, the test, the release script.
- `finder/`: the published finder (the file, the prompt, the record, the rules module) and its pages. `assets/components/`: the base and the finder components.
- `team/`: the roles, their issues, briefs and debriefs. `review/`: the review folder.
- `.github/workflows/deploy-pages.yml`: validate, tag, deploy to GitHub Pages from `dev`, the same pipeline as the sibling sites.

[Release history](versions.md) · [What exists](reality.md) · [Corrections](corrections.md) · [the repository](https://github.com/SGit-AI/SGit-AI__Website__Startups)


---

*[Site index for agents](https://startups.sgit.ai/llms.txt) · [HTML version](https://startups.sgit.ai/admin/index.html)*
