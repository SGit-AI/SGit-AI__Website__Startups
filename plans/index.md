# Business plans to build on sgit, startups.sgit.ai

> 8 complete business plans published as vaults on sgit.ai, for other people to build companies on: how to take one, and what every plan contains.

*Source: <https://startups.sgit.ai/plans/index.html> · site v0.1.5 · this file is generated from the same content as the page, so the two cannot drift. Every page on this site has a `.md` twin; internal links below point at them.*

---

For founders · published as vaults on sgit.ai · take one and run it

# Business plans to build on sgit

Businesses we think should exist on top of sgit, each written up as a vault in enough detail for somebody else to start. 8 plans as of 2026-10-20, each with the plan as an app and as documents, the numbers marked as hypotheses, the facts with their sources, and prototypes enough to serve the first customer. **We are looking for business partners to build them.** Where nobody does, we may build one ourselves. Either way the plan is public, on the same terms as the code.

The plans live in their vaults on sgit.ai and are linked, not copied: every plan's page there prints its public read key, and a vault is right where a copy would drift. This page is generated from `admin/content/plans.json`, one row per plan. If you have just [found your startup](../finder/index.md) and it is one of these, the plan is the head start.

## The plans

| Plan | The business | How it makes money | What is in the vault |
|---|---|---|---|
| [**Agent Desk**](https://sgit.ai/demos/vaults/agent-desk/index.html)2026-10-09 | A Mac of the agent's own: a dedicated macOS desktop per customer, a clean desktop per run built from encrypted vaults by a short bootstrap, keys by PKI, an egress proxy, a binary allowlist and a record streamed off the machine, erased at the end. Apple's licence rules out a shared pool rented by the minute, so the plan is the shapes it allows. | A fixed monthly fee for a Mac one customer holds, plus a per-minute meter for desktop time; a developer-agent offer; the same set-up given away as software. Every number but Apple's prices is a labelled assumption. | Eleven plan documents, the licence quoted with five shapes against it, three Agent Behaviour Policies for the same agent, a calculator, a Wardley map, the bootstrap and example profiles and allowlists. |
| [**Deck Vault**](https://sgit.ai/demos/vaults/deck-vault/index.html)2026-10-06 | An author-first home for presentations: every author's decks in a vault the host cannot read, access decided by keys the author holds, decryption in the browser, seven roles that no single company holds, pay once or nothing with 85% to the author on a ledger they can recompute, provenance as the product. | Given away. Whoever commercialises it inherits the payments relationship, the identity verifications, the enclave operation, support and the register, under rules the plan states. | A working mock as web components, ten plan documents, the economics of one author, the right-of-access letter and a register of ten accepted risks. |
| [**Kit Bag**](https://sgit.ai/demos/vaults/kit-bag/index.html)2026-09-30 | A recovery-shopping companion for football and padel players on one shop, as a Chrome extension you build yourself, or your agent does, and load from a folder. No store. Its Agent Behaviour Policy was written before its code and ships beside it. | Given away. Six ways to pay for whoever commercialises it: paid stacks from coaches and physios, a club subscription, white-label, more retailers, disclosed affiliate links, or adoption by the retailer. | A working extension tested on a fixture, the policy in prose and JSON, two stacks of label facts, an encrypted record with export, a register, the build-it-yourself checks, ten plan documents and two diagrams. |
| [**Company X-Ray**](https://sgit.ai/demos/vaults/company-xray/index.html)2026-09-24 | Read a company's own documents together: accounts, customer and supplier lists, minutes, the plan and a complaints log dropped into an encrypted vault; agents run a catalogue of twelve analyses; a person reviews; within five working days the customer gets their questions answered, a one-page board pack, findings tied to the file and row they rest on, and a Claude setup to keep asking. No connectors. | Four levels: the kit £50, your X-ray vault £150, Standard £500, Tailored £1,500. Re-X-rays when the numbers move, and a partner licence for accountants. About eleven Standard and three Tailored a month cover a two-founder burn. | One invented company X-rayed end to end, a script that re-runs all 46 figures, the board pack and the Claude setup as delivered, eleven plan documents, the analysis catalogue, the run prompt, the reviewer's checklist, a calculator and two diagrams. |
| [**Lesson Loop**](https://sgit.ai/demos/vaults/lesson-loop/index.html)2026-09-24 | Capture what a padel coach knows at the end of every lesson, in a record the player holds: a voice memo, an agent, a lesson note, match notes from the player, and a two-minute briefing for the next coach, in any club or country. Works for any teacher with students. | Paid on demand, no subscription: credits for processing, about 20p a lesson note. Coaches price remote reviews, drill plans, follow-ups and content; the operator takes a share. | One invented player's record across four lessons with three coaches, eleven plan documents, the coach-memo and briefing prompts, the note specification, a calculator and two diagrams. |
| [**Risk Acceptance Office**](https://sgit.ai/demos/vaults/risk-acceptance/index.html)2026-09-24 | Run the risk acceptance loop for organisations: every material risk established on facts, held by a named person, accepted for a stated interval, and at expiry accepted again, escalated, funded or fixed. A governance service in the gaps of the client's GRC platform, with a vault per material risk as its evidence pack. | A free acceptance audit, then a foundation engagement at £18,000, then £2,500 a month plus £60 per material risk per month. Incident support by the day, and a partner licence for consultancies. | The principles, one invented risk replayed over six weeks with a hash-chained decision record, eleven plan documents, two specifications, three prototypes, a calculator and three diagrams. |
| [**Connector Twin**](https://sgit.ai/demos/vaults/connector-twin/index.html)2026-09-24 | Give every AI agent deployment a twin of its connectors: a journal of every request and response to Gmail, Calendar, Drive or Slack, replayed into the views the agent saw, with before and after and a revert plan. Sold with one question: do you know what your agents did? | A connector review once, £750 to £6,000. Then per agent per month: £15, £40 or £90 by tier. Incident replays on demand. About 380 agents cover a two-founder burn. | A working replay of an invented session with a hash chain verified in the browser, eleven plan documents, the journal entry specification, revert rules, three prototypes, a calculator and two diagrams. |
| [**Agent as Webmaster**](https://sgit.ai/demos/vaults/agent-webmaster/index.html)2026-09-23 | Give small businesses a website they can change by asking, with an AI agent as the webmaster and GitHub Pages as the host. Setup once, maintenance monthly, changes on demand. | Setup £300 to £1,200. Maintenance £50 to £200 a month. Changes on demand. One operator, profitable at about fifty customers. | The plan in one page and in ten documents, three diagrams, a unit-economics calculator, three invented customer sites and the operator's sales site as mock-ups, the agent's playbook, the setup steps and six worked change requests. |

## How to take one

1. **Open it.** Every plan's page on sgit.ai prints its public read key. Open it in the browser with nothing installed, or clone it with `sgit clone`.
2. **Read the one-page version.** Every plan starts at `plan/00-START-HERE.md`, with a reading order after it.
3. **Test the numbers.** Every price and every hour is a first guess, and every plan says so. The first ten customers are the test.
4. **Keep what you build.** The plans are offered on the same terms as the code behind them: take it, run it, change it.
5. **Send back what broke.** It is the one thing we ask, and it makes the next plan better.

## What every plan contains

| **The one-page version** | The business, why now, what you sell, the numbers and why it is buildable, on one page. |
|---|---|
| **Facts and assumptions, kept apart** | Facts link to their sources. Assumptions are labelled, with the arithmetic shown so they can be redone. |
| **The architecture and the service** | How it is built on vaults, what the customer gets, and what the operator does not do. |
| **The model, with a calculator** | Prices, costs, margins and break-even, with the inputs on sliders in the app. |
| **Go-to-market and the first ninety days** | Who buys first, the free thing that opens the door, and what done means at each stage. |
| **Investors, risks and open questions** | The case for backing it, what could sink it, and what is not known yet. |
| **Prototypes** | Enough to serve the first customer: playbooks, specifications, set-up steps and worked examples. |
| **PUBLIC.md** | The rules the vault is published under: nothing private, no write token, and an app that asks for no permissions. |

**Want to build one of these, or want one written for your idea?** The plans start as a voice memo and become a vault the same day. If you want to run one of the businesses above, with us or on your own, or you have one that should exist on this stack, [say so](https://sgit.ai/about/index.html). A plan written on this site would be a row here and a vault of its own; none exists yet.

This page moved here from [sgit.ai/startups/business-plans.html](https://sgit.ai/startups/business-plans.html) on 2026-10-20; the rows were read from that page at site v0.7.87.


---

*[Site index for agents](https://startups.sgit.ai/llms.txt) · [HTML version](https://startups.sgit.ai/plans/index.html)*
