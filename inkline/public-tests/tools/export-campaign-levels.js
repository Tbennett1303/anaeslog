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
for (const [id, level] of Object.entries(context.levels)) {
  levels[id] = {
    world: level.world, name: level.name, ink: level.ink,
    drop: level.drop, finish: level.finish,
    printed: level.printed.map((f) => f.pts || [[f.x0, f.h], [f.x1, f.h]]),
    plinths: level.plinths.map((p) => [p.x0, p.x1, p.h]),
    hazards: level.hazards, drops: level.drops,
  };
}
const manifest = {
  sourceHash: crypto.createHash('sha256').update(source).digest('hex'),
  levels,
};
fs.writeFileSync(path.join(root, 'functions/campaign-levels.json'), JSON.stringify(manifest) + '\n');
console.log('Exported', Object.keys(levels).length, 'campaign levels');
