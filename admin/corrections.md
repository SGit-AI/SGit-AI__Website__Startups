# Where the brief was wrong, startups.sgit.ai

> Where the brief was departed from, what was found, and what was done instead.

*Source: <https://startups.sgit.ai/admin/corrections.html> · site v0.1.3 · this file is generated from the same content as the page, so the two cannot drift. Every page on this site has a `.md` twin; internal links below point at them.*

---

# Where the brief was wrong

The brief is [the voice memo](/briefs/01__find-your-startup.md), published verbatim, and the guidance it points at. It is never edited to look right afterwards; what was found and what was done go here, dated, newest last. Rendered at `/admin/corrections.html`.

## 2026-10-20, site v0.1.0: departures recorded by the engineer at the first release

1. **Markdown twins are converted from the HTML, not written from a source.** [The repository guidance](https://sgit.ai/docs/guidance/repositories.html) asks for a `.md` twin per page generated from the same data as the page. gen-z-developers.sgit.ai writes twins for articles only. This build converts every rendered page's body to markdown with a small HTML parser (`build.py`, `to_markdown`), so every page has a twin and the two cannot drift. Articles, briefs, decisions and roles keep their source file as the twin. Found: a page composed in Python has no markdown source to publish. Done instead: the projection.
2. **The review folder is a subset of the review brief.** [Code review graphs in the repository](https://sgit.ai/docs/briefs/code-review-graphs-in-the-repository.html) asks a new repository to build `review/` before its first source file: intent layers, a parser-derived graph, change files, a navigator as web components and `review/self/`. Done: the four intent files from the brief, a derived file list with hashes and the page surfaces, the join with a coverage figure, a README, and a freshness check in the gate. Not done: methods and classes (the repository has 1 Python module and 4 JavaScript files), change files, the navigator, `self/`. Recorded as the engineer's issue 001. Reason: the first release had one session; the navigator is the largest single item in the brief and the finder was the brief's own ask.
3. **No vault was created.** The sibling site created its working vault in its first session. Nothing on this site needs one yet: the finder's records belong to the people who make them, the plans live in vaults on sgit.ai, and the roles' work is in the repository. The vault page says what a vault would hold when needed.
4. **The component base is local, not the CDN's.** coding.sgit.ai's examples import the base component from `dev.tools.sgraph.ai`. The repository guidance says nothing is fetched at run time that is not vendored, and the site-pages brief says to copy house code into the site rather than fetch across origins. `assets/components/sg-base/` is a base in the same contract, written here.
5. **Gate checks that do not apply.** Section 4 of the guidance lists the Type_Safe structural guards and crypto vectors; this repository has no schema classes and no cryptography, so neither check exists here. A check is added the day the code it guards appears.
6. **The honest row on nfrs.sgit.ai is not written.** Item 10 of the new-repository checklist; it needs a brief to that site's team. Engineer's issue 002.
7. **Settled choices from coding.sgit.ai's open questions.** No semicolons in the components (the newer tree's convention); one banner style, a JSDoc block per file; the event namespace is `startups:`; `_`-prefixed private fields in JavaScript, which that site says contradicts a Python rule and which this repository treats as JavaScript-only. The gate does not yet enforce them.

Rendered from `BRIEF-CORRECTIONS.md` at the repository root; the file is the source.


---

*[Site index for agents](https://startups.sgit.ai/llms.txt) · [HTML version](https://startups.sgit.ai/admin/corrections.html)*
