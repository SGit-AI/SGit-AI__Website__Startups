# Working in this repository

This is the contributor contract for agent sessions. `README.md` describes the layout; this file describes the
behaviour expected of you. Read both, then `REALITY.md`, before touching anything.

## The one-paragraph orientation

This repository is the website `startups.sgit.ai`: the finder (an interview that helps a person find their startup,
as one data file read by a prompt, a page and a test), the vaults section moved from sgit.ai, and the business plans.
Every push to `dev` is a narrated, tagged, deployed release. The roles (journalist, interviewer, librarian, engineer)
live in `team/`; the decisions are Dinis's, in his words, in `admin/content/decisions/`.

## What you must not do

- **Do not hand-edit a generated page.** Every `.html` and every `.md` twin outside `admin/content/`, `team/` and
  `review/` is written by `admin/build/build.py`. Change the source (the markdown and JSON under `admin/content/`,
  the roles, the intent, or `build.py`) and rebuild.
- **Do not write anything about the interview outside `admin/content/finder/finder.json`.** The prompt, the page, the
  describing pages and the test read it (decision 002). A question in two places is a question that will disagree.
- **Do not put a private key anywhere in the tree.** Not in a file, a comment, a commit message or a test fixture.
  The gate refuses the key shapes it knows; the release script scans every staged diff. A key a session is handed
  goes in `admin/credentials/`, which git ignores, and is escrowed with Dinis.
- **Do not fetch anything from another origin at run time.** No CDN script, no external stylesheet. Copy house code
  into the repository; the gate refuses an external `<script src>`.
- **Do not write into another role's `issues/` folder.** You may read it. Work for a role arrives as a brief in its
  `briefs/` (`team/ISSUES.md`).
- **Do not pass judgement on anyone's idea**, in the finder, the prompt, an article or a record (decision 003).
- **Do not edit the brief.** `admin/content/briefs/01__find-your-startup.md` is the memo as transcribed. Where the
  work departs from it, write why in `BRIEF-CORRECTIONS.md`.
- **No em-dashes.** The gate fails on one, in any page, twin or data file. British spelling, plain words.

## The release ritual, every push to `dev`

1. `git fetch origin dev --tags` first. Never choose a version number without fetching.
2. `python3 admin/build/release.py --what "one sentence: what changed, and why" [--dev]`. It bumps
   `admin/build/version.txt` to the next patch (the middle number moves only when Dinis says a change is major; an
   agent never chooses it), adds the row to `admin/content/versions.json`, builds, runs the gate and the finder test,
   scans the staged diff, commits as `site vX.Y.Z: what changed` (the colon straight after the version; CI parses
   it), pushes the branch, and with `--dev` pushes `dev` and polls the live site for the version.
3. By hand, the same thing is: bump, add the row, `python3 admin/build/build.py`, `node admin/build/validate.js`,
   `node admin/build/test_finder.mjs`, commit with that subject, push.
4. On a version collision: fetch, renumber, rebuild, retry; never force.

## What every change carries

- **The reality file.** When something starts or stops existing, the row in `REALITY.md` changes in the same commit.
- **A release line** that says what changed and why, for a reader who will not open the diff. Not "UI improvements".
- **An issue change** in the same commit as the work that caused it, by `git mv` between `open/`, `blocked/` and `done/`.
- **A count, not a memory.** A number on a page is read from a file by the build; a number in prose names the file.

## Articles, agent articles and decisions

- **Articles** (`admin/content/articles/`, `/articles/`) are co-written with Dinis, in his voice, by the journalist,
  in the newsroom's shape (the guide is newsroom.sgit.ai's `admin/content/articles/README.md`): a title with a colon,
  In short, the argument, What this does not claim, the brief for the roles, Where this comes from.
- **Agent articles** (`admin/content/agent-articles/`): when you finish a significant body of work, write one in your
  own voice as the agent, named `startups.<role>`: what you did, the changes, what you leave for the other roles.
  One per body of work, not one per release. Name who made each human decision. No model name in the text.
- **Decisions** are records in `admin/content/decisions/`, one per decision, never deleted; a later one supersedes
  and says so. Only Dinis's words go in **Said.**

## The finder

`admin/content/finder/finder.json` is the interview. Changing a question means: edit the file, bump its `version`,
run `node admin/build/test_finder.mjs` (it checks every id resolves, every route is reachable, the last rule is a
default, and sample answers land where expected), add a release line, and tell the interviewer which ids changed.
Ids never change meaning: they appear in records people keep. The rules module `finder/finder-rules.js` is the only
code that applies the rules; the component and the test both import it.

## The storyboards

`admin/content/storyboards/` holds the cast and the storyboards in the kit's format (api.storyboards.sgit.ai, docs/format).
The kit is vendored under `assets/vendor/storyboards/<release>/` with its manifest: never edit a file there; moving to a
new release is copying its folder and changing `admin/content/storyboards/kit.json`. A line, a board, a quote or a
punchline that is the finder's is marked `"from_finder": true` and must equal a string in `finder.json` word for word;
the build refuses a paraphrase. Everything else a character says is the storyboard's own words. Characters use the
pronouns their cast entry gives; three looks are the book's cast's and are not changed here. The strips are an
experiment on pages of their own (decision 004): do not embed one on the finder's pages or the front page without a
decision.

## The review folder

`review/intent/` is written from the brief and marked `"proposed": true` until Dinis accepts it. `review/graph/` and
`review/join/` are derived by `review/tools/derive.py` on every build and never edited; the gate fails if a source
file changed since. What the folder does not yet have is in `review/README.md` and the engineer's issues.

## Working as a role

Read `team/<role>/role.md` first. Every role names what it refuses; hold to it. Stamp your debriefs with the version
you worked against. Record every finding's answer next to it; "declined" with a reason is a valid answer, and
deleting a finding is not.
