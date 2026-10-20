---
title: Feedback from the page
description: A pane on the right of every page for sending notes to this site's agent while reading: text, a quote of the selection, voice memos transcribed with your own OpenRouter key, a screenshot of the page, pasted and dropped files. Kept in your browser until you send, then sealed in your browser and appended to a write-only lane only the owner can read. How to use it, exactly what is sent, the credentials and where each lives, how the agent reads it, the limits, and the prompt to build the same on another site.
kicker: The pattern, documented · vault {{VAULT}} · key {{FINGERPRINT}} · lane made {{CREATED}}
---

## Use it

1. **Enter the lane code** in the pane on this page (it opens here on its own). It looks like `sgf1.<vault>.<token>` and was given to you with the owner keys. It is kept in this browser; from then on a **Feedback** tab sits on the right of every page, and **Alt+F** opens and closes it.
2. **Optionally, your OpenRouter key**, under Settings, if you want voice memos transcribed. It stays in this tab unless you tick *remember*, and it is sent to openrouter.ai and nowhere else.
3. **Write as you read.** The note knows the page, its title, the site version and, on a storyboard, the panel in the address. Select text on the page and it is quoted. **Record** a voice memo; with a key it is transcribed into the note, and the audio goes with it. **Screenshot** captures this tab with the pane out of the way (desktop Chrome and Edge ask which tab; choose this one). Paste an image, or drop or attach files.
4. **Add to the list.** The note waits in this browser, with the draft you are writing, across pages and reloads. Edit or delete any of them.
5. **Send.** The notes are encrypted here, to the lane's public key, and appended to the lane. The server answers `{"ok": true}` and nothing else. What you sent is listed under *Sent from this browser*, without the files.

A reader with no lane code sees none of this: no tab, no pane, nothing sent. The only thing that runs is the check for a code.

## What is sent, exactly

One message per send (more if the notes are large), sealed, each carrying:

| Field | What |
|---|---|
| `kind`, `to`, `sent_at`, `site` | `startups-feedback/v1`, the key's fingerprint, the time, the site version |
| `from` | the name you gave this browser in Settings, and its platform |
| `notes[]` | each note: `id`, `at`, `text`, and `context`: the URL, path, page title, site version, storyboard and panel when there is one, the quoted selection and the page it came from, the window size and the theme |
| `notes[].attachments[]` | `kind` (screenshot, audio, paste, file), name, type, size, the bytes as base64, and for audio its duration and transcript |

Nothing else: no reading history, no other tab, nothing from another site.

## The four capabilities, and where each lives

The lane is an append lane on vault `{{VAULT}}` at `{{ENDPOINT}}`, as [the append-lanes API](https://sgit.ai/api/append-lanes.html) defines it. Its four capabilities are split on purpose:

| Capability | Where it lives | Can |
|---|---|---|
| **append token** | in the lane code: the owner hands it to you; your browser keeps it | write to the lane; read nothing, list nothing, not even what it wrote |
| **enum key** | the owner file | list, fetch, mark processed |
| **write key** | the owner file, derived from the vault key | configure the lane (with the SG/Send access token), purge |
| **private key** | the owner file (RSA-OAEP 3072) | decrypt; never sent anywhere |

The **public key** and the vault id are published in [`lane.json`](lane.json), because a public key can only seal. The **append token** is the gate and is in no file of this repository; the gate checks that `lane.json` carries none of the four. The **owner file** (`admin/credentials/feedback-owner.json`, which git ignores) holds the rest; the owner escrows it and hands it to a session as the environment variable `STARTUPS_FEEDBACK_OWNER` when the agent should read the lane.

**What the code proves, and what it does not.** Only a holder of the code can write: a write with any other token is refused (404). Anyone you give the code to, or who copies it from your browser, can write as you; the lane cannot tell who. If the code leaks, the owner rotates it and the old code is refused from then on.

## How the agent reads it

```
STARTUPS_FEEDBACK_OWNER="$(cat feedback-owner.json)" python3 admin/build/feedback.py drain
```

`drain` lists the lane with the enum key, fetches every pending message, opens each with the private key, refuses any that is not a `startups-feedback/v1` message for this key, writes each note and its files to a folder outside the repository, prints a digest (page, quote, text, transcript, files) and marks the messages processed. `--keep` leaves them pending. The other commands:

| Command | Does |
|---|---|
| `feedback.py setup` | once: a vault, the key pair, the token, the enum key, the lane configured, the owner file and `lane.json` written |
| `feedback.py check` | a sealed probe in, listed, fetched, opened and marked processed; and a random token refused, the negative control |
| `feedback.py rotate` | a new token; the old code is refused from then on; give the new code to whoever should keep writing |
| `feedback.py code` | prints the current lane code, to hand over |

## Limits

| Limit | Value | Why |
|---|---|---|
| A file | 2 MB | sealed and encoded twice, a message grows about 2.4 times, and an append is at most 5 MB |
| A message | about 1.9 MB of JSON | the same; more notes go as more messages |
| A screenshot | 1600 wide, JPEG, under 1.5 MB | quality drops until it fits |
| A voice memo | 10 minutes | transcribed in two-minute parts of 16 kHz mono WAV |
| Waiting in the lane | 1000 messages per token | the lane's own cap (507 after that); drain often |

## What this does not do

- **It does not reply.** The agent answers in a release, an article or a chat. A reply lane, the same machinery pointed the other way, is not built.
- **It does not sign.** The code is the credential; a message is a claim from whoever held it, and is read as one.
- **It does not expire codes.** The lane has no expiry; rotation is the revocation the server enforces.
- **Screenshots need a desktop browser that can share a tab.** iPhone and iPad Safari cannot; take a screenshot with the system and paste it.
- **Transcription needs your key and a network.** Without one the audio goes as it is, untranscribed.
- **It does not run in the vault host.** This is a site page; a vault app sends through the bridge (`sg.append.write`) instead, as [the telemetry brief](https://sgit.ai/docs/briefs/vault-telemetry-append-lanes.html) explains.

## Where it comes from

This was asked for on 20 October 2026 ([decision 005](../decisions/index.html#a-feedback-pane-on-every-page)). The parts that existed and were reused: the append lane and its four capabilities, documented on sgit.ai ([the API](https://sgit.ai/api/append-lanes.html), [the telemetry brief](https://sgit.ai/docs/briefs/vault-telemetry-append-lanes.html), [append-lane messaging](https://sgit.ai/docs/append-lane-messaging.html)); the sealed inbox and the sending page of newsroom.sgit.ai (`assets/vault-pane/inbox.js` and `send.js` there), whose envelope this copies exactly; the pane on the right of newsroom.sgit.ai; and its *Ask*, which calls openrouter.ai with the reader's own key. The parts that were new here: voice memos with transcription, the screenshot, paste and drop, the pane mounted only where a code is kept, and the owner's script. None of the sibling sites read for this had recorded voice or captured a screenshot.

## The prompt to build the same on another site

```
Add a feedback pane to SITE, after https://startups.sgit.ai/feedback/ (read it, and the
source: assets/feedback/feedback-core.js, assets/feedback/feedback-store.js,
assets/components/sg-feedback/, admin/build/feedback.py in SGit-AI/SGit-AI__Website__Startups).

Copy those files rather than rewriting them. Run admin/build/feedback.py setup with
SG_SEND_ACCESS_TOKEN in the environment: it makes the vault and the lane, writes the
owner file under the repository's gitignored credentials folder, and writes the lane's
public half for the site to publish. Run feedback.py check: the probe must round-trip
and a random token must be refused.

Rules: publish only the endpoint, the vault id and the public key. The append token is
handed to the person who will write, never committed. The owner file is escrowed with the
owner and handed to a session as an environment variable. The pane mounts only where a
lane code is kept. Notes stay in the browser (IndexedDB) until Send. A voice memo goes to
openrouter.ai with the reader's own key and nowhere else. Say on the page exactly what is
sent. Add a gate check that the published file carries no token or key.
```
