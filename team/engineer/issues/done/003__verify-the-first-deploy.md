# Verify the first deploy, and the release script's live poll

**What.** Dinis created the `dev` branch and wired GitHub Pages and the domain during the first session. The first push to `dev` runs validate, tag and deploy. Check that the site serves v0.1.0 at https://startups.sgit.ai/, that the tag exists, and that `release.py`'s poll of `admin/build/version.txt` on the live site works; record what happened in the reality file's deploy row.

**Done when.** The reality row for deploy says "verified live at vX.Y.Z on <date>".

**From.** The second message in [the initial prompt](../../../../briefs/02__note-the-initial-prompt.md).

**Done.** 2026-10-20, site v0.1.1. The push of v0.1.0 to `dev` at 14:58 UTC ran the pipeline (run 1: validate, test, tag, deploy, all green), CI tagged `v0.1.0` on the release commit, and the live site served `v0.1.0` within a minute. Recorded in the reality file's deploy row. The release script's own live poll is exercised by this release, v0.1.1, which it made.
