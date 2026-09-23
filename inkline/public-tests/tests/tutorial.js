/* The first-play opening, driven with a real mouse and a real finger:
 *   node tests/tutorial.js        (file:// or BASE=http://127.0.0.1:5000/)
 * Draws at once and gets up; does nothing (falls, then the hint); scribbles
 * nonsense (no hint until the third failure); blocks Inky with a wall (he
 * stops, it resets); refreshes mid-way; comes back after finishing (skipped);
 * replays it from "how to play"; plays it by touch on a phone; ?tutorial and
 * ?fresh; and the handover into the U, the splat and the title.
 */
const { chromium } = require('playwright');
const path = require('path');
const BASE = process.env.BASE || ('file://' + path.resolve(__dirname, '../public/index.html'));
const q = (s) => BASE + (BASE.includes('?') ? '&' : '?') + s;
const CH = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let fails = 0;
const check = (ok, msg, x) => { console.log((ok ? '  ok   ' : '  FAIL ') + msg + (x !== undefined ? '  ' + JSON.stringify(x) : '')); if (!ok) fails++; };
const tut = (p) => p.evaluate(() => INKLINE.title.tut);
const events = (p) => p.evaluate(() => INKLINE.analytics.events().filter((e) => e.e === 'tu').map((e) => { const o = Object.assign({}, e); delete o.t; return o; }));

async function open(ctx, url) {
  const p = await ctx.newPage();
  p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.goto(url);
  await p.waitForFunction(() => window.INKLINE && INKLINE.title);
  return p;
}
// world (tutorial page) to screen
async function geo(p) {
  return p.evaluate(() => ({ T: INKLINE.title.tutLayout(), s: INKLINE.view().scale, cam: INKLINE.state().camX }));
}
async function stroke(p, pts, touch) {
  const g = await geo(p);
  const S = pts.map(([x, y]) => [(x - g.cam) * g.s, y * g.s]);
  if (touch) {
    const cdp = await p.context().newCDPSession(p);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: S[0][0], y: S[0][1] }] });
    for (let i = 1; i < S.length; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: S[i][0], y: S[i][1] }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } else {
    await p.mouse.move(S[0][0], S[0][1]); await p.mouse.down();
    for (let i = 1; i < S.length; i++) await p.mouse.move(S[i][0], S[i][1]);
    await p.mouse.up();
  }
}
// the ramp a first-timer draws: from the ledge a little before the edge, up to the platform top
function ramp(T, n) {
  const a = [T.gX0 - 50, T.sY + 1], b = [T.pX0 + 35, T.pY - 1], out = [];
  for (let i = 0; i <= n; i++) { const u = i / n; out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u - Math.sin(u * Math.PI) * 4]); }
  return out;
}
const waitAttempt = (p, n) => p.waitForFunction((n) => { const t = INKLINE.title.tut; return t && t.n === n && t.state === 'play'; }, n, { timeout: 12000 });

(async () => {
  const b = await chromium.launch({ executablePath: CH });

  console.log('draws straight away');
  let ctx = await b.newContext({ viewport: { width: 1180, height: 820 } });
  let p = await open(ctx, q('noanalytics'));
  check(await p.evaluate(() => INKLINE.title.phase) === 'tutorial' && await p.evaluate(() => INKLINE.title.boxes().every((x) => !x)), 'first launch: no menu, straight into the page');
  let g = await geo(p);
  await p.waitForTimeout(300);
  await stroke(p, ramp(g.T, 16));
  await p.waitForFunction(() => INKLINE.title.flow, null, { timeout: 8000 });
  let ev = await events(p);
  check(ev.some((e) => e.k === 'done' && e.n === 1 && e.drew === 1 && e.hinted === 0) && !ev.some((e) => e.k === 'hint'), 'a ramp on the first try: up, no hint ever shown', ev.filter((e) => e.k !== 'start'));
  const t0 = Date.now();
  await p.waitForFunction(() => INKLINE.title.phase === 'menu', null, { timeout: 12000 });
  const dt = Date.now() - t0;
  const fr = await p.evaluate(() => ({ splat: INKLINE.title.splatT >= 0, boxes: INKLINE.title.boxes().filter(Boolean).length, cam: INKLINE.state().camX, done: INKLINE.title.tutDone }));
  check(fr.splat && fr.boxes === 3 && fr.cam === 0 && fr.done, 'no stop: the page slides to the U, he rides it, splat, THE INKLINE and the menu (' + (dt / 1000).toFixed(1) + ' s)', fr);
  check(dt < 7000, 'the handover takes seconds, not a screen change');
  // comes back later: skipped, the familiar U intro
  await p.reload(); await p.waitForFunction(() => window.INKLINE && INKLINE.title);
  check(await p.evaluate(() => INKLINE.title.phase) !== 'tutorial', 'next launch: the usual U intro, no opening');
  ev = await events(p);
  check(ev.some((e) => e.k === 'skipped'), 'and it is recorded as skipped (already done)');
  // replay from "how to play"
  await p.evaluate(() => INKLINE.title.skip()); await p.waitForTimeout(400);
  const hb = await p.evaluate(() => { const h = INKLINE.title.help(), v = INKLINE.view(); return h && { x: (h.x0 + h.x1) / 2 * v.scale, y: (h.y0 + h.y1) / 2 * v.scale }; });
  check(!!hb, '"how to play" is on the finished front page');
  await p.mouse.click(hb.x, hb.y);
  await p.waitForFunction(() => INKLINE.title.phase === 'tutorial', null, { timeout: 3000 });
  g = await geo(p);
  await stroke(p, ramp(g.T, 16));
  await p.waitForFunction(() => INKLINE.title.phase === 'menu', null, { timeout: 15000 });
  ev = await events(p);
  check(ev.filter((e) => e.k === 'start' && e.rp === 1).length === 1 && ev.some((e) => e.k === 'done' && e.rp === 1), 'replay works end to end, and is counted as a replay');
  check(!p.errs.length, 'no page errors', p.errs);
  await ctx.close();

  console.log('does nothing');
  ctx = await b.newContext({ viewport: { width: 1024, height: 768 } });
  p = await open(ctx, q('noanalytics'));
  const firstHintFree = await p.evaluate(() => INKLINE.title.tut.hint);
  await waitAttempt(p, 2);
  let t = await tut(p);
  check(!firstHintFree && t.fails === 1 && t.hint, 'he runs, falls — splat — and the next try carries the hint', t);
  await p.waitForTimeout(500);
  const shot1 = await p.screenshot();
  // a refresh in the middle starts the opening again
  await p.reload(); await p.waitForFunction(() => window.INKLINE && INKLINE.title);
  check(await p.evaluate(() => INKLINE.title.phase) === 'tutorial' && !(await tut(p)).hint, 'refresh mid-opening: it starts again, fresh');
  await ctx.close();

  console.log('scribbles nonsense');
  ctx = await b.newContext({ viewport: { width: 1024, height: 768 } });
  p = await open(ctx, q('noanalytics'));
  for (let n = 1; n <= 3; n++) {
    await waitAttempt(p, n);
    g = await geo(p);
    t = await tut(p);
    if (n < 3) check(!t.hint, 'try ' + n + ': drew something (nonsense), so no hint yet');
    // a loop in the sky, nowhere near the gap
    const loop = []; for (let i = 0; i <= 20; i++) loop.push([g.T.sX0 + 300 + Math.cos(i / 3) * 60, g.T.sY - 160 + Math.sin(i / 3) * 40]);
    await stroke(p, loop);
  }
  await waitAttempt(p, 4);
  t = await tut(p);
  check(t.fails === 3 && t.hint, 'after three failed tries the hint appears', t);
  g = await geo(p);
  await stroke(p, ramp(g.T, 16));
  await p.waitForFunction(() => INKLINE.title.flow, null, { timeout: 8000 });
  ev = await events(p);
  check(ev.some((e) => e.k === 'done' && e.n === 4 && e.fails === 3 && e.hinted === 1 && e.drew === 1), 'then he is up: 4 tries, 3 fails, hinted, had drawn before the hint', ev.find((e) => e.k === 'done'));
  await ctx.close();

  console.log('blocks him');
  ctx = await b.newContext({ viewport: { width: 1024, height: 768 } });
  p = await open(ctx, q('noanalytics'));
  g = await geo(p);
  await stroke(p, [[g.T.sX0 + 190, g.T.sY + 2], [g.T.sX0 + 192, g.T.sY - 60], [g.T.sX0 + 194, g.T.sY - 120]]);
  await waitAttempt(p, 2);
  ev = await events(p);
  check(ev.some((e) => e.k === 'fail' && e.why === 'stuck'), 'a wall in his way: he stops, splat, straight back to the start', ev.filter((e) => e.k === 'fail'));
  await ctx.close();

  console.log('phone, touch');
  ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });
  p = await open(ctx, q('noanalytics'));
  await p.waitForTimeout(300);
  g = await geo(p);
  await stroke(p, ramp(g.T, 16), true);
  await p.waitForFunction(() => INKLINE.title.flow || (INKLINE.title.tut && INKLINE.title.tut.fails > 0), null, { timeout: 8000 });
  const ph = await p.evaluate(() => ({ flow: INKLINE.title.flow, tut: INKLINE.title.tut, ev: INKLINE.analytics.events().filter((e) => e.e === 'tu' && e.k === 'fail') }));
  check(ph.flow, 'phone: the finger-drawn ramp gets him up', ph);
  if (!ph.flow) { g = await geo(p); await stroke(p, ramp(g.T, 16), true); await p.waitForFunction(() => INKLINE.title.flow, null, { timeout: 8000 }); }
  await p.waitForFunction(() => INKLINE.title.phase === 'menu', null, { timeout: 15000 });
  check(true, 'a finger draws the ramp; the phone gets the same handover to the menu');
  check(!p.errs.length, 'no page errors', p.errs);
  await ctx.close();

  console.log('switches for testing');
  ctx = await b.newContext({ viewport: { width: 1024, height: 768 } });
  p = await open(ctx, q('noanalytics'));
  g = await geo(p); await stroke(p, ramp(g.T, 16));
  await p.waitForFunction(() => INKLINE.title.tutDone, null, { timeout: 8000 });
  await p.goto(q('noanalytics&tutorial')); await p.waitForFunction(() => window.INKLINE && INKLINE.title);
  check(await p.evaluate(() => INKLINE.title.phase) === 'tutorial', '?tutorial plays it even when done');
  await p.goto(q('noanalytics&fresh')); await p.waitForFunction(() => window.INKLINE && INKLINE.title);
  check(await p.evaluate(() => INKLINE.title.phase === 'tutorial' && !INKLINE.title.tutDone), '?fresh forgets it: a first visit again');
  await ctx.close();

  require('fs').writeFileSync(path.join(require('os').tmpdir(), 'inkline-tutorial-hint.png'), shot1);
  await b.close();
  console.log(fails ? fails + ' FAILED' : 'all passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
