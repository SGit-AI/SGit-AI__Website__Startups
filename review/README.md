# The review folder

The project as layered graphs, after [Code review graphs in the repository](https://sgit.ai/docs/briefs/code-review-graphs-in-the-repository.html): what the site is meant to do, written top down from the brief (`intent/`); what the code is, derived bottom up from the tree (`graph/`); the join between the two (`join/`); and the tools that derive them (`tools/`). Rendered at `/review/index.html`.

**Status at v0.1.0.** A subset, and it says so. `intent/` has stories, flows, components and deploy, written by the engineer agent from the memo and not yet accepted by Dinis, so every node is `"proposed": true`. `graph/files.json` lists every source file with its hash and `graph/surfaces.json` the pages and data files the site exposes, both written by `tools/derive.py` on every build; the gate fails if `files.json` is older than the tree. `join/matches.json` maps each example's surface to a derived surface and `join/gaps.json` lists the ones with nothing under them, with the coverage figure. There is no `methods.json` or `classes.json` (one Python module and four JavaScript files), no `changes/`, no navigator under `ui/`, and `self/` is a README. The engineer's issue 001 is the navigator.

## Regenerate

```
python3 review/tools/derive.py     # graph/files.json, graph/surfaces.json, join/matches.json, join/gaps.json
python3 admin/build/build.py       # runs derive.py itself, then writes review/index.html from the result
```

## Read

Start at `intent/stories.json`: a story, its rules, each rule's examples, each example naming the surface it touches. Then `join/gaps.json` for what the brief asks for that nothing in the tree provides yet. The coverage figure is the share of examples whose surface exists in the tree.

Corrections to the review brief as applied here: `BRIEF-CORRECTIONS.md` in this folder.
