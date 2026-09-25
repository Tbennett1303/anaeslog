/* Generator checks that need no browser:  node tests/gen.test.js
 *   - the server's copy of gen.js is the game's
 *   - a seed always gives the same course; a day always gives the same seed
 *   - the day rolls over at 00:00 UTC, not local midnight
 *   - across thousands of seeds: heights stay in band, every hazard stands on
 *     ground, tunnels leave room, blots sit on floors, the reference ink ledger
 *     never runs dry, and difficulty only rises (upside down, it rises too,
 *     from a gentler start)
 *   - antigravity (Endless only): a gravity line is in plain ground, the far
 *     side has a floor to fall onto with nothing near it, the first comes at
 *     200 m, none sits by a world's edge, and Daily and Zen never turn over
 */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const G = require('../public/gen.js');
let fails = 0;
const check = (ok, msg, x) => { console.log((ok ? '  ok   ' : '  FAIL ') + msg + (x !== undefined ? '  ' + JSON.stringify(x) : '')); if (!ok) fails++; };
const hash = (o) => crypto.createHash('sha256').update(JSON.stringify(o)).digest('hex').slice(0, 16);

const a = fs.readFileSync(path.join(__dirname, '../public/gen.js'), 'utf8');
const b = fs.readFileSync(path.join(__dirname, '../functions/gen.js'), 'utf8');
check(a === b, 'functions/gen.js is identical to public/gen.js');

const course = (mode, seed, x) => { const c = G.create({ mode, seed }).ensure(x); return { p: c.printed, h: c.hazards, d: c.drops }; };
check(hash(course('endless', 42, 40000)) === hash(course('endless', 42, 40000)), 'same seed, same course');
check(hash(course('endless', 42, 40000)) !== hash(course('endless', 43, 40000)), 'different seed, different course');
// built in one go or streamed a little at a time: the same course
const s1 = G.create({ mode: 'daily', seed: 7 }); for (let x = 1000; x < 30000; x += 377) s1.ensure(x);
const s2 = G.create({ mode: 'daily', seed: 7 }).ensure(30000);
// compare everything the shorter build has (the other may have gone one chunk further)
const cut = (c) => ({ p: c.printed.slice(0, s1.printed.length), h: c.hazards.slice(0, s1.hazards.length), d: c.drops.slice(0, s1.drops.length) });
check(s1.printed.length > 40 && hash(cut(s1)) === hash(cut(s2)), 'streamed in small steps = built at once');

const day = '2026-09-22';
check(G.dailySeed(day) === G.dailySeed('2026-09-22'), 'a day always gives the same seed', G.dailySeed(day));
check(G.dailySeed('2026-09-22') !== G.dailySeed('2026-09-23'), 'each day its own seed');
check(G.utcDay(Date.parse('2026-09-22T23:59:59.999Z')) === '2026-09-22' && G.utcDay(Date.parse('2026-09-23T00:00:00Z')) === '2026-09-23',
      'the day turns at 00:00 UTC');
check(G.utcDay(Date.parse('2026-09-23T00:30:00+02:00')) === '2026-09-22', 'a player east of Greenwich after local midnight is still on the UTC day');
// a known course fingerprint: if this changes, every daily in flight changes with it (bump VERSION)
const fp = hash(course('daily', G.dailySeed('2026-01-01'), 20000));
console.log('  info fingerprint daily 2026-01-01: ' + fp + ' (generator v' + G.VERSION + ')');

check(G.score(100.0, 50) > G.score(99.9, 10), 'score: distance first');
check(G.score(100.0, 50) > G.score(100.0, 51), 'score: then sooner');
check(G.score(0, 0) >= 0 && G.score(5000, 3599) < Number.MAX_SAFE_INTEGER, 'score fits');

// static sanity over many seeds
let worst = { ledger: 1e9 }, bad = [];
const N = +(process.argv[2] || 3000);
for (let i = 1; i <= N; i++) {
  const mode = ['endless', 'daily', 'zen'][i % 3];
  const c = G.create({ mode, seed: (i * 2654435761) >>> 0 }).ensure(i % 10 === 0 ? 80000 : 40000);
  // the printed floor under x, or null over a gap
  const at = (x) => {
    for (const f of c.printed) {
      const p = f.pts;
      if (x < p[0][0] || x > p[p.length - 1][0]) continue;
      for (let k = 1; k < p.length; k++) if (p[k][0] >= x) {
        const a = p[k - 1], b = p[k], t = b[0] > a[0] ? (x - a[0]) / (b[0] - a[0]) : 0;
        return a[1] + (b[1] - a[1]) * t;
      }
    }
    return null;
  };
  const lastD = [-1, -1];
  for (const k of c.chunks) {
    if (k.kind === 'flip') continue;
    if (k.d < lastD[k.inv ? 1 : 0] - 1e-9) bad.push(['difficulty fell', i, k.i]);
    lastD[k.inv ? 1 : 0] = k.d;
    if (c.cfg.drops && k.inkRef < 0) bad.push(['ledger dry', i, k.i, k.kind]);
    if (c.cfg.drops && k.inkRef < worst.ledger) worst = { ledger: k.inkRef, seed: i, kind: k.kind };
  }
  for (const f of c.printed) for (const q of f.pts) if (q[1] < -75 || q[1] > 240) { bad.push(['height', i, q]); break; }
  for (const h of c.hazards) {
    const mid = h.x + h.w / 2, fl = at(mid);
    if (h.kind === 'ceil') {
      // every floor point under the ceiling leaves room for Inky
      for (let x = h.x; x <= h.x + h.w; x += 10) { const f = at(x); if (f !== null && h.hBot - f < 36) { bad.push(['low ceiling', i, h.x, h.hBot - f]); break; } }
    } else if (fl === null || Math.abs(h.hBot + 4 - fl) > 0.5) bad.push(['floating ' + h.kind, i, h.x, h.hBot, fl]);
  }
  for (const d of c.drops) {
    if (d.b) continue;                       // a bonus blot hangs over its block on purpose
    const fl = at(d.x);
    if (fl === null || Math.abs(d.h - 22 - fl) > 0.5) bad.push(['blot off floor', i, d.x]);
    for (const h of c.hazards) if (d.x > h.x - 40 && d.x < h.x + h.w + 40 && h.kind !== 'ceil') bad.push(['blot by hazard', i, d.x]);
  }
  // gravity lines
  if (mode !== 'endless' && (c.flips.length || c.printed.some((f) => f.inv) || c.hazards.some((h) => h.inv))) bad.push(['turned over in ' + mode, i]);
  if (mode === 'endless') {
    const first = c.flips.length ? G.metres(c.flips[0]) : 0;
    if (first < 199.99 || first > 225) bad.push(['first line not at 200–225 m', i, first]);
    c.flips.forEach((xg, j) => {
      const inv = j % 2 === 0;                                   // the first line turns him over
      for (const x of [xg - 100, xg - 20]) { const fl = at(x); if (fl === null || Math.abs(fl + 30) > 0.6) bad.push(['no level floor before the line', i, j, x, fl]); }
      // the far side: a floor from just before the line, level, for 26 m, of the right way up
      const far = c.printed.find((f) => !!f.inv === inv && f.pts[0][0] <= xg - 39 && f.pts[f.pts.length - 1][0] >= xg + 519);
      if (!far || far.pts.some((q) => q[0] >= xg - 40 && q[0] <= xg + 520 && Math.abs(q[1] + 30) > 0.6)) bad.push(['nothing to land on', i, j]);
      for (const h of c.hazards) if (h.x + h.w > xg - 300 && h.x < xg + 520) bad.push(['hazard by a gravity line', i, j, h.x]);
      for (const d of c.drops) if (d.x > xg - 60 && d.x < xg + 300) bad.push(['blot in the fall', i, j, d.x]);
      for (const f of c.printed) if (f.pts[0][0] < xg - 41 && f.pts[f.pts.length - 1][0] > xg + 41) bad.push(['floor across a gravity line', i, j]);
      const k = Math.round((xg - G.START_X) / (300 * G.U)), B = G.START_X + k * 300 * G.U;
      if (k >= 1 && xg > B - 16 * G.U + 0.01 && xg < B + 20 * G.U - 0.01) bad.push(['gravity line by a world edge', i, j, G.metres(xg)]);
    });
    // everything built between two lines is marked the way up it is played
    for (const h of c.hazards) if (!!h.inv !== c.invAt(h.x)) bad.push(['hazard marked the wrong way up', i, h.x]);
    for (const d of c.drops) if (!!d.inv !== c.invAt(d.x)) bad.push(['blot marked the wrong way up', i, d.x]);
  }
  if (bad.length > 20) break;
}
check(!bad.length, N + ' seeds × 2 km (every tenth to 4 km): heights, hazards, tunnels, blots, ledger, gravity lines', bad.slice(0, 5));
check(worst.ledger >= 0, 'reference ink ledger never below zero', worst);
console.log(fails ? fails + ' FAILED' : 'all passed');
process.exit(fails ? 1 : 0);
