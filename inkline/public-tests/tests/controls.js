/* The controls in a run, PAUSE, and the volume sliders.
 *
 * Top left in every run: a boxed back button, RESTART (↻) and PAUSE (❚❚).
 * RESTART puts the same course back at its beginning. PAUSE holds everything
 * still under a wash with one big ▶ to carry on, RESTART and the way back
 * beneath it. SETTINGS has a slider each for SOUND and MUSIC.
 *
 *   node tests/controls.js            (opens public/index.html from disk)
 */
'use strict';
const path = require('path');
const { chromium } = require('playwright');
let fails = 0;
const check = (ok, what, info) => { console.log((ok ? '  ok   ' : '  FAIL ') + what + (info === undefined ? '' : '  ' + JSON.stringify(info))); if (!ok) fails++; };
const URL = 'file://' + path.resolve(__dirname, '../public/index.html') + '?noanalytics&all';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  for (const [w, h, touch] of [[1280, 720, false], [390, 844, true]]) {
    console.log(w + '×' + h);
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    await p.goto(URL);
    await p.waitForFunction(() => window.INKLINE && INKLINE.title);
    const st = () => p.evaluate(() => INKLINE.state());
    const tap = async (bx) => {
      const v = await p.evaluate(() => INKLINE.view()), x = (bx.x0 + bx.x1) / 2 * v.scale, y = (bx.y0 + bx.y1) / 2 * v.scale;
      if (touch) await p.touchscreen.tap(x, y); else await p.mouse.click(x, y);
    };
    const ctl = () => p.evaluate(() => INKLINE.controls());
    const scale = (await p.evaluate(() => INKLINE.view())).scale;

    // a campaign page: the three controls
    await p.evaluate(() => INKLINE.level('notebook-1'));
    await p.waitForTimeout(250);
    let c = await ctl();
    check(c.back && c.restart && c.pause, 'a run shows ‹ back, RESTART and PAUSE, top left');
    check((c.back.y1 - c.back.y0) * scale >= 30 && (c.restart.x1 - c.restart.x0) * scale >= 30, 'each at least a fingertip across on screen', { back: Math.round((c.back.y1 - c.back.y0) * scale), icon: Math.round((c.restart.x1 - c.restart.x0) * scale) });
    check(c.back.x1 <= c.restart.x0 && c.restart.x1 <= c.pause.x0 && Math.abs(c.back.y0 - c.pause.y0) < 1, 'in a row: back, restart, pause');

    // let Inky run on a drawn line, then PAUSE
    await p.evaluate(() => { const G = INKLINE.levelInfo().ground; const pts = []; for (let q = 60; q < 1400; q += 10) pts.push({ x: q, y: G - 1 }); INKLINE.paint(pts); });
    await p.waitForFunction(() => INKLINE.state().x > 350, null, { timeout: 8000 });
    await tap(c.pause);
    await p.waitForTimeout(80);
    check(await p.evaluate(() => INKLINE.paused()), 'PAUSE pauses');
    const a = await st(); await p.waitForTimeout(700); const a2 = await st();
    check(a.x === a2.x && a.t === a2.t && a.camX === a2.camX, 'paused, nothing moves: not Inky, not the page, not the clock', { x: [a.x, a2.x], t: [a.t, a2.t] });
    c = await ctl();
    check(c.overlay && c.overlay.resume && c.overlay.restart && c.overlay.back, 'the pause page: a big ▶, RESTART and ‹ back');
    const R = c.overlay.resume, RS = c.overlay.restart;
    check((R.x1 - R.x0) * (R.y1 - R.y0) > 2 * (RS.x1 - RS.x0) * (RS.y1 - RS.y0), 'the ▶ is the big one');
    await tap(c.overlay.resume);
    await p.waitForTimeout(250);
    check(!(await p.evaluate(() => INKLINE.paused())) && (await st()).x > a2.x, 'the big ▶ carries on from where he was', { x: (await st()).x });
    if (!touch) {
      await p.keyboard.press('p'); check(await p.evaluate(() => INKLINE.paused()), 'P pauses');
      await p.keyboard.press(' '); check(!(await p.evaluate(() => INKLINE.paused())), 'Space carries on');
      await p.keyboard.press(' '); check(await p.evaluate(() => INKLINE.paused()), 'Space pauses a run');
      await p.keyboard.press('Enter'); check(!(await p.evaluate(() => INKLINE.paused())), 'Enter carries on');
    }
    check(await p.evaluate(() => INKLINE.keysShown()) === !touch, touch ? 'on a touch screen: no key caps' : 'on a computer: key caps on the controls');
    // RESTART from the corner
    await p.waitForTimeout(200);
    const before = await st();
    c = await ctl();
    await tap(c.restart);
    await p.waitForTimeout(80);
    const after = await st();
    check(after.state === 'play' && after.x < 200 && after.strokes === 0 && after.t < 0.3, 'RESTART puts the page back at its beginning, lines gone', { was: Math.round(before.x), now: Math.round(after.x) });
    // RESTART from the pause page
    await p.evaluate(() => { const G = INKLINE.levelInfo().ground; const pts = []; for (let q = 60; q < 1400; q += 10) pts.push({ x: q, y: G - 1 }); INKLINE.paint(pts); });
    await p.waitForFunction(() => INKLINE.state().x > 300, null, { timeout: 8000 });
    await p.evaluate(() => INKLINE.pause()); await p.waitForTimeout(100);
    await tap((await ctl()).overlay.restart); await p.waitForTimeout(80);
    check(!(await p.evaluate(() => INKLINE.paused())) && (await st()).x < 200, 'and so does RESTART on the pause page');
    // back from the pause page
    await p.evaluate(() => INKLINE.pause()); await p.waitForTimeout(100);
    await tap((await ctl()).overlay.back); await p.waitForTimeout(150);
    check(await p.evaluate(() => INKLINE.scene()) === 'campaign', '‹ PAGES on the pause page goes to the pages');

    // Endless: RESTART is the same course, from the start
    await p.evaluate(() => INKLINE.mode('endless', 4242)); await p.waitForTimeout(150);
    const seed0 = await p.evaluate(() => INKLINE.course().seed);
    await tap((await ctl()).restart); await p.waitForTimeout(100);
    check(await p.evaluate(() => INKLINE.course().seed) === seed0, 'in Endless, RESTART keeps the same course', seed0);

    // a hidden tab pauses a run under way
    await p.evaluate(() => { const G = INKLINE.levelInfo().ground; INKLINE.paint([{ x: 300, y: G - 1 }, { x: 420, y: G - 1 }]); });
    await p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
    check(await p.evaluate(() => INKLINE.paused()), 'leaving the tab pauses the run');
    await p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')); INKLINE.resume(); });

    // SETTINGS: the sliders
    await p.evaluate(() => INKLINE.settings.enter()); await p.waitForTimeout(700);
    const sl = await p.evaluate(() => INKLINE.settings.sliders()), bx = await p.evaluate(() => INKLINE.settings.boxes());
    check(sl.sound && sl.music, 'SETTINGS has a SOUND slider and a MUSIC slider');
    const v = await p.evaluate(() => INKLINE.view());
    const at = (k, f) => ({ x: (sl[k].sx0 + (sl[k].sx1 - sl[k].sx0) * f) * v.scale, y: (bx[k].y0 + bx[k].y1) / 2 * v.scale });
    const drag = async (k, f0, f1) => {
      const s0 = at(k, f0), s1 = at(k, f1);
      if (touch) { const e = at(k, Math.max(0, Math.min(1, f1))); await p.touchscreen.tap(e.x, e.y); return; }
      await p.mouse.move(s0.x, s0.y); await p.mouse.down();
      for (let i = 1; i <= 8; i++) await p.mouse.move(s0.x + (s1.x - s0.x) * i / 8, s0.y);
      await p.mouse.up();
    };
    await drag('sound', 1, 0.4);
    let vol = await p.evaluate(() => [INKLINE.sound.volume, INKLINE.sound.on, localStorage.getItem('inkline.sound.vol')]);
    check(Math.abs(vol[0] - 0.4) < 0.06 && vol[1] && vol[2] !== null, 'the SOUND slider sets how loud (and remembers it)', vol);
    await drag('music', 1, 0.25);
    vol = await p.evaluate(() => [INKLINE.music.volume, INKLINE.music.on, localStorage.getItem('inkline.music.vol')]);
    check(Math.abs(vol[0] - 0.25) < 0.06 && vol[1] && vol[2] !== null, 'the MUSIC slider sets how loud (and remembers it)', vol);
    await drag('music', 0.25, -0.2);
    vol = await p.evaluate(() => [INKLINE.music.volume, INKLINE.music.on]);
    check(vol[0] === 0 && !vol[1], 'all the way down is off', vol);
    await drag('music', 0, 0.8);
    vol = await p.evaluate(() => [INKLINE.music.volume, INKLINE.music.on]);
    check(Math.abs(vol[0] - 0.8) < 0.06 && vol[1], 'and back up is on again', vol);
    const lab = { x0: bx.sound.x0 + 10, x1: bx.sound.x0 + 60, y0: bx.sound.y0, y1: bx.sound.y1 };
    await tap(lab);
    vol = await p.evaluate(() => [INKLINE.sound.volume, INKLINE.sound.on]);
    check(!vol[1] && Math.abs(vol[0] - 0.4) < 0.06, 'tapping the word SOUND switches it off, keeping the level', vol);
    await tap(lab);
    check(await p.evaluate(() => INKLINE.sound.on), 'and on again');

    if (!touch) {                                  // the letters on the HOME! card
      await p.evaluate(() => { INKLINE.level('notebook-1'); const G = INKLINE.levelInfo().ground; INKLINE.place(INKLINE.levelInfo().finish - 30, G - 12, 300, 0); });
      await p.waitForFunction(() => INKLINE.state().state === 'win' && INKLINE.endButtons(), null, { timeout: 8000 });
      await p.keyboard.press('l');
      check(await p.evaluate(() => INKLINE.scene()) === 'leaderboard', 'L on the HOME! card opens the leaderboard');
      await p.keyboard.press('Escape');
      await p.evaluate(() => INKLINE.mode('endless', 11)); await p.waitForTimeout(100);
      await p.evaluate(() => { const G = INKLINE.levelInfo().ground; INKLINE.place(INKLINE.state().x + 40, G + 260, 0, 400); });
      await p.waitForFunction(() => INKLINE.state().state === 'dead' && INKLINE.endButtons());
      await p.waitForTimeout(250);
      await p.keyboard.press('z');
      check((await st()).mode === 'zen', 'Z on the Endless splat card opens Zen');
    }
    check(!errs.length, 'no page errors', errs);
    await ctx.close();
  }
  await b.close();
  console.log(fails ? fails + ' FAILED' : 'all passed');
  process.exit(fails ? 1 : 0);
})();
