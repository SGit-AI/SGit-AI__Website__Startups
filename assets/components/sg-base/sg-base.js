/**
 * sg-base: the base component the others extend, in the contract coding.sgit.ai documents and written here so
 * that nothing is fetched from another origin at run time.
 *
 * A component sets `static jsUrl = import.meta.url` and `get resourceName()`; the base fetches the sibling
 * .html and .css next to that URL, builds the shadow root, and calls `onReady()` once the markup is there.
 * Events go through document with bubbles and composed, under the `startups:` namespace.
 *
 * @module sg-base
 * @version 0.1.0
 */

export const NAMESPACE = Object.freeze({ prefix: 'startups' })

export class SgBase extends HTMLElement {

    static jsUrl = import.meta.url
    get resourceName()   { return 'sg-base' }
    get sharedCssPaths() { return [] }

    connectedCallback() {
        if (this._booted) return
        this._booted = true
        this._boot().catch(err => this._fail(err))
    }

    async _boot() {
        const base = this.constructor.jsUrl
        const dir  = base.slice(0, base.lastIndexOf('/') + 1)
        const name = this.resourceName
        const [html, css] = await Promise.all([
            this._fetchText(dir + name + '.html'),
            this._fetchText(dir + name + '.css'),
        ])
        const shared = await Promise.all(this.sharedCssPaths.map(p => this._fetchText(p)))
        const root   = this.shadowRoot || this.attachShadow({ mode: 'open' })
        const style  = document.createElement('style')
        style.textContent = shared.concat([css]).join('\n')
        root.replaceChildren(style)
        const tpl = document.createElement('template')
        tpl.innerHTML = html
        root.appendChild(tpl.content.cloneNode(true))
        await this.onReady()
    }

    async _fetchText(url) {
        const r = await fetch(url)
        if (!r.ok) throw new Error(`${url}: ${r.status}`)
        return r.text()
    }

    _fail(err) {
        const root = this.shadowRoot || this.attachShadow({ mode: 'open' })
        const p = document.createElement('p')
        p.textContent = `This component could not load its files (${err.message}). It needs to be served over http, not opened as a file.`
        root.replaceChildren(p)
    }

    onReady() {}

    $(sel)    { return this.shadowRoot.querySelector(sel) }
    $$(sel)   { return Array.from(this.shadowRoot.querySelectorAll(sel)) }

    emit(name, detail) {
        document.dispatchEvent(new CustomEvent(`${NAMESPACE.prefix}:${name}`, {
            detail,
            bubbles:  true,
            composed: true,
        }))
    }
}

customElements.define('sg-base', SgBase)
