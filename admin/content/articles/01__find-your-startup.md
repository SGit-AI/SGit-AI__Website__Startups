---
title: Find your startup: an interview that helps a person zoom in on what to ship, run by Claude or ChatGPT first, not passing judgement, and the first thing the book should do
date: 2026-10-20
author: Dinis Cruz
summary: I keep coming back to the question of how we empower people to focus and to do the thing, and for a startup the thing is shipping. We have enough material now, especially the book, for a startups site of its own, and the first thing on it is a finder. An online questionnaire, a who-done-it of questions where the next question depends on the last, built as a state machine, powered by a fractal semantic graph and by an LLM where it needs one, and deterministic where it can be. The question is find your startup. It maps the person against everything I have been pushing here, which comes down to one thing: can you ship it, can you get it into the hands of users, now. There is a spectrum, from the person starting from zero to the person with a good plan who is not shipping, and we are not passing judgement anywhere on it: the right startup is the one you are passionate about. I am a framework person, I arrive at my profitable startups a few components later, and that is fine. What we can help with is focus, and the output is the person's own description, in their own words, of what they should be focusing on. For now it is designed to be run by Claude or ChatGPT interviewing the person, or reading the documents they upload, because you need an agent behind the scenes; the programmatic version comes after we have the primitives and some examples, which I will do myself. And it is how the book should start.
version: v0.1.0
tags: finder, startups, shipping, interview, agents, book, article
status: published
---

## In short {#in-short}

- **A startups site of its own.** We have enough material, especially the book; the startups section of sgit.ai becomes startups.sgit.ai.
- **The first thing on it is a finder.** Find your startup: a questionnaire where the questions change with the answers, a state machine, powered by a fractal semantic graph.
- **One test runs through it.** Can you ship it? Can you get it into the hands of users, now?
- **A spectrum, not a type.** From the person with no startup yet to the person with a good plan who is not shipping it.
- **We are not passing judgement.** The right startup is the one you are passionate about. We help with focus, and with shipping.
- **The output is in your words.** Your own description of what you should be focusing on, which may be: go old school and raise.
- **For humans and for agents.** It works from the website and it is designed to be run by Claude or ChatGPT interviewing you.
- **LLM first, programmatic later.** Assume it needs an agent behind the scenes; once the primitives exist, some of it can be made deterministic.
- **It is how the book should start.** The first thing the book should do is help the reader zoom in.

## The question I keep coming back to {#the-question}

How do we empower people to focus, and to do the thing right? I want to help people, and for a startup the thing is shipping. I think we have enough material now for this to be a site of its own, especially with the book, and the first thing I would put on it is an online questionnaire. The question is: find your startup.

What makes it interesting is that it is not a form. It is a who-done-it of questions, where the next question depends on the answer to the last one. That goes back to an idea I have had for a long time, dynamic questionnaires, and we can now build the state machines behind them properly. It is powered by a fractal semantic graph: the questions, the signals an answer sets, the routes and the rules that connect them are nodes and edges, and a graph can be zoomed into. Where it needs a model, it uses one. Where it can be deterministic, it should be, because a rule you can read is a rule you can argue with.

## What it maps against {#what-it-maps}

The mapping takes everything I have been pushing here and reduces it to one thing. It has to be something that will ship. Something that can be done right now, and executed. Not a plan for a thing: the thing, in the hands of a user, so that you can give it away, take it away, and find out whether they missed it. That model is written up in [the most important question is whether they miss it](https://newsroom.sgit.ai/articles/the-question-is-whether-they-miss-it.html), and the finder is a way to get a person to the first step of it.

So the questions are about the person and the thing, and about the distance between the thing and a stranger using it. What do you naturally build? What exists today? What is the smallest version somebody could use this week? What is stopping you? Who are the five people you would hand it to? How and when do you take it away? Can you charge, and at a profit? Each answer sets a signal, and the rules read the signals and pick a route.

## The spectrum {#the-spectrum}

There is a spectrum here, and the finder has to work along the whole of it. At one end is the person who has not figured out where their startup is. They start from zero: what do you want to do, what do you want to build, how do you want to build it. At the other end is the person who already has a very good plan and a really good idea, and what we can bring them is focus.

To be honest, almost everybody I meet has a really good idea. What they are not doing is shipping. They are doing the typical thing: it is not ready yet, I just want to get this one feature out, and every other excuse in the book for why it is not ready. I would argue that is the problem. They have to ship it. So the finder lists the excuses, by name, so a person can pick theirs and see it written down, and the route it gives them is the smallest version in a stranger's hands by a date.

## We are not passing judgement {#not-judging}

This is the part I think is most important. The right startup for a person is the one they are passionate about, the one they want to work on. Look at my own example. I am a framework person. I build things, I refactor, so I naturally focus on the components and the infrastructure, and I arrive at my real startups, I should say my profitable and effective startups, three or four startups and a number of components later. I think that is okay. The finder has a route for it: ship the component.

So the finder never says whether an idea is good. What it helps with is focus, and it helps open the door for the person to ship. And the answer can be: here is your focus. Or it can be: sorry, you have to go old school, you are going to have to raise a lot of money to pull this off. That is a valid outcome, said plainly. It all comes down to whether you can ship it and get it to users, and some startups cannot do that without capital first.

The output is the person's own words. Their own description of this is what I should be focusing on. The interviewer drafts from their answers; they correct it until it reads as theirs. Not our verdict, their record.

## For humans and for agents {#humans-and-agents}

I want this to work from the website, maybe through the storyboards we are working on, but it is almost designed to be worked by another LLM. If somebody is not sure what their startup is, where they should focus, what their direction of travel should be, we can help with that on a website or with Claude or ChatGPT driving it directly, in their own account. So the guidance has to work for humans and for agents, and it is written once: one file holds the stages, the questions, the signals, the routes and the rules, and every surface reads it.

## Start with the LLM, make it programmatic later {#llm-first}

Thinking about what can be done on the web and what needs a model, I think the second is better to start with. My idea is to get Claude to interview the person. So for now this is designed to be used by Claude or ChatGPT, because you need that data analysis, you need an agent behind the scenes. What we build first are the primitives, the toolkit a model can run, and I will show some examples by doing it myself. Once we have done a whole part of this, we can find a better way to do some of it programmatically.

Two ways in, both of which work well now: the person uploads a whole bunch of documents, a plan, a deck, their notes, and the model reads them and fills in what it can; or they just have Claude or ChatGPT interview them.

## The first thing the book should do {#the-book}

This is also a great way to start the book. The first thing the book should do is help the reader zoom in: find your startup, and come up with your own words for what you should be focusing on. The record the finder writes is that first page. Where exactly it goes in the book is a decision for the book's own site, [gen-z-developers.sgit.ai](https://gen-z-developers.sgit.ai/), and I have put it to them as a question rather than a change.

## What this does not claim {#not-claimed}

- **The finder has not been run with anyone yet.** The questions and the rules are a first version from this memo; the first interviews, mine included, will change them.
- **The storyboard version does not exist.** Nor does any programmatic version beyond the rules a page can apply in the browser.
- **It is not a verdict on anyone's idea**, and it is not written to be one.
- **The counts are small and will move.** Seven stages, twenty-four questions, six routes, eight rules, as of this release; the finder page prints the current numbers from the file.

## The brief {#the-brief}

For the roles on this site, in order. Each item says what done looks like; the questions for me are kept apart at the end.

1. **The engineer:** the site, in the shape every repository in the estate carries: the brief in full, the reality and corrections files, one version going up on every push, the gate, the review folder, the roles, the licences and the disclosure, the markdown twin for every page and `llms.txt`. Done when the first release is live at startups.sgit.ai from the dev branch and the gate is green.
2. **The librarian:** the finder as data. `finder.json` with the stages, questions, signals, routes and rules, each with an id, so that the prompt, the page and the test read one file. Done when the test proves every rule's signals exist and every route is reachable.
3. **The interviewer:** the prompt for Claude or ChatGPT, the record template, and the in-browser walk-through of the same data. Done when a person can paste the prompt and get a record, and can walk the stages on the site and copy the same record out, with nothing sent anywhere.
4. **The journalist:** this article, the brief verbatim, the decisions from the memo, and the agent article accounting for the build. Done when they are published with their markdown twins.
5. **The interviewer, next:** run the finder with me, from this memo and whatever documents I give it, and publish the record as the first example. Done when the example is on the site, marked as mine.
6. **The librarian, next:** the finder as a graph in the grammar of [graphs.sgit.ai](https://graphs.sgit.ai/): nodes and edges, zoomable, so a stage opens into its questions and a question into its signals. Done when the graph is generated from `finder.json` and nothing is written twice.

Questions for me, not tasks: whether the finder opens the book, and where, which is for the book's site to decide with me; whether the storyboard version is worth building before the programmatic one; and whether the spectrum's five entries are the right five.

## Where this comes from {#sources}

- [The voice memo](/briefs/01__find-your-startup.html), transcribed by otter.ai on 20 October 2026, published verbatim.
- [The most important question is whether they miss it](https://newsroom.sgit.ai/articles/the-question-is-whether-they-miss-it.html), the operating model the finder maps against.
- [Build your startup on sgit vaults](https://sgit.ai/startups/index.html), the section of sgit.ai this site takes over, read at site v0.7.87.
- The counts are read from `finder.json` by the build; the finder page prints them.

*Written by Dinis Cruz with this site's journalist, an agent, from the memo above. Licensed CC BY 4.0.*
