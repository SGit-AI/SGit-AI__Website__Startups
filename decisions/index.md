# Decisions, startups.sgit.ai

> Dinis's decisions on what the finder is and how this site works, in his words.

*Source: <https://startups.sgit.ai/decisions/index.html> · site v0.1.5 · this file is generated from the same content as the page, so the two cannot drift. Every page on this site has a `.md` twin; internal links below point at them.*

---

# Decisions

Dinis’s decisions on what the finder is and how this site works, one record each, in the order made, in his words. A decision is never deleted; a later one supersedes it and says so.

| # | Decided | Decision |
|---|---|---|
| [001](#for-now-the-finder-needs-an-llm) | 2026-10-20 | For now, the finder is run by an LLM |
| [002](#it-works-for-humans-and-for-agents) | 2026-10-20 | The guidance works for humans and for agents |
| [003](#we-are-not-passing-judgement) | 2026-10-20 | The finder does not pass judgement |
| [004](#storyboards-come-here-as-an-experiment) | 2026-10-20 | Storyboards come to this site as an experiment, on a page of their own, and the ideas go back |
| [005](#a-feedback-pane-on-every-page) | 2026-10-20 | A feedback pane on every page, over a sealed append lane only the owner can read |

## 001 · For now, the finder is run by an LLM

**Decided.** 2026-10-20

**By.** Dinis Cruz.

**Said.** "So I think for now, let's start by this is something that they will is designed to be used by Claude or ChatGPT because you need that data analysis. You need an agent behind the scenes. So what we're going to be doing is creating the primitives, and maybe I'll show some examples. Right, I'll do it myself. [...] for now, assume that you're going to need an LLM to run it, and I think once we've done a whole part of this, we can find a better way to do it, programme some of it programmatically."

**Means.** The first version of the finder is a toolkit for Claude or ChatGPT to run: the stages, questions, signals, routes and rules as one data file, a prompt that tells the model how to run them, and a record template for the output. The in-browser page that walks the same data is the deterministic part made visible, not a replacement for the interview. A version that runs programmatically on the site, with storyboards or otherwise, comes after the primitives have been used; the memo asks for examples first, and Dinis will do one himself.

**Supersedes.** Nothing; the first decision on this site.

**Recorded in.** [Find your startup](/articles/find-your-startup.md), the first co-written article, and the engineer's agent article [Building startups.sgit.ai](/agent-articles/building-startups-sgit-ai.md).

## 002 · The guidance works for humans and for agents

**Decided.** 2026-10-20

**By.** Dinis Cruz.

**Said.** "Let's make this so that it works from the website, but also is almost designed to be worked by another [LLM] like Claude running interviews. [...] So this guidance needs to work for humans and for agents."

**Means.** One source serves both readers. The finder's questions, signals, routes and rules are written once, in `finder.json`, and every surface reads it: the pages a person reads, the page that walks the interview in the browser, the prompt a model follows, and the test that checks the rules. A change to a question is a change to the file, and every surface follows. Nothing about the interview is written in two places.

**Supersedes.** Nothing.

**Recorded in.** [Find your startup](/articles/find-your-startup.md); the rule is kept in the finder file's own `what` line.

## 003 · The finder does not pass judgement

**Decided.** 2026-10-20

**By.** Dinis Cruz.

**Said.** "I think what's important here is that we're not passing judgement. You know, the right startup for the person is the one they're passionate about. Is the one they want to work. [...] I think we're not passing judgement. I think what we can help is we can help with focus, but also we can help open there for them to ship. [...] ultimately it's about coming up with their own words and coming up with their own description of this is kind of what you should be focusing on."

**Means.** The finder never says whether an idea is good. It helps with two things: focus, and shipping. Its output is a record in the person's own words, which they correct until it reads as theirs; the route it picks is a direction of travel with the rule that chose it shown, and the person can change a signal and get a different route. "You have to go old school and raise money first" is a valid route, said plainly, not a verdict. The prompt tells the model the same, and tells it that "it is not ready yet" is the problem the finder exists for, not a reason.

**Supersedes.** Nothing.

**Recorded in.** [Find your startup](/articles/find-your-startup.md); the rule is the `rule_of_the_finder` line in `finder.json` and is printed on the finder's front page.

## 004 · Storyboards come to this site as an experiment, on a page of their own, and the ideas go back

**Decided.** 2026-10-20

**By.** Dinis Cruz.

**Said.** "Take a look at storyboards.sgit.ai and see how can we use those storyboards here on this website to explain the concepts. [...] you can make changes to it. You don't have to take it all. And also we should feedback some ideas to it. [...] at the moment they're quite big, and I think in your site they are almost like a nice thing to have. So think about it from the design element of it. [...] we can have new designs, we can add more clarity, we can experiment different things, we can change the layout, the schemas, the colors, because ultimately the idea is for the API to support all these changes. [...] I'm more keen to explore the storyboards concept and also the characters. [...] Maybe put that on a separate page initially so we can experiment."

**Means.** The storyboards are used here to explain this site's concepts (the loop, the spectrum, the excuses, the rules), in a section of their own rather than on the front page, as a nice thing to have, not the main thing. The site may change how they are drawn and laid out, and need not take the whole kit; what it learns goes back to storyboards.sgit.ai as a brief, because the API is meant to support such changes. The characters are part of the exploration: a cast of this site's own, with three shared with the book's.

**Supersedes.** Nothing.

**Recorded in.** The engineer's agent article [Storyboards on a separate page](/agent-articles/storyboards-on-a-separate-page.md); the brief [What startups.sgit.ai would like from the storyboards kit](/storyboards/feedback/index.md).

## 005 · A feedback pane on every page, over a sealed append lane only the owner can read

**Decided.** 2026-10-20

**By.** Dinis Cruz.

**Said.** "Can you look on sgit.ai for how the instructions of how can you add an append lane, and basically how can you create a vault here and add an append lane into that vault so that you can receive comments from me as I view the website. [...] I should have a pane that opens on the right-hand side, which I need to enter the vault lane ID. So you can leak the public key of your vault lane, but you'll give me [...] the ID of it, so that nobody else can send messages to it. And then you need to allow me to write text. You also need to allow me to record voice memos, which can be transcript. And this will work on [an] open router key. [...] including taking screenshots and uploading files, copy and paste. Or maybe even a button [...] to add a screenshot of the current site. [...] I want to, for example, be reading in a storyboard, and I have a comment on it or a question, and I'll be able to send it to you. And this whole thing, you save in a local storage, and then you catch it all up, and then eventually I submit to send. So we should already have this pattern documented. If not, let me know, because we really need to have it documented."

**Means.** This site gets a vault of its own with an append lane, and every page gets a pane on the right that sends notes into it: text, the quoted selection, voice memos transcribed with Dinis's own OpenRouter key, a screenshot of the page, pasted and attached files, each note knowing its page and, on a storyboard, its panel. Notes are kept in the browser until Send. The lane's public key is published; the append token, given to Dinis as the lane code, is the only thing that lets anyone write, and it is in no file of the repository. The pattern is documented on the site's own feedback page with the prompt to repeat it elsewhere, because, as checked on the day, the append lane and the sealed inbox were documented and built, and voice memos and screenshots were not.

**Supersedes.** Nothing.

**Recorded in.** [Feedback from the page](/feedback/index.md); the engineer's agent article [A feedback pane, and a lane only the owner reads](/agent-articles/a-feedback-pane-and-a-lane.md).

The sources are in `admin/content/decisions/`. Each names the article that recorded it.


---

*[Site index for agents](https://startups.sgit.ai/llms.txt) · [HTML version](https://startups.sgit.ai/decisions/index.html)*
