/**
 * feedback-store.js: where the pane keeps things, in this browser only.
 *
 *   IndexedDB "startups.feedback"   notes waiting (with their screenshots, voice memos and files as Blobs), the draft
 *                                   being written, and the sent history (text and metadata, no bytes, the last 100)
 *   localStorage                    the lane code (startups.feedback.lane), this browser's label, the model, the open state
 *   sessionStorage or localStorage  the OpenRouter key: this tab only unless "remember" is ticked
 *
 * IndexedDB rather than localStorage for the notes because a screenshot or a minute of voice is hundreds of kilobytes
 * and localStorage holds a few megabytes in all. Nothing here leaves the browser until Send.
 *
 * @module feedback-store
 * @version 0.1.0
 */
export const KEYS = Object.freeze({ lane: 'startups.feedback.lane', label: 'startups.feedback.label', model: 'startups.feedback.model',
    open: 'startups.feedback.open', orKey: 'startups.feedback.openrouter-key' })
const DB = 'startups.feedback', VERSION = 1

export const ls = {
    get(k)    { try { return localStorage.getItem(k) } catch (e) { return null } },
    set(k, v) { try { localStorage.setItem(k, v) } catch (e) { /* unremembered */ } },
    del(k)    { try { localStorage.removeItem(k) } catch (e) { /* fine */ } },
}
export const orKey = {
    get()          { try { return sessionStorage.getItem(KEYS.orKey) || localStorage.getItem(KEYS.orKey) || '' } catch (e) { return '' } },
    remembered()   { try { return !!localStorage.getItem(KEYS.orKey) } catch (e) { return false } },
    set(v, keep)   { try { sessionStorage.removeItem(KEYS.orKey); localStorage.removeItem(KEYS.orKey); if (v) (keep ? localStorage : sessionStorage).setItem(KEYS.orKey, v) } catch (e) { /* fine */ } },
}

let dbp = null
function db() {
    if (!dbp) dbp = new Promise((ok, fail) => {
        const r = indexedDB.open(DB, VERSION)
        r.onupgradeneeded = () => { const d = r.result; for (const s of ['notes', 'sent', 'draft']) if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath: 'id' }) }
        r.onsuccess = () => ok(r.result)
        r.onerror = () => fail(r.error)
    })
    return dbp
}
async function tx(store, mode, fn) {
    const d = await db()
    return new Promise((ok, fail) => {
        const t = d.transaction(store, mode), s = t.objectStore(store), out = fn(s)
        t.oncomplete = () => ok(out && 'result' in out ? out.result : undefined)
        t.onerror = () => fail(t.error)
    })
}
export const notes = {
    all:    async () => (await tx('notes', 'readonly', s => s.getAll())).sort((a, b) => a.at < b.at ? -1 : 1),
    put:    n => tx('notes', 'readwrite', s => s.put(n)),
    remove: id => tx('notes', 'readwrite', s => s.delete(id)),
}
export const draft = {
    get:   async () => (await tx('draft', 'readonly', s => s.get('draft'))) || { id: 'draft', text: '', attachments: [], quote: '' },
    put:   d => tx('draft', 'readwrite', s => s.put({ ...d, id: 'draft' })),
    clear: () => tx('draft', 'readwrite', s => s.delete('draft')),
}
export const sent = {
    all: async () => (await tx('sent', 'readonly', s => s.getAll())).sort((a, b) => a.sent_at < b.sent_at ? 1 : -1),
    async add(list) {
        await tx('sent', 'readwrite', s => { for (const n of list) s.put(n) })
        const all = await sent.all()
        if (all.length > 100) await tx('sent', 'readwrite', s => { for (const n of all.slice(100)) s.delete(n.id) })
    },
}
/** Remove every trace of the pane from this browser. */
export async function forgetAll() {
    for (const k of Object.values(KEYS)) ls.del(k)
    try { sessionStorage.removeItem(KEYS.orKey) } catch (e) { /* fine */ }
    await Promise.all(['notes', 'sent', 'draft'].map(s => tx(s, 'readwrite', st => st.clear())))
}
