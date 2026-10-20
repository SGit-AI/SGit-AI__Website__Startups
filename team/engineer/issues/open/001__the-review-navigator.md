# The review navigator, as web components

**What.** The review brief asks for `review/ui/`: a shell, a base component, and one component per file shape (ladder, tree, node, source, reach, change, join, checks, search, crumb, set). This release has the intent layers, a derived file list and the join; the navigator is a page the build writes. Build the navigator in the three-file shape on `assets/components/sg-base/`, reading the JSON under `review/`, with no server and no build step; then `review/self/` for the tools.

**Done when.** `review/ui/index.html` walks from a story to a surface to a file, the gate checks the components parse, and the reality row for the review folder says "navigator: exists".

**From.** [Every sgit repository, section 7](https://sgit.ai/docs/guidance/repositories.html); the engineer's agent article, departures.
