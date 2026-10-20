/**
 * sg-finder: the finder's interview, walked in the browser from finder.json.
 *
 * Attributes: src (the finder.json to read), rules (the rules module to import), prompt (the prompt page to link).
 * Keeps the answers in this browser only (localStorage, startups.finder.v1); sends nothing anywhere. The route is
 * picked by finder-rules.js, the same module the Node test runs; the record is the markdown it writes.
 * Fires startups:finder.answered { question, answer } and startups:finder.routed { route, rule } on document.
 *
 * @module sg-finder
 * @version 0.1.0
 */

import { SgBase } from '../sg-base/sg-base.js'

const STORE = Object.freeze({ key: 'startups.finder.v1' })

class SgFinder extends SgBase {

    static jsUrl = import.meta.url
    get resourceName() { return 'sg-finder' }

    async onReady() {
        // src is page-relative (fetch resolves against the page); rules is page-relative too, and is resolved here
        // because a dynamic import resolves against this module, not the page
        this._src    = this.getAttribute('src') || 'finder.json'
        const rules  = this.getAttribute('rules') ? new URL(this.getAttribute('rules'), document.baseURI).href
                                                  : new URL('../../../finder/finder-rules.js', import.meta.url).href
        this._rules  = await import(rules)
        this._finder = await (await fetch(this._src)).json()
        this._answers = this._load()
        this._stage   = this._answers['where.entry'] ? this._firstUnanswered() : 0
        this.$('.reset').addEventListener('click', () => this._reset())
        this.$('.copy').addEventListener('click',  () => this._copy())
        this.$('.save').addEventListener('click',  () => this._save())
        this.$('.name').addEventListener('input',  e => { this._answers['_name'] = e.target.value; this._store() })
        this.$('.name').value = this._answers['_name'] || ''
        this._render()
    }

    // ---- state, in this browser only
    _load()  { try { return JSON.parse(localStorage.getItem(STORE.key) || '{}') } catch (e) { return {} } }
    _store() { try { localStorage.setItem(STORE.key, JSON.stringify(this._answers)) } catch (e) { /* unremembered, still answered */ } }
    _reset() {
        if (!confirm('Clear every answer kept in this browser?')) return
        this._answers = {}
        this._store()
        this._stage = 0
        this._render()
    }

    get _entry()  { return this._answers['where.entry'] || null }
    get _stages() { return this._rules.stagesFor(this._finder, this._entry) }
    _questions(stage) { return this._rules.questionsFor(this._finder, this._entry).filter(q => q.stage === stage.id) }
    _firstUnanswered() {
        const stages = this._stages
        for (let i = 0; i < stages.length; i++) {
            if (this._questions(stages[i]).some(q => !(q.id in this._answers) || this._answers[q.id] === '')) return i
        }
        return stages.length - 1
    }

    // ---- rendering
    _render() {
        const stages = this._stages
        const i      = Math.min(this._stage, stages.length - 1)
        const stage  = stages[i]
        this._renderRail(stages, i)
        this.$('.stage-title').textContent = `${i + 1}. ${stage.title}`
        this.$('.stage-ask').textContent   = stage.ask
        this.$('.stage-why').textContent   = stage.why
        const list = this.$('.questions')
        list.replaceChildren(...this._questions(stage).map(q => this._question(q)))
        const prev = this.$('.prev'), next = this.$('.next')
        prev.disabled = i === 0
        next.textContent = i === stages.length - 1 ? 'Write the record' : 'Next stage'
        prev.onclick = () => { this._stage = i - 1; this._render() }
        next.onclick = () => { if (i < stages.length - 1) { this._stage = i + 1; this._render() } else { this._record() } }
        this._renderRoute()
        this.$('.record').hidden = !(i === stages.length - 1)
        if (i === stages.length - 1) this._record()
    }

    _renderRail(stages, i) {
        const rail = this.$('.rail')
        rail.replaceChildren(...stages.map((s, n) => {
            const b = document.createElement('button')
            b.type = 'button'
            b.textContent = `${n + 1} ${s.title}`
            b.setAttribute('aria-current', n === i ? 'step' : 'false')
            b.dataset.done = String(this._questions(s).every(q => q.id in this._answers && this._answers[q.id] !== ''))
            b.addEventListener('click', () => { this._stage = n; this._render() })
            return b
        }))
    }

    _question(q) {
        const box = document.createElement('div')
        box.className = 'q'
        const ask = document.createElement('p'); ask.className = 'ask'; ask.textContent = q.ask
        const why = document.createElement('p'); why.className = 'why'; why.textContent = q.why
        const id  = document.createElement('span'); id.className = 'id'; id.textContent = q.id
        ask.prepend(id)
        box.append(ask, why)
        if (q.kind === 'choice') {
            const group = document.createElement('div'); group.className = 'opts'; group.setAttribute('role', 'radiogroup')
            for (const o of q.options) {
                const label = document.createElement('label')
                const input = document.createElement('input')
                input.type = 'radio'; input.name = q.id; input.value = o.id
                input.checked = this._answers[q.id] === o.id
                input.addEventListener('change', () => this._answer(q, o.id))
                const text = document.createElement('span'); text.textContent = o.label
                const sig  = document.createElement('code'); sig.textContent = Object.entries(o.signals || {}).map(([k, v]) => `${k}=${v}`).join(' ')
                label.append(input, text, sig)
                group.appendChild(label)
            }
            box.appendChild(group)
        } else {
            const ta = document.createElement('textarea')
            ta.rows = 2
            ta.value = this._answers[q.id] || ''
            ta.setAttribute('aria-label', q.ask)
            ta.addEventListener('input', () => this._answer(q, ta.value, true))
            box.appendChild(ta)
        }
        return box
    }

    _answer(q, value, quiet) {
        this._answers[q.id] = value
        this._store()
        this.emit('finder.answered', { question: q.id, answer: value })
        if (!quiet) { this._renderRail(this._stages, this._stage); this._renderRoute() }
        if (q.id === 'where.entry') this._render()
    }

    _renderRoute() {
        const signals = this._rules.signalsFrom(this._finder, this._answers)
        const picked  = this._rules.route(this._finder, signals)
        const box     = this.$('.route')
        box.hidden    = !this._entry
        if (!picked.route) return
        this.$('.route-title').textContent = picked.route.title
        this.$('.route-rule').textContent  = `rule ${picked.rule.id}: ${picked.rule.because}`
        this.$('.route-what').textContent  = picked.route.what
        this.$('.signals').textContent     = Object.entries(signals).map(([k, v]) => `${k}=${v}`).join('  ') || 'no signals yet'
        this.emit('finder.routed', { route: picked.route.id, rule: picked.rule.id })
    }

    _record() {
        const md = this._rules.record(this._finder, this._answers, { name: this._answers['_name'] || '<name>' })
        this.$('.record textarea').value = md
        this.$('.record').hidden = false
    }

    async _copy() {
        const ta = this.$('.record textarea')
        try { await navigator.clipboard.writeText(ta.value); this.$('.copied').textContent = 'copied' }
        catch (e) { ta.select(); this.$('.copied').textContent = 'select and copy' }
    }

    _save() {
        const blob = new Blob([this.$('.record textarea').value], { type: 'text/markdown' })
        const a    = document.createElement('a')
        a.href     = URL.createObjectURL(blob)
        a.download = 'my-startup.md'
        a.click()
        URL.revokeObjectURL(a.href)
    }
}

customElements.define('sg-finder', SgFinder)
