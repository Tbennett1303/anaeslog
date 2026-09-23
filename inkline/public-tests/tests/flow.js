/* The whole game through its real inputs: a mouse on a desktop page and a
 * finger on a phone, in real time. Against the emulators (for the board):
 *
 *   node tests/flow.js            BASE=http://127.0.0.1:5000/ by default
 *
 * Covers: the front page choices, Endless start → draw → death → result card
 * → retry (and the guard against a stray tap), home and zen links, Zen's
 * respawn, the Daily page, the name field, a Daily run drawn live through
 * the pointer handlers (so the server has to accept a genuine real-time run),
 * Esc navigation, the Campaign page, and no console errors anywhere.
 */
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:5000/';
const CH = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let fails = 0;
const check = (ok, msg, x) => { console.log((ok ? '  ok   ' : '  FAIL ') + msg + (x !== undefined ? '  ' + JSON.stringify(x) : '')); if (!ok) fails++; };
const st = (p) => p.evaluate(() => INKLINE.state());

/* in the page: draw the course's reference strokes live, as pointer events
   through the real handlers, converting world to screen at each event */
async function liveDriver(p, stopMetres, type) {
  await p.evaluate(({ stopMetres, type }) => {
    const C = INKLINE.course(), cv = document.getElementById('game');
    let k = 0, cur = null, idx = 0;
    const scr = (x, h) => { const s = INKLINE.state(), v = INKLINE.view(); return { cx: (x - s.camX) * v.scale, cy: (v.G - h - s.camY) * v.scale }; };
    const fire = (kind, q) => cv.dispatchEvent(new PointerEvent(kind, { pointerId: 7, pointerType: type, isPrimary: true, bubbles: true, cancelable: true, clientX: q.cx, clientY: q.cy, buttons: kind === 'pointerup' ? 0 : 1 }));
    window.__drv = { on: true, strokes: 0 };
    (function step() {
      if (!window.__drv.on) return;
      const s = INKLINE.state();
      if (s.state !== 'play') { if (cur) { fire('pointerup', scr(cur[cur.length - 1][0], cur[cur.length - 1][1])); cur = null; } window.__drv.on = false; return; }
      if (!cur && k < C.refs.length && s.x >= C.refs[k].at && s.x < stopMetres * 20 + 110) {
        // densify: a hand moves in small steps
        const r = C.refs[k++].pts; cur = [];
        for (let i = 0; i < r.length - 1; i++) {
          const n = Math.max(1, Math.round(Math.hypot(r[i + 1][0] - r[i][0], r[i + 1][1] - r[i][1]) / 9));
          for (let j = 0; j < n; j++) cur.push([r[i][0] + (r[i + 1][0] - r[i][0]) * j / n, r[i][1] + (r[i + 1][1] - r[i][1]) * j / n]);
        }
        cur.push(r[r.length - 1]); idx = 0;
        fire('pointerdown', scr(cur[0][0], cur[0][1])); window.__drv.strokes++;
      }
      if (cur) {
        for (let n = 0; n < 5 && idx < cur.length - 1; n++) { idx++; fire('pointermove', scr(cur[idx][0], cur[idx][1])); }
        if (idx >= cur.length - 1) { fire('pointerup', scr(cur[idx][0], cur[idx][1])); cur = null; }
      }
      requestAnimationFrame(step);
    })();
  }, { stopMetres, type });
}
const waitDead = (p, ms) => p.waitForFunction(() => INKLINE.state().state === 'dead', null, { timeout: ms || 120000 });

async function menuBox(p, i) {
  await p.waitForFunction((i) => { const b = INKLINE.title.boxes()[i]; return b && b.k >= 1; }, i, { timeout: 4000 });
  return p.evaluate((i) => { const b = INKLINE.title.boxes()[i], v = INKLINE.view(); return b && { x: (b.x0 + b.x1) / 2 * v.scale, y: (b.y0 + b.y1) / 2 * v.scale }; }, i);
}

async function desktop(b) {
  console.log('desktop · mouse · 1280×800');
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.goto(BASE);
  await p.waitForFunction(() => window.INKLINE && INKLINE.title && INKLINE.title.phase === 'tutorial', null, { timeout: 5000 });
  // first visit: the opening is played — draw the ramp, and it rolls into the U and the menu
  {
    const g = await p.evaluate(() => ({ T: INKLINE.title.tutLayout(), s: INKLINE.view().scale, cam: INKLINE.state().camX }));
    const X = (x) => (x - g.cam) * g.s, Y = (y) => y * g.s;
    await p.mouse.move(X(g.T.gX0 - 50), Y(g.T.sY + 1)); await p.mouse.down();
    for (let i = 1; i <= 16; i++) { const u = i / 16; await p.mouse.move(X(g.T.gX0 - 50 + (g.T.pX0 + 35 - g.T.gX0 + 50) * u), Y(g.T.sY + 1 + (g.T.pY - g.T.sY - 2) * u)); }
    await p.mouse.up();
  }
  await p.waitForFunction(() => INKLINE.title.phase === 'menu' || (INKLINE.title.tut && INKLINE.title.tut.fails > 0), null, { timeout: 15000 });
  const op = await p.evaluate(() => ({ phase: INKLINE.title.phase, tut: INKLINE.title.tut, ev: INKLINE.analytics.events().filter((e) => e.e === 'tu') }));
  check(op.phase === 'menu', 'first visit: the opening is played, then the U, the splat and the menu', op.phase === 'menu' ? undefined : op);
  const labels = await p.evaluate(() => INKLINE.title.boxes().map((b) => !!b));
  check(labels.length === 3 && labels.every(Boolean), 'menu: CAMPAIGN, ENDLESS, DAILY CHALLENGE are written');

  // ENDLESS
  let m = await menuBox(p, 1);
  await p.mouse.click(m.x, m.y);
  await p.waitForFunction(() => INKLINE.state().scene === 'play' && INKLINE.state().mode === 'endless', null, { timeout: 3000 });
  check(true, 'ENDLESS starts a run at once');
  // draw the first bridge by hand before Inky sets off (the page has not moved yet)
  const v = await p.evaluate(() => INKLINE.view());
  const s0 = await st(p);
  const gy = (v.G - 0 - s0.camY) * v.scale;
  await p.mouse.move((560 - s0.camX) * v.scale, gy);
  await p.mouse.down();
  for (let i = 1; i <= 30; i++) await p.mouse.move((560 + i * 12 - s0.camX) * v.scale, gy + Math.sin(i) * 1.5);
  await p.mouse.up();
  const drawn = await p.evaluate(() => INKLINE.state().strokes);
  check(drawn === 1, 'a mouse stroke draws a line (one-euro steadied)');
  await p.waitForFunction(() => INKLINE.state().x > 1000 || INKLINE.state().state !== 'play', null, { timeout: 8000 });
  const s1 = await st(p);
  check(s1.state === 'play' && s1.x > 1000, 'Inky crosses the first gap on the drawn line', { x: Math.round(s1.x) });
  await waitDead(p, 30000);
  const d1 = await st(p);
  check(!!d1.result && d1.result.dist > 20, 'death shows the result at once: distance, time, best', { dist: Math.round(d1.result.dist), time: d1.result.time.toFixed(1), newPb: d1.result.newPb });
  // a tap that lands straight away is not a retry
  await p.mouse.click(640, 700);
  const still = await st(p);
  check(still.state === 'dead', 'a stray tap within 0.2 s of death does not retry');
  await p.waitForTimeout(260);
  const att0 = still.attempt;
  const t0 = Date.now();
  await p.mouse.click(640, 700);
  await p.waitForFunction(() => INKLINE.state().state === 'play', null, { timeout: 2000 });
  const r1 = await st(p);
  check(r1.attempt === att0 + 1, 'tap anywhere: RETRY, a new course, in ' + (Date.now() - t0) + ' ms');
  const ev = await p.evaluate(() => INKLINE.analytics.events().filter((e) => e.e === 'a').pop());
  check(ev && ev.via === 'retry' && ev.m === 'e' && ev.seed, 'the retry is recorded as a retry, with its seed', ev);
  await p.keyboard.press('Escape');
  await p.waitForFunction(() => INKLINE.state().scene === 'title', null, { timeout: 3000 });
  const q = await p.evaluate(() => INKLINE.analytics.events().filter((e) => e.e === 'q').pop());
  check(q && q.m === 'e' && q.st === 'play', 'Esc goes home, and where the run was left is recorded', q);

  // ZEN
  await p.waitForFunction(() => INKLINE.title.phase === 'menu', null, { timeout: 5000 });
  const zb = await p.evaluate(() => { const b = INKLINE.title.boxes()[1], v = INKLINE.view(); return { x: (b.x1 + 40) * v.scale, y: (b.base - 30) * v.scale }; });
  await p.mouse.click(zb.x, zb.y);
  await p.waitForFunction(() => INKLINE.state().mode === 'zen' && INKLINE.state().scene === 'play', null, { timeout: 3000 }).catch(() => {});
  let z = await st(p);
  check(z.mode === 'zen', 'the pencilled "or zen" opens Zen');
  await p.waitForFunction(() => INKLINE.state().state === 'dead', null, { timeout: 15000 });
  await p.waitForFunction(() => INKLINE.state().state === 'play', null, { timeout: 3000 });
  z = await st(p);
  check(z.state === 'play' && z.ink === 1, 'Zen: a fall sets Inky back on good ground, no card, the well full', { x: Math.round(z.x) });
  await p.keyboard.press('Escape');
  await p.waitForFunction(() => INKLINE.state().scene === 'title', null, { timeout: 3000 });

  // DAILY
  await p.waitForFunction(() => INKLINE.title.phase === 'menu', null, { timeout: 5000 });
  m = await menuBox(p, 2);
  await p.mouse.click(m.x, m.y);
  await p.waitForFunction(() => INKLINE.state().scene === 'daily', null, { timeout: 3000 });
  await p.waitForFunction(() => INKLINE.daily.status === 'ok' || INKLINE.daily.status === 'offline', null, { timeout: 8000 });
  check(await p.evaluate(() => INKLINE.daily.status) === 'ok', 'the Daily page reads today\'s board');
  const nb = await p.evaluate(() => { const b = INKLINE.daily.boxes().name, v = INKLINE.view(); return { x: (b.x0 + 30) * v.scale, y: (b.y0 + b.y1) / 2 * v.scale }; });
  await p.mouse.click(nb.x, nb.y);
  await p.waitForSelector('#name', { state: 'visible', timeout: 2000 });
  await p.keyboard.type('Mo <3 Ink');
  await p.keyboard.press('Enter');
  check(await p.evaluate(() => INKLINE.records.name) === 'Mo 3 Ink' && !(await p.isVisible('#name')), 'the name field takes a name, cleaned, and goes away');
  const pb = await p.evaluate(() => { const b = INKLINE.daily.boxes().play, v = INKLINE.view(); return { x: (b.x0 + b.x1) / 2 * v.scale, y: (b.y0 + b.y1) / 2 * v.scale }; });
  await p.mouse.click(pb.x, pb.y);
  await p.waitForFunction(() => INKLINE.state().scene === 'play' && INKLINE.state().mode === 'daily', null, { timeout: 3000 });
  await liveDriver(p, 180, 'mouse');
  await waitDead(p, 150000);
  const dd = await st(p);
  await p.waitForFunction(() => INKLINE.state().result && INKLINE.state().result.net !== 'sending', null, { timeout: 12000 });
  const res = (await st(p)).result;
  check(res.net === 'ok' && res.rank >= 1, 'a Daily run drawn live (' + Math.round(res.dist) + ' m) is accepted by the server and ranked', { net: res.net, rank: res.rank, strokes: await p.evaluate(() => window.__drv.strokes) });
  await p.waitForTimeout(250);
  await p.keyboard.press('Escape');
  await p.waitForFunction(() => INKLINE.state().scene === 'daily', null, { timeout: 3000 });
  await p.waitForFunction(() => INKLINE.daily.status === 'ok', null, { timeout: 8000 });
  const me = await p.evaluate(() => INKLINE.daily.board.top.find((r) => r.me));
  check(me && me.name === 'Mo 3 Ink', 'the board shows the run under the chosen name', me);
  await p.keyboard.press('Escape');
  await p.waitForFunction(() => INKLINE.state().scene === 'title', null, { timeout: 3000 });

  // CAMPAIGN still there
  await p.waitForFunction(() => INKLINE.title.phase === 'menu', null, { timeout: 5000 });
  m = await menuBox(p, 0);
  await p.mouse.click(m.x, m.y);
  await p.waitForFunction(() => INKLINE.state().scene === 'campaign', null, { timeout: 3000 });
  check(true, 'CAMPAIGN opens the pages');
  check(!errs.length, 'no console errors', errs.slice(0, 3));
  await ctx.close();
}

async function phone(b) {
  console.log('phone · touch · 390×844');
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.goto(BASE);
  await p.waitForFunction(() => window.INKLINE && INKLINE.title);
  await p.evaluate(() => INKLINE.title.skip());              // (the opening itself is tested in tutorial.js)
  await p.waitForFunction(() => INKLINE.title.phase === 'menu', null, { timeout: 3000 });
  const m = await menuBox(p, 1);
  await p.touchscreen.tap(m.x, m.y);
  await p.waitForFunction(() => INKLINE.state().mode === 'endless', null, { timeout: 3000 });
  await liveDriver(p, 120, 'touch');
  await waitDead(p, 90000);
  const s = await st(p);
  check(s.dist > 110, 'a finger draws an Endless run past 110 m (' + Math.round(s.dist) + ' m)');
  await p.waitForTimeout(260);
  // the home link on the card
  await p.touchscreen.tap(195, 420);
  await p.waitForFunction(() => INKLINE.state().state === 'play', null, { timeout: 2000 });
  check(true, 'a tap retries on a phone');
  check(!errs.length, 'no page errors', errs.slice(0, 3));
  await ctx.close();
}

(async () => {
  const b = await chromium.launch({ executablePath: CH });
  await desktop(b);
  await phone(b);
  await b.close();
  console.log(fails ? fails + ' FAILED' : 'all passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
