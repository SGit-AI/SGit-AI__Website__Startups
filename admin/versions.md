# Release history, startups.sgit.ai

> Every release of startups.sgit.ai, narrated.

*Source: <https://startups.sgit.ai/admin/versions.html> · site v0.1.3 · this file is generated from the same content as the page, so the two cannot drift. Every page on this site has a `.md` twin; internal links below point at them.*

---

# Release history

Every release of this site, narrated: a reader should understand the change without opening the diff. Every push to `dev` is a release, tagged `vX.Y.Z` by CI, which refuses a release whose `version.txt` disagrees with the commit subject.

| Site | Date | What changed, and why |
|---|---|---|
| **v0.1.3** | 2026-10-20 | Correction: v0.1.2's line said the release script no longer retargets the working branch's upstream, but that edit had missed its line and v0.1.2 changed nothing; this release carries the fix. |
| **v0.1.2** | 2026-10-20 | The release script no longer retargets the working branch's upstream to dev when it pushes dev; no page changes. |
| **v0.1.1** | 2026-10-20 | The first deploy verified: v0.1.0 went live from dev through validate, test, tag and deploy within a minute of the push, recorded in the reality file and the engineer's issue 003 closed; the release script gains a commit body for attribution and makes this release itself. |
| **v0.1.0** | 2026-10-20 | The first release, built from Dinis's voice memo of 20 October 2026 (the AI startup finder concept) and the guidance on sgit.ai for every repository in the estate. The site takes over the startups section of sgit.ai (build on vaults, and the eight business plans) and adds the finder: the interview that helps a person find their startup, as data (finder.json: seven stages, twenty-four questions, twelve signals, six routes, eight rules, first match wins), as a prompt to paste into Claude or ChatGPT, as a page that walks the stages in the browser and writes the record (nothing sent anywhere), and as the record template. The brief is published verbatim with the initial prompt; the first co-written article says what the finder is in Dinis's words and briefs the roles; three decisions are recorded from the memo; four roles (journalist, interviewer, librarian, engineer) with their first issues; the reality file and the corrections file; the review folder's intent layers from the brief and a derived file list; the gate (validate.js, twelve checks) and the release script; the five themes and the pipeline of the sibling sites. What does not exist yet is on the reality page. |


---

*[Site index for agents](https://startups.sgit.ai/llms.txt) · [HTML version](https://startups.sgit.ai/admin/versions.html)*
