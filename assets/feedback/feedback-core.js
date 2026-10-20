/**
 * feedback-core.js: the pure part of the feedback pane, no DOM, so Node runs it in the tests.
 *
 * The pane (assets/components/sg-feedback/) keeps notes in this browser and, on Send, seals them to the lane's public
 * key and appends them to the lane: an append lane on vault feedback/lane.json names, on dev.send.sgraph.ai, which any
 * holder of the lane code can write to and nobody but the owner can read (https://sgit.ai/api/append-lanes.html).
 *
 *   the lane code   sgf1.<vault id>.<append token>: what Dinis types into the pane, once per browser; the token is the gate
 *   the public key  published in feedback/lane.json; a public key seals, it cannot open
 *   the envelope    sgit's hybrid v2 (AES-256-GCM, the key wrapped with RSA-OAEP SHA-256), as the newsroom's inbox.js and
 *                   the sgit CLI write it; the payload is base64 of the base64 envelope, as the API documents
 *
 * Also here: a voice memo's audio turned into 16 kHz mono WAV chunks for transcription, the OpenRouter request that
 * transcribes one, and the batching that keeps every append under the lane's 5 MB payload limit.
 *
 * @module feedback-core
 * @version 0.1.0
 */
export const KIND     = 'startups-feedback/v1'
export const PREFIX   = 'sgf1'
export const LIMITS   = Object.freeze({ payload: 5 * 1024 * 1024, message: 1_900_000, file: 2 * 1024 * 1024, quote: 2000, text: 20000 })
export const OPENROUTER = Object.freeze({ endpoint: 'https://openrouter.ai/api/v1/chat/completions', model: 'google/gemini-2.5-flash',
    models: ['google/gemini-2.5-flash', 'google/gemini-3.1-flash-lite', 'mistralai/voxtral-small-24b-2507', 'openai/gpt-audio-mini'] })
export const AUDIO    = Object.freeze({ rate: 16000, chunkSeconds: 120 })

const te = new TextEncoder(), td = new TextDecoder()
const subtle = () => globalThis.crypto.subtle
export const hex = bytes => [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('')
export function b64(bytes) {
    const u = new Uint8Array(bytes); let s = ''
    for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000))
    return btoa(s)
}
export function unb64(s) { const bin = atob(String(s)); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out }
export async function fingerprint(spki) { return 'sha256:' + hex(await subtle().digest('SHA-256', new Uint8Array(spki))).slice(0, 16) }
export const newId = () => new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14) + '-' + hex(globalThis.crypto.getRandomValues(new Uint8Array(4)))

// ------------------------------------------------------------ the lane code
/** sgf1.<vault>.<token> anywhere in what was pasted, or a bare 32 to 128 hex token with the published vault; null when neither. */
export function parseCode(text, lane) {
    const s = String(text || '').trim()
    const m = new RegExp(`${PREFIX}\\.([a-z0-9]{4,24})\\.([0-9a-f]{16,128})\\b`).exec(s)
    if (m) return { vault: m[1], token: m[2], code: m[0] }
    if (lane && /^[0-9a-f]{32,128}$/.test(s)) return { vault: lane.vault, token: s, code: `${PREFIX}.${lane.vault}.${s}` }
    return null
}
/** The code with the token masked, for showing: sgf1.<vault>.ab12…ef90 */
export const maskCode = c => c ? `${PREFIX}.${c.vault}.${c.token.slice(0, 4)}…${c.token.slice(-4)}` : ''

// ------------------------------------------------------------ the envelope: sgit's hybrid v2
export async function seal(spki, text) {
    const pub = await subtle().importKey('spki', spki, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt'])
    const aes = await subtle().generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt'])
    const raw = await subtle().exportKey('raw', aes)
    const iv  = globalThis.crypto.getRandomValues(new Uint8Array(12))
    const c   = await subtle().encrypt({ name: 'AES-GCM', iv, tagLength: 128 }, aes, te.encode(text))
    const w   = await subtle().encrypt({ name: 'RSA-OAEP' }, pub, raw)
    const enc = btoa(JSON.stringify({ v: 2, w: b64(w), i: b64(iv), c: b64(c) }))
    return btoa(enc)
}
/** The inverse, for the tests (the owner opens with admin/build/feedback.py). */
export async function unseal(pkcs8, payload) {
    const env  = JSON.parse(atob(atob(String(payload))))
    const priv = await subtle().importKey('pkcs8', pkcs8, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['decrypt'])
    const raw  = await subtle().decrypt({ name: 'RSA-OAEP' }, priv, unb64(env.w))
    const aes  = await subtle().importKey('raw', raw, { name: 'AES-GCM' }, false, ['decrypt'])
    return td.decode(await subtle().decrypt({ name: 'AES-GCM', iv: unb64(env.i), tagLength: 128 }, aes, unb64(env.c)))
}

// ------------------------------------------------------------ notes, messages and batches
/** A note as it is sent: attachments carry their bytes as base64 (the caller has read the blobs). */
export function wireNote(note, datas) {
    return {
        id: note.id, at: note.at, context: note.context || {}, text: String(note.text || '').slice(0, LIMITS.text),
        attachments: (note.attachments || []).map((a, i) => ({ kind: a.kind, name: a.name, type: a.type, size: a.size,
            ...(a.duration ? { duration: a.duration } : {}), ...(a.transcript ? { transcript: a.transcript } : {}), data: datas[i] })),
    }
}
export function message(notes, { to, from = {}, site = '', sentAt = new Date().toISOString() } = {}) {
    return { kind: KIND, to, sent_at: sentAt, site, from, notes }
}
/**
 * Notes grouped so each message's JSON stays under LIMITS.message characters; sealed and encoded twice that is about
 * 2.4 times larger, under the lane's 5 MB. A note that alone is too large is returned in `tooLarge`, not sent.
 */
export function batches(notes, limit = LIMITS.message) {
    const out = [], tooLarge = []
    let cur = [], size = 200
    for (const n of notes) {
        const s = JSON.stringify(n).length + 1
        if (s + 200 > limit) { tooLarge.push(n); continue }
        if (size + s > limit && cur.length) { out.push(cur); cur = []; size = 200 }
        cur.push(n); size += s
    }
    if (cur.length) out.push(cur)
    return { batches: out, tooLarge }
}
/** POST the payload with the token. The lane answers {"ok": true} and nothing else; anything else is an error. */
export async function append(lane, code, payload, fetchImpl = globalThis.fetch) {
    if (payload.length > LIMITS.payload) throw new Error('too large for one append (5 MB)')
    const r = await fetchImpl(`${lane.endpoint}/api/vault/append/write/${code.vault}`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ append_token: code.token, payload }) })
    let j = null; try { j = await r.json() } catch (e) { j = null }
    if (!r.ok || !j || j.ok !== true) throw new Error(r.status === 404 ? 'the lane refused the code (404): a wrong or rotated lane code' : `the vault server answered ${r.status}`)
    return true
}

// ------------------------------------------------------------ voice: audio to WAV, and the transcription request
/** Mix channels down to one and resample linearly to `rate`; returns a Float32Array. */
export function monoResample(channels, fromRate, rate = AUDIO.rate) {
    const n = channels[0].length, mono = new Float32Array(n)
    for (const ch of channels) for (let i = 0; i < n; i++) mono[i] += ch[i] / channels.length
    if (fromRate === rate) return mono
    const outLen = Math.floor(n * rate / fromRate), out = new Float32Array(outLen), step = fromRate / rate
    for (let i = 0; i < outLen; i++) {
        const x = i * step, j = Math.floor(x), f = x - j
        out[i] = j + 1 < n ? mono[j] * (1 - f) + mono[j + 1] * f : mono[j]
    }
    return out
}
/** 16-bit PCM WAV bytes from mono samples. */
export function wav(samples, rate = AUDIO.rate) {
    const buf = new ArrayBuffer(44 + samples.length * 2), v = new DataView(buf)
    const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)) }
    str(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); str(8, 'WAVE'); str(12, 'fmt ')
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true)
    v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, samples.length * 2, true)
    for (let i = 0; i < samples.length; i++) { const s = Math.max(-1, Math.min(1, samples[i])); v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true) }
    return new Uint8Array(buf)
}
/** Mono samples cut into WAV chunks of at most `seconds`, so one long memo is several small requests. */
export function wavChunks(samples, rate = AUDIO.rate, seconds = AUDIO.chunkSeconds) {
    const per = rate * seconds, out = []
    for (let i = 0; i < samples.length; i += per) out.push(wav(samples.subarray(i, i + per), rate))
    return out.length ? out : [wav(new Float32Array(0), rate)]
}
/** The request that transcribes one WAV chunk: { url, init }. The key goes to openrouter.ai and nowhere else. */
export function transcribeRequest(wavBytes, { key, model = OPENROUTER.model, referer = '', part = null } = {}) {
    return {
        url: OPENROUTER.endpoint,
        init: {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, ...(referer ? { 'HTTP-Referer': referer } : {}), 'X-Title': 'startups.sgit.ai feedback' },
            body: JSON.stringify({ model, temperature: 0, messages: [
                { role: 'system', content: 'You transcribe voice memos. Return only the transcript, verbatim, in the language spoken, with punctuation and paragraph breaks. No preamble, no summary, no quotation marks around it.' },
                { role: 'user', content: [
                    { type: 'text', text: part ? `Transcribe part ${part[0]} of ${part[1]} of this voice memo.` : 'Transcribe this voice memo.' },
                    { type: 'input_audio', input_audio: { data: b64(wavBytes), format: 'wav' } },
                ] },
            ] }),
        },
    }
}
/** The text of an OpenRouter answer, or an error with its message. */
export function transcriptOf(j, status) {
    const t = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content
    if (typeof t === 'string' && t.trim()) return t.trim()
    if (Array.isArray(t)) return t.map(p => p.text || '').join('').trim()
    throw new Error((j && j.error && j.error.message) || `openrouter.ai answered ${status}`)
}
