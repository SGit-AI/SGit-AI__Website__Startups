/**
 * sg-strip: a storyboard as a strip of panels in the page, drawn by the storyboard kit, without the kit's deck chrome.
 * The design experiment this site runs on top of api.storyboards.sgit.ai v0.1.0 (vendored under assets/vendor/storyboards/).
 *
 * Attributes:
 *   src       the bundle to draw ({ storyboard, cast, packs }), page-relative
 *   panels    "all" (default) or a list such as "2,4-6" (1-based)
 *   cols      panels per row (default 3)
 *   mode      "spoken" (the kit's bubbles in the panel, default) or "silent" (no bubbles; the lines as text under the panel,
 *             so a small panel stays legible)
 *   captions  "in" (the kit's yellow caption box, default) or "out" (the caption as text under the panel)
 *   ink       "paper" (the kit's cream paper and dark ink in every theme, default) or "theme" (ink, paper and white mapped to
 *             this site's tokens after drawing, so the panel follows the theme; an experiment, see the design page)
 *   href      a page to open when a panel is clicked, "#scene-N" appended
 *   controls  present: a small bar above the strip to change mode, captions, ink and cols live
 *
 * Needs window.StoryboardKit (storyboard.js, Rough.js and the prop packs loaded as classic scripts before this module).
 * Fires startups:strip.drawn { src, panels } on document.
 *
 * @module sg-strip
 * @version 0.1.0
 */

import { SgBase } from '../sg-base/sg-base.js'

const INK = Object.freeze({ ink: '#23262b', paper: '#fbf7ee', white: '#fff', whiteLong: '#ffffff' })
const SEED = Object.freeze({ base: 11 })

class SgStrip extends SgBase {

    static jsUrl = import.meta.url
    get resourceName() { return 'sg-strip' }

    async onReady() {
        this._kit    = await this._kitReady()
        this._data   = await (await fetch(this.getAttribute('src'))).json()
        this._opts   = {
            cols:     parseInt(this.getAttribute('cols') || '3', 10),
            mode:     this.getAttribute('mode')     || 'spoken',
            captions: this.getAttribute('captions') || 'in',
            ink:      this.getAttribute('ink')      || 'paper',
        }
        if (this.hasAttribute('controls')) this._controls()
        else this.$('.bar').hidden = true
        this._draw()
    }

    _kitReady() {
        return new Promise((ok, fail) => {
            let tries = 0
            const look = () => {
                if (window.StoryboardKit && window.rough) return ok(window.StoryboardKit)
                if (++tries > 200) return fail(new Error('the storyboard kit did not load'))
                setTimeout(look, 25)
            }
            look()
        })
    }

    _indexes() {
        const n = this._data.storyboard.scenes.length, want = (this.getAttribute('panels') || 'all').trim()
        if (want === 'all') return [...Array(n).keys()]
        const out = []
        for (const part of want.split(',')) {
            const [a, b] = part.split('-').map(s => parseInt(s, 10))
            for (let i = a; i <= (isNaN(b) ? a : b); i++) if (i >= 1 && i <= n) out.push(i - 1)
        }
        return out
    }

    _draw() {
        const { storyboard, cast } = this._data
        const strip = this.$('.strip')
        strip.style.setProperty('--cols', String(this._opts.cols))
        strip.dataset.ink = this._opts.ink
        strip.replaceChildren(...this._indexes().map(i => this._panel(storyboard, cast, i)))
        this.emit('strip.drawn', { src: this.getAttribute('src'), panels: this._indexes().length })
    }

    _panel(storyboard, cast, i) {
        const scene  = JSON.parse(JSON.stringify(storyboard.scenes[i]))
        const lines  = []
        if (this._opts.mode === 'silent') for (const c of scene.cast || []) { if (c.says) lines.push({ who: c.who, says: c.says, thinks: !!c.thinks }); delete c.says; delete c.thinks }
        let caption = ''
        if (this._opts.captions === 'out' && scene.kind !== 'cover') { caption = scene.caption || ''; delete scene.caption }
        const fig = document.createElement('figure')
        fig.className = 'panel'
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        fig.appendChild(svg)
        this._kit.drawScene(svg, scene, cast, { seed: SEED.base + i, footer: `${storyboard.title} · ${i + 1}/${storyboard.scenes.length}` })
        if (this._opts.ink === 'theme') this._retint(svg)
        const cap = document.createElement('figcaption')
        const num = document.createElement('span'); num.className = 'num'; num.textContent = String(i + 1)
        cap.appendChild(num)
        if (caption) { const c = document.createElement('span'); c.className = 'cap'; c.textContent = caption; cap.appendChild(c) }
        if (lines.length) {
            const who = Object.fromEntries((cast.characters || []).map(c => [c.id, c]))
            for (const l of lines) {
                const p = document.createElement('p'); p.className = 'line'
                const b = document.createElement('b'); b.textContent = (who[l.who] ? who[l.who].name : l.who) + (l.thinks ? ' thinks: ' : ': ')
                p.append(b, document.createTextNode(l.says))
                cap.appendChild(p)
            }
        }
        fig.appendChild(cap)
        const href = this.getAttribute('href')
        if (href) {
            const a = document.createElement('a'); a.href = `${href}#scene-${i + 1}`; a.className = 'open'; a.setAttribute('aria-label', `Open panel ${i + 1} in the deck`)
            fig.appendChild(a)
        }
        return fig
    }

    _retint(svg) {
        // the kit draws with two constants, ink and paper, and white fills; map them to this site's tokens
        const map = { [INK.ink]: 'var(--sb-ink)', [INK.paper]: 'var(--sb-paper)', [INK.white]: 'var(--sb-white)', [INK.whiteLong]: 'var(--sb-white)' }
        for (const e of svg.querySelectorAll('*')) {
            for (const attr of ['stroke', 'fill']) {
                const v = (e.getAttribute(attr) || '').toLowerCase()
                if (map[v]) e.setAttribute(attr, map[v])
            }
        }
    }

    _controls() {
        const bar = this.$('.bar')
        const bind = (sel, key, parse) => {
            const el = bar.querySelector(sel)
            el.value = String(this._opts[key])
            el.addEventListener('change', () => { this._opts[key] = parse ? parse(el.value) : el.value; this._draw() })
        }
        bind('.mode', 'mode'); bind('.captions', 'captions'); bind('.ink', 'ink'); bind('.cols', 'cols', v => parseInt(v, 10))
    }
}

customElements.define('sg-strip', SgStrip)
