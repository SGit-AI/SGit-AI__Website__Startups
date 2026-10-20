# The guidance works for humans and for agents

**Decided.** 2026-10-20

**By.** Dinis Cruz.

**Said.** "Let's make this so that it works from the website, but also is almost designed to be worked by another [LLM] like Claude running interviews. [...] So this guidance needs to work for humans and for agents."

**Means.** One source serves both readers. The finder's questions, signals, routes and rules are written once, in `finder.json`, and every surface reads it: the pages a person reads, the page that walks the interview in the browser, the prompt a model follows, and the test that checks the rules. A change to a question is a change to the file, and every surface follows. Nothing about the interview is written in two places.

**Supersedes.** Nothing.

**Recorded in.** [Find your startup](/articles/find-your-startup.md); the rule is kept in the finder file's own `what` line.
