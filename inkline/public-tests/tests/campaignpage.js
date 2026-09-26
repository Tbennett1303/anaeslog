/* The campaign page: one world open.
 *
 * The world with the next page to finish is open as a big card with its
 * three pages and one big PLAY; the others are folded to tabs. A tab of an
 * open world opens it; a locked one does not. PLAY plays the next page (or,
 * with all three home, the one with most to gain); ← → pick another page,
 * ↑ ↓ another world, Enter plays, L the leaderboards.
 *
 *   node tests/campaignpage.js            (opens public/index.html from disk)
 */
'use strict';
const path = require('path');
const { chromium } = require('playwright');
let fails = 0;
const check = (ok, what, info) => { console.log((ok ? '  ok   ' : '  FAIL ') + what + (info === undefined ? '' : '  ' + JSON.stringify(info))); if (!ok) fails++; };
const URL = 'file://' + path.resolve(__dirname, '../public/index.html') + '?noanalytics';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  for (const [w, h] of [[1280, 720], [390, 844], [844, 390]]) {
    console.log(w + '×' + h);
    const ctx = await b.newContext({ viewport: { width: w, height: h } });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    await p.goto(URL);
    await p.waitForFunction(() => window.INKLINE && INKLINE.title);
    const tap = async (bx) => { const v = await p.evaluate(() => INKLINE.view()); await p.mouse.click((bx.x0 + bx.x1) / 2 * v.scale, (bx.y0 + bx.y1) / 2 * v.scale); };
    const boxes = () => p.evaluate(() => INKLINE.campaign.boxes());
    await p.evaluate(() => {
      INKLINE.progress.clear(); INKLINE.mastery.clear();
      [['notebook-1', 0.62], ['notebook-2', 0.41], ['notebook-3', 0.55], ['blueprint-1', 0.3]].forEach((a) => INKLINE.progress.win(a[0], a[1], 30));
      INKLINE.mastery.check(); INKLINE.worlds().forEach((wd) => { if (INKLINE.mastery.isOpen(wd)) INKLINE.mastery.markShown(wd); });
      INKLINE.campaign.enter(true);
    });
    await p.waitForTimeout(400);
    let bx = await boxes();
    check(await p.evaluate(() => INKLINE.campaign.open) === 'blueprint', 'the world with the next page is open', await p.evaluate(() => INKLINE.campaign.open));
    check(bx.playId === 'blueprint-2' && !!bx.play, 'its big PLAY is for the next page, Blueprint 2', bx.playId);
    check(bx.tabs.length === 4 && bx.tabs.every((t) => t.id !== 'blueprint'), 'the other four worlds are folded to tabs', bx.tabs.map((t) => t.id));
    const marks = await p.evaluate(() => INKLINE.campaign.marks());
    check(marks.length === 3 && marks.every((m) => m.y > bx.play.y0 - 400 && m.y < bx.play.y0), 'three pages drawn on the open card, above PLAY', marks.map((m) => m.id));
    const ov = bx.tabs.some((t) => t.box.y0 < bx.play.y1 && t.box.y1 > bx.play.y0);
    check(!ov && bx.board.y0 >= Math.max(...bx.tabs.map((t) => t.box.y1)) - 1, 'tabs, card and LEADERBOARDS do not overlap');

    // a locked tab does nothing; an open one opens its world
    await tap(bx.tabs.find((t) => t.id === 'crayon').box);
    check(await p.evaluate(() => INKLINE.campaign.open) === 'blueprint', 'a locked world’s tab does not open');
    await tap(bx.tabs.find((t) => t.id === 'notebook').box);
    await p.waitForTimeout(100);
    bx = await boxes();
    check(await p.evaluate(() => INKLINE.campaign.open) === 'notebook' && bx.playId === 'notebook-2', 'Notebook’s tab opens Notebook; with all home, PLAY offers the page with most to gain', bx.playId);

    // keys
    await p.keyboard.press('ArrowDown'); await p.waitForTimeout(50);
    check(await p.evaluate(() => INKLINE.campaign.open) === 'blueprint', '↓ opens the next open world');
    await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(50);
    check((await boxes()).playId === 'blueprint-1', '← moves PLAY to the page before', (await boxes()).playId);
    await p.keyboard.press('ArrowRight'); await p.waitForTimeout(50);
    check((await boxes()).playId === 'blueprint-2', '→ back again (a locked page is skipped)', (await boxes()).playId);
    await p.keyboard.press('l');
    check(await p.evaluate(() => INKLINE.scene()) === 'leaderboard', 'L opens the leaderboards');
    await p.keyboard.press('Escape'); await p.waitForTimeout(150);

    // PLAY
    bx = await boxes();
    await tap(bx.play);
    await p.waitForFunction(() => INKLINE.scene() === 'play', null, { timeout: 3000 });
    check(await p.evaluate(() => INKLINE.levelInfo().id) === 'blueprint-2', 'PLAY plays it');
    check(!errs.length, 'no page errors', errs);
    await ctx.close();
  }
  await b.close();
  console.log(fails ? fails + ' FAILED' : 'all passed');
  process.exit(fails ? 1 : 0);
})();
