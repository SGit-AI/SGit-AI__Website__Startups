#!/usr/bin/env node
/**
 * storyboards.mjs: the storyboards' derived files, with the kit's own formats.js (vendored release), in Node.
 *
 *   node admin/build/storyboards.mjs            # validate every storyboard; check from_finder lines against finder.json;
 *                                               # write storyboards/<slug>/{storyboard.json,bundle.json,graph.json,script.md};
 *                                               # print the stats as JSON (build.py reads them)
 *   node admin/build/storyboards.mjs --check    # validate and check only, write nothing (the test runs this)
 *
 * The from_finder rule: a line, a board's lines, an evidence quote or a punchline marked "from_finder": true must equal,
 * word for word, a string value somewhere in admin/content/finder/finder.json. Nothing about the interview is written
 * twice (decision 002): the storyboard quotes the file, and the build refuses a quote that drifted.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT    = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const require = createRequire(import.meta.url)
const RELEASE = JSON.parse(readFileSync(path.join(ROOT, 'admin/content/storyboards/kit.json'), 'utf8'))
const F       = require(path.join(ROOT, 'assets/vendor/storyboards', RELEASE.release, 'formats.js'))
const PACK    = ['crowd', 'tag', 'door', 'box']  // this site's prop pack, assets/storyboards/startups-props.js
const check   = process.argv.includes('--check')
const SRC     = path.join(ROOT, 'admin/content/storyboards')
const HOST    = 'https://' + readFileSync(path.join(ROOT, 'CNAME'), 'utf8').trim() + '/'

const finder  = JSON.parse(readFileSync(path.join(ROOT, 'admin/content/finder/finder.json'), 'utf8'))
const strings = new Set()
const walk = v => { if (typeof v === 'string') strings.add(v); else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') Object.values(v).forEach(walk) }
walk(finder)

const cast = JSON.parse(readFileSync(path.join(SRC, 'cast.json'), 'utf8'))
const problems = [], boards = []
for (const name of readdirSync(SRC).filter(n => /^\d\d__.*\.json$/.test(n)).sort()) {
  const sb = JSON.parse(readFileSync(path.join(SRC, name), 'utf8'))
  for (const p of F.validate(sb, cast, { props: F.PACKS.security.concat(PACK) })) problems.push(`${name}: ${p}`)
  sb.scenes.forEach((sc, i) => {
    const at = `${name} panel ${i + 1}`
    const quoted = s => { if (!strings.has(s)) problems.push(`${at}: marked from_finder but not in finder.json word for word: "${s}"`) }
    for (const c of sc.cast || []) if (c.from_finder) quoted(c.says)
    for (const p of sc.props || []) if (p.from_finder) (p.lines || [p.label]).forEach(quoted)
    if (sc.evidence && sc.evidence.from_finder) quoted(sc.evidence.quote)
    if (sc.from_finder && sc.kind === 'punchline') quoted(sc.punchline)
    if (sc.from_finder && sc.kind === 'graph') for (const n of sc.graph.nodes) quoted(n.label.replace(/^R\d(, R\d)? /, ''))
  })
  const stats = F.stats(sb)
  boards.push({ slug: sb.slug, file: name, title: sb.title, subtitle: sb.subtitle || '', status: sb.status || '', panels: sb.scenes.length, stats })
  if (!check) {
    const dir = path.join(ROOT, 'storyboards', sb.slug)
    mkdirSync(dir, { recursive: true })
    const url = `${HOST}storyboards/${sb.slug}/index.html`
    writeFileSync(path.join(dir, 'storyboard.json'), JSON.stringify(sb, null, 1) + '\n')
    writeFileSync(path.join(dir, 'bundle.json'), JSON.stringify({ storyboard: sb, cast, packs: ['security'] }) + '\n')
    writeFileSync(path.join(dir, 'graph.json'), JSON.stringify(F.toGraph(sb, cast, { url, seriesTitle: 'startups.sgit.ai' }), null, 1) + '\n')
    writeFileSync(path.join(dir, 'script.md'), F.toMarkdown(sb, cast, { url, castHref: `${HOST}storyboards/cast/index.html` }))
  }
}
if (!check) {
  mkdirSync(path.join(ROOT, 'storyboards'), { recursive: true })
  writeFileSync(path.join(ROOT, 'storyboards/cast.json'), JSON.stringify(cast, null, 1) + '\n')
}
if (problems.length) {
  console.error(`storyboards: ${problems.length} problem(s)`)
  for (const p of problems) console.error('  - ' + p)
  process.exit(1)
}
const out = { release: RELEASE.release, boards, panels: boards.reduce((n, b) => n + b.panels, 0), characters: cast.characters.length }
if (check) console.log(`storyboards: ok, ${boards.length} storyboards, ${out.panels} panels, ${out.characters} characters, every from_finder line is in finder.json`)
else process.stdout.write(JSON.stringify(out))
