/* Export the shipped campaign geometry for TEST leaderboard verification.
 * Run after changing level definitions in public/index.html. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const start = html.indexOf('  function path(ctrl) {');
const end = html.indexOf('  const WORLDS = [', start);
if (start < 0 || end < 0) throw new Error('Campaign definition not found');
const source = html.slice(start, end);
const context = Object.create(null);
vm.runInNewContext(source + '\nglobalThis.levels = LEVELS;', context, { timeout: 1000 });
const levels = {};
/* Antigravity pages (id ending ':ag') are exported as they are played:
   anything marked `inv` is reflected, h -> 80 - h, so the check reads the
   page the way up it really is. */
const M = 80;
for (const [id, level] of Object.entries(context.levels)) {
  const e = {
    world: level.world, name: level.name, ink: level.ink,
    drop: level.drop, finish: level.finish,
    printed: level.printed.map((f) => {
      const pts = f.pts || [[f.x0, f.h], [f.x1, f.h1 === undefined ? f.h : f.h1]];
      return f.inv ? pts.map((q) => [q[0], M - q[1]]) : pts;
    }),
    plinths: level.plinths.map((p) => [p.x0, p.x1, p.inv ? M - p.h : p.h]),
    hazards: level.hazards.map((h) => h.inv ? { x: h.x, w: h.w, hTop: M - h.hBot, hBot: M - h.hTop, kind: h.kind } : h),
    drops: level.drops.map((d) => d.inv ? { x: d.x, h: M - d.h } : d),
  };
  if (level.flips) e.flips = level.flips;
  levels[id] = e;
}
const manifest = {
  sourceHash: crypto.createHash('sha256').update(source).digest('hex'),
  levels,
};
fs.writeFileSync(path.join(root, 'functions/campaign-levels.json'), JSON.stringify(manifest) + '\n');
console.log('Exported', Object.keys(levels).length, 'campaign levels');
