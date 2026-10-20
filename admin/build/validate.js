#!/usr/bin/env node
// startups.sgit.ai pre-release gate. Run from anywhere: node admin/build/validate.js
// The same shape as the gates of gen-z-developers.sgit.ai and the sibling sites, with the checks this site has. In order:
//   1. version agreement: admin/build/version.txt vs the badge on every page, the newest row of versions.json, llms.txt
//   2. internal links resolve, and no page is an orphan (every page reachable from index.html by links)
//   3. every page has a markdown twin, and every twin is listed in llms.txt
//   4. canonical and og:url on every page, on the host in CNAME
//   5. nothing fetched from another origin: no external <script src>, stylesheet <link href> or <img src>
//   6. the key tripwire: private sgit keys, private-key blocks, cloud, model-provider, GitHub, Slack and Google key shapes
//   7. div balance
//   8. no em-dash in any page or twin
//   9. the sitemap and the tree agree in both directions (404.html excepted)
//  10. the finder's published file is its source
//  11. the review folder is fresh: every source file's hash matches review/graph/files.json; the review page carries the join's coverage
//  12. every script parses (node --check on .js and .mjs; py_compile on .py when python3 is available)
// Any failure exits 1: no tag, no publish.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const ROOT = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, '..', '..');
const errors = [];
const rel = f => path.relative(ROOT, f).split(path.sep).join('/');
const SKIP_DIRS = new Set(['.git', '.github', 'node_modules', '.sg_vault', '__pycache__']);

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}
const files = walk(ROOT);
const htmlFiles = files.filter(f => f.endsWith('.html') && !rel(f).startsWith('assets/'));
const pages = htmlFiles.filter(f => rel(f) !== '404.html');
const read = f => fs.readFileSync(f, 'utf8');
const sha = buf => crypto.createHash('sha256').update(buf).digest('hex');

// --- 1. version agreement ---------------------------------------------------
const VERSION = read(path.join(ROOT, 'admin/build/version.txt')).trim();
if (!/^v\d+\.\d+\.\d+$/.test(VERSION)) errors.push(`version.txt does not carry a vX.Y.Z version: "${VERSION}"`);
for (const f of htmlFiles) {
  const m = read(f).match(/<span class="ver">site <a [^>]*>(v[\d.]+)<\/a><\/span>/);
  if (!m) errors.push(`${rel(f)}: no version badge`);
  else if (m[1] !== VERSION) errors.push(`${rel(f)}: badge says ${m[1]}, version.txt says ${VERSION}`);
}
const releases = JSON.parse(read(path.join(ROOT, 'admin/content/versions.json'))).releases;
if (releases[releases.length - 1].version !== VERSION) errors.push(`admin/content/versions.json: newest row is ${releases[releases.length - 1].version}, version.txt says ${VERSION}`);
const llms = read(path.join(ROOT, 'llms.txt'));
if (!llms.includes(`Site ${VERSION}.`)) errors.push(`llms.txt does not carry ${VERSION}`);

// --- 2. internal links, and orphans -----------------------------------------
const HOST = read(path.join(ROOT, 'CNAME')).trim();
const linksOut = new Map();
for (const f of htmlFiles) {
  const t = read(f);
  const re = /(?:href|src)="([^"#]*)(?:#[^"]*)?"/g;
  let m;
  const out = new Set();
  while ((m = re.exec(t))) {
    const url = m[1].split('?')[0];
    if (!url || /^(https?:|mailto:|data:|\/\/)/.test(url)) continue;
    const target = url.startsWith('/') ? path.join(ROOT, url) : path.resolve(path.dirname(f), url);
    const ok = fs.existsSync(target) && (fs.statSync(target).isFile() || fs.existsSync(path.join(target, 'index.html')));
    if (!ok) errors.push(`${rel(f)}: link to "${url}" does not resolve`);
    else if (target.endsWith('.html')) out.add(rel(target));
  }
  linksOut.set(rel(f), out);
}
const reachable = new Set(['index.html']);
const queue = ['index.html'];
while (queue.length) {
  const p = queue.shift();
  for (const t of linksOut.get(p) || []) if (!reachable.has(t)) { reachable.add(t); queue.push(t); }
}
for (const f of pages) if (!reachable.has(rel(f))) errors.push(`${rel(f)}: an orphan, no page links to it`);

// --- 3. twins and llms.txt --------------------------------------------------
for (const f of pages) {
  const twin = f.slice(0, -5) + '.md';
  if (!fs.existsSync(twin)) { errors.push(`${rel(f)}: no markdown twin`); continue; }
  if (!llms.includes(`https://${HOST}/${rel(twin)}`)) errors.push(`llms.txt does not list ${rel(twin)}`);
  if (!read(f).includes('rel="alternate" type="text/markdown"')) errors.push(`${rel(f)}: no <link rel="alternate"> to its twin`);
}

// --- 4. canonical host ------------------------------------------------------
for (const f of htmlFiles) {
  const t = read(f);
  const c = t.match(/<link rel="canonical" href="([^"]+)">/);
  if (!c) { errors.push(`${rel(f)}: no canonical`); continue; }
  const expected = `https://${HOST}/` + (rel(f) === 'index.html' ? '' : rel(f));
  if (c[1] !== expected) errors.push(`${rel(f)}: canonical "${c[1]}" is not ${expected}`);
  const og = t.match(/<meta property="og:url" content="([^"]+)">/);
  if (!og || og[1] !== c[1]) errors.push(`${rel(f)}: og:url missing or disagrees with canonical`);
}

// --- 5. nothing from another origin ------------------------------------------
for (const f of htmlFiles) {
  const t = read(f);
  for (const m of t.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)) if (/^(https?:)?\/\//.test(m[1])) errors.push(`${rel(f)}: script from another origin: ${m[1]}`);
  for (const m of t.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)) if (/^(https?:)?\/\//.test(m[1])) errors.push(`${rel(f)}: stylesheet from another origin: ${m[1]}`);
  for (const m of t.matchAll(/<img[^>]*\ssrc="([^"]+)"/g)) if (/^(https?:)?\/\//.test(m[1])) errors.push(`${rel(f)}: image from another origin: ${m[1]}`);
}
for (const f of files.filter(f => /\.(js|mjs)$/.test(f))) {
  for (const m of read(f).matchAll(/import\(?\s*['"](https?:\/\/[^'"]+)['"]/g)) errors.push(`${rel(f)}: imports from another origin: ${m[1]}`);
}

// --- 6. the key tripwire ------------------------------------------------------
const SHAPES = [
  [/sgit_private_\S+/, 'a private sgit key'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'a private key block'],
  [/\bAKIA[0-9A-Z]{16}\b/, 'an AWS access key id'],
  [/\bsk-or-v1-[0-9a-f]{20,}/, 'an OpenRouter key'],
  [/\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{24,}/, 'a model-provider key'],
  [/\bgh[pousr]_[A-Za-z0-9]{30,}\b/, 'a GitHub token'],
  [/\bgithub_pat_[A-Za-z0-9_]{40,}\b/, 'a GitHub fine-grained token'],
  [/\bxox[baprs]-[A-Za-z0-9-]{10,}/, 'a Slack token'],
  [/\bAIza[0-9A-Za-z_-]{35}\b/, 'a Google API key'],
  [/\b[A-Za-z0-9]{40,}:[a-z0-9]{8}\b/, 'a legacy vault key shape'],
];
for (const f of files) {
  if (/\.(png|jpg|jpeg|webp|gif|pdf|ico|woff2?)$/i.test(f)) continue;
  const r = rel(f);
  if (r === 'admin/build/validate.js' || r === 'admin/build/release.py' || r.startsWith('admin/credentials/')) continue;
  const t = read(f);
  for (const [rx, what] of SHAPES) {
    const m = t.match(rx);
    if (m && !m[0].includes('sgit_public_read_') && !t.includes('sgit_public_read_' + m[0])) errors.push(`${r}: carries ${what} ("${m[0].slice(0, 10)}...")`);
  }
}

// --- 7. div balance ---------------------------------------------------------
for (const f of htmlFiles) {
  const t = read(f);
  const open = (t.match(/<div\b/g) || []).length, close = (t.match(/<\/div>/g) || []).length;
  if (open !== close) errors.push(`${rel(f)}: ${open} <div> but ${close} </div>`);
}

// --- 8. no em-dash ------------------------------------------------------------
for (const f of files.filter(f => /\.(html|md|txt|json)$/.test(f) && !rel(f).startsWith('admin/credentials/'))) {
  const t = read(f);
  const i = t.indexOf('—');
  if (i >= 0) errors.push(`${rel(f)}: an em-dash at offset ${i} ("...${t.slice(Math.max(0, i - 20), i + 20).replace(/\n/g, ' ')}...")`);
}

// --- 9. sitemap -------------------------------------------------------------
const sitemap = read(path.join(ROOT, 'sitemap.xml'));
const locs = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].replace(`https://${HOST}/`, '') || 'index.html'));
for (const f of pages) if (!locs.has(rel(f))) errors.push(`sitemap.xml does not list ${rel(f)}`);
for (const l of locs) if (!fs.existsSync(path.join(ROOT, l))) errors.push(`sitemap.xml lists ${l}, which does not exist`);

// --- 10. the finder's published file is its source ---------------------------
for (const [name, out] of [['finder.json', 'finder.json'], ['prompt.md', 'finder-prompt.md'], ['record.md', 'finder-record.md']]) {
  const a = path.join(ROOT, 'admin/content/finder', name), b = path.join(ROOT, 'finder', out);
  if (!fs.existsSync(b)) errors.push(`finder/${out} is missing: rerun build.py`);
  else if (read(a) !== read(b)) errors.push(`finder/${out} differs from admin/content/finder/${name}: rerun build.py`);
}
try { JSON.parse(read(path.join(ROOT, 'finder/finder.json'))); } catch (e) { errors.push(`finder/finder.json does not parse: ${e.message}`); }

// --- 11. the review folder is fresh -------------------------------------------
const SOURCE_DIRS = ['.github', 'admin/build', 'admin/content', 'admin/credentials', 'assets', 'finder', 'review/intent', 'review/tools', 'team'];
const SOURCE_EXT = new Set(['.py', '.js', '.mjs', '.css', '.html', '.json', '.md', '.yml', '.txt']);
const ROOT_FILES = ['README.md', 'CLAUDE.md', 'REALITY.md', 'BRIEF-CORRECTIONS.md', 'LICENSES.md', 'CNAME', 'robots.txt', 'review/README.md', 'review/BRIEF-CORRECTIONS.md', 'review/self/README.md'];
const GENERATED = new Set(['finder/finder.json', 'finder/finder-prompt.md', 'finder/finder-record.md']);
function walkAll(dir, out = []) { // the derive tool's walk includes .github, which walk() above skips
  for (const name of fs.readdirSync(dir)) {
    if (name === '.git' || name === 'node_modules' || name === '__pycache__') continue;
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walkAll(p, out); else out.push(p);
  }
  return out;
}
const sourceFiles = new Set();
for (const d of SOURCE_DIRS) {
  const base = path.join(ROOT, d);
  if (!fs.existsSync(base)) continue;
  for (const p of walkAll(base)) {
    const r = rel(p);
    if (!SOURCE_EXT.has(path.extname(p)) || GENERATED.has(r)) continue;
    if (d === 'team' && r.endsWith('.html')) continue;
    sourceFiles.add(r);
  }
}
for (const f of ROOT_FILES) if (fs.existsSync(path.join(ROOT, f))) sourceFiles.add(f);
const filesJson = path.join(ROOT, 'review/graph/files.json');
if (!fs.existsSync(filesJson)) errors.push('review/graph/files.json is missing: rerun build.py');
else {
  const recorded = new Map(JSON.parse(read(filesJson)).files.map(x => [x.path, x.sha256]));
  for (const r of sourceFiles) {
    if (!recorded.has(r)) errors.push(`review/graph/files.json does not list ${r}: the review folder is older than the tree, rerun build.py`);
    else if (recorded.get(r) !== sha(fs.readFileSync(path.join(ROOT, r)))) errors.push(`review/graph/files.json: ${r} changed since the review folder was derived, rerun build.py`);
  }
  for (const r of recorded.keys()) if (!sourceFiles.has(r)) errors.push(`review/graph/files.json lists ${r}, which is not a source file in the tree`);
  const join = JSON.parse(read(path.join(ROOT, 'review/join/matches.json')));
  const pageCov = read(path.join(ROOT, 'review/index.html')).match(/<span class="stat"><b>(\d+)%<\/b><span>coverage/);
  if (!pageCov || Number(pageCov[1]) !== Math.floor(join.coverage * 100)) errors.push(`review/index.html: the coverage figure is not the join's (${join.coverage})`);
}
for (const f of ['REALITY.md', 'BRIEF-CORRECTIONS.md']) if (!fs.existsSync(path.join(ROOT, f))) errors.push(`${f} is missing`);

// --- 12. every script parses ---------------------------------------------------
for (const f of files.filter(f => /\.(js|mjs)$/.test(f))) {
  const r = spawnSync('node', ['--check', f], { encoding: 'utf8' });
  if (r.status !== 0) errors.push(`${rel(f)}: does not parse: ${(r.stderr || '').split('\n')[0]}`);
}
const py = spawnSync('python3', ['--version'], { encoding: 'utf8' });
if (py.status === 0) {
  for (const f of files.filter(f => f.endsWith('.py'))) {
    const r = spawnSync('python3', ['-m', 'py_compile', f], { encoding: 'utf8' });
    if (r.status !== 0) errors.push(`${rel(f)}: does not compile: ${(r.stderr || '').trim().split('\n').pop()}`);
  }
}

if (errors.length) {
  console.error(`validate: ${errors.length} problem(s)`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log(`validate: ok, ${VERSION}, ${pages.length} pages with twins, ${sourceFiles.size} source files fresh in the review folder, no key in the tree`);
