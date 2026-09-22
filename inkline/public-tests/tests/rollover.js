/* Midnight UTC, from the player's side (the client clock is moved; the
 * server's is real, so "today" below is the server's today):
 *   - a run started at 23:59:58 is on that day's course and is submitted for
 *     that day even though it ends after midnight;
 *   - the retry after midnight is tomorrow's course, with a fresh daily record;
 *   - the Daily page and the front page turn over on their own.
 *   node tests/rollover.js      (emulators running; BASE as for flow.js)
 */
const { chromium } = require('playwright');
const G = require('../public/gen.js');
const BASE = process.env.BASE || 'http://127.0.0.1:5000/';
const CH = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let fails = 0;
const check = (ok, msg, x) => { console.log((ok ? '  ok   ' : '  FAIL ') + msg + (x !== undefined ? '  ' + JSON.stringify(x) : '')); if (!ok) fails++; };

(async () => {
  const b = await chromium.launch({ executablePath: CH });
  const p = await b.newPage({ viewport: { width: 1024, height: 768 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.goto(BASE);
  await p.waitForFunction(() => window.INKLINE && INKLINE.title);
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.parse(today + 'T12:00:00Z') + 86400000).toISOString().slice(0, 10);
  const late = Date.parse(today + 'T23:59:58Z'), after = Date.parse(tomorrow + 'T00:00:07Z');

  await p.evaluate((t) => INKLINE.setNow(t), late);
  await p.evaluate(() => INKLINE.daily.enter());
  check(await p.evaluate(() => INKLINE.daily.day) === today, 'at 23:59:58 the Daily page is today\'s');
  await p.evaluate(() => INKLINE.mode('daily'));
  let c = await p.evaluate(() => ({ day: INKLINE.course().day, seed: INKLINE.course().seed }));
  check(c.day === today && c.seed === G.dailySeed(today), 'the run starts on today\'s course', c);

  // midnight passes mid-run
  await p.evaluate((t) => INKLINE.setNow(t), after);
  await p.evaluate(() => {
    INKLINE.freeze(true);
    const C = INKLINE.course(), Gd = INKLINE.levelInfo().ground; let k = 0, st = INKLINE.state();
    while (st.state === 'play' && st.t < 300) {
      while (st.x < 2600 && k < C.refs.length && st.x >= C.refs[k].at) INKLINE.paint(C.refs[k++].pts.map((q) => ({ x: q[0], y: Gd - q[1] })));
      INKLINE.tick(1 / 60, 3); st = INKLINE.state();
    }
    INKLINE.freeze(false);
  });
  await p.waitForFunction(() => INKLINE.state().result && INKLINE.state().result.net !== 'sending', null, { timeout: 12000 });
  const r = (await p.evaluate(() => INKLINE.state().result));
  check(r.net === 'ok', 'ending after midnight, it is still counted for the day it started', { net: r.net, rank: r.rank });
  const ev = await p.evaluate(() => INKLINE.analytics.events().filter((e) => e.e === 'dr').pop());
  check(ev && ev.day === today, 'and reported for that day', ev && ev.day);

  // retry: tomorrow
  await p.waitForTimeout(250);
  await p.mouse.click(512, 700);
  await p.waitForFunction(() => INKLINE.state().state === 'play', null, { timeout: 2000 });
  c = await p.evaluate(() => ({ day: INKLINE.course().day, seed: INKLINE.course().seed, att: INKLINE.state().attempt }));
  check(c.day === tomorrow && c.seed === G.dailySeed(tomorrow) && c.att === 1, 'the retry after midnight is tomorrow\'s course, attempt 1', c);
  const rec = await p.evaluate((d) => INKLINE.records.daily(d), tomorrow);
  check(rec.best === null && rec.day === tomorrow, 'tomorrow\'s record starts clean');

  // the Daily page turns over while open
  await p.evaluate((t) => INKLINE.setNow(t), late);
  await p.evaluate(() => INKLINE.daily.enter());
  await p.waitForTimeout(200);
  check(await p.evaluate(() => INKLINE.daily.day) === today, 'page open before midnight shows today');
  await p.evaluate((t) => INKLINE.setNow(t), after);
  await p.waitForFunction((d) => INKLINE.daily.day === d, tomorrow, { timeout: 3000 }).catch(() => {});
  check(await p.evaluate(() => INKLINE.daily.day) === tomorrow, '…and turns to tomorrow on its own at midnight');
  await p.evaluate(() => INKLINE.setNow(null));
  check(!errs.length, 'no page errors', errs.slice(0, 3));
  await b.close();
  console.log(fails ? fails + ' FAILED' : 'all passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
