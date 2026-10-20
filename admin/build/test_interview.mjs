#!/usr/bin/env node
/**
 * test_interview.mjs: the interview page in a real browser. Serves the tree over http (the components fetch their
 * sibling files, which file:// forbids), walks a sample interview as a person would, and checks the route the page
 * shows and the record it writes against the rules module. Needs Playwright and its Chromium; skips without them.
 * Optional: SHOTS=<dir> writes screenshots of the front page and the interview in two themes.
 *
 *   node admin/build/test_interview.mjs
 */
import { createServer } from 'node:http'
import { readFile, stat, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.md': 'text/markdown', '.txt': 'text/plain', '.svg': 'image/svg+xml' }

// playwright may be a local dependency or a global install (CI has neither, and the test skips there)
let playwright = null
try { playwright = await import('playwright') } catch (e) {
  try {
    const globalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim()
    const req = createRequire(path.join(globalRoot, 'x.js'))
    playwright = await import(req.resolve('playwright'))
  } catch (e2) { console.log('test_interview: skipped, playwright is not installed'); process.exit(0) }
}

const server = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  if (p.endsWith('/')) p += 'index.html'
  const f = path.join(ROOT, p)
  try {
    if ((await stat(f)).isDirectory()) throw new Error('dir')
    res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' })
    res.end(await readFile(f))
  } catch (e) { res.writeHead(404); res.end('not here') }
})
await new Promise(r => server.listen(0, '127.0.0.1', r))
const base = `http://127.0.0.1:${server.address().port}/`
const failures = []
const expect = (ok, what) => { if (!ok) failures.push(what) }
const shots = process.env.SHOTS
if (shots) await mkdir(shots, { recursive: true })

const chromium = (playwright.chromium || (playwright.default && playwright.default.chromium))
const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const errors = []
  page.on('pageerror', e => errors.push(String(e)))
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })

  // the front page, in Newsprint and Night
  await page.goto(base + 'index.html')
  await page.waitForSelector('.theme-pick button')
  if (shots) await page.screenshot({ path: path.join(shots, 'home-newsprint.png'), fullPage: false })
  await page.evaluate(() => window.__startupsTheme.set('night'))
  expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme')) === 'night', 'the theme did not switch to night')
  if (shots) await page.screenshot({ path: path.join(shots, 'home-night.png'), fullPage: false })

  // the interview: the component boots and shows the first stage
  await page.goto(base + 'finder/interview.html')
  const finder = await page.locator('sg-finder')
  await page.waitForFunction(() => { const f = document.querySelector('sg-finder'); return f && f.shadowRoot && f.shadowRoot.querySelector('.stage-title') && f.shadowRoot.querySelector('.stage-title').textContent.includes('Where you are') }, null, { timeout: 15000 })
  const inShadow = (sel) => page.evaluate(sel => { const r = document.querySelector('sg-finder').shadowRoot; const e = r.querySelector(sel); return e ? e.textContent : null }, sel)
  expect((await inShadow('.stage-title')) === '1. Where you are', `first stage title: ${await inShadow('.stage-title')}`)
  expect((await page.evaluate(() => document.querySelector('sg-finder').shadowRoot.querySelectorAll('.rail button').length)) === 7, 'the rail does not show seven stages')

  // a framework person with a demo: the sample the Node test expects to land on component-first by rule R7
  const pick = async (q, opt) => page.evaluate(([q, opt]) => { const r = document.querySelector('sg-finder').shadowRoot; const i = r.querySelector(`input[name="${q}"][value="${opt}"]`); i.click(); return !!i }, [q, opt])
  const type = async (q, text) => page.evaluate(([q, text]) => { const r = document.querySelector('sg-finder').shadowRoot; const t = r.querySelector(`textarea[aria-label]`); return true }, [q, text])
  const next = async () => page.evaluate(() => document.querySelector('sg-finder').shadowRoot.querySelector('.next').click())
  expect(await pick('where.entry', 'one'), 'could not pick where.entry=one')
  await next()
  expect((await inShadow('.stage-title')) === '2. You', `second stage title: ${await inShadow('.stage-title')}`)
  expect(await pick('you.build', 'framework'), 'could not pick you.build')
  expect(await pick('you.shipped', 'often'), 'could not pick you.shipped')
  expect(await pick('you.time', 'half'), 'could not pick you.time')
  expect(await pick('you.reach', 'five'), 'could not pick you.reach')
  await next()
  expect((await inShadow('.stage-title')) === '3. The thing', `third stage title: ${await inShadow('.stage-title')}`)
  expect((await page.evaluate(() => document.querySelector('sg-finder').shadowRoot.querySelectorAll('.q').length)) === 5, 'the thing stage for a one entry should have five questions')
  await page.evaluate(() => { const r = document.querySelector('sg-finder').shadowRoot; const ta = r.querySelector('textarea'); ta.value = 'A library other builders import to read a vault in one call.'; ta.dispatchEvent(new Event('input')) })
  expect(await pick('thing.exists', 'demo'), 'could not pick thing.exists')
  expect(await pick('thing.scope', 'one'), 'could not pick thing.scope')
  await next()
  expect(await pick('ship.blocker', 'not-ready'), 'could not pick ship.blocker')
  expect(await pick('ship.cost', 'zero'), 'could not pick ship.cost')
  const routeTitle = await inShadow('.route-title')
  expect(routeTitle === 'Ship the component', `route shown: ${routeTitle}`)
  expect((await inShadow('.route-rule')).startsWith('rule R7'), `rule shown: ${await inShadow('.route-rule')}`)
  if (shots) await page.screenshot({ path: path.join(shots, 'interview-ship.png'), fullPage: false })
  await next(); await next(); await next()
  expect((await inShadow('.stage-title')) === '7. Your focus', `last stage title: ${await inShadow('.stage-title')}`)
  const record = await page.evaluate(() => document.querySelector('sg-finder').shadowRoot.querySelector('.record textarea').value)
  expect(record.includes('## The route') && record.includes('Ship the component') && record.includes('rule R7'), 'the record lacks the route and rule')
  expect(record.includes('A library other builders import'), 'the record lacks the typed answer')
  expect(record.includes('"builder":"framework"'), 'the record lacks the signals')
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('startups.finder.v1'))['you.build']) === 'framework', 'answers are not kept in localStorage')
  if (shots) { await page.evaluate(() => window.__startupsTheme.set('paper')); await page.screenshot({ path: path.join(shots, 'interview-record-paper.png'), fullPage: true }) }

  // a reload keeps the answers and lands on the first unanswered stage
  await page.reload()
  await page.waitForFunction(() => { const f = document.querySelector('sg-finder'); return f && f.shadowRoot && f.shadowRoot.querySelector('.stage-title') && f.shadowRoot.querySelector('.stage-title').textContent }, null, { timeout: 15000 })
  expect((await inShadow('.stage-title')).startsWith('3.'), `after reload the page should open the first unanswered stage (3, where two text answers were left blank), got ${await inShadow('.stage-title')}`)

  // the stages page and the prompt page render without script errors
  for (const p of ['finder/stages.html', 'finder/prompt.html', 'finder/routes.html', 'vaults/index.html', 'plans/index.html', 'review/index.html']) {
    await page.goto(base + p)
    expect((await page.title()).includes('startups.sgit.ai'), `${p}: title`)
  }
  expect(errors.length === 0, 'browser errors: ' + errors.join(' | '))
} finally {
  await browser.close()
  server.close()
}

if (failures.length) {
  console.error(`test_interview: ${failures.length} failure(s)`)
  for (const f of failures) console.error('  - ' + f)
  process.exit(1)
}
console.log('test_interview: ok, the interview walks seven stages, picks the route by rule, writes the record, keeps the answers, and the pages load with no browser error')
