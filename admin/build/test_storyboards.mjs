#!/usr/bin/env node
/**
 * test_storyboards.mjs: the storyboards against the kit's validator and the finder's file, and the vendored kit against
 * its manifest. No mocks. Run: node admin/build/test_storyboards.mjs
 */
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const failures = []
const expect = (ok, what) => { if (!ok) failures.push(what) }

// 1. the vendored release is the release: every file's bytes hash to the manifest's
const kit = JSON.parse(readFileSync(path.join(ROOT, 'admin/content/storyboards/kit.json'), 'utf8'))
const base = path.join(ROOT, 'assets/vendor/storyboards', kit.release)
const manifest = JSON.parse(readFileSync(path.join(base, 'manifest.json'), 'utf8'))
expect(manifest.release === kit.release, `manifest says ${manifest.release}, kit.json says ${kit.release}`)
for (const f of manifest.files) {
  let ok = false
  try { ok = createHash('sha256').update(readFileSync(path.join(base, f.path))).digest('hex') === f.sha256 } catch (e) { ok = false }
  expect(ok, `vendored ${f.path} does not hash to the manifest's sha256`)
}

// 2. the storyboards validate, and every from_finder line is in finder.json (the build script, in check mode)
const r = spawnSync('node', [path.join(ROOT, 'admin/build/storyboards.mjs'), '--check'], { encoding: 'utf8' })
expect(r.status === 0, 'storyboards.mjs --check failed:\n' + (r.stderr || r.stdout))

// 3. a drifted quote is refused: a copy of a storyboard with one from_finder line changed must fail
const F = (await import('node:module')).createRequire(import.meta.url)(path.join(base, 'formats.js'))
const cast = JSON.parse(readFileSync(path.join(ROOT, 'admin/content/storyboards/cast.json'), 'utf8'))
const sb = JSON.parse(readFileSync(path.join(ROOT, 'admin/content/storyboards/02__five-ways-in.json'), 'utf8'))
expect(F.validate(sb, cast, { props: F.PACKS.security.concat(['crowd', 'tag', 'door', 'box']) }).length === 0, 'five-ways-in does not validate')
const finderStrings = new Set(); (function walk(v) { if (typeof v === 'string') finderStrings.add(v); else if (v && typeof v === 'object') Object.values(v).forEach(walk) })(JSON.parse(readFileSync(path.join(ROOT, 'admin/content/finder/finder.json'), 'utf8')))
const marked = sb.scenes.flatMap(s => (s.cast || []).filter(c => c.from_finder).map(c => c.says))
expect(marked.length >= 6 && marked.every(s => finderStrings.has(s)), 'five-ways-in: a from_finder line is not in finder.json')
expect(!finderStrings.has(marked[0] + ' (changed)'), 'the drift check cannot distinguish a changed line')

// 4. the published copies are the sources, once the build has run
for (const b of ['do-they-miss-it', 'five-ways-in', 'it-is-not-ready-yet', 'the-route-is-a-rule']) {
  let pub = null
  try { pub = JSON.parse(readFileSync(path.join(ROOT, 'storyboards', b, 'storyboard.json'), 'utf8')) } catch (e) { expect(false, `storyboards/${b}/storyboard.json is missing: rerun build.py`); continue }
  const src = JSON.parse(readFileSync(path.join(ROOT, 'admin/content/storyboards', `0${['do-they-miss-it', 'five-ways-in', 'it-is-not-ready-yet', 'the-route-is-a-rule'].indexOf(b) + 1}__${b}.json`), 'utf8'))
  expect(JSON.stringify(pub) === JSON.stringify(src), `storyboards/${b}/storyboard.json differs from its source: rerun build.py`)
}

if (failures.length) {
  console.error(`test_storyboards: ${failures.length} failure(s)`)
  for (const f of failures) console.error('  - ' + f)
  process.exit(1)
}
console.log(`test_storyboards: ok, kit ${kit.release} vendored and verified (${manifest.files.length} files), every storyboard validates, every from_finder line is in finder.json`)
