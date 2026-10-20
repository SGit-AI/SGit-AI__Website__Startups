# Storyboards, startups.sgit.ai

> This site's concepts as storyboards drawn by code: the loop, the spectrum, the excuses and the rules; an experiment with the storyboards kit.

*Source: <https://startups.sgit.ai/storyboards/index.html> · site v0.1.5 · this file is generated from the same content as the page, so the two cannot drift. Every page on this site has a `.md` twin; internal links below point at them.*

---

An experiment, on a page of its own · decision 004 · kit v0.1.0 from api.storyboards.sgit.ai, vendored

# Storyboards

This site's concepts as storyboards: the loop, the spectrum, the excuses and the rules, drawn by code from data with [the storyboards kit](https://storyboards.sgit.ai/). 4 strips, 25 panels, 7 characters. Short on purpose: a nice thing to have beside the pages, not the main thing. The [design experiments](design/index.md) try other layouts; [the brief](feedback/index.md) sends what was learnt back.

*storyboard 1 · 6 panels*

### [Do they miss it?](do-they-miss-it/index.md)

The loop every route on this site leads to, in five panels: ship it, give it away, take it away, ask, then charge or ship again.

[Open the deck →](do-they-miss-it/index.md)

*storyboard 2 · 8 panels*

### [Five ways in](five-ways-in/index.md)

The finder's spectrum, one person per entry: where you are decides what it asks next.

[Open the deck →](five-ways-in/index.md)

*storyboard 3 · 6 panels*

### [It is not ready yet](it-is-not-ready-yet/index.md)

Rui builds frameworks. His product is three components away, and that is fine: the route is to ship the component.

[Open the deck →](it-is-not-ready-yet/index.md)

*storyboard 4 · 5 panels*

### [The route is a rule](the-route-is-a-rule/index.md)

Eight rules, applied in order, first match wins. You can read them, and you can disagree with one.

[Open the deck →](the-route-is-a-rule/index.md)

## The strips, silent, captions as text

Each strip as the design experiments ended up drawing it: the panels small, the words under them as text, a click opening the deck. The lines a character speaks from `finder.json` are the file's, word for word, and the build checks them.

### [Do they miss it?](do-they-miss-it/index.md)

### [Five ways in](five-ways-in/index.md)

### [It is not ready yet](it-is-not-ready-yet/index.md)

### [The route is a rule](the-route-is-a-rule/index.md)

## How they are made

- **Data.** One JSON file per storyboard and one cast in `admin/content/storyboards/`, in [the kit's format](https://api.storyboards.sgit.ai/docs/format.html), validated by its `formats.js` on every build. [The cast](cast/index.md) is three characters shared with the book and four of this site's own.
- **Drawing.** The kit's release v0.1.0, vendored byte for byte under `assets/vendor/storyboards/` with its manifest; the gate recomputes every hash. This site adds a prop pack (the five, a price tag, a door, a parcel) and the `sg-strip` component.
- **Quotes.** A line marked `from_finder` must be in `finder.json` word for word (decision 002: nothing about the interview is written twice).
- **Shapes.** Each storyboard has its data, its bundle for an embed, its graph and its script as the page's markdown twin.

The storyboards began on [the book's site](https://gen-z-developers.sgit.ai/storyboards/index.html), moved to [storyboards.sgit.ai](https://storyboards.sgit.ai/) on 20 October 2026, and this is the first site to draw its own with the kit from outside. Status: a proposal for Dinis; the cast and every panel are drafts.


---

*[Site index for agents](https://startups.sgit.ai/llms.txt) · [HTML version](https://startups.sgit.ai/storyboards/index.html)*
