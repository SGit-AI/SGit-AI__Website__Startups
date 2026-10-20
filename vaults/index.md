# Build your startup on sgit vaults, startups.sgit.ai

> For founders: a vault removes the four costs that usually stand between you and a first user (a database to run, hosting for your reader, an account, an install), so you can ship something usable, give it away briefly, take it away, and find out whether they missed it. What you get on day one, the loop from first vault to first customer, what you still bring, and the measured cost base.

*Source: <https://startups.sgit.ai/vaults/index.html> · site v0.1.0 · this file is generated from the same content as the page, so the two cannot drift. Every page on this site has a `.md` twin; internal links below point at them.*

---

For founders building on vaults · moved here from sgit.ai/startups on 20 October 2026

# Build your startup on sgit vaults

For founders: a vault removes the four costs that usually stand between you and a first user (a database to run, hosting for your reader, an account, an install), so you can ship something usable, give it away briefly, take it away, and find out whether they missed it. What you get on day one, the loop from first vault to first customer, what you still bring, and the measured cost base.

A large part of why sgit exists is to make it cheap enough to ship something a stranger can actually use, repeatedly, and to take it away again when you need to find out whether they missed it. That loop is hard mostly because the infrastructure under it is expensive: a database to run, hosting to pay for, an account for every reader, an install before anybody sees anything. **A vault removes all four.** This page is for founders who want to build on that. It was the startups section of sgit.ai until it outgrew a page; [the finder](../finder/index.md) is what this site adds to it.

**The operating model comes first, because the technology is the easy part.** [**For a startup, the most important question is whether they miss it**](https://newsroom.sgit.ai/articles/the-question-is-whether-they-miss-it.html) is the model this is all built to serve: ship something somebody can use, give it away briefly, take it away, and find out whether anybody noticed. Be profitable before you raise, so the investors are calling you. Open source everything, because the technology is not the moat. Read that first, then come back for the substrate. If you are not sure what to ship, [the finder](../finder/index.md) is the interview that gets you to the first step.

## What you get on day one

Not a platform to sign up for. A format, a CLI and a credential, all open source, that between them remove the four things that usually stand between you and a first user.

| The usual cost | On a vault |
|---|---|
| **A database to run** | None. The store is encrypted files in cloud storage, read directly. Nothing runs between requests, so nothing is billed between requests. |
| **Hosting for your reader** | None. A vault carries its own app, and it opens in the browser with no server of yours in the path. It also runs from a plain static host or a bucket, so your deployment is a copy. |
| **An account, and an install** | Neither. [A read key](https://sgit.ai/docs/credentials.html) is the whole credential: the address, the capability and the decryption key in one string. You send it. They open it. |
| **Versioning you bolt on later** | Already there. Every change is a commit, every version is retained, and a reader can see the history, which means you can take something away and put it back without losing what was there. |
| **An audit story for the first serious customer** | The server storing it cannot read it. That is the default, not a tier, and [the security model](https://sgit.ai/security/index.html) states exactly what the server does see. |

The numbers behind that are measured rather than claimed. [Performance, cost, and running everywhere](https://sgit.ai/demos/fractal-graphs/performance.html) has the full set, and the shape of the bill is the part founders care about: storage and egress only, no instance hours, and query compute paid by the reader's own device.

## First vault to first customer

The point of the model is a short loop. Here is what it looks like on this stack, with the page that owns each step.

| Step | What, and where |
|---|---|
| **1. Put the thing in a vault** | `pip install sgit-ai`, create, commit, push. [Five minutes](https://sgit.ai/docs/quickstart.html), and the same verbs as git. |
| **2. Make it usable, not demoable** | Publish content with no code at all, or ship an app inside the vault. [Pick the surface first](https://sgit.ai/docs/surfaces.html): that choice decides more than anything after it. |
| **3. Give a read key to five people** | No onboarding to build, no invites, no seats. If the content is meant to be open, use the prefix that says so. The finder's miss stage asks you to name the five. |
| **4. Take it away** | Rotate the key and the trial is over. Nothing else about the product changes, which is the point: you are testing whether they miss it, not whether they liked the email. |
| **5. Charge, if they came back** | The stack does not do billing, and you should not want it to. What it gives you is a cost base low enough that a small price can be a profitable one. |

**One honest caveat on step 4.** [Revocation is not retroactive.](https://sgit.ai/docs/credentials.html#read) Anybody who cloned while they had the key keeps what they cloned. For a trial that is usually fine, and it is better to know it now than to design as though a key could be recalled.

## What you still have to bring

A vault is a storage, distribution and versioning layer. It is not a product, and it is deliberately not several things.

- **Billing and payments.** Not here, not planned. Use whatever charges cards.
- **Identity and per-user accounts.** A read key is a capability, not a login. If you need to know who opened something rather than that it was opened, that is yours to build.
- **Server-side search and query.** The server cannot read the content, so it cannot index it. Whatever the client needs, the client downloads, which is fine at a megabyte and a design problem at a gigabyte.
- **The judgement about what to ship.** The finder helps with the focus; the shipping is yours. It is worth saying, because the cheapest part of this is now the part everybody used to spend their seed round on.

[When not to use sgit](https://sgit.ai/docs/limitations.html) is the longer version of this list, and it is kept honest on purpose.

## The arguments this rests on, and where they live

The market you are building into is described in [The SaaS apocalypse will be decided by inertia, not by AI](https://newsroom.sgit.ai/articles/saas-apocalypse-decided-by-inertia-not-by-ai.html): most users were never happy, most features were never used, most licences sit idle, and the portability and APIs the incumbents starved to protect their moats are what an agent now needs. One market gets its own worked example, because it is the one where both the traffic and the law are moving at once: [The future of news is the story vault, not the paywall](https://newsroom.sgit.ai/articles/future-of-news-story-vault-not-paywall.html).

Two of the three pillars have a whole site to themselves.

- [**open-source.sgit.ai**](https://open-source.sgit.ai/): why giving away the technology is the commercial choice rather than the charitable one, and why it is the better exit for a founder who wants to leave with their tools. "Open source is a strategy. It is not a charity."
- [**subscriptions.sgit.ai**](https://subscriptions.sgit.ai/): the pricing trap most founders walk into by default. Charging rent for something nobody is using is a worse business than being paid when you deliver. "A subscription is a discount for regular use, not rent on something you ignore."

## Business plans to build on

Complete business plans, published as vaults, for other people to build companies on. Each one is written to be taken and run, with the numbers marked as hypotheses, the mock-ups included, and the prototypes enough to serve the first customer. [**All the plans, and how to take one**](../plans/index.md).

## Evidence, rather than a pitch

Everything above is how sgit.ai itself is built, which is the only reason to believe any of it.

- **The published vaults carry their read keys**, each with a page describing what it does and the vault running live inside it. [Open any of them](https://sgit.ai/demos/vaults/index.html) with no account and nothing installed.
- **The method is written down**, including the mistakes that produced each rule. [The publishing method](https://sgit.ai/demos/vaults/publishing.html) is written to be followed by somebody else's agent.
- **The measurements are repeatable**, with the commands printed. [Performance and cost](https://sgit.ai/demos/fractal-graphs/performance.html).
- **One person, working with agents.** The whole estate is built this way, which is the actual claim about how small a team this needs.

## Where to start

|  |  |
|---|---|
| **Find what to ship** | [The finder](../finder/index.md): an interview, run by Claude or ChatGPT or walked on this site, that ends in your own description of what to ship, to whom, by when. |
| **Read the model** | [The most important question is whether they miss it](https://newsroom.sgit.ai/articles/the-question-is-whether-they-miss-it.html) |
| **Ship something today** | [Quickstart](https://sgit.ai/docs/quickstart.html), then [pick your surface](https://sgit.ai/docs/surfaces.html) |
| **Build with agents** | [The agent guide](https://sgit.ai/docs/agents.html) and [the skills](https://sgit.ai/skills/index.html), since this is how the work actually gets done here |
| **See what exists already** | [What exists, and what is still a design](https://sgit.ai/summit/startups.html), the sheet that says which is which |
| **Raising, eventually** | [sgit.ai for investors](https://sgit.ai/investors/index.html), published in the open, which is the same rule this site follows |

**This page moved here from sgit.ai on 20 October 2026**, at that site's v0.7.87, as its last paragraph said it would when the section outgrew a page. Until sgit.ai's page carries a notice pointing here, both exist; that is on [the librarian's board](../team/librarian/index.md). If you are building on vaults, the most useful thing you can send is what broke.


---

*[Site index for agents](https://startups.sgit.ai/llms.txt) · [HTML version](https://startups.sgit.ai/vaults/index.html)*
