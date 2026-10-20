# A scheduled drain, so notes are read without being asked

**What.** Notes wait in the lane until a session runs `feedback.py drain`. With the owner keys in the environment as `STARTUPS_FEEDBACK_OWNER`, a scheduled task can drain once or twice a day, write a digest as a brief to the role a note concerns, and act on what is cheap to undo, as the newsroom's editor's channel proposes for its daily pass.

**Done when.** A scheduled task exists, drains, and its digest lands as a brief in `team/<role>/briefs/`; the lane's pending count stays near zero.

**Waits on nothing**, but needs Dinis to add the owner keys to the environment first.

**From.** Decision 005; the newsroom's note *The editor's channel* (`admin/notes/2026-10-18__the-editors-channel.md` there).
