/* assets/storyboards/startups-props.js: this site's prop pack for the storyboard kit (api.storyboards.sgit.ai v0.1.0),
 * drawn the same way as the kit's own props (Rough.js, sketchy, nothing an image), in the pack contract the kit documents:
 * a function given the drawing primitives, returning { kind: draw(g, rc, x, y, s, p) }, x the centre, y the line it stands
 * on, s a scale, p the scene's entry. Loaded before storyboard.js it waits in window.StoryboardPropPacks; after, it registers
 * itself with StoryboardKit.addProps.
 *
 *   crowd   the five people you hand the thing to: p.n (default 5), p.label, p.mood ('shrug' draws them shrugging, 'ask' one
 *           of them with a hand up), p.colour
 *   tag     a price tag; p.label, p.colour
 *   door    a door; p.open, p.label
 *   box     the shipped thing, a parcel with a version on it; p.label, p.colour
 *
 * @version 0.1.0
 */
(function () {
  'use strict';
  const pack = function (k) {
    const { draw, el, textBlock, wrap, INK } = k;
    const ink = (o) => Object.assign({ stroke: INK, strokeWidth: 2.4, roughness: 0.9 }, o || {});
    const label = (g, text, x, y, size) => { if (text) textBlock(g, wrap(text, 22), x, y, (size || 26) * 1.35, { anchor: 'middle' }); };
    const K = 1.45;
    function person(g, rc, x, y, s, o) {
      const c = o.colour || '#94a3b8', r = 16 * s, hy = y - 118 * s;
      draw(g, rc.circle(x, hy, r * 2, ink({ fill: '#f1c27d', fillStyle: 'solid', strokeWidth: 2 })));
      draw(g, rc.path(`M${x - 24 * s},${y} L${x - 20 * s},${hy + r + 4 * s} L${x + 20 * s},${hy + r + 4 * s} L${x + 24 * s},${y} Z`, ink({ fill: c, fillStyle: 'hachure', hachureGap: 5, fillWeight: 1.6 })));
      if (o.arms === 'shrug') { draw(g, rc.line(x - 20 * s, hy + r + 20 * s, x - 42 * s, hy + r + 4 * s, ink({ strokeWidth: 6 * s }))); draw(g, rc.line(x + 20 * s, hy + r + 20 * s, x + 42 * s, hy + r + 4 * s, ink({ strokeWidth: 6 * s }))); }
      else if (o.arms === 'up') { draw(g, rc.line(x + 20 * s, hy + r + 14 * s, x + 34 * s, hy - 30 * s, ink({ strokeWidth: 6 * s }))); draw(g, rc.line(x - 20 * s, hy + r + 20 * s, x - 26 * s, y - 40 * s, ink({ strokeWidth: 6 * s }))); }
      else { draw(g, rc.line(x - 20 * s, hy + r + 20 * s, x - 26 * s, y - 40 * s, ink({ strokeWidth: 6 * s }))); draw(g, rc.line(x + 20 * s, hy + r + 20 * s, x + 26 * s, y - 40 * s, ink({ strokeWidth: 6 * s }))); }
      if (o.arms === 'shrug') draw(g, rc.path(`M${x - 7 * s},${hy + 8 * s} Q${x},${hy + 2 * s} ${x + 7 * s},${hy + 8 * s}`, ink({ strokeWidth: 2 })));
      else draw(g, rc.path(`M${x - 7 * s},${hy + 5 * s} Q${x},${hy + 12 * s} ${x + 7 * s},${hy + 5 * s}`, ink({ strokeWidth: 2 })));
      for (const d of [-1, 1]) el('circle', { cx: x + d * 6 * s, cy: hy - 2 * s, r: 2.4 * s, fill: INK, class: 'ink-solid' }, g);
    }
    return {
      crowd(g, rc, x, y, s, p) {
        s *= K * 0.9;
        const n = p.n || 5, gap = 82 * s, x0 = x - ((n - 1) * gap) / 2;
        for (let i = 0; i < n; i++) {
          const arms = p.mood === 'shrug' ? 'shrug' : (p.mood === 'ask' && i === Math.floor(n / 2) ? 'up' : 'down');
          person(g, rc, x0 + i * gap, y, s * (0.92 + ((i * 7) % 3) * 0.05), { arms, colour: p.colour || ['#94a3b8', '#fbbf24', '#60a5fa', '#f87171', '#34d399'][i % 5] });
        }
        label(g, p.label, x, y + 40 * s, 26 * s);
      },
      tag(g, rc, x, y, s, p) {
        s *= K; const w = 220 * s, h = 110 * s, c = p.colour || '#fde68a';
        draw(g, rc.path(`M${x - w / 2 + 40 * s},${y - h} H${x + w / 2} V${y} H${x - w / 2 + 40 * s} L${x - w / 2},${y - h / 2} Z`, ink({ fill: c, fillStyle: 'solid' })));
        draw(g, rc.circle(x - w / 2 + 44 * s, y - h / 2, 14 * s, ink({ fill: '#fff', fillStyle: 'solid', strokeWidth: 2 })));
        draw(g, rc.line(x - w / 2 + 44 * s, y - h / 2 - 7 * s, x - w / 2 + 10 * s, y - h - 30 * s, ink({ strokeWidth: 2 })));
        if (p.label) textBlock(g, wrap(p.label, 14), x + 24 * s, y - h / 2 + 10 * s, 30 * s, { anchor: 'middle' });
      },
      door(g, rc, x, y, s, p) {
        s *= K; const w = 170 * s, h = 300 * s;
        draw(g, rc.rectangle(x - w / 2 - 14 * s, y - h - 14 * s, w + 28 * s, h + 14 * s, ink({ strokeWidth: 3 })));
        if (p.open) draw(g, rc.path(`M${x - w / 2},${y} L${x - w / 2},${y - h} L${x + w / 2 - 70 * s},${y - h + 40 * s} L${x + w / 2 - 70 * s},${y - 30 * s} Z`, ink({ fill: '#b45309', fillStyle: 'hachure', hachureGap: 7 })));
        else { draw(g, rc.rectangle(x - w / 2, y - h, w, h, ink({ fill: '#b45309', fillStyle: 'hachure', hachureGap: 7 }))); draw(g, rc.circle(x + w / 2 - 28 * s, y - h / 2, 12 * s, ink({ fill: '#f59e0b', fillStyle: 'solid', strokeWidth: 2 }))); }
        label(g, p.label, x, y + 40 * s, 26 * s);
      },
      box(g, rc, x, y, s, p) {
        s *= K; const w = 200 * s, h = 150 * s, c = p.colour || '#e7d8b1';
        draw(g, rc.rectangle(x - w / 2, y - h, w, h, ink({ fill: c, fillStyle: 'solid' })));
        draw(g, rc.line(x, y - h, x, y, ink({ strokeWidth: 2, strokeLineDash: [10, 8] })));
        draw(g, rc.rectangle(x - w / 2 - 8 * s, y - h - 22 * s, w + 16 * s, 26 * s, ink({ fill: c, fillStyle: 'solid' })));
        if (p.label) textBlock(g, wrap(p.label, 12), x, y - h / 2 + 10 * s, 30 * s, { anchor: 'middle', weight: 'bold' });
      },
    };
  };
  if (window.StoryboardKit && window.StoryboardKit.addProps) window.StoryboardKit.addProps(pack);
  else (window.StoryboardPropPacks = window.StoryboardPropPacks || []).push(pack);
})();
