/* Antigravity: gravity is one number the physics reads, and it only turns
 * over where Inky crosses a gravity line.
 *   node tests/antigravity.js
 *  1. Mirror symmetry: a campaign page played the right way up, and the same
 *     page mirrored with gravity pulling up and every line drawn mirrored,
 *     give the same run — x identical, y the mirror image, same ink, same end.
 *     (So nothing in the physics quietly assumes "down".)
 *  2. Endless, many seeds, drawn with each course's reference lines: gravity
 *     turns at the line and nowhere else; after every line Inky lands on the
 *     far side with nothing drawn at all; he is always on screen; the run
 *     carries on across every line.
 *  3. Falling off the top is a fall, as falling off the bottom is.
 *  4. The first line is at 200 m; Daily and Zen never turn over. */
'use strict';
const path = require('path'), fs = require('fs'), vm = require('vm');
const { chromium } = require('playwright');
const CH = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PAGE = 'file://' + path.resolve(__dirname, '../public/index.html') + '?noanalytics';
const SEEDS = +(process.env.SEEDS || 30);

let failed = 0;
const check = (ok, what, extra) => {
  console.log((ok ? '  ok   ' : '  FAIL ') + what + (extra !== undefined ? '  ' + JSON.stringify(extra) : ''));
  if (!ok) failed++;
};

// the campaign page's geometry, read from the game itself
const html = fs.readFileSync(path.resolve(__dirname, '../public/index.html'), 'utf8');
const src = html.slice(html.indexOf('  function path(ctrl) {'), html.indexOf('  const WORLDS = ['));
const ctx = {}; vm.runInNewContext(src + '\nglobalThis.levels = LEVELS;', ctx);
const LV = 'highlighter-1';
const def = JSON.parse(JSON.stringify(ctx.levels[LV]));
const sol = JSON.parse(fs.readFileSync(path.join(__dirname, 'solutions/sol-h1.json'), 'utf8')).tidy;
// every floor as a point list, so both runs build it exactly the same way
const asPts = (f) => f.pts ? { pts: f.pts } : { pts: [[f.x0, f.h], [f.x1, f.h1 === undefined ? f.h : f.h1]] };

(async () => {
  const b = await chromium.launch({ executablePath: CH });
  const p = await b.newPage({ viewport: { width: 1024, height: 768 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.goto(PAGE); await p.waitForFunction(() => window.INKLINE && INKLINE.title);

  // 1. mirror symmetry
  const play = (mirror) => p.evaluate(({ id, def, strokes, mirror, asPtsSrc }) => {
    const asPts = eval('(' + asPtsSrc + ')');
    const tag = (o) => mirror ? Object.assign({}, o, { inv: 1 }) : o;
    INKLINE.freeze(true);
    INKLINE.tune(id, { printed: def.printed.map(asPts).map(tag), hazards: def.hazards.map(tag), drops: def.drops.map(tag), plinths: [] });
    INKLINE.gravityBase(mirror ? -1 : 1);
    INKLINE.level(id);
    const G = INKLINE.levelInfo().ground, yy = 2 * (G - 40);
    let k = 0, st = INKLINE.state(); const tr = [];
    for (let f = 0; f < 60 * 60 && st.state === 'play'; f++) {
      while (k < strokes.length && st.x >= strokes[k].at) {
        const a2 = [];
        strokes[k].pts.forEach((q, i) => {
          if (i) { const a = strokes[k].pts[i - 1], n = Math.max(1, Math.round(Math.hypot(q[0] - a[0], q[1] - a[1]) / 8));
                   for (let j = 1; j <= n; j++) a2.push([a[0] + (q[0] - a[0]) * j / n, a[1] + (q[1] - a[1]) * j / n]); }
          else a2.push(q);
        });
        INKLINE.paint(a2.map((q) => ({ x: q[0], y: mirror ? yy - (G - q[1]) : G - q[1] })));
        k++;
      }
      INKLINE.tick(1 / 60, 1); st = INKLINE.state();
      if (f % 6 === 0) tr.push([st.x, mirror ? yy - st.y : st.y, st.grounded ? 1 : 0]);
    }
    const r = { state: st.state, reason: st.reason, ink: st.ink, x: st.x, tr };
    INKLINE.gravityBase(1);
    return r;
  }, { id: LV, def, strokes: sol, mirror, asPtsSrc: asPts.toString() });
  const A = await play(false), B = await play(true);
  let dx = 0, dy = 0, dg = 0;
  for (let i = 0; i < Math.min(A.tr.length, B.tr.length); i++) {
    dx = Math.max(dx, Math.abs(A.tr[i][0] - B.tr[i][0])); dy = Math.max(dy, Math.abs(A.tr[i][1] - B.tr[i][1]));
    if (A.tr[i][2] !== B.tr[i][2]) dg++;
  }
  check(A.state === 'win', 'the page played the right way up gets home', { state: A.state, ink: Math.round(A.ink * 1000) / 10 });
  check(B.state === A.state && Math.abs(B.ink - A.ink) < 1e-9 && A.tr.length === B.tr.length,
    'mirrored, gravity pulling up, lines drawn mirrored: the same run to the end', { state: B.state, ink: Math.round(B.ink * 1000) / 10, samples: B.tr.length });
  check(dx < 1e-6 && dy < 1e-6 && dg === 0, '…x identical, y the exact mirror image, on the ground at the same moments', { dx, dy, groundedDiffers: dg });

  // 3. off the top is a fall (the mirrored page, placed over its first void)
  const fall = (mirror) => p.evaluate(({ id, def, mirror, asPtsSrc }) => {
    const asPts = eval('(' + asPtsSrc + ')');
    const tag = (o) => mirror ? Object.assign({}, o, { inv: 1 }) : o;
    INKLINE.tune(id, { printed: def.printed.map(asPts).map(tag), hazards: def.hazards.map(tag), drops: def.drops.map(tag), plinths: [] });
    INKLINE.freeze(true); INKLINE.gravityBase(mirror ? -1 : 1); INKLINE.level(id);
    const G = INKLINE.levelInfo().ground;
    for (let f = 0; f < 60; f++) INKLINE.tick(1 / 60, 1);
    INKLINE.place(1280, mirror ? 2 * (G - 40) - (G - 40) : G - 40, 300, 0);      // over the void after the first swipe
    let st = INKLINE.state(), t = 0; const y0 = st.y;
    for (; t < 300 && st.state === 'play'; t++) { INKLINE.tick(1 / 60, 1); st = INKLINE.state(); }
    const r = { state: st.state, reason: st.reason, s: t / 60, up: st.y < y0 };
    INKLINE.gravityBase(1);
    return r;
  }, { id: LV, def, mirror, asPtsSrc: asPts.toString() });
  const fd = await fall(false), fu = await fall(true);
  check(fd.reason === 'fell' && !fd.up && fu.reason === 'fell' && fu.up && Math.abs(fd.s - fu.s) < 0.05,
    'falling off the bottom and falling off the top are the same fall, as quickly', { down: fd, up: fu });
  await p.evaluate(() => INKLINE.tune('highlighter-1', {}));
  await p.goto(PAGE); await p.waitForFunction(() => window.INKLINE && INKLINE.title);

  // 2. Endless across many seeds
  let lines = 0, landed = 0, turnedAt = [], offscreen = 0, alive = 0, worstLand = 0, early = [];
  for (let seed = 1; seed <= SEEDS; seed++) {
    const r = await p.evaluate((seed) => {
      INKLINE.freeze(true); INKLINE.mode('endless', seed);
      const C = INKLINE.course(), G = INKLINE.levelInfo().ground;
      let k = 0, st = INKLINE.state(), g = st.grav, prevX = st.x, wait = null;
      const out = { lines: 0, landed: 0, turnedAt: [], landT: [], offT: [], off: 0, state: 'play', dist: 0, first: null, early: [] };
      const V = INKLINE.view();
      for (let f = 0; f < 60 * 140 && st.state === 'play' && (st.dist < 1500 || wait); f++) {
        // after a line, draw nothing until he is down on the far side
        if (!wait) while (k < C.refs.length && st.x >= C.refs[k].at) {
          if (C.flips.some((xg) => xg > st.x && xg < C.refs[k].pts[0][0] + 40 && xg - st.x < 700)) break;   // not a line meant for the other side
          INKLINE.paint(C.refs[k++].pts.map((q) => ({ x: q[0], y: G - q[1] })));
        }
        INKLINE.tick(1 / 60, 1); st = INKLINE.state();
        if (st.grav !== g) {
          const xg = C.flips.find((x) => x > prevX - 1e-6 && x <= st.x + 1e-6);
          out.turnedAt.push(xg === undefined ? null : st.x - xg);
          if (out.first === null) out.first = xg;
          out.lines++; g = st.grav; wait = { t: st.t, xg: xg };
          while (k < C.refs.length && C.refs[k].pts[0][0] < st.x + 60) k++;       // lines from before it are behind him
        }
        // down on the far floor: its h is -30 the right way up and 110 upside down, Inky's centre 10 off it
        if (wait) {
          const h = G - st.y, on = Math.abs(h - (st.grav > 0 ? -20 : 100)) < 4;
          wait.on = on ? (wait.on || 0) + 1 : 0;
          if (wait.on >= 12) { out.landed++; out.landT.push(+(st.t - wait.t - 0.2).toFixed(2)); wait = null; }
          else if (st.t - wait.t > 2.5) { out.early.push({ x: Math.round(wait.xg), state: st.state }); wait = null; }
        }
        if (st.y < st.camY - 12 || st.y > st.camY + V.VH + 12) out.offT.push(st.t);
        prevX = st.x;
      }
      out.state = st.state; out.reason = st.reason; out.dist = Math.round(st.dist);
      out.off = out.offT.filter((t) => st.state === 'play' || t < st.t - 1.2).length;     // a fall to the end is meant to leave the page
      return out;
    }, seed);
    lines += r.lines; landed += r.landed; offscreen += r.off;
    turnedAt.push(...r.turnedAt); if (r.state === 'play') alive++;
    worstLand = Math.max(worstLand, ...r.landT, 0);
    if (r.early.length || r.state !== 'play') early.push({ seed, early: r.early, state: r.state, reason: r.reason, dist: r.dist });
    if (seed === 1) check(r.first !== null && Math.abs((r.first - 110) / 20 - 200) < 0.01, 'the first gravity line is at 200 m', (r.first - 110) / 20);
  }
  check(lines > SEEDS * 4, SEEDS + ' seeds to 1.5 km cross gravity lines', { lines });
  check(turnedAt.every((d) => d !== null && d >= 0 && d < 8), 'gravity turns over exactly as Inky crosses a line, and never anywhere else', { worst: Math.max(...turnedAt.map((d) => d === null ? 999 : d)) });
  check(landed === lines, 'after every line he lands on the far side with nothing drawn', { lines, landed, slowest: worstLand + ' s', misses: early.slice(0, 3) });
  check(offscreen === 0, 'he is always on screen, either way up', offscreen);
  check(alive === SEEDS, 'every run is still going at 1.5 km (reference lines, no line drawn near a crossing)', { alive, of: SEEDS, lost: early.slice(0, 3) });

  // 4. only Endless turns over
  const other = await p.evaluate(() => {
    const o = {};
    for (const m of ['daily', 'zen']) {
      INKLINE.freeze(true); INKLINE.mode(m, 77);
      INKLINE.course().ensure(110 + 20 * 2500);
      o[m] = { flips: INKLINE.course().flips.length, grav: INKLINE.state().grav };
    }
    return o;
  });
  check(other.daily.flips === 0 && other.zen.flips === 0 && other.daily.grav === 1 && other.zen.grav === 1, 'Daily and Zen never turn over', other);

  check(!errs.length, 'no page errors', errs);
  await b.close();
  console.log(failed ? failed + ' failed' : 'all passed');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
