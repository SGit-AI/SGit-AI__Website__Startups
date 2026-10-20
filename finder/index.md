# Find your startup, startups.sgit.ai

> An interview that helps you zoom in on what to ship, to whom, by when; run by Claude or ChatGPT, or walked on this site; the output in your own words.

*Source: <https://startups.sgit.ai/finder/index.html> · site v0.1.1 · this file is generated from the same content as the page, so the two cannot drift. Every page on this site has a `.md` twin; internal links below point at them.*

---

Find your startup · finder 0.1.0 · first version, written 20 October 2026 from the brief; the questions and the rules are a proposal for Dinis to correct

# Find your startup

An interview that helps you zoom in on what to ship, to whom, by when. The questions change with your answers; the route at the end is picked by a rule you can read; the output is your own description of what you should be focusing on. It can be run by Claude or ChatGPT interviewing you, or walked on this site.

**The rule of the finder.** We are not passing judgement. The right startup for a person is the one they are passionate about and will keep working on. What we help with is focus, and shipping: something a stranger can use, now.

## Three ways to run it

[

*With Claude or ChatGPT*

### Paste the prompt

The model interviews you one question at a time, or reads the documents you give it first, applies the rules in the open and writes your record. This is the version the memo asks for first.

The prompt →](prompt.md) [

*On this site*

### Walk the interview

The same stages and questions in the browser. Your answers stay in this browser; the route and the record are computed from them, and you copy the record out. No conversation, no follow-up: that is the model's part.

Walk it →](interview.md) [

*Read it first*

### Every stage, question and rule

The interview is one data file. Read the stages and what each question is for, then the routes and the eight rules that pick between them.

The stages →](stages.md)

## Where you are: the spectrum

The finder works along the whole spectrum, from the person who has not figured out where their startup is to the person with a good plan who is not shipping it. The first question is which of these you are, and it decides what comes next.

*blank*

### I do not have a startup yet

Start from zero: what you want to build, how you want to work, what you already have.

*many*

### I have several ideas and cannot pick

Bring focus: the one that can ship first, and what the others wait for.

*one*

### I have one idea and have not shipped it

The usual case. A good idea, and every reason in the book why it is not ready yet.

*plan*

### I have a plan, maybe a company, and I want focus

A plan already written; we zoom in on the thing to ship next and what to stop doing.

*shipping*

### I am shipping and want the next step

Give it away, take it away, find out whether they miss it, then charge.

## The seven stages

1.

### Where you are

Which of the five are you? There is no wrong answer; it decides which questions come next.

2.

### You

What you naturally build, what you have shipped, how much time you have and who you can reach.

3.

### The thing

The thing in one sentence, the first user and what they do on day one, what exists today, how wide it is.

4.

### The ship test

Can a stranger use it on their own this week? What is stopping you? What does it cost to run?

5.

### The miss test

The five people you will give it to, how, when you take it away, and what missing it looks like.

6.

### The money

Whether you can charge, in what shape, and whether you can reach the first paying user without raising.

7.

### Your focus

The record, in your own words: what you will ship, to whom, by when, what you are not doing, and the route.

## One test runs through it

Everything maps to one question: can you ship it, can you get it into the hands of users, now? Not a plan for a thing: the thing, usable by a stranger, so that you can give it away, take it away, and find out whether they missed it. The model is [the most important question is whether they miss it](https://newsroom.sgit.ai/articles/the-question-is-whether-they-miss-it.html), and [the vaults page](../vaults/index.md) is the substrate that makes the loop cheap.

## How it is made

The interview is one file, [`finder.json`](finder.json): 7 stages, 24 questions, 12 signals, 6 routes and 8 rules, first match wins. The prompt tells a model to follow it; the interview page reads it; this page and the next two print it; `admin/build/test_finder.mjs` proves it on every release. Nothing about the interview is written anywhere else, which is [decision 002](../decisions/index.html#it-works-for-humans-and-for-agents). The questions and the rules are a first reading of [the memo](../briefs/01__find-your-startup.md), and the first interviews will change them; the file carries its own version so a record says which it was made with.

## What this does not claim

- **It has not been run with anyone yet.** The first interview, Dinis's own, is [the interviewer's first issue](../team/interviewer/index.md).
- **It is not a verdict** on your idea, and it is not written to be one.
- **The page does not hold a conversation.** It asks the questions as written. The follow-up when an answer is vague, and the reading of documents, are the model's, through the prompt.
- **The storyboard version and the programmatic version do not exist.** The memo names both as later.

The finder is the brief's own ask: [Find your startup](../articles/find-your-startup.md), in Dinis's words, with the brief for the roles at its end. The agent surface is [llms.txt](../llms.txt).


---

*[Site index for agents](https://startups.sgit.ai/llms.txt) · [HTML version](https://startups.sgit.ai/finder/index.html)*
