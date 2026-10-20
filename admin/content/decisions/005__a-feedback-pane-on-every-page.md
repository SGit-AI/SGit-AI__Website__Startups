# A feedback pane on every page, over a sealed append lane only the owner can read

**Decided.** 2026-10-20

**By.** Dinis Cruz.

**Said.** "Can you look on sgit.ai for how the instructions of how can you add an append lane, and basically how can you create a vault here and add an append lane into that vault so that you can receive comments from me as I view the website. [...] I should have a pane that opens on the right-hand side, which I need to enter the vault lane ID. So you can leak the public key of your vault lane, but you'll give me [...] the ID of it, so that nobody else can send messages to it. And then you need to allow me to write text. You also need to allow me to record voice memos, which can be transcript. And this will work on [an] open router key. [...] including taking screenshots and uploading files, copy and paste. Or maybe even a button [...] to add a screenshot of the current site. [...] I want to, for example, be reading in a storyboard, and I have a comment on it or a question, and I'll be able to send it to you. And this whole thing, you save in a local storage, and then you catch it all up, and then eventually I submit to send. So we should already have this pattern documented. If not, let me know, because we really need to have it documented."

**Means.** This site gets a vault of its own with an append lane, and every page gets a pane on the right that sends notes into it: text, the quoted selection, voice memos transcribed with Dinis's own OpenRouter key, a screenshot of the page, pasted and attached files, each note knowing its page and, on a storyboard, its panel. Notes are kept in the browser until Send. The lane's public key is published; the append token, given to Dinis as the lane code, is the only thing that lets anyone write, and it is in no file of the repository. The pattern is documented on the site's own feedback page with the prompt to repeat it elsewhere, because, as checked on the day, the append lane and the sealed inbox were documented and built, and voice memos and screenshots were not.

**Supersedes.** Nothing.

**Recorded in.** [Feedback from the page](/feedback/index.md); the engineer's agent article [A feedback pane, and a lane only the owner reads](/agent-articles/a-feedback-pane-and-a-lane.md).
