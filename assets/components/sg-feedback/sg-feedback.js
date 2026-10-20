/**
 * sg-feedback: a pane on the right of every page for sending notes to this site's agent while reading.
 *
 * Text, a quote of the selected text, voice memos (recorded here, transcribed by openrouter.ai with the reader's own key),
 * a screenshot of the page, pasted or dropped images and files. Everything is kept in this browser (IndexedDB) as it is
 * written, across pages, until Send; then the notes are sealed in this browser to the lane's public key
 * (feedback/lane.json) and appended to the lane with the lane code, which is the only credential and can only write.
 * The owner reads the lane with admin/build/feedback.py drain. Design and limits: /feedback/ (admin/content/feedback/pattern.md).
 *
 * Shown only in a browser that holds a lane code, or on /feedback/, or with #feedback in the address: a reader with
 * no code sees nothing and nothing runs beyond this check. Alt+F opens and closes it.
 * Fires startups:feedback.sent { notes, messages } on document.
 *
 * @module sg-feedback
 * @version 0.1.0
 */
import { SgBase } from '../sg-base/sg-base.js'
import * as C from '../../feedback/feedback-core.js'
import * as S from '../../feedback/feedback-store.js'

const LANE_URL = new URL('../../../feedback/lane.json', import.meta.url).href
const REC      = Object.freeze({ maxSeconds: 600, mime: ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/webm'] })
const SHOT     = Object.freeze({ width: 1600, quality: 0.82, maxBytes: 1_500_000 })

class SgFeedback extends SgBase {

    static jsUrl = import.meta.url
    get resourceName() { return 'sg-feedback' }

    async onReady() {
        this._lane  = await (await fetch(LANE_URL)).json()
        this._spki  = C.unb64(this._lane.public_key)
        if (await C.fingerprint(this._spki) !== this._lane.fingerprint) throw new Error('feedback/lane.json: the public key does not match its fingerprint')
        this._draft = await S.draft.get()
        this._lastSel = null
        this._wire()
        this._render()
        const setup = document.documentElement.dataset.feedback === 'setup'
        if (S.ls.get(S.KEYS.open) === '1' || this.hasAttribute('open') || /feedback/.test(location.hash) || (setup && !this._code())) this.open()
    }

    // ------------------------------------------------------------ wiring
    _wire() {
        const on = (sel, ev, fn) => this.$(sel).addEventListener(ev, fn)
        on('.tab', 'click', () => this.open())
        on('.close', 'click', () => this.close())
        on('.use-code', 'click', () => this._useCode(this.$('.code-in').value))
        on('.code-in', 'keydown', e => { if (e.key === 'Enter') this._useCode(this.$('.code-in').value) })
        on('.text', 'input', () => { this._draft.text = this.$('.text').value; this._saveDraft() })
        on('.text', 'paste', e => this._paste(e))
        on('.add', 'click', () => this._add())
        on('.rec', 'click', () => this._rec ? this._stopRec() : this._startRec())
        on('.shot', 'click', () => this._screenshot())
        on('.file-in', 'change', e => { this._files([...e.target.files], 'file'); e.target.value = '' })
        on('.use-selection', 'click', () => this._quote(this._lastSel))
        on('.drop-quote', 'click', () => { this._draft.quote = null; this._saveDraft(); this._renderContext() })
        on('.send', 'click', () => this._send())
        on('.save-settings', 'click', () => this._saveSettings())
        on('.forget', 'click', () => this._forget())
        const ta = this.$('.text')
        ta.addEventListener('dragover', e => { e.preventDefault(); ta.classList.add('drop') })
        ta.addEventListener('dragleave', () => ta.classList.remove('drop'))
        ta.addEventListener('drop', e => { e.preventDefault(); ta.classList.remove('drop'); this._files([...e.dataTransfer.files], 'file') })
        document.addEventListener('selectionchange', () => {
            const s = document.getSelection()
            if (!s || s.isCollapsed || this.contains(s.anchorNode)) return
            const text = String(s).trim()
            if (!text) return
            this._lastSel = { text: text.slice(0, C.LIMITS.quote), path: location.pathname, title: this._title(), at: Date.now() }
            if (this.isOpen && !this._draft.quote) { clearTimeout(this._st); this._st = setTimeout(() => this._quote(this._lastSel), 400) }   // reading with the pane open: the selection is the quote
            else this._renderContext()
        })
        document.addEventListener('keydown', e => {
            if (e.altKey && (e.key === 'f' || e.key === 'F' || e.code === 'KeyF')) { e.preventDefault(); this.isOpen ? this.close() : this.open() }
            else if (e.key === 'Escape' && this.isOpen && this.shadowRoot.activeElement) this.close()
        })
        window.addEventListener('hashchange', () => this._renderContext())
        const models = this.$('#models')
        for (const m of C.OPENROUTER.models) { const o = document.createElement('option'); o.value = m; models.appendChild(o) }
    }

    get isOpen() { return !this.$('.pane').hidden }
    open() {
        this.$('.pane').hidden = false
        this.$('.tab').setAttribute('aria-expanded', 'true')
        document.documentElement.classList.add('fb-open')
        S.ls.set(S.KEYS.open, '1')
        const s = document.getSelection()
        if (s && !s.isCollapsed && String(s).trim() && !this._draft.quote) this._quote(this._lastSel)
        this._render()
        const focus = this._code() ? this.$('.text') : this.$('.code-in')
        setTimeout(() => focus.focus(), 0)
    }
    close() {
        this.$('.pane').hidden = true
        this.$('.tab').setAttribute('aria-expanded', 'false')
        document.documentElement.classList.remove('fb-open')
        S.ls.set(S.KEYS.open, '0')
    }

    // ------------------------------------------------------------ state
    _code()  { return C.parseCode(S.ls.get(S.KEYS.lane) || '', this._lane) }
    _title() { const h = document.querySelector('main h1'); return (h ? h.textContent : document.title).trim().slice(0, 200) }
    _context() {
        const v = document.querySelector('nav.site .ver a'), m = /^#scene-(\d+)$/.exec(location.hash)
        const sb = /\/storyboards\/([a-z0-9-]+)\/(index\.html)?$/.exec(location.pathname)
        return {
            url: location.href, path: location.pathname, title: this._title(), site: v ? v.textContent.trim() : '',
            ...(m ? { panel: Number(m[1]) } : {}), ...(sb && sb[1] !== 'design' && sb[1] !== 'cast' && sb[1] !== 'feedback' ? { storyboard: sb[1] } : {}),
            ...(this._draft.quote ? { quote: this._draft.quote.text, quote_path: this._draft.quote.path } : {}),
            viewport: `${innerWidth}x${innerHeight}`, theme: document.documentElement.getAttribute('data-theme') || '',
        }
    }
    _saveDraft() {
        clearTimeout(this._dt)
        this._dt = setTimeout(async () => { await S.draft.put(this._draft); this.$('.saved').textContent = 'kept in this browser' }, 300)
    }
    _say(sel, text, cls = '') { const el = this.$(sel); el.textContent = text; el.className = `msg ${sel.slice(1)} ${cls}` }

    // ------------------------------------------------------------ rendering
    async _render() {
        const code = this._code()
        this.$('.setup').hidden = !!code
        this.$('.compose').hidden = !code
        this.$('.lane-line').textContent = code ? `${C.maskCode(code)} · key ${this._lane.fingerprint}` : 'no lane code in this browser'
        this.$('.text').value = this._draft.text || ''
        this.$('.code-in2').value = S.ls.get(S.KEYS.lane) || ''
        this.$('.or-in').value = S.orKey.get()
        this.$('.or-keep').checked = S.orKey.remembered()
        this.$('.model-in').value = S.ls.get(S.KEYS.model) || C.OPENROUTER.model
        this.$('.label-in').value = S.ls.get(S.KEYS.label) || ''
        this._renderContext()
        this._renderAtts()
        await this._renderQueue()
        await this._renderHistory()
    }
    _renderContext() {
        const c = this._context()
        const page = this.$('.ctx-page')
        page.replaceChildren(document.createTextNode('On '), Object.assign(document.createElement('b'), { textContent: c.title || c.path }),
            document.createTextNode(` · ${c.path}${c.panel ? ` · panel ${c.panel}` : ''}${c.site ? ` · site ${c.site}` : ''}`))
        const q = this._draft.quote
        this.$('.ctx-quote').hidden = !q
        if (q) this.$('.q').textContent = `“${q.text.length > 280 ? q.text.slice(0, 280) + '…' : q.text}”${q.path !== location.pathname ? ` (on ${q.path})` : ''}`
        this.$('.use-selection').hidden = !this._lastSel || (q && q.text === this._lastSel.text)
    }
    _renderAtts() {
        const box = this.$('.atts')
        box.replaceChildren(...(this._draft.attachments || []).map((a, i) => {
            const el = document.createElement('div'); el.className = 'att'
            if (a.kind === 'screenshot' || (a.type || '').startsWith('image/')) { const img = document.createElement('img'); img.alt = a.name; img.src = URL.createObjectURL(a.blob); el.appendChild(img) }
            else if (a.kind === 'audio') { const au = document.createElement('audio'); au.controls = true; au.src = URL.createObjectURL(a.blob); el.appendChild(au) }
            const t = document.createElement('span'); t.textContent = `${a.kind === 'audio' ? `voice ${Math.round(a.duration || 0)}s` : a.name} · ${Math.round(a.size / 1024)} KB${a.transcribing ? ' · transcribing…' : a.transcript ? ' · transcribed' : ''}`
            const x = document.createElement('button'); x.type = 'button'; x.className = 'x'; x.textContent = '×'; x.setAttribute('aria-label', `Remove ${a.name}`)
            x.addEventListener('click', () => { this._draft.attachments.splice(i, 1); this._saveDraft(); this._renderAtts() })
            el.append(t, x)
            return el
        }))
    }
    async _renderQueue() {
        const list = await S.notes.all()
        const count = this.$('.count')
        count.hidden = !list.length; count.textContent = String(list.length)
        this.$('.queue').hidden = !list.length || !this._code()
        this.$('.queue .n').textContent = `(${list.length})`
        this.$('.send').textContent = `Send ${list.length} note${list.length === 1 ? '' : 's'}`
        this.$('.items').replaceChildren(...list.map(n => {
            const li = document.createElement('li'); li.className = 'item'
            const where = document.createElement('div'); where.className = 'where'; where.textContent = `${(n.context.title || n.context.path)}${n.context.panel ? `, panel ${n.context.panel}` : ''} · ${n.at.slice(11, 16)}`
            const body = document.createElement('div'); body.className = 'body'; body.textContent = (n.context.quote ? `“${n.context.quote.slice(0, 120)}”\n` : '') + (n.text || '').slice(0, 400)
            const meta = document.createElement('div'); meta.className = 'meta'
            meta.textContent = n.attachments.length ? `${n.attachments.length} attachment${n.attachments.length === 1 ? '' : 's'}: ${n.attachments.map(a => a.kind).join(', ')}` : 'text only'
            const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'link'; edit.textContent = 'edit'
            edit.addEventListener('click', () => this._edit(n))
            const del = document.createElement('button'); del.type = 'button'; del.className = 'link'; del.textContent = 'delete'
            del.addEventListener('click', async () => { await S.notes.remove(n.id); this._renderQueue() })
            meta.append(edit, del)
            li.append(where, body, meta)
            return li
        }))
    }
    async _renderHistory() {
        const list = await S.sent.all()
        this.$('.hn').textContent = list.length ? `(${list.length})` : ''
        this.$('.sent-items').replaceChildren(...list.slice(0, 30).map(n => {
            const li = document.createElement('li'); li.className = 'item'
            li.textContent = `${n.sent_at.slice(0, 16).replace('T', ' ')} · ${n.context.title || n.context.path}: ${(n.text || '').slice(0, 140)}${n.attachments.length ? ` [${n.attachments.length}]` : ''}`
            return li
        }))
    }

    // ------------------------------------------------------------ the code and the settings
    _useCode(text) {
        const c = C.parseCode(text, this._lane)
        if (!c) return this._say('.setup-msg', 'That is not a lane code: it looks like sgf1.<vault>.<token>, the token 32 hex characters.', 'warn')
        if (c.vault !== this._lane.vault) return this._say('.setup-msg', `That code is for vault ${c.vault}; this site's lane is on vault ${this._lane.vault}.`, 'warn')
        S.ls.set(S.KEYS.lane, c.code)
        this._say('.setup-msg', '')
        this._render()
    }
    _saveSettings() {
        const raw = this.$('.code-in2').value.trim()
        if (raw) { const c = C.parseCode(raw, this._lane); if (c && c.vault === this._lane.vault) S.ls.set(S.KEYS.lane, c.code) } else S.ls.del(S.KEYS.lane)
        S.orKey.set(this.$('.or-in').value.trim(), this.$('.or-keep').checked)
        const m = this.$('.model-in').value.trim(); m && m !== C.OPENROUTER.model ? S.ls.set(S.KEYS.model, m) : S.ls.del(S.KEYS.model)
        S.ls.set(S.KEYS.label, this.$('.label-in').value.trim())
        this._render()
        this._say('.compose-msg', 'Settings saved in this browser.', 'ok')
    }
    async _forget() {
        if (!confirm('Remove the lane code, the OpenRouter key, the draft, every note waiting and the sent history from this browser?')) return
        await S.forgetAll()
        this._draft = { id: 'draft', text: '', attachments: [], quote: null }
        this._render()
    }

    // ------------------------------------------------------------ what goes in a note
    _quote(sel) { if (!sel) return; this._draft.quote = sel; this._saveDraft(); this._renderContext() }
    _attach(a) {
        if (a.size > C.LIMITS.file) { this._say('.compose-msg', `${a.name} is ${Math.round(a.size / 1024)} KB; the limit is ${C.LIMITS.file / 1024 / 1024} MB a file.`, 'warn'); return false }
        this._draft.attachments = [...(this._draft.attachments || []), a]
        this._saveDraft(); this._renderAtts()
        return true
    }
    _files(files, kind) { for (const f of files) this._attach({ kind: (f.type || '').startsWith('image/') && kind === 'paste' ? 'paste' : 'file', name: f.name || `pasted-${C.newId()}`, type: f.type || 'application/octet-stream', size: f.size, blob: f }) }
    _paste(e) {
        const files = [...(e.clipboardData ? e.clipboardData.files : [])]
        if (!files.length) return
        e.preventDefault()
        this._files(files.map(f => f.name && f.name !== 'image.png' ? f : new File([f], `pasted-${C.newId()}.${(f.type.split('/')[1] || 'bin').replace('jpeg', 'jpg')}`, { type: f.type })), 'paste')
    }
    async _add() {
        const text = this.$('.text').value.trim()
        const atts = this._draft.attachments || []
        if (!text && !atts.length && !this._draft.quote) return this._say('.compose-msg', 'Nothing to add yet: write something, record, or attach.', 'warn')
        if (atts.some(a => a.transcribing)) return this._say('.compose-msg', 'A voice memo is still being transcribed; add it when it is done, or remove it.', 'warn')
        const note = { id: C.newId(), at: new Date().toISOString(), context: this._context(), text,
            attachments: atts.map(({ transcribing, ...a }) => a) }
        await S.notes.put(note)
        this._draft = { id: 'draft', text: '', attachments: [], quote: null }
        await S.draft.clear()
        this.$('.saved').textContent = ''
        this._say('.compose-msg', 'Added. It waits here, in this browser, until you send.', 'ok')
        this._render()
    }
    async _edit(n) {
        if ((this._draft.text || '').trim() || (this._draft.attachments || []).length) await this._add()
        this._draft = { id: 'draft', text: n.text, attachments: n.attachments, quote: n.context.quote ? { text: n.context.quote, path: n.context.quote_path || n.context.path } : null }
        await S.notes.remove(n.id)
        await S.draft.put(this._draft)
        this._render()
    }

    // ------------------------------------------------------------ voice
    async _startRec() {
        if (!navigator.mediaDevices || !window.MediaRecorder) return this._say('.compose-msg', 'This browser cannot record audio here.', 'warn')
        let stream
        try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }) } catch (e) { return this._say('.compose-msg', `No microphone: ${e.message || e}`, 'warn') }
        const mimeType = REC.mime.find(m => MediaRecorder.isTypeSupported(m)) || ''
        const rec = new MediaRecorder(stream, mimeType ? { mimeType } : {})
        const chunks = [], started = Date.now()
        rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data) }
        rec.onstop = () => {
            stream.getTracks().forEach(t => t.stop())
            clearInterval(this._recTimer); this.$('.rec-time').textContent = ''
            const type = rec.mimeType || mimeType || 'audio/webm', blob = new Blob(chunks, { type })
            const ext = type.includes('ogg') ? 'ogg' : type.includes('mp4') ? 'm4a' : 'webm'
            const a = { kind: 'audio', name: `voice-${C.newId()}.${ext}`, type, size: blob.size, blob, duration: (Date.now() - started) / 1000 }
            if (this._attach(a)) this._transcribe(a)
        }
        rec.start(1000)
        this._rec = rec
        this.$('.rec').classList.add('on'); this.$('.rec').textContent = '■ Stop'
        this._recTimer = setInterval(() => {
            const s = Math.round((Date.now() - started) / 1000)
            this.$('.rec-time').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
            if (s >= REC.maxSeconds) this._stopRec()
        }, 500)
    }
    _stopRec() {
        if (!this._rec) return
        this._rec.stop(); this._rec = null
        this.$('.rec').classList.remove('on'); this.$('.rec').innerHTML = '&#9679; Record'
    }
    async _transcribe(a) {
        const key = S.orKey.get()
        if (!key) return this._say('.compose-msg', 'Recorded. No OpenRouter key is set (Settings), so it is sent as audio without a transcript.', '')
        a.transcribing = true; this._renderAtts()
        this._say('.compose-msg', 'Transcribing with openrouter.ai…')
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)()
            const buf = await ctx.decodeAudioData(await a.blob.arrayBuffer())
            ctx.close && ctx.close()
            const channels = [...Array(buf.numberOfChannels).keys()].map(i => buf.getChannelData(i))
            const parts = C.wavChunks(C.monoResample(channels, buf.sampleRate))
            const model = S.ls.get(S.KEYS.model) || C.OPENROUTER.model, texts = []
            for (let i = 0; i < parts.length; i++) {
                const { url, init } = C.transcribeRequest(parts[i], { key, model, referer: location.origin, part: parts.length > 1 ? [i + 1, parts.length] : null })
                const r = await fetch(url, init)
                let j = null; try { j = await r.json() } catch (e) { j = null }
                texts.push(C.transcriptOf(j, r.status))
            }
            a.transcript = texts.join('\n\n'); a.model = model
            const ta = this.$('.text')
            ta.value = (ta.value.trim() ? ta.value.trimEnd() + '\n\n' : '') + a.transcript
            this._draft.text = ta.value
            this._say('.compose-msg', `Transcribed by ${model}. Edit it as you like; the audio goes with it.`, 'ok')
        } catch (e) {
            this._say('.compose-msg', `Not transcribed (${e.message || e}). The audio is kept and goes as it is.`, 'warn')
        } finally {
            delete a.transcribing; this._saveDraft(); this._renderAtts()
        }
    }

    // ------------------------------------------------------------ the screenshot
    async _screenshot() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) return this._say('.compose-msg', 'This browser cannot capture the page. Take a screenshot with the system and paste it into the text box.', 'warn')
        const wasOpen = this.isOpen
        this.style.display = 'none'; document.documentElement.classList.remove('fb-open')
        let stream = null
        try {
            stream = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: 'browser' }, audio: false, preferCurrentTab: true, selfBrowserSurface: 'include', surfaceSwitching: 'exclude' })
            const video = document.createElement('video'); video.muted = true; video.playsInline = true; video.srcObject = stream
            await video.play()
            await new Promise(r => setTimeout(r, 350))
            const w = Math.min(SHOT.width, video.videoWidth), h = Math.round(video.videoHeight * w / video.videoWidth)
            const canvas = Object.assign(document.createElement('canvas'), { width: w, height: h })
            canvas.getContext('2d').drawImage(video, 0, 0, w, h)
            let q = SHOT.quality, blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', q))
            while (blob && blob.size > SHOT.maxBytes && q > 0.4) { q -= 0.15; blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', q)) }
            if (!blob) throw new Error('the frame could not be encoded')
            this._attach({ kind: 'screenshot', name: `screenshot-${C.newId()}.jpg`, type: 'image/jpeg', size: blob.size, blob, width: w, height: h })
            this._say('.compose-msg', 'Screenshot attached.', 'ok')
        } catch (e) {
            this._say('.compose-msg', e && e.name === 'NotAllowedError' ? 'Screenshot cancelled.' : `No screenshot: ${e.message || e}`, 'warn')
        } finally {
            if (stream) stream.getTracks().forEach(t => t.stop())
            this.style.display = ''
            if (wasOpen) document.documentElement.classList.add('fb-open')
        }
    }

    // ------------------------------------------------------------ send
    async _send() {
        const code = this._code()
        if (!code) return
        const list = await S.notes.all()
        if (!list.length) return
        const btn = this.$('.send'); btn.disabled = true
        try {
            const wire = []
            for (const n of list) wire.push(C.wireNote(n, await Promise.all(n.attachments.map(async a => C.b64(new Uint8Array(await a.blob.arrayBuffer()))))))
            const { batches, tooLarge } = C.batches(wire)
            const from = { label: S.ls.get(S.KEYS.label) || '', agent: (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '' }
            const site = (document.querySelector('nav.site .ver a') || {}).textContent || ''
            let sentNotes = 0
            for (let i = 0; i < batches.length; i++) {
                this._say('.send-msg', `Encrypting and appending ${i + 1} of ${batches.length}…`)
                const payload = await C.seal(this._spki, JSON.stringify(C.message(batches[i], { to: this._lane.fingerprint, from, site })))
                await C.append(this._lane, code, payload)
                const at = new Date().toISOString()
                await S.sent.add(batches[i].map(w => ({ id: w.id, sent_at: at, context: w.context, text: w.text, attachments: w.attachments.map(({ data, ...m }) => m) })))
                for (const w of batches[i]) await S.notes.remove(w.id)
                sentNotes += batches[i].length
            }
            this.emit('feedback.sent', { notes: sentNotes, messages: batches.length })
            this._say('.send-msg', `Sent ${sentNotes} note${sentNotes === 1 ? '' : 's'} in ${batches.length} message${batches.length === 1 ? '' : 's'}, sealed to ${this._lane.fingerprint}.${tooLarge.length ? ` ${tooLarge.length} too large to send; remove an attachment and try again.` : ''}`, tooLarge.length ? 'warn' : 'ok')
        } catch (e) {
            this._say('.send-msg', `Not sent: ${e.message || e}. Every note not sent is still here.`, 'warn')
        } finally {
            btn.disabled = false
            this._renderQueue(); this._renderHistory()
        }
    }
}

customElements.define('sg-feedback', SgFeedback)

// mount: only where it is wanted, so a reader with no lane code runs nothing more than this
const wanted = () => { try { return !!localStorage.getItem(S.KEYS.lane) } catch (e) { return false } }
if (wanted() || document.documentElement.dataset.feedback === 'setup' || /feedback/.test(location.hash)) {
    const mount = () => { if (!document.querySelector('sg-feedback')) document.body.appendChild(document.createElement('sg-feedback')) }
    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', mount) : mount()
}
