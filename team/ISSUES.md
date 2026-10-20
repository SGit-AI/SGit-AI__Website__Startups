# Issues, the way the roles keep them

The pattern is the one graphs.sgit.ai calls Issues-FS-lite and gen-z-developers.sgit.ai uses, and there is no tool.

- Each role owns `team/<role>/issues/open|blocked|done/`. **The folder is the status.** A status change is a `git mv`; nothing inside the file says the status.
- Four operations: create (a new file in `open/`), block (`git mv` to `blocked/`, and a line saying what it waits on), unblock (`git mv` back to `open/`), close (`git mv` to `done/`, and a line saying what was done and where).
- A file is `NNN__slug.md`, numbered in the order it was created, never renumbered. The first line is `# title`; then `**What.**`, `**Done when.**`, `**From.**` (the brief or article that asked), and when blocked `**Waits on.**`.
- **The writer rule:** any role may read another role's issues folder; only the owning role writes into it. Work for another role arrives as a brief in that role's `briefs/`.
- An issue change is committed in the same commit as the work that caused it.
- Stamps carry the site version: `v0.1.0__<slug>.md` for a brief or a debrief written against that release.
