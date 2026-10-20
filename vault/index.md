# The vault, startups.sgit.ai

> No vault yet, why, and what one would hold.

*Source: <https://startups.sgit.ai/vault/index.html> · site v0.1.0 · this file is generated from the same content as the page, so the two cannot drift. Every page on this site has a `.md` twin; internal links below point at them.*

---

# The vault

None yet, and this page says so rather than describing one in the present tense. The sibling sites keep their working versions in a public, zero-knowledge encrypted vault with the read key published; this site has nothing that needs one as of v0.1.0.

## Why not yet

- **The finder's records belong to the people who make them.** The page keeps answers in the browser; a model keeps them in the conversation. Nothing reaches this site unless somebody publishes it.
- **The business plans live in their own vaults** on sgit.ai, each with its read key on its page there.
- **The roles' work is in the repository**, as issues, briefs and debriefs.

## What a vault would hold

- `records/`: finder records people choose to publish, each with its permission line; the interviewer's
- `interviews/`: transcripts of interviews run by a model, with the person's permission
- `findings/`: what interviews showed about the questions, for the librarian
- `plans/`: a business plan written on this site, when there is one, in the shape of sgit.ai's plan vaults

## The rule, and the gate

When a vault exists, only its **read** key goes on this page and in `admin/content/vault.json`; the write key is held by Dinis and exists nowhere in this repository. The release gate refuses any file carrying a private sgit key, the same rule sgit's own scanner uses, and the release script scans every staged diff; [the admin page](../admin/index.md) lists the checks. The method for publishing one is [on sgit.ai](https://sgit.ai/demos/vaults/publishing.html).


---

*[Site index for agents](https://startups.sgit.ai/llms.txt) · [HTML version](https://startups.sgit.ai/vault/index.html)*
