#!/usr/bin/env node
/**
 * test_finder.mjs: the finder's rules against the finder's file, in Node, with the same module the page uses.
 * No mocks: the real file, the real module. Run: node admin/build/test_finder.mjs
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT   = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const finder = JSON.parse(readFileSync(path.join(ROOT, 'admin/content/finder/finder.json'), 'utf8'))
const rules  = await import(path.join(ROOT, 'finder/finder-rules.js'))

const failures = []
const expect = (ok, what) => { if (!ok) failures.push(what) }

// 1. the file is whole: every id resolves, every route is reachable, the last rule is a default
const problems = rules.check(finder)
for (const p of problems) failures.push('check: ' + p)

// 2. the published copy is the source
const published = readFileSync(path.join(ROOT, 'finder/finder.json'), 'utf8')
expect(published === readFileSync(path.join(ROOT, 'admin/content/finder/finder.json'), 'utf8'), 'finder/finder.json differs from admin/content/finder/finder.json: rerun build.py')

// 3. sample answers land on the route the sample expects
const SAMPLES = [
  { name: 'nothing yet',                  answers: { 'where.entry': 'blank' },                                                                      route: 'start-the-loop',  rule: 'R1' },
  { name: 'hardware before any user',     answers: { 'where.entry': 'one', 'ship.cost': 'capital' },                                               route: 'old-school',      rule: 'R2' },
  { name: 'must raise',                   answers: { 'where.entry': 'plan', 'ship.cost': 'server', 'money.raise': 'cannot' },                       route: 'old-school',      rule: 'R3' },
  { name: 'already shipping',             answers: { 'where.entry': 'shipping', 'ship.cost': 'zero', 'money.raise': 'yes' },                        route: 'next-step',       rule: 'R4' },
  { name: 'too many ideas',               answers: { 'where.entry': 'many', 'ship.cost': 'zero' },                                                  route: 'zoom-in',         rule: 'R5' },
  { name: 'a platform',                   answers: { 'where.entry': 'one', 'thing.scope': 'platform', 'ship.cost': 'zero' },                        route: 'zoom-in',         rule: 'R6' },
  { name: 'a framework person, no product', answers: { 'where.entry': 'one', 'you.build': 'framework', 'thing.exists': 'demo', 'thing.scope': 'one', 'ship.cost': 'zero' }, route: 'component-first', rule: 'R7' },
  { name: 'a component person with a usable thing', answers: { 'where.entry': 'one', 'you.build': 'component', 'thing.exists': 'usable', 'thing.scope': 'one', 'ship.cost': 'zero', 'money.raise': 'yes' }, route: 'ship-now', rule: 'R8' },
  { name: 'not ready yet',                answers: { 'where.entry': 'one', 'you.build': 'product', 'thing.exists': 'prototype', 'thing.scope': 'one', 'ship.blocker': 'not-ready', 'ship.cost': 'server', 'money.raise': 'some' }, route: 'ship-now', rule: 'R8' },
  { name: 'a plan that wants focus',      answers: { 'where.entry': 'plan', 'you.build': 'service', 'thing.exists': 'usable', 'thing.scope': 'few', 'ship.cost': 'people', 'money.raise': 'yes' }, route: 'ship-now', rule: 'R8' },
]
for (const s of SAMPLES) {
  const signals = rules.signalsFrom(finder, s.answers)
  const picked  = rules.route(finder, signals)
  expect(picked.route && picked.route.id === s.route, `sample "${s.name}": expected ${s.route}, got ${picked.route ? picked.route.id : 'nothing'} (signals ${JSON.stringify(signals)})`)
  expect(picked.rule && picked.rule.id === s.rule, `sample "${s.name}": expected rule ${s.rule}, got ${picked.rule ? picked.rule.id : 'none'}`)
}

// 4. the entries decide which questions are asked
const blank = rules.questionsFor(finder, 'blank').map(q => q.id)
expect(blank.includes('thing.want') && !blank.includes('thing.sentence'), 'a blank entry should be asked thing.want and not thing.sentence')
const one = rules.questionsFor(finder, 'one').map(q => q.id)
expect(one.includes('thing.sentence') && !one.includes('thing.want'), 'a one entry should be asked thing.sentence and not thing.want')
for (const e of finder.entries) expect(rules.stagesFor(finder, e.id).length === finder.stages.length, `entry ${e.id} should walk every stage`)

// 5. the record carries every section, the route and the signals
const rec = rules.record(finder, SAMPLES[8].answers, { name: 'Test', date: '2026-10-20', interviewer: 'the test' })
for (const [, title] of rules.RECORD_SECTIONS) expect(rec.includes(`## ${title}`), `record lacks section "${title}"`)
expect(rec.includes('## The route') && rec.includes('Ship it this week') && rec.includes('rule R8'), 'record lacks the route and its rule')
expect(rec.includes('"blocker":"not-ready"'), 'record lacks the signals')
expect(!/—/.test(rec) && !/—/.test(JSON.stringify(finder)), 'an em-dash in the finder or the record')

if (failures.length) {
  console.error(`test_finder: ${failures.length} failure(s)`)
  for (const f of failures) console.error('  - ' + f)
  process.exit(1)
}
console.log(`test_finder: ok, finder ${finder.version}: ${finder.stages.length} stages, ${finder.questions.length} questions, ${finder.signals.length} signals, ${finder.routes.length} routes, ${finder.rules.length} rules, ${SAMPLES.length} samples`)
