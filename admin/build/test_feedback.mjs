#!/usr/bin/env node
/**
 * test_feedback.mjs: the feedback pane's core in Node, with real Web Crypto, no mocks.
 * The lane code, the envelope (sealed in JavaScript, opened in JavaScript and by admin/build/feedback.py's own Envelope),
 * the batching under the lane's limit, the WAV encoding, and the transcription request's shape. The network round trip
 * against the real lane is in test_interview.mjs, which needs the owner keys and Playwright.
 *   node admin/build/test_feedback.mjs
 */
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const C = await import(path.join(ROOT, 'assets/feedback/feedback-core.js'))
const failures = []
const expect = (ok, what) => { if (!ok) failures.push(what) }

// 1. the lane code
const lane = JSON.parse(readFileSync(path.join(ROOT, 'admin/content/feedback/lane.json'), 'utf8'))
const tok = 'ab'.repeat(16)
const c = C.parseCode(`here it is: sgf1.${lane.vault}.${tok} thanks`, lane)
expect(c && c.vault === lane.vault && c.token === tok, 'parseCode should find a code inside pasted text')
expect(C.parseCode(tok, lane).code === `sgf1.${lane.vault}.${tok}`, 'a bare token takes the published vault')
expect(C.parseCode('sgf1.abc.notahex', lane) === null && C.parseCode('', lane) === null, 'parseCode should refuse what is not a code')
expect(!C.maskCode(c).includes(tok) && C.maskCode(c).startsWith(`sgf1.${lane.vault}.abab`), 'maskCode should hide the token')
expect(await C.fingerprint(C.unb64(lane.public_key)) === lane.fingerprint, 'lane.json: the public key should hash to its fingerprint')

// 2. the envelope, round trip in JS, a changed ciphertext refused, and opened by the owner's Python
const keys = await crypto.subtle.generateKey({ name: 'RSA-OAEP', modulusLength: 3072, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['encrypt', 'decrypt'])
const spki = new Uint8Array(await crypto.subtle.exportKey('spki', keys.publicKey)), pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', keys.privateKey))
const msg = C.message([C.wireNote({ id: 'n1', at: '2026-10-20T10:00:00Z', context: { path: '/storyboards/five-ways-in/', panel: 3, quote: 'Where are you?' }, text: 'Is Inês the right name? éà',
    attachments: [{ kind: 'screenshot', name: 's.jpg', type: 'image/jpeg', size: 3 }] }, [C.b64(new Uint8Array([1, 2, 3]))])], { to: await C.fingerprint(spki), site: 'v0.1.5' })
const payload = await C.seal(spki, JSON.stringify(msg))
expect(JSON.parse(await C.unseal(pkcs8, payload)).notes[0].text === msg.notes[0].text, 'seal then unseal should give the message back')
const env = JSON.parse(atob(atob(payload)))
expect(env.v === 2 && env.w && env.i && env.c, 'the envelope should be sgit hybrid v2, encoded twice')
const bad = btoa(btoa(JSON.stringify({ ...env, c: btoa('x'.repeat(40)) })))
let refused = false; try { await C.unseal(pkcs8, bad) } catch (e) { refused = true }
expect(refused, 'a changed ciphertext should not open')
const hasCrypto = spawnSync('python3', ['-c', 'import cryptography'], { encoding: 'utf8' }).status === 0
if (!hasCrypto) console.log('test_feedback: the feedback.py interop check is skipped, python3 has no cryptography module')
const dir = mkdtempSync(path.join(tmpdir(), 'fb-test-'))
writeFileSync(path.join(dir, 'payload.txt'), payload); writeFileSync(path.join(dir, 'key.b64'), C.b64(pkcs8))
const py = spawnSync('python3', ['-c', `import sys,base64,json; sys.path.insert(0, ${JSON.stringify(path.join(ROOT, 'admin/build'))}); from feedback import Envelope
print(json.loads(Envelope.open(base64.b64decode(open(${JSON.stringify(path.join(dir, 'key.b64'))}).read()), open(${JSON.stringify(path.join(dir, 'payload.txt'))}).read()))['notes'][0]['text'])`], { encoding: 'utf8' })
expect(!hasCrypto || (py.status === 0 && py.stdout.trim() === msg.notes[0].text), 'feedback.py should open what the browser seals: ' + (py.stderr || py.stdout).trim().split('\n').pop())
const pyseal = spawnSync('python3', ['-c', `import sys,base64; sys.path.insert(0, ${JSON.stringify(path.join(ROOT, 'admin/build'))}); from feedback import Envelope
print(Envelope.seal(base64.b64decode(${JSON.stringify(C.b64(spki))}), 'from python'))`], { encoding: 'utf8' })
expect(!hasCrypto || (pyseal.status === 0 && await C.unseal(pkcs8, pyseal.stdout.trim()) === 'from python'), 'the browser should open what feedback.py seals')

// 3. batches stay under the limit; a note alone over it is held back
const big = n => ({ id: 'b' + n, text: 'x'.repeat(700_000) })
const { batches, tooLarge } = C.batches([big(1), big(2), big(3), { id: 'small', text: 'hi' }, { id: 'huge', text: 'y'.repeat(2_000_000) }])
expect(batches.length === 2 && batches.every(b => JSON.stringify(b).length < C.LIMITS.message) && tooLarge.length === 1 && tooLarge[0].id === 'huge', `batches: ${batches.map(b => b.map(n => n.id).join('+')).join(' | ')}`)
const sealedBig = await C.seal(spki, JSON.stringify(C.message(batches[0], { to: 'x' })))
expect(sealedBig.length < C.LIMITS.payload, `a full batch sealed should fit one append: ${sealedBig.length}`)

// 4. audio: resample, WAV header, chunks
const tone = new Float32Array(48000).map((_, i) => Math.sin(i / 10))
const mono = C.monoResample([tone, tone], 48000)
expect(mono.length === 16000, `48 kHz stereo, one second, should become 16000 samples: ${mono.length}`)
const w = C.wav(mono)
const dv = new DataView(w.buffer)
expect(String.fromCharCode(...w.slice(0, 4)) === 'RIFF' && String.fromCharCode(...w.slice(8, 12)) === 'WAVE' && dv.getUint32(24, true) === 16000 && dv.getUint16(22, true) === 1 && w.length === 44 + 32000, 'the WAV header should say 16 kHz mono 16-bit')
expect(C.wavChunks(new Float32Array(16000 * 250)).length === 3, 'a 250-second memo should be three two-minute chunks')

// 5. the transcription request: the key to openrouter.ai only, the audio as input_audio wav
const req = C.transcribeRequest(w, { key: 'sk-or-v1-test', referer: 'https://startups.sgit.ai' })
const body = JSON.parse(req.init.body)
expect(req.url === 'https://openrouter.ai/api/v1/chat/completions' && req.init.headers.Authorization === 'Bearer sk-or-v1-test', 'the key goes to openrouter.ai in the Authorization header')
const part = body.messages[1].content.find(p => p.type === 'input_audio')
expect(body.model === C.OPENROUTER.model && part && part.input_audio.format === 'wav' && C.unb64(part.input_audio.data).length === w.length, 'the audio goes as input_audio, wav, base64')
expect(C.transcriptOf({ choices: [{ message: { content: ' hello ' } }] }, 200) === 'hello', 'transcriptOf reads the answer')
let err = ''; try { C.transcriptOf({ error: { message: 'No auth credentials found' } }, 401) } catch (e) { err = e.message }
expect(err === 'No auth credentials found', 'transcriptOf surfaces openrouter.ai\'s error')

if (failures.length) {
  console.error(`test_feedback: ${failures.length} failure(s)`)
  for (const f of failures) console.error('  - ' + f)
  process.exit(1)
}
console.log('test_feedback: ok, the lane code, the envelope (JS and feedback.py both ways, a changed ciphertext refused), batches under the limit, 16 kHz mono WAV in two-minute chunks, the transcription request')
