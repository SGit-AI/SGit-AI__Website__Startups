/* startups.sgit.ai: the theme, chosen and remembered, and the menu on a narrow screen.

   A CLASSIC SCRIPT IN <head>, NOT A MODULE, NOT DEFERRED: it has to set the theme before the first paint, or the page
   would paint Newsprint and then flip to the reader's theme. The picker and the menu are wired once the DOM exists.

   The five themes are newsroom.sgit.ai's (assets/themes.css says how), the same file gen-z-developers.sgit.ai uses.
   The stored value is a key from THEMES, never anything else: what comes back from localStorage is checked before it
   reaches the DOM, and an unknown value is Newsprint. It stays in this browser and is sent nowhere. With nothing
   stored, the system decides between the two defaults: dark gets Night, anything else Newsprint. */
(function () {
  'use strict';
  var KEY = 'startups.theme';
  var LIGHT = 'newsprint', DARK = 'night';
  var THEMES = {
    newsprint: { label: 'Newsprint', note: 'Warm off-white, teal' },
    night:     { label: 'Night',     note: 'Dark, teal' },
    paper:     { label: 'Paper',     note: 'Warm cream, terracotta' },
    blueprint: { label: 'Blueprint', note: 'White, electric blue' },
    ember:     { label: 'Ember',     note: 'Dark, amber' }
  };
  var has = function (k) { return Object.prototype.hasOwnProperty.call(THEMES, k); };
  function stored() { try { var v = localStorage.getItem(KEY); return has(v) ? v : null; } catch (e) { return null; } }
  function system() {
    try { return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? DARK : LIGHT; }
    catch (e) { return LIGHT; }
  }
  function current() { return stored() || system(); }
  function apply(name) { document.documentElement.setAttribute('data-theme', name); return name; }
  function set(name) {
    if (!has(name)) return current();
    try { localStorage.setItem(KEY, name); } catch (e) { /* unremembered, still applied */ }
    apply(name);
    render();  /* hoisted; the pill shows the theme whoever set it */
    try { document.dispatchEvent(new CustomEvent('startups:theme.changed', { detail: { theme: name }, bubbles: true, composed: true })); } catch (e) {}
    return name;
  }
  window.__startupsTheme = { themes: THEMES, key: KEY, get: current, set: set };
  apply(current());

  // the system preference can change while the page is open; follow it only while the reader has not chosen
  try {
    var mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    if (mq && mq.addEventListener) mq.addEventListener('change', function () { if (!stored()) { apply(system()); render(); } });
  } catch (e) {}

  // ---------- the picker: build.py leaves <div class="theme-pick"></div> in the nav's tools
  var pick = null;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function render() {
    pick = pick || document.querySelector('.theme-pick');
    if (!pick) return;
    var now = current(), items = '';
    for (var k in THEMES) if (has(k)) {
      items += '<li><button type="button" data-theme="' + k + '" aria-current="' + (k === now) + '">' +
               '<span class="sw sw-' + k + '"></span><span>' + esc(THEMES[k].label) +
               '<span class="n">' + esc(THEMES[k].note) + '</span></span></button></li>';
    }
    pick.innerHTML = '<button type="button" aria-haspopup="true" aria-expanded="false" title="The theme: five to choose from, kept in this browser">' +
      '<span class="sw sw-' + now + '"></span><span class="name">' + esc(THEMES[now].label) + '</span>' +
      '<span class="caret" aria-hidden="true">&#9662;</span></button>' +
      '<ul role="menu" aria-label="Theme" hidden>' + items + '</ul>';
    var toggle = pick.firstChild, menu = pick.lastChild;
    var close = function () { menu.hidden = true; toggle.setAttribute('aria-expanded', 'false'); };
    toggle.addEventListener('click', function () {
      menu.hidden = !menu.hidden;
      toggle.setAttribute('aria-expanded', String(!menu.hidden));
      if (!menu.hidden) { var cur = menu.querySelector('[aria-current="true"]'); if (cur) cur.focus(); }
    });
    [].forEach.call(menu.querySelectorAll('[data-theme]'), function (b) {
      b.addEventListener('click', function (e) { set(e.currentTarget.getAttribute('data-theme')); close(); render(); pick.firstChild.focus(); });
    });
    menu.addEventListener('keydown', function (e) {
      var list = [].slice.call(menu.querySelectorAll('[data-theme]')), i = list.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); list[(i + 1) % list.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); list[(i - 1 + list.length) % list.length].focus(); }
      else if (e.key === 'Escape') { close(); toggle.focus(); }
    });
  }

  // ---------- the menu: on a narrow screen the groups collapse behind one button
  function menu() {
    var nav = document.querySelector('nav.site'), btn = nav && nav.querySelector('.nav-toggle');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('open')) { nav.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); btn.focus(); } });
  }

  // one listener closes the picker on a click anywhere else
  document.addEventListener('click', function (e) {
    if (pick && !pick.contains(e.target)) { var m = pick.querySelector('ul'), t = pick.firstChild; if (m && !m.hidden) { m.hidden = true; t.setAttribute('aria-expanded', 'false'); } }
  });
  function ready() { render(); menu(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
}());
