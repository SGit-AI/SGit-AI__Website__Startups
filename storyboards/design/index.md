# Design experiments, startups.sgit.ai

> The storyboards laid out differently: strips, silent panels, captions outside, theme ink, sizes, a figure in prose.

*Source: <https://startups.sgit.ai/storyboards/design/index.html> · site v0.1.5 · this file is generated from the same content as the page, so the two cannot drift. Every page on this site has a `.md` twin; internal links below point at them.*

---

# Design experiments

The same storyboards, drawn by the same kit, laid out differently. Dinis's brief: the storyboards are a nice thing to have on this site rather than the main thing, they are quite big as they come, and the design is the thing to explore: layouts, schemas, colours, characters. Each experiment below names what it changes and what it costs, and feeds [the brief back to the storyboards team](../feedback/index.md). Switch the theme in the top bar to see the ink experiment.

## 0. As the kit draws it

The deck: one panel at a time in a dark frame, a toolbar, a bar, notes, full screen. Right for a storyboard page; heavy for a figure in a page of prose. [Open the first strip in the deck.](../do-they-miss-it/index.md)

## 1. A strip, three per row, as the kit draws each panel

The `sg-strip` component draws each panel with `drawScene` into its own grid: no toolbar, no frame, a number and nothing else under each panel. A click opens the deck at that panel. The bubbles are the kit's; at a third of the measure the four-line ones are hard to read.

## 2. Silent panels, the lines under them

The same strip with the speech taken out of a copy of each scene before drawing, and printed under the panel. The picture carries the setting, the people and their moods; the text carries the words. Small panels become legible, and the lines are selectable text. The cost: the panel no longer says who speaks first without the text.

## 3. Captions outside too

The yellow caption box is the kit's narrator voice. Outside the panel it reads as a figure caption, and the panel is only the drawing.

## 4. Theme ink

The kit draws on cream paper with dark ink in every theme, like a printed picture, on purpose. This experiment maps the kit's two constants and its white fills to this site's tokens after drawing, so the panel follows Night, Paper, Blueprint or Ember. It is a remap of the output, not a kit option: the hachure fills and the coloured props keep their colours, which is why it is here and not on the front page. Ask 1 in the brief is the kit doing this properly.

## 5. One per row, with the script beside it

At the full measure a panel reads as the kit intends, bubbles included, and the lines under it become a transcript. Two panels a row is the shape a strip in prose wants; one is a figure.

## 6. A figure in prose

One panel beside a paragraph, silent, caption as a figure caption. This is the shape the finder's pages would use if the storyboards left this section: the evidence panel of [It is not ready yet](../it-is-not-ready-yet/index.md) quoting the rule of the finder, word for word from `finder.json`, beside the paragraph that explains it.

The quote in the panel is checked by the build against the file: a line marked `from_finder` must equal a string in `finder.json`, or the build fails. The same rule the book's site applied to its chapters.

## 7. Try the combinations

Every switch above, live, on the spectrum strip.

## What these do not settle

- **Panel format.** Everything is 16:10, the kit's one shape. A square or a 4:5 portrait would hold two people and a prop better in a strip (ask 6).
- **Text scale.** Silent panels dodge the problem; a kit option would solve it (ask 7).
- **The characters.** The cast page shows them; whether Rui, Inês and Ana are the right four, and whether the Finder should look like an agent or like a page, is for Dinis.
- **Where they go.** Nothing on the finder's pages embeds a strip yet; this section is the experiment. Decision 004.


---

*[Site index for agents](https://startups.sgit.ai/llms.txt) · [HTML version](https://startups.sgit.ai/storyboards/design/index.html)*
