/* Map each campaign page's saved routes onto its antigravity page and write
 * tests/solutions/sol-<page>-ag.json. Run after changing ANTI in
 * public/index.html (or a page's routes).
 *
 * A stroke between two cuts moves along with its stretch, and is reflected
 * (h -> 80 - h) when that stretch is upside down; a stroke may never cross a
 * cut. One route is touched first where it sat on a knife edge (a ramp that
 * met a ledge exactly at its height), so the antigravity page does not
 * depend on luck there. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const src = html.slice(html.indexOf('  function path(ctrl) {'), html.indexOf('  const WORLDS = ['));
const ctx = {}; vm.runInNewContext(src + '\nglobalThis.levels = LEVELS; globalThis.antiCuts = antiCuts; globalThis.ANTI = ANTI;', ctx);
const SHORT = { notebook: 'n', blueprint: 'b', highlighter: 'h', scratch: 's', crayon: 'c' };
const PATCH = { 'blueprint-1': { trusting: { 3: [[3090, -20], [3216, 58]] } } };
let bad = 0;
for (const id of Object.keys(ctx.ANTI)) {
  const L = ctx.levels[id], X = ctx.antiCuts(L, ctx.ANTI[id]);
  const side = (x) => { let k = 0; while (k < X.length && X[k].c <= x) k++; return k; };
  const name = 'sol-' + SHORT[L.world] + L.n;
  const sol = JSON.parse(fs.readFileSync(path.join(root, 'tests/solutions', name + '.json'), 'utf8'));
  const out = {};
  for (const [rt, route0] of Object.entries(sol)) {
    const pt = (PATCH[id] || {})[rt] || {};
    out[rt] = route0.map((s, i) => pt[i] ? Object.assign({}, s, { pts: pt[i] }) : s).map((s) => {
      const k = side(s.pts[0][0]);
      if (s.pts.some((q) => side(q[0]) !== k)) { console.log('  a stroke crosses a cut:', id, rt, s.pts[0][0]); bad++; }
      const d = k ? X[k - 1].before + X[k - 1].len : 0, inv = k % 2 === 1;
      return { at: side(s.at) === k ? s.at + d : s.at,
               pts: s.pts.map((q) => [Math.round((q[0] + d) * 100) / 100, Math.round((inv ? 80 - q[1] : q[1]) * 100) / 100]) };
    });
  }
  fs.writeFileSync(path.join(root, 'tests/solutions', name + '-ag.json'), JSON.stringify(out));
}
console.log('Wrote', Object.keys(ctx.ANTI).length, 'antigravity route files' + (bad ? ', ' + bad + ' strokes crossing cuts' : ''));
process.exit(bad ? 1 : 0);
