# startups.sgit.ai: find your startup, then ship it

The website for founders in the sgit.ai network: the finder, an interview that helps a person zoom in on what to
ship, to whom, by when, run by Claude or ChatGPT or walked on the site; the vault substrate that makes shipping
cheap enough to do this week; and the business plans published as vaults to build on. It takes over the startups
section of sgit.ai, as that section said it would when it outgrew a page.

Live site: https://startups.sgit.ai (GitHub Pages, deployed from `dev`).

## Where this comes from

A voice memo by Dinis Cruz of 20 October 2026, published verbatim at `admin/content/briefs/01__find-your-startup.md`
and rendered at `/briefs/`, and the message that started the first session (`02__note-the-initial-prompt.md`). The
first article, `/articles/find-your-startup.html`, says what the finder is in Dinis's words and ends with the brief
for the roles. The guidance followed is [Every sgit repository](https://sgit.ai/docs/guidance/repositories.html); the
sibling this repository follows most closely is
[gen-z-developers.sgit.ai](https://github.com/SGit-AI/SGit-AI__Website__Gen-Z-Developers).

## The rule of the finder

> We are not passing judgement. The right startup for a person is the one they are passionate about and will keep
> working on. What we help with is focus, and shipping: something a stranger can use, now.

## Layout

```
index.html                 the front page
finder/                    generated: the finder's pages (index, interview, stages, routes, prompt, record) and the
                           published copies finder.json, finder-prompt.md, finder-record.md; finder-rules.js is the rules module
                           (source, not generated), imported by the interview component and by the test
vaults/                    generated from admin/content/pages/vaults.md: build your startup on vaults (moved from sgit.ai)
plans/                     generated from admin/content/plans.json: the business plans published as vaults on sgit.ai
articles/, agent-articles/ generated: the co-written and the agent articles, each with its source as its twin
decisions/, briefs/        generated: Dinis's decisions in his words; the memo and the initial prompt, verbatim
team/                      the roles: journalist, interviewer, librarian, engineer
  ISSUES.md                how the roles keep issues (the folder is the status)
  <role>/role.md           Identity, Foundation, Primary Responsibilities, Core Workflows
  <role>/issues/           open/ blocked/ done/
  <role>/briefs/, debriefs/
storyboards/               generated from admin/content/storyboards/: the index with the strips, one page per storyboard (the kit's
                           deck, grid and script; storyboard.json, bundle.json, graph.json, script.md; the script is the page's twin),
                           the cast (cast sheet and model sheet), the design experiments, the brief back to storyboards.sgit.ai
vault/                     generated: no vault yet, and what one would hold
review/                    the review folder: intent/ from the brief; graph/ and join/ derived by tools/derive.py
about/participant.html     the participant disclosure
admin/
  build/version.txt        the site's version (vX.Y.Z), bumped once per release
  build/build.py           writes every page, every markdown twin, llms.txt, the sitemap, and runs derive.py
  build/validate.js        the gate (twelve checks; see /admin/)
  build/test_finder.mjs    the finder's rules against the finder's file
  build/test_interview.mjs the interview page and the storyboards in a real browser (Playwright; skips without it)
  build/storyboards.mjs    validates the storyboards with the kit's formats.js, checks from_finder lines, writes the derived files
  build/test_storyboards.mjs  the vendored kit against its manifest, the storyboards against the validator and finder.json
  build/release.py         fetch, bump, build, validate, test, tripwire, commit, push, verify live
  content/                 the authored data: finder/, plans.json, pages/, briefs/, articles/, agent-articles/,
                           decisions/, versions.json, vault.json, storyboards/ (cast.json, NN__<slug>.json, kit.json, feedback.md)
  credentials/             the credentials tier, ignored by git except its README
  index.html, versions.html, reality.html, corrections.html   admin, the release history, the reality file, the corrections
assets/site.css            the layout and type, for every page
assets/themes.css          the colour: five themes, newsroom.sgit.ai's, every colour a token defined in all five
assets/site.js             sets the theme before the first paint, draws the picker, opens the menu on a narrow screen
assets/components/         sg-base (the base component), sg-finder (the interview) and sg-strip (a storyboard as a strip), three files each
assets/vendor/storyboards/ the storyboard kit, one immutable release folder with its manifest, hashes checked by the gate
assets/storyboards/        this site's prop pack for the kit (the five, a price tag, a door, a parcel)
REALITY.md                 what exists, by domain; BRIEF-CORRECTIONS.md: where the brief was departed from
llms.txt, sitemap.xml, robots.txt, 404.html, CNAME, LICENSE, LICENSES.md
.github/workflows/deploy-pages.yml   validate -> test -> tag -> deploy, the same pipeline as the sibling sites
```

Every page has a markdown twin at the same path with `.md`, converted by the build from the page's own body so the
two cannot drift; an article's twin is its source file. `llms.txt` lists every twin.

## The build

```
python3 admin/build/build.py       # every page and twin, llms.txt, the sitemap, the review's derived layers
node admin/build/validate.js       # the gate
node admin/build/test_finder.mjs   # the finder's rules against finder.json
node admin/build/test_interview.mjs  # the interview page and the storyboards in a real browser; skips without Playwright
node admin/build/test_storyboards.mjs  # the vendored kit against its manifest, the storyboards against the validator and finder.json
```

Dependencies: Python 3 with `markdown` (`pip install markdown`), Node 18+; Playwright with Chromium for the browser
test only. Nothing is fetched at run time.

## The release ritual

1. `git fetch origin dev --tags` first; other agents may have shipped.
2. `python3 admin/build/release.py --what "what changed, and why" [--dev]`, which bumps, builds, validates, tests,
   scans the staged diff, commits `site vX.Y.Z: ...`, pushes, and polls the live site. CI validates, tags and deploys.

## The finder, for an agent

- `https://startups.sgit.ai/finder/finder.json`: the interview as data (stages, questions, signals, routes, rules).
- `https://startups.sgit.ai/finder/finder-prompt.md`: the prompt to follow. `finder-record.md`: the template to fill.
- `https://startups.sgit.ai/llms.txt`: every page as markdown.

## Licences

Code Apache 2.0 (`LICENSE`); content CC BY 4.0; `LICENSES.md` says which is which.
