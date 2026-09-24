/* Endless travels through the worlds the player has opened.
 *   node tests/regions.js
 * Only the look changes: the same seed with the same lines gives the same run
 * whatever worlds are open. */
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const CH = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PAGE = 'file://' + path.resolve(__dirname, '../public/index.html') + '?noanalytics';
const OUT = process.env.OUT || require('os').tmpdir();

let failed = 0;
const check = (ok, what, extra) => {
  console.log((ok ? '  ok   ' : '  FAIL ') + what + (extra !== undefined ? '  ' + JSON.stringify(extra) : ''));
  if (!ok) failed++;
};

(async () => {
  const b = await chromium.launch({ executablePath: CH });
  const p = await b.newPage({ viewport: { width: 1024, height: 768 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.goto(PAGE); await p.waitForFunction(() => window.INKLINE && INKLINE.title);

  const setWorlds = (n) => p.evaluate((n) => {
    const P = INKLINE.progress, W = INKLINE.worlds();
    P.clear(); INKLINE.mastery.clear();
    for (let k = 0; k < n - 1; k++) W[k].levels.forEach((id) => P.win(id, 0.1, 30));   // home on every page opens the next world
    return W.map((w) => INKLINE.mastery.isOpen(w));
  }, n);
  /* play a seed with its reference lines to `metres`, noting the theme and
     Inky's state as he goes */
  const run = (seed, metres) => p.evaluate(({ seed, metres }) => {
    INKLINE.freeze(true); INKLINE.mode('endless', seed);
    const C = INKLINE.course(), G = INKLINE.levelInfo().ground;
    let k = 0, st = INKLINE.state(), lastT = -1, marks = [], themes = [], prev = null, frames = 0;
    while (st.state === 'play' && st.dist < metres && frames < 60 * 400) {
      while (k < C.refs.length && st.x >= C.refs[k].at) INKLINE.paint(C.refs[k++].pts.map((q) => ({ x: q[0], y: G - q[1] })));
      INKLINE.tick(1 / 60, 1); frames++; st = INKLINE.state();
      const r = INKLINE.region();
      if (r.theme !== prev) { themes.push([Math.round(st.dist), r.theme, r.name]); prev = r.theme; }
      if (st.t - lastT >= 0.5) { lastT = st.t; marks.push([+st.t.toFixed(2), Math.round(st.x * 10) / 10, Math.round(st.y * 10) / 10]); }
    }
    return { state: st.state, dist: st.dist, t: st.t, themes, marks, region: INKLINE.region() };
  }, { seed, metres });

  // 1. only the Notebook open: Endless stays in the Notebook
  check((await setWorlds(1)).join() === 'true,false,false,false,false', 'a new player has only the Notebook');
  const one = await run(4242, 1000);
  check(one.dist >= 1000 && one.themes.length === 1 && one.themes[0][1] === 'notebook', 'Notebook only: 1 km, still the Notebook', one.themes);

  // 2. two worlds: they alternate every 300 m
  await setWorlds(2);
  const two = await run(4242, 1000);
  check(JSON.stringify(two.themes.map((t) => t[1])) === JSON.stringify(['notebook', 'blueprint', 'notebook', 'blueprint']), 'Notebook and Blueprint alternate', two.themes);
  check(two.themes.slice(1).every((t, i) => t[0] >= 300 * (i + 1) && t[0] <= 300 * (i + 1) + 25),
    'a new region every 300 m, switched on the level ground laid across each boundary', two.themes.map((t) => t[0]));

  // 3. all five, in campaign order, and back round
  check((await setWorlds(5)).every(Boolean), 'every world open');
  const four = await run(4242, 1600);
  check(JSON.stringify(four.themes.map((t) => t[1])) === JSON.stringify(['notebook', 'blueprint', 'highlighter', 'scratch', 'crayon', 'notebook']), 'Notebook → Blueprint → Highlighter → Scratch Art → Crayon → Notebook', four.themes);
  check(four.themes.slice(1).map((t) => t[2]).join() === 'BLUEPRINT,HIGHLIGHTER,SCRATCH ART,CRAYON,NOTEBOOK', 'each new world is named as it arrives');

  // 4. only the look changes: the same seed and lines give the same run
  const same = JSON.stringify(one.marks.slice(0, four.marks.length)) === JSON.stringify(four.marks.slice(0, one.marks.length));
  check(same && one.marks.length > 100, 'same seed, same lines: Inky\'s path is identical with one world or five', { samples: Math.min(one.marks.length, four.marks.length) });
  check(four.state === 'play', 'Inky never stopped: the run carried on through every turn of the page');

  // 5. a retry starts in the Notebook again; Daily and Zen do not travel
  const again = await run(99, 50);
  check(again.region.cur === 0 && again.themes[0][1] === 'notebook', 'a new run starts in the Notebook', again.themes);
  const daily = await p.evaluate(() => { INKLINE.mode('daily'); return INKLINE.region().theme; });
  check(daily === 'blueprint', 'the Daily stays on its blueprint', daily);
  const zen = await p.evaluate(() => { INKLINE.mode('zen', 5); return INKLINE.region().theme; });
  check(zen === 'notebook', 'Zen stays in the Notebook', zen);

  // 6. live: the page turns and the name is written, while he runs (pictures)
  await p.evaluate(() => {
    INKLINE.freeze(true); INKLINE.mode('endless', 4242);
    const C = INKLINE.course(), G = INKLINE.levelInfo().ground; let k = 0, st = INKLINE.state();
    while (st.dist < 296) { while (k < C.refs.length && st.x >= C.refs[k].at) INKLINE.paint(C.refs[k++].pts.map((q) => ({ x: q[0], y: G - q[1] }))); INKLINE.tick(1 / 60, 1); st = INKLINE.state(); }
    window.__k = k;
    INKLINE.freeze(false);
    const tick = () => { const s = INKLINE.state(); const C2 = INKLINE.course(); while (window.__k < C2.refs.length && s.x >= C2.refs[window.__k].at) INKLINE.paint(C2.refs[window.__k++].pts.map((q) => ({ x: q[0], y: G - q[1] }))); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  await p.waitForFunction(() => INKLINE.region().cur === 1, null, { timeout: 8000 });
  await p.waitForTimeout(180); await p.screenshot({ path: path.join(OUT, 'inkline-region-turn.png') });
  await p.waitForTimeout(700); await p.screenshot({ path: path.join(OUT, 'inkline-region-name.png') });
  const live = await p.evaluate(() => INKLINE.state());
  check(live.state === 'play', 'played live across the boundary: still running after the turn', { dist: Math.round(live.dist) });

  check(!errs.length, 'no page errors', errs);
  await b.close();
  console.log(failed ? failed + ' failed' : 'all passed');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
