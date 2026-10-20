# The credentials tier

Everything in this directory except this file is ignored by git (`.gitignore`: `admin/credentials/*`,
`!admin/credentials/README.md`). It is where a session keeps a key it was handed for a task: a vault's
write key before the vault is published, an OpenRouter key with a credit limit, a GitHub token.

The rules, from [Every sgit repository, section 6](https://sgit.ai/docs/guidance/repositories.html):

- **Read keys may be published; vault keys never.** A read key goes on the vault page. A write key goes
  here, and is escrowed with Dinis before anything is published.
- **The tripwire runs before every commit.** `admin/build/release.py` and `admin/build/validate.js` refuse
  a tree or a staged diff carrying a private sgit key, a private-key block, a cloud or model-provider key
  shape, or the secret part of any key kept in this directory (`release.py --tripwire` reads them to know
  what to look for; it prints nothing it reads).
- **Session-only credentials stay in the session.** Nothing here is copied into a page, a vault, a commit
  message or a chat log that becomes a file.
- **Nothing the site needs to build is a secret.** The build and the gate run with this directory empty.

As of the first release this directory holds nothing but this file.
