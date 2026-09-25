/* The end of a run: one card, one obvious way on.
 *
 * After a splat or a finish the corner notes go and the card offers boxed
 * choices: a big one for the obvious next step, smaller ones beside it. Every
 * box is pressed here and must do what it says; Space/Enter is the big box;
 * after a splat a tap off the card is TRY AGAIN, after a finish it is nothing.
 *
 *   node tests/endcard.js            (opens public/index.html from disk)
 */
'use strict';
const path = require('path');
const { chromium } = require('playwright');
let fails = 0;
const check = (ok, what, info) => { console.log((ok ? '  ok   ' : '  FAIL ') + what + (info === undefined ? '' : '  ' + JSON.stringify(info))); if (!ok) fails++; };
const URL = 'file://' + path.resolve(__dirname, '../public/index.html') + '?noanalytics&all';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  for (const [w, h] of [[1280, 720], [390, 844]]) {
    console.log(w + '×' + h);
    const ctx = await b.newContext({ viewport: { width: w, height: h } });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    await p.goto(URL);
    await p.waitForFunction(() => window.INKLINE && INKLINE.title);
    const st = () => p.evaluate(() => INKLINE.state());
    const card = () => p.evaluate(() => INKLINE.endButtons());
    const press = async (key) => {
      const c = await card(), v = await p.evaluate(() => INKLINE.view());
      const bx = c.boxes[key];
      await p.mouse.click((bx.x0 + bx.x1) / 2 * v.scale, (bx.y0 + bx.y1) / 2 * v.scale);
    };
    const die = () => p.evaluate(() => { const G = INKLINE.levelInfo().ground; INKLINE.place(INKLINE.state().x + 40, G + 260, 0, 400); });
    const win = () => p.evaluate(() => { const G = INKLINE.levelInfo().ground; INKLINE.place(INKLINE.levelInfo().finish - 30, G - 12, 300, 0); });
    const within = (a, c) => a.x0 >= c.x0 && a.x1 <= c.x1;
    const primaryBig = (c) => { const P = c.boxes[c.primary]; return Object.keys(c.boxes).every((k) => k === c.primary || (P.x1 - P.x0) * (P.y1 - P.y0) > (c.boxes[k].x1 - c.boxes[k].x0) * (c.boxes[k].y1 - c.boxes[k].y0)); };
    const overlap = (c) => { const L = Object.values(c.boxes); return L.some((a, i) => L.some((q, j) => i !== j && a.x0 < q.x1 && q.x0 < a.x1 && a.y0 < q.y1 && q.y0 < a.y1)); };

    // a splat on a campaign page
    await p.evaluate(() => INKLINE.level('notebook-1'));
    await die();
    await p.waitForFunction(() => INKLINE.state().state === 'dead' && INKLINE.endButtons());
    let c = await card();
    check(c.primary === 'again' && !!c.boxes.again && !!c.boxes.pages && Object.keys(c.boxes).length === 2, 'splat: a big TRY AGAIN box and a ‹ PAGES box', Object.keys(c.boxes));
    check(primaryBig(c) && !overlap(c), 'the big box is the biggest, and no box overlaps another');
    await p.mouse.click(8, h - 8);
    let s1 = await st();
    check(s1.state === 'play' && s1.progress < 0.1, 'a tap off the card is TRY AGAIN, at once', { state: s1.state, progress: s1.progress });
    await die(); await p.waitForFunction(() => INKLINE.state().state === 'dead' && INKLINE.endButtons());
    await press('again');
    s1 = await st();
    check(s1.state === 'play' && s1.progress < 0.1, 'TRY AGAIN tries again', { state: s1.state, progress: s1.progress });
    await die(); await p.waitForFunction(() => INKLINE.state().state === 'dead' && INKLINE.endButtons());
    await p.keyboard.press('Space');
    check((await st()).state === 'play', 'Space is the big box');
    await die(); await p.waitForFunction(() => INKLINE.state().state === 'dead' && INKLINE.endButtons());
    await press('pages');
    check(await p.evaluate(() => INKLINE.scene()) === 'campaign', '‹ PAGES goes to the campaign pages');

    // home on a campaign page
    await p.evaluate(() => INKLINE.level('notebook-1'));
    await win();
    await p.waitForFunction(() => INKLINE.state().state === 'win' && INKLINE.endButtons(), null, { timeout: 8000 });
    await p.waitForTimeout(300);
    c = await card();
    check(c.primary === 'next' && ['again', 'replay', 'board'].every((k) => c.boxes[k]), 'home: a big NEXT PAGE box, then TRY AGAIN, REPLAY, LEADERBOARD', Object.keys(c.boxes));
    check(primaryBig(c) && !overlap(c), 'the big box is the biggest, and no box overlaps another');
    await p.mouse.click(8, h - 8); await p.waitForTimeout(100);
    check((await st()).state === 'win', 'a tap off the card does nothing: the choice is on it');
    await press('again');
    check((await st()).state === 'play' && await p.evaluate(() => INKLINE.state().progress) < 0.2, 'TRY AGAIN plays the page again');
    await win(); await p.waitForFunction(() => INKLINE.state().state === 'win' && INKLINE.endButtons(), null, { timeout: 8000 });
    await p.waitForTimeout(300);
    await press('replay');
    check((await st()).state === 'replay', 'REPLAY plays the run back');
    await p.evaluate(() => INKLINE.level('notebook-1'));
    await win(); await p.waitForFunction(() => INKLINE.state().state === 'win' && INKLINE.endButtons(), null, { timeout: 8000 });
    await p.waitForTimeout(300);
    await press('board');
    check(await p.evaluate(() => INKLINE.scene()) === 'leaderboard', 'LEADERBOARD opens the page’s board');
    await p.keyboard.press('Escape');
    await p.waitForTimeout(300);
    await p.keyboard.press('Enter');
    check(await p.evaluate(() => INKLINE.levelId) !== undefined && (await st()).state === 'play' && await p.evaluate(() => INKLINE.levelInfo().id) === 'notebook-2', 'Enter is the big box: NEXT PAGE', await p.evaluate(() => INKLINE.levelInfo().id));
    await p.evaluate(() => INKLINE.level('notebook-1'));
    await win(); await p.waitForFunction(() => INKLINE.state().state === 'win' && INKLINE.endButtons(), null, { timeout: 8000 });
    await p.waitForTimeout(300);
    await press('next');
    check(await p.evaluate(() => INKLINE.levelInfo().id) === 'notebook-2', 'NEXT PAGE opens the next page');

    // the last page of the campaign has no next: the big box goes back to the pages
    const last = await p.evaluate(() => { const W = INKLINE.worlds(); const w = W[W.length - 1]; return w.levels[w.levels.length - 1]; });
    const lastBox = await p.evaluate((id) => INKLINE.nextLevel(id), last);
    check(lastBox === null || lastBox === undefined, 'the last page has no next page (the big box is BACK TO THE PAGES)');

    // Endless
    await p.evaluate(() => INKLINE.mode('endless', 5));
    await p.waitForTimeout(200);
    await die();
    await p.waitForFunction(() => INKLINE.state().state === 'dead' && INKLINE.endButtons());
    await p.waitForTimeout(250);
    c = await card();
    check(c.primary === 'again' && c.boxes.home && c.boxes.zen, 'Endless: TRY AGAIN, then HOME and ZEN MODE', Object.keys(c.boxes));
    await press('zen');
    check((await st()).mode === 'zen', 'ZEN MODE opens Zen');
    await p.evaluate(() => INKLINE.mode('endless', 6));
    await p.waitForTimeout(200);
    await die(); await p.waitForFunction(() => INKLINE.state().state === 'dead' && INKLINE.endButtons());
    await p.waitForTimeout(250);
    await press('home');
    check(await p.evaluate(() => INKLINE.scene()) === 'title', 'HOME goes home');

    // Daily
    await p.evaluate(() => INKLINE.mode('daily'));
    await p.waitForTimeout(200);
    await die(); await p.waitForFunction(() => INKLINE.state().state === 'dead' && INKLINE.endButtons());
    await p.waitForTimeout(250);
    c = await card();
    check(c.primary === 'again' && c.boxes.board && c.boxes.home, 'Daily: TRY AGAIN, then TODAY’S BOARD and HOME', Object.keys(c.boxes));
    await press('board');
    check(await p.evaluate(() => INKLINE.scene()) === 'daily', 'TODAY’S BOARD opens the Daily page');

    check(!errs.length, 'no page errors', errs);
    await ctx.close();
  }
  await b.close();
  console.log(fails ? fails + ' FAILED' : 'all passed');
  process.exit(fails ? 1 : 0);
})();
