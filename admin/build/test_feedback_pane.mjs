#!/usr/bin/env node
/**
 * test_feedback_pane.mjs: the feedback pane in Chromium, as Dinis would use it, and the owner reading what it sent.
 *
 * Chromium runs with a fake microphone (a tone) and tab capture accepted, the tree served over http. The test enters a
 * lane code, sets an OpenRouter key, opens a storyboard at panel 3, quotes a selection, types, records a voice memo,
 * takes a screenshot, pastes an image, adds the note, reloads (the note must still be there), and sends.
 *
 * With the owner keys (admin/credentials/feedback-owner.json or STARTUPS_FEEDBACK_OWNER) the send goes to the real lane
 * and admin/build/feedback.py drain reads it back and the test checks every field. Without them the append is answered
 * locally and only its shape is checked. openrouter.ai is always answered locally with a fixed transcript (there is no
 * key in the test), and the request is checked: the key, the model, wav audio. Skips without Playwright.
 *   node admin/build/test_feedback_pane.mjs
 */
import { createServer } from 'node:http'
import { readFile, stat, mkdir, readdir } from 'node:fs/promises'
import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { execSync, spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.md': 'text/markdown' }
let pw = null
try { pw = await import('playwright') } catch (e) { try { pw = await import(createRequire(path.join(execSync('npm root -g', { encoding: 'utf8' }).trim(), 'x.js')).resolve('playwright')) } catch (e2) { console.log('test_feedback_pane: skipped, playwright is not installed'); process.exit(0) } }
const chromium = pw.chromium || pw.default.chromium

const real = existsSync(path.join(ROOT, 'admin/credentials/feedback-owner.json')) || !!process.env.STARTUPS_FEEDBACK_OWNER
const lane = JSON.parse(readFileSync(path.join(ROOT, 'feedback/lane.json'), 'utf8'))
const code = real ? spawnSync('python3', [path.join(ROOT, 'admin/build/feedback.py'), 'code'], { encoding: 'utf8' }).stdout.trim() : `sgf1.${lane.vault}.${'0f'.repeat(16)}`
const TRANSCRIPT = 'This is the transcript of the fake microphone.'
const LABEL = 'test browser ' + Math.random().toString(16).slice(2, 10)   // the drain below takes only this run's messages
const shots = process.env.SHOTS
if (shots) await mkdir(shots, { recursive: true })

const server = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'
  try { const f = path.join(ROOT, p); if ((await stat(f)).isDirectory()) throw 0; res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(await readFile(f)) }
  catch (e) { res.writeHead(404); res.end('not here') }
})
await new Promise(r => server.listen(0, '127.0.0.1', r))
const base = `http://127.0.0.1:${server.address().port}/`
const failures = [], expect = (ok, what) => { if (!ok) failures.push(what) }

const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--auto-accept-this-tab-capture', '--autoplay-policy=no-user-gesture-required'] })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['microphone', 'clipboard-read', 'clipboard-write'] })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', e => errors.push(String(e)))
let orBody = null, appended = []
await page.route('https://openrouter.ai/**', async route => { orBody = JSON.parse(route.request().postData() || '{}'); orBody.__auth = route.request().headers().authorization
  await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ choices: [{ message: { content: TRANSCRIPT } }] }) }) })
if (!real) await page.route('https://dev.send.sgraph.ai/**', async route => { appended.push(JSON.parse(route.request().postData() || '{}'))
  await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"ok":true}' }) })

const pane = sel => page.evaluate(sel => { const r = document.querySelector('sg-feedback') && document.querySelector('sg-feedback').shadowRoot; const e = r && r.querySelector(sel); return e ? { text: e.textContent, value: e.value, hidden: e.hidden || e.closest('[hidden]') != null } : null }, sel)
const click = sel => page.evaluate(sel => document.querySelector('sg-feedback').shadowRoot.querySelector(sel).click(), sel)
const fill = (sel, v) => page.evaluate(([sel, v]) => { const e = document.querySelector('sg-feedback').shadowRoot.querySelector(sel); e.value = v; e.dispatchEvent(new Event('input')); e.dispatchEvent(new Event('change')) }, [sel, v])
const waitPane = (fn, arg, what, timeout = 20000) => page.waitForFunction(fn, arg, { timeout }).catch(() => failures.push('timed out: ' + what))

try {
  // a reader with no code: no pane, no tab
  await page.goto(base + 'index.html')
  await page.waitForTimeout(600)
  expect(await page.evaluate(() => !document.querySelector('sg-feedback')), 'with no lane code, no pane should be mounted on an ordinary page')

  // the setup page: the pane opens on its own and asks for the code
  await page.goto(base + 'feedback/index.html')
  await waitPane(() => { const f = document.querySelector('sg-feedback'); return f && f.shadowRoot && f.shadowRoot.querySelector('.setup') && !f.shadowRoot.querySelector('.pane').hidden }, null, 'the pane opening on /feedback/')
  expect(!(await pane('.setup')).hidden, 'the setup section should show with no code')
  await fill('.code-in', 'not a code'); await click('.use-code')
  expect((await pane('.setup-msg')).text.includes('not a lane code'), 'a bad code should be refused')
  await fill('.code-in', code); await click('.use-code')
  await waitPane(() => !document.querySelector('sg-feedback').shadowRoot.querySelector('.compose').hidden, null, 'the composer after the code')
  expect(!(await pane('.lane-line')).text.includes(code.split('.')[2]), 'the pane should never show the token in full')
  await page.evaluate(() => document.querySelector('sg-feedback').shadowRoot.querySelector('details.settings').open = true)
  await fill('.or-in', 'sk-or-v1-test'); await fill('.label-in', LABEL); await click('.save-settings')
  if (shots) await page.screenshot({ path: path.join(shots, 'feedback-setup.png') })

  // a storyboard, at panel 3: the tab is there, the pane knows the page and the panel
  await page.goto(base + 'storyboards/five-ways-in/index.html#scene-3')
  await waitPane(() => { const f = document.querySelector('sg-feedback'); return f && f.shadowRoot && f.shadowRoot.querySelector('.tab') }, null, 'the tab on a storyboard page')
  await waitPane(() => !document.querySelector('sg-feedback').shadowRoot.querySelector('.pane').hidden, null, 'the pane open on the next page, as it was left')
  await page.keyboard.press('Alt+f')
  await waitPane(() => document.querySelector('sg-feedback').shadowRoot.querySelector('.pane').hidden, null, 'Alt+F closing the pane')
  await page.keyboard.press('Alt+f')
  await waitPane(() => !document.querySelector('sg-feedback').shadowRoot.querySelector('.pane').hidden, null, 'Alt+F opening the pane')
  await page.waitForTimeout(300)   // the pane focuses its text box just after opening; a reader selects later than that
  await page.evaluate(() => { const r = document.createRange(); r.selectNodeContents(document.querySelector('main .lede')); const s = getSelection(); s.removeAllRanges(); s.addRange(r) })
  await waitPane(() => !document.querySelector('sg-feedback').shadowRoot.querySelector('.ctx-quote').hidden, null, 'the selection becoming the quote')
  if (process.env.DEBUG) console.log('after selection:', await page.evaluate(() => { const f = document.querySelector('sg-feedback'); return JSON.stringify({ sel: String(getSelection()).slice(0, 60), open: f.isOpen, draftQuote: f._draft.quote, last: f._lastSel && f._lastSel.text.slice(0, 40), btn: !f.shadowRoot.querySelector('.use-selection').hidden }) }))
  expect((await pane('.ctx-page')).text.includes('panel 3') && (await pane('.ctx-page')).text.includes('Five ways in'), 'the context should name the storyboard and panel 3: ' + (await pane('.ctx-page')).text)
  expect(!(await pane('.ctx-quote')).hidden && (await pane('.q')).text.includes('spectrum'), 'the selection should be quoted')
  expect(await page.evaluate(() => document.documentElement.classList.contains('fb-open') && parseInt(getComputedStyle(document.body).marginRight) > 300), 'the page should make room for the pane')

  // text, a voice memo transcribed, a screenshot, a pasted image
  await fill('.text', 'Is Inês the right name for the many entry?')
  await click('.rec'); await page.waitForTimeout(2500); await click('.rec')
  await waitPane(t => document.querySelector('sg-feedback').shadowRoot.querySelector('.text').value.includes(t), TRANSCRIPT, 'the transcript in the note')
  expect(orBody && orBody.__auth === 'Bearer sk-or-v1-test' && orBody.model === 'google/gemini-2.5-flash', 'the transcription should go to openrouter.ai with the key and the default model')
  const audioPart = orBody && orBody.messages[1].content.find(p => p.type === 'input_audio')
  expect(audioPart && audioPart.input_audio.format === 'wav' && atob(audioPart.input_audio.data).slice(0, 4) === 'RIFF', 'the audio should be sent as wav')
  await click('.shot')
  await waitPane(() => [...document.querySelector('sg-feedback').shadowRoot.querySelectorAll('.att img')].length >= 1, null, 'the screenshot attached', 15000)
  await page.evaluate(async () => {
    const c = Object.assign(document.createElement('canvas'), { width: 40, height: 20 }); c.getContext('2d').fillRect(0, 0, 40, 20)
    const blob = await new Promise(r => c.toBlob(r, 'image/png')), dt = new DataTransfer(); dt.items.add(new File([blob], 'image.png', { type: 'image/png' }))
    document.querySelector('sg-feedback').shadowRoot.querySelector('.text').dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }))
  })
  await waitPane(() => document.querySelector('sg-feedback').shadowRoot.querySelectorAll('.att').length >= 3, null, 'three attachments (voice, screenshot, paste)')
  if (shots) await page.screenshot({ path: path.join(shots, 'feedback-compose.png') })
  await click('.add')
  await waitPane(() => document.querySelector('sg-feedback').shadowRoot.querySelectorAll('.items .item').length === 1, null, 'the note in the list')

  // a reload keeps it; a second page adds another
  await page.reload()
  await waitPane(() => { const f = document.querySelector('sg-feedback'); return f && f.shadowRoot && f.shadowRoot.querySelectorAll('.items .item').length === 1 }, null, 'the note kept across a reload')
  await page.goto(base + 'finder/routes.html')
  await waitPane(() => { const f = document.querySelector('sg-feedback'); return f && f.shadowRoot && !f.shadowRoot.querySelector('.pane').hidden }, null, 'the pane staying open on the next page')
  await fill('.text', 'Rule R7 reads well.'); await click('.add')
  await waitPane(() => document.querySelector('sg-feedback').shadowRoot.querySelectorAll('.items .item').length === 2, null, 'two notes waiting')
  expect((await pane('.count')).text === '2', 'the tab should count two notes')

  // send
  await click('.send')
  await waitPane(() => /Sent 2 notes/.test(document.querySelector('sg-feedback').shadowRoot.querySelector('.send-msg').textContent), null, 'the send', 60000)
  expect((await pane('.send-msg')).text.includes(lane.fingerprint), 'the pane should say which key it sealed to')
  expect(await page.evaluate(() => document.querySelector('sg-feedback').shadowRoot.querySelectorAll('.items .item').length === 0 && document.querySelector('sg-feedback').shadowRoot.querySelectorAll('.sent-items .item').length === 2), 'the notes should move to the sent history')
  if (shots) await page.screenshot({ path: path.join(shots, 'feedback-sent.png') })

  if (real) {
    const out = mkdtempSync(path.join(tmpdir(), 'fb-drain-'))
    const r = spawnSync('python3', [path.join(ROOT, 'admin/build/feedback.py'), 'drain', '--out', out, '--only-from', LABEL], { encoding: 'utf8' })
    expect(r.status === 0, 'feedback.py drain failed: ' + r.stderr)
    const ids = await readdir(out), notes = ids.map(id => JSON.parse(readFileSync(path.join(out, id, 'note.json'), 'utf8')))
    const sb = notes.find(n => n.context && n.context.storyboard === 'five-ways-in')
    if (process.env.DEBUG) console.log(JSON.stringify(notes.map(n => ({ ...n, attachments: n.attachments.map(a => a.kind) })), null, 1))
    expect(notes.length === 2, `the drain should open two notes: ${notes.length}`)
    expect(sb && sb.context.panel === 3 && String(sb.context.quote || '').includes('spectrum') && sb.text.includes('Inês') && sb.text.includes(TRANSCRIPT), 'the storyboard note should carry its panel, quote, text and transcript')
    const kinds = sb ? sb.attachments.map(a => a.kind).sort().join(',') : ''
    expect(kinds === 'audio,paste,screenshot', `the storyboard note should carry audio, paste and screenshot: ${kinds}`)
    expect(sb && sb.attachments.every(a => existsSync(a.saved_as) && readFileSync(a.saved_as).length === a.size), 'every attachment should be written out at its size')
    expect(sb && readFileSync(sb.attachments.find(a => a.kind === 'screenshot').saved_as).slice(0, 2).toString('hex') === 'ffd8', 'the screenshot should be a JPEG')
    expect(sb && sb.message.from.label === LABEL, 'the browser label should arrive')
  } else {
    expect(appended.length === 1 && /^[A-Za-z0-9+/=]+$/.test(appended[0].payload) && appended[0].append_token === code.split('.')[2], 'the append should carry the token and a base64 payload')
  }
  expect(errors.length === 0, 'browser errors: ' + errors.join(' | '))
} finally {
  await browser.close(); server.close()
}
if (failures.length) { console.error(`test_feedback_pane: ${failures.length} failure(s)`); for (const f of failures) console.error('  - ' + f); process.exit(1) }
console.log(`test_feedback_pane: ok, ${real ? 'against the real lane, drained and checked by feedback.py' : 'with the append answered locally (no owner keys)'}: no pane without a code; the code refused then kept; panel and quote in the context; voice transcribed (openrouter.ai answered locally), screenshot, paste; kept across a reload; two notes sent`)
