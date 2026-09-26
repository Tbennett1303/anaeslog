/* The music: silent until Inky splats on the front page, then "The Inkwell"
 * loops under everything. Its own switch in SETTINGS, remembered; the sound
 * effects switch leaves it alone; a hidden tab pauses it.
 *
 *   node tests/music.js            BASE=http://127.0.0.1:5000/ by default
 */
'use strict';
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:5000/';
let fails = 0;
const check = (ok, what, info) => { console.log((ok ? '  ok   ' : '  FAIL ') + what + (info === undefined ? '' : '  ' + JSON.stringify(info))); if (!ok) fails++; };

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.addInitScript(() => { try { localStorage.setItem('inkline.introSeen', '1'); localStorage.setItem('inkline.tutorialDone', '1'); } catch (e) {} });
  await p.goto(BASE + '?noanalytics');
  await p.waitForFunction(() => window.INKLINE && INKLINE.music);
  const m = () => p.evaluate(() => INKLINE.music.state());

  const before = await p.evaluate(() => ({ splat: INKLINE.title.splatT, m: INKLINE.music.state() }));
  check(before.splat < 0 && !before.m.wanted && !before.m.started, 'nothing plays before the splat', before.m);
  await p.waitForFunction(() => INKLINE.music.state().ready, null, { timeout: 8000 });
  check(true, 'the piece is fetched and decoded while the opening plays');
  await p.waitForFunction(() => INKLINE.title.splatT >= 0, null, { timeout: 8000 });
  await p.waitForTimeout(400);
  let s = await m();
  check(s.wanted && s.started && s.ctx === 'running' && s.gain > 0.3, 'Inky splats: the music starts', s);
  check(s.duration > 80 && s.duration < 90, 'it is The Inkwell (84 s), looping', { duration: s.duration });
  const node = await p.evaluate(() => INKLINE.music.state().started);

  // through the modes, it keeps going: never restarted
  await p.evaluate(() => INKLINE.mode('endless', 7)); await p.waitForTimeout(300);
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  s = await m();
  check(node && s.started && s.ctx === 'running' && s.gain > 0.3, 'it plays on through a run and back home', s);

  // SETTINGS › MUSIC
  await p.evaluate(() => INKLINE.settings.enter()); await p.waitForTimeout(700);
  const box = await p.evaluate(() => { const b = INKLINE.settings.boxes().music, v = INKLINE.view(); return b && { x: (b.x0 + 60) * v.scale, y: (b.y0 + b.y1) / 2 * v.scale }; });
  check(!!box, 'SETTINGS has a MUSIC switch');
  await p.mouse.click(box.x, box.y); await p.waitForTimeout(600);
  s = await m();
  const stored = await p.evaluate(() => localStorage.getItem('inkline.music'));
  check(!s.on && s.ctx === 'suspended' && stored === '0', 'MUSIC off: it fades and stops, and that is remembered', { s, stored });
  await p.mouse.click(box.x, box.y); await p.waitForTimeout(600);
  s = await m();
  check(s.on && s.ctx === 'running' && s.gain > 0.3, 'MUSIC on: it carries on', s);

  // the effects switch is not the music switch
  await p.evaluate(() => INKLINE.sound.toggle()); await p.waitForTimeout(300);
  s = await m();
  check(!(await p.evaluate(() => INKLINE.sound.on)) && s.ctx === 'running' && s.gain > 0.3, 'SOUND off leaves the music playing', s);
  await p.evaluate(() => INKLINE.sound.toggle());

  // a hidden tab pauses it; back, it resumes
  await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
  await p.waitForTimeout(600);
  s = await m();
  check(s.ctx === 'suspended', 'a hidden tab pauses the music', s);
  await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
  await p.waitForTimeout(400);
  s = await m();
  check(s.ctx === 'running' && s.gain > 0.3, 'and resumes when it comes back', s);

  // switched off, a new visit does not even fetch it
  await p.evaluate(() => localStorage.setItem('inkline.music', '0'));
  let fetched = false;
  p.on('request', (r) => { if (/the-inkwell\.mp3/.test(r.url())) fetched = true; });
  await p.reload(); await p.waitForFunction(() => window.INKLINE && INKLINE.title.splatT >= 0, null, { timeout: 8000 });
  await p.waitForTimeout(1500);
  s = await m();
  check(!s.on && !s.started && !fetched, 'with MUSIC off, a new visit stays silent and does not download it', { s, fetched });

  check(!errs.length, 'no page errors', errs);

  /* a tablet, with iOS's rule: a context may start only inside a gesture the
     browser honours, and on a touch screen that is the finger lifting */
  const tc = await b.newContext({ viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: true });
  await tc.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await tc.addInitScript(() => {
    const AC = window.AudioContext;
    window.__ctxs = [];
    const HONOURED = { pointerup: 1, touchend: 1, click: 1, keydown: 1, mousedown: 1 };
    window.AudioContext = class extends AC {
      constructor(o) { super(o); this.__ok = false; window.__ctxs.push(this); }
      get state() { return this.__ok ? 'running' : 'suspended'; }
      resume() { const ev = window.event; if (ev && (HONOURED[ev.type] || (ev.type === 'pointerdown' && ev.pointerType === 'mouse'))) this.__ok = true; return super.resume(); }
    };
  });
  const tp = await tc.newPage();
  const terrs = []; tp.on('pageerror', (e) => terrs.push(e.message));
  await tp.goto(BASE + '?noanalytics&fresh');
  await tp.waitForFunction(() => window.INKLINE && INKLINE.title.phase === 'tutorial');
  await tp.waitForTimeout(1500);                                  // both contexts built while Inky lands
  const cdp = await tc.newCDPSession(tp);
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  await touch('touchStart', 300, 700); await touch('touchMove', 340, 690);
  const down = await tp.evaluate(() => window.__ctxs.map((c) => c.__ok));
  check(down.length === 2 && down.every((v) => !v), 'tablet: a finger landing cannot start audio (as on iOS)', down);
  await touch('touchEnd', 340, 690);
  await tp.waitForTimeout(100);
  const up = await tp.evaluate(() => window.__ctxs.map((c) => c.__ok));
  check(up.length === 2 && up.every(Boolean), 'the finger lifting starts both the sound and the music contexts', up);
  check(!terrs.length, 'no page errors on the tablet', terrs);
  await tc.close();
  await b.close();
  console.log(fails ? fails + ' FAILED' : 'all passed');
  process.exit(fails ? 1 : 0);
})();
