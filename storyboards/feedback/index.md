# What startups.sgit.ai would like from the storyboards kit, startups.sgit.ai

> Feedback to storyboards.sgit.ai and api.storyboards.sgit.ai from the first site to use the kit from outside: what worked unchanged, what this site had to do around the kit, and ten things the API could take, each with the experiment here that shows why.

*Source: <https://startups.sgit.ai/storyboards/feedback/index.html> · site v0.1.4 · this file is generated from the same content as the page, so the two cannot drift. Every page on this site has a `.md` twin; internal links below point at them.*

---

A brief for the storyboards team · from startups.engineer · 20 October 2026 · status: proposed, not sent as a pull request

# What startups.sgit.ai would like from the storyboards kit

Feedback to storyboards.sgit.ai and api.storyboards.sgit.ai from the first site to use the kit from outside: what worked unchanged, what this site had to do around the kit, and ten things the API could take, each with the experiment here that shows why.

The memo that started the storyboards site says the API is what gets used, by other websites embedding it, and asks to see how far the storyboards can be pushed. This site is the first to use the kit from outside the two origin sites, on the day both went live. Dinis asked for the storyboards to be used here to explain the concepts, for the design to be explored (layouts, schemas, colours, characters), for the experiments to stay on a separate page at first, and for the ideas to be fed back. This is the feeding back. Everything below is checkable on [the design page](../design/index.md) and in [this site's repository](https://github.com/SGit-AI/SGit-AI__Website__Startups).

## What worked unchanged

- **The format and the validator.** Four storyboards and a cast were written in the documented JSON, and `formats.js` validated them in Node with no surprises. `toMarkdown` and `toGraph` gave the script twins and the graphs for free.
- **Prop packs.** The security pack's `key`, `calendar`, `padlock` and `record` drew the vault parts of the loop; this site's own pack (`crowd`, `tag`, `door`, `box`) registered through the documented hook in a few dozen lines.
- **The viewer.** The deck, grid and script, wired from the same markup storyboards.sgit.ai writes, with a prefs key of this site's own.
- **Shared characters.** Zara, Marta and the Guide were copied from the gen-z cast with their look unchanged, and they draw the same here, which is the point.

## What this site did around the kit

1. **Vendored the release instead of hot-linking it.** The guidance for every sgit repository says nothing is fetched from another origin at run time, and the site-pages brief says to copy house code in. So `v0/v0.1/v0.1.0/` is in this repository byte for byte, and the gate recomputes every file's hash against the manifest on every build. The manifest made that a ten-line check.
2. **A strip component.** `sg-strip` draws panels with `drawScene` into its own grid, without the toolbar, the dark deck frame and the bar: a figure in a page rather than a player. The deck is one click away.
3. **Silent panels.** The strip can strip the lines out of a copy of a scene before drawing, and print them under the panel. A 34px bubble in a 1600-wide panel is unreadable below about 500 pixels; the silent panel reads at 250.
4. **Theme ink.** After drawing, the strip maps the kit's two constants (ink `#23262b`, paper `#fbf7ee`) and its white fills to this site's tokens, so a panel can follow Night or Ember. It is a hack on the output, and it misses the hachure fills and the coloured props, which is why it is on the design page and not on the front page.
5. **Quotes checked against a file.** Lines marked `from_finder` must equal a string in `finder.json` word for word, or the build fails. The gen-z site did the same against its chapters; it is the second site to need it.

## Ten things the API could take

| # | Ask | Why, and where to see it |
|---|---|---|
| 1 | **Ink and paper as options.** `drawScene(svg, scene, cast, { ink, paper })`, or the two as CSS custom properties the kit reads, with the hachure and prop fills following. | The theme-ink experiment on the design page shows what a host theme wants and where a post-hoc remap breaks. |
| 2 | **A silent mode in the kit.** `{ speech: 'outside' }` returning the lines, or a `sceneText` split into caption and lines, so small panels are legible by design. | The silent strips on the design page. |
| 3 | **A `strip` view in the embed.** `view="strip" cols="3"`: panels in a row, caption under, no toolbar, a click opening the deck. | `sg-strip` is that, written outside the kit. |
| 4 | **Prop packs by URL.** `packs="https://startups.sgit.ai/assets/storyboards/startups-props.js"` on the embed, and the pack's kinds passed to `validate`. Today the embed knows one pack by name. | This site's pack had to be loaded by the page, not by the embed. |
| 5 | **A `from` field for quoted lines, in the format.** `"from": { "file": "...", "path": "..." }` on a line, with `validate` checking it when given the source text. Two sites have now written this check by hand. | `admin/build/storyboards.mjs`, the from_finder rule. |
| 6 | **Panel formats.** A square and a 4:5 portrait beside 16:10, for phones and for strips. | The strips on this site are 16:10 at a third of the measure; a square would hold a two-person scene better. |
| 7 | **Text scale for small panels.** A `textScale` option, or captions and bubbles that scale with the number of characters in the panel. | The cover and the spectrum read at any size; a four-line bubble does not. |
| 8 | **A cast registry across sites.** A character defined once (Zara, Marta, the Guide) and imported by URL into a cast, so a look is not copied by hand. | This site copied three looks by hand and says so in its cast file. |
| 9 | **A vendor archive per release.** `vX.Y.Z.zip` beside the manifest, or a one-line `curl` in the docs, for sites whose rule is nothing cross-origin at run time. | This site copied the folder from the API repository. |
| 10 | **The security pack's name is narrow.** The key, the calendar and the record are the storyboards' most general props; a `kit` pack of those, with `security` keeping the QR codes and vaults. | The loop strip uses three security props and nothing about security. |

## What this does not claim

- These are one site's asks after one day. The kit's authors may have reasons against each, and the memo's own list (JSON, markup, graph, JPEG, SVG, animated, thumbnail) is already met.
- The theme-ink remap is an experiment on the kit's output, not a proposal to change the drawing's look by default: the cream paper in every theme is a deliberate choice of the kit's and reads well.
- Nothing here was sent to the storyboards repository. This page is the brief; a session with write access there can copy it into `briefs/` as the site's own rules ask.

## Where this comes from

Dinis's message of 20 October 2026 (quoted in [decision 004](../../decisions/index.html#storyboards-come-here-as-an-experiment)); [the storyboards brief](https://storyboards.sgit.ai/brief/index.html); [the API's docs](https://api.storyboards.sgit.ai/docs/index.html); [the design page](../design/index.md) here, where every claim above is drawn.


---

*[Site index for agents](https://startups.sgit.ai/llms.txt) · [HTML version](https://startups.sgit.ai/storyboards/feedback/index.html)*
