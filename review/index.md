# The review, startups.sgit.ai

> The project as layered graphs: the intent from the brief, the tree, the join and the gaps.

*Source: <https://startups.sgit.ai/review/index.html> · site v0.1.0 · this file is generated from the same content as the page, so the two cannot drift. Every page on this site has a `.md` twin; internal links below point at them.*

---

# The review

The project as layered graphs, after [the review brief](https://sgit.ai/docs/briefs/code-review-graphs-in-the-repository.html): the intent, top down from the brief, as stories, rules and examples that name the surface each touches; the tree, bottom up, as files and surfaces; and the join between them. A subset, and it says so: no methods, no change files, no navigator yet.

**100%**coverage**39**examples with a surface**0**gaps**79**source files**57**surfaces

Coverage is the share of intent examples and flow steps whose surface exists in the tree. Every intent node is *proposed*: written by the engineer agent from the memo, not yet read back and accepted by Dinis. Source files by language: css 4, html 8, javascript 7, json 8, markdown 45, python 3, text 3, yaml 1.

## The intent

### A person finds their startup through an interview proposed

from briefs/01__find-your-startup.md, 0:02

**The next question depends on the last answer: a state machine, not a form.**

- A person who picks 'I do not have a startup yet' is not asked for a sentence about the thing exists `finder/interview.html`

**Everything maps to one test: can it ship, can it reach users, now.**

- The ship stage asks for the smallest version a stranger could use this week, the blocker and the cost exists `finder/stages.html`

**It works along the spectrum from no startup yet to a good plan that is not shipping.**

- Five entries on the where stage, each with its own route in exists `finder/index.html`

**The finder does not pass judgement; it helps with focus and shipping; the output is in the person's words.**

- The record's focus line is the person's; the interviewer may draft and must mark the draft exists `finder/record.html`
- A capital-first startup gets the old-school route, said plainly, with next steps exists `finder/routes.html`

### The same guidance works for a person on the site and for a model running the interview proposed

from briefs/01__find-your-startup.md, 0:02

**One data file serves every surface.**

- finder.json is published at finder/finder.json and the prompt names it exists `finder/finder.json`
- The stages and routes pages print the file's contents with ids exists `finder/stages.html`

**For now the finder is run by Claude or ChatGPT; the primitives come first, the programmatic version later.**

- A prompt a person pastes that tells the model how to run the file exists `finder/prompt.html`
- The prompt handles documents uploaded instead of answers exists `finder/finder-prompt.md`

### The startups section of sgit.ai becomes its own site, in the shape of the sibling sites proposed

from briefs/02__note-the-initial-prompt.md, the message

**The two startups pages of sgit.ai move here.**

- Build your startup on sgit vaults, as a page here exists `vaults/index.html`
- The business plans as a page generated from data exists `plans/index.html`

**The site is built, gated and released like gen-z-developers.sgit.ai and newsroom.sgit.ai.**

- validate.js fails the build; CI runs it before tagging exists `admin/build/validate.js`
- The five themes, chosen in the nav exists `assets/themes.css`
- The version in the nav links to the narrated release history exists `admin/versions.html`

**The repository carries what every sgit repository carries.**

- The memo published verbatim exists `briefs/01__find-your-startup.html`
- A reality file with a row per domain exists `admin/reality.html`
- A corrections file exists `admin/corrections.html`
- Roles as files with issues exists `team/index.html`
- A review folder with intent from the brief exists `review/index.html`

### The finder is the first thing the book does proposed

from briefs/01__find-your-startup.md, 3:59

**Whether and where the finder opens the book is decided on the book's site.**

- A brief to gen-z-developers.sgit.ai's journalist, as a question exists `team/journalist/issues/open/002__the-finder-as-the-opening-of-the-book.md`

## The gaps

| Intent | Surface asked for | Finding |
|---|---|---|
| none |  |  |

## The folder

- `review/intent/`: [stories.json](intent/stories.json), [flows.json](intent/flows.json), [components.json](intent/components.json), [deploy.json](intent/deploy.json)
- `review/graph/`: [files.json](graph/files.json) (every source file with its hash; the gate recomputes them), [surfaces.json](graph/surfaces.json)
- `review/join/`: [matches.json](join/matches.json), [gaps.json](join/gaps.json)
- `review/tools/derive.py` writes the derived files; [README.md](README.md) and [BRIEF-CORRECTIONS.md](BRIEF-CORRECTIONS.md) say what is and is not here; `review/self/` is a README until the navigator exists.

The navigator as web components is [the engineer’s first issue](../team/engineer/index.md).


---

*[Site index for agents](https://startups.sgit.ai/llms.txt) · [HTML version](https://startups.sgit.ai/review/index.html)*
