/* The Daily's paper changes every day, in a random order: each run of five
 * days is a fresh shuffle of the five papers, and no two days in a row share
 * a paper. The same day always gives the same paper (it is everyone's page).
 *
 *   node tests/papers.js            (opens public/index.html from disk)
 */
'use strict';
const path = require('path');
const { chromium } = require('playwright');
let fails = 0;
const check = (ok, what, info) => { console.log((ok ? '  ok   ' : '  FAIL ') + what + (info === undefined ? '' : '  ' + JSON.stringify(info))); if (!ok) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await b.newPage();
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.goto('file://' + path.resolve(__dirname, '../public/index.html') + '?noanalytics');
  await p.waitForFunction(() => window.INKLINE && INKLINE.dailyPaper);
  const days = await p.evaluate(() => {
    const out = [], t0 = Date.parse('2026-01-01T00:00:00Z');
    for (let i = 0; i < 730; i++) { const d = new Date(t0 + i * 864e5).toISOString().slice(0, 10); out.push([d, INKLINE.dailyPaper(d)]); }
    return out;
  });
  const P = ['notebook', 'blueprint', 'highlighter', 'scratch', 'crayon'];
  check(days.every((d) => P.includes(d[1])), 'every day is on one of the five papers');
  const rep = days.filter((d, i) => i && d[1] === days[i - 1][1]).map((d) => d[0]);
  check(!rep.length, 'no two days in a row share a paper (two years checked)', rep.slice(0, 3));
  const n0 = Math.floor(Date.parse('2026-01-01T00:00:00Z') / 864e5), start = (5 - (n0 % 5)) % 5;
  let whole = true;
  for (let i = start; i + 5 <= days.length; i += 5) if (new Set(days.slice(i, i + 5).map((d) => d[1])).size !== 5) whole = false;
  check(whole, 'each run of five days has all five papers');
  const order = days.slice(start, start + 25).map((d) => d[1]).join(' ');
  check(new Set(Array.from({ length: 5 }, (_, k) => days.slice(start + k * 5, start + k * 5 + 5).map((d) => d[1]).join())).size > 1, 'and the order changes from run to run (it is random, not a cycle)', order);
  const again = await p.evaluate(() => INKLINE.dailyPaper('2026-09-26'));
  check(again === days.find((d) => d[0] === '2026-09-26')[1], 'the same day always gives the same paper', again);
  await p.evaluate(() => { INKLINE.setNow(Date.parse('2026-09-27T09:00:00Z')); INKLINE.mode('daily'); });
  const run = await p.evaluate(() => ({ world: INKLINE.levelInfo().world, paper: INKLINE.dailyPaper('2026-09-27') }));
  check(run.world === run.paper, 'the Daily run is drawn on its day\u2019s paper', run);
  await p.evaluate(() => INKLINE.daily.enter());
  const page = await p.evaluate(() => INKLINE.levelInfo().theme);
  check(page === run.paper, 'and so is the Daily page', page);
  await b.close();
  console.log(fails ? fails + ' FAILED' : 'all passed');
  process.exit(fails ? 1 : 0);
})();
