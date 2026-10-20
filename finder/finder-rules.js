/**
 * finder-rules.js: the deterministic part of the finder, as one module with no dependencies.
 *
 * Reads finder.json's shape and applies it: which questions a person is asked given their entry, which signals
 * their answers set, which rule fires first, and the record as markdown. The sg-finder component runs it in the
 * browser; admin/build/test_finder.mjs runs it in Node against the same file. Nothing about the interview is
 * decided here that is not in the file.
 *
 * @module finder-rules
 * @version 0.1.0
 */

export const RECORD_SECTIONS = Object.freeze([
    ['where',    'Where I am',                                 ['where.entry']],
    ['sentence', 'The thing, in one sentence',                 ['thing.sentence', 'thing.want']],
    ['user',     'The first user, and what they do on day one', ['thing.user', 'thing.instead']],
    ['exists',   'What exists today',                          ['thing.exists', 'thing.scope']],
    ['smallest', 'The smallest thing I will ship, and when',   ['ship.smallest', 'ship.date', 'ship.blocker', 'ship.cost']],
    ['five',     'The five people',                            ['miss.five', 'miss.give', 'miss.take', 'miss.sign']],
    ['money',    'The money',                                  ['money.charge', 'money.shape', 'money.raise']],
])

export function questionsFor(finder, entry) {
    return finder.questions.filter(q => {
        if (q.for     && entry && !q.for.includes(entry))    return false
        if (q.not_for && entry &&  q.not_for.includes(entry)) return false
        return true
    })
}

export function stagesFor(finder, entry) {
    const asked = questionsFor(finder, entry)
    return finder.stages.filter(s => asked.some(q => q.stage === s.id))
}

export function optionOf(question, optionId) {
    return (question.options || []).find(o => o.id === optionId) || null
}

export function signalsFrom(finder, answers) {
    const signals = {}
    for (const q of finder.questions) {
        if (q.kind !== 'choice') continue
        const opt = optionOf(q, answers[q.id])
        if (!opt) continue
        Object.assign(signals, opt.signals || {})
    }
    return signals
}

export function ruleMatches(rule, signals) {
    return Object.entries(rule.if || {}).every(([signal, values]) => values.includes(signals[signal]))
}

export function route(finder, signals) {
    for (const rule of finder.rules) {
        if (ruleMatches(rule, signals)) {
            const r = finder.routes.find(x => x.id === rule.then) || null
            return { rule, route: r }
        }
    }
    return { rule: null, route: null }
}

export function answerText(finder, answers, qid) {
    const q = finder.questions.find(x => x.id === qid)
    if (!q) return ''
    const a = answers[qid]
    if (a === undefined || a === null || a === '') return ''
    if (q.kind === 'choice') { const o = optionOf(q, a); return o ? o.label : String(a) }
    return String(a)
}

export function record(finder, answers, meta = {}) {
    const name     = meta.name || '<name>'
    const date     = meta.date || new Date().toISOString().slice(0, 10)
    const by       = meta.interviewer || 'the page at startups.sgit.ai/finder/interview.html'
    const signals  = signalsFrom(finder, answers)
    const picked   = route(finder, signals)
    const lines    = []
    lines.push(`# ${name}'s startup, in their own words`, '')
    lines.push(`*Finder record. Date: ${date}. Interviewer: ${by}. Finder version ${finder.version}. Status: a first record; the next one supersedes it and says what changed.*`, '')
    for (const [, title, qids] of RECORD_SECTIONS) {
        const parts = qids.map(qid => {
            const q = finder.questions.find(x => x.id === qid)
            const t = answerText(finder, answers, qid)
            return q && t ? `**${q.ask}** ${t}` : ''
        }).filter(Boolean)
        lines.push(`## ${title}`, '', parts.length ? parts.join('\n\n') : '<not answered>', '')
    }
    lines.push('## The route', '')
    if (picked.route) {
        lines.push(`**${picked.route.title}** (rule ${picked.rule.id}: ${picked.rule.because})`, '', picked.route.what, '')
        lines.push('Next, from the route:', '', ...picked.route.next.map((n, i) => `${i + 1}. ${n}`), '')
    } else {
        lines.push('<no rule fired; the file has no default rule>', '')
    }
    lines.push('## What I am not doing, for now', '', answerText(finder, answers, 'focus.not') || '- <one line each>', '')
    lines.push('## My focus, in my own words', '', answerText(finder, answers, 'focus.words') || '<the sentence I would say to a friend who asked what I am working on>', '')
    lines.push('## Signals', '', '```', JSON.stringify(signals), '```', '')
    lines.push('*Written on the interview page from my own answers; nothing was sent anywhere. Answers marked (drafted) were proposed and corrected by me.*', '')
    return lines.join('\n')
}

export function check(finder) {
    const problems = []
    const stageIds  = new Set(finder.stages.map(s => s.id))
    const signalDef = Object.fromEntries(finder.signals.map(s => [s.id, new Set(s.values)]))
    const routeIds  = new Set(finder.routes.map(r => r.id))
    const entryIds  = new Set(finder.entries.map(e => e.id))
    const qIds      = new Set()
    for (const q of finder.questions) {
        if (qIds.has(q.id)) problems.push(`question ${q.id} is listed twice`)
        qIds.add(q.id)
        if (!stageIds.has(q.stage)) problems.push(`question ${q.id} names stage ${q.stage}, which does not exist`)
        if (!['choice', 'text'].includes(q.kind)) problems.push(`question ${q.id} has kind ${q.kind}`)
        for (const e of [...(q.for || []), ...(q.not_for || [])]) if (!entryIds.has(e)) problems.push(`question ${q.id} names entry ${e}, which does not exist`)
        if (q.kind === 'choice') {
            if (!q.options || q.options.length < 2) problems.push(`question ${q.id} is a choice with fewer than two options`)
            for (const o of q.options || []) {
                for (const [s, v] of Object.entries(o.signals || {})) {
                    if (!signalDef[s]) problems.push(`option ${q.id}/${o.id} sets signal ${s}, which is not declared`)
                    else if (!signalDef[s].has(v)) problems.push(`option ${q.id}/${o.id} sets ${s}=${v}, which is not a declared value`)
                }
            }
        }
    }
    for (const s of finder.stages) if (!finder.questions.some(q => q.stage === s.id)) problems.push(`stage ${s.id} has no questions`)
    const reached = new Set()
    for (const r of finder.rules) {
        for (const [s, vs] of Object.entries(r.if || {})) {
            if (!signalDef[s]) problems.push(`rule ${r.id} reads signal ${s}, which is not declared`)
            else for (const v of vs) if (!signalDef[s].has(v)) problems.push(`rule ${r.id} expects ${s}=${v}, which is not a declared value`)
        }
        if (!routeIds.has(r.then)) problems.push(`rule ${r.id} picks route ${r.then}, which does not exist`)
        reached.add(r.then)
    }
    for (const r of finder.routes) if (!reached.has(r.id)) problems.push(`route ${r.id} is picked by no rule`)
    const last = finder.rules[finder.rules.length - 1]
    if (!last || Object.keys(last.if || {}).length) problems.push('the last rule is not a default (its "if" is not empty)')
    for (const s of finder.signals) {
        const set = finder.questions.some(q => (q.options || []).some(o => s.id in (o.signals || {})))
        if (!set) problems.push(`signal ${s.id} is set by no option`)
    }
    for (const e of finder.entries) {
        const opt = finder.questions.find(q => q.id === 'where.entry')
        if (!opt || !optionOf(opt, e.id)) problems.push(`entry ${e.id} has no option on where.entry`)
    }
    for (const [, , qids] of RECORD_SECTIONS) for (const qid of qids) if (!qIds.has(qid)) problems.push(`the record names question ${qid}, which does not exist`)
    return problems
}
