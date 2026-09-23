/* The telemetry dashboard's arithmetic, on a small dataset whose answers are
 * known by hand:  node tests/admin.test.js */
const { chromium } = require('playwright');
const path = require('path');
const CH = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let fails = 0;
const check = (ok, msg, x) => { console.log((ok ? '  ok   ' : '  FAIL ') + msg + (x !== undefined ? '  ' + JSON.stringify(x) : '')); if (!ok) fails++; };
const D0 = Date.parse('2026-09-01T10:00:00Z'), D1 = D0 + 86400000, NOW = Date.now();
const players = [
  { pid: 'a', ev: [
    { e: 's', t: D0, n: 1, dev: 'tablet', in: 'touch' },
    { e: 'tu', t: D0 + 0.1, k: 'start', rp: 0 }, { e: 'tu', t: D0 + 0.2, k: 'fail', n: 1, why: 'fell', drew: 0 },
    { e: 'tu', t: D0 + 0.3, k: 'hint', n: 2 }, { e: 'tu', t: D0 + 0.4, k: 'done', n: 2, fails: 1, hinted: 1, drew: 0, ms: 9000, rp: 0 },
    { e: 'm', t: D0 + 1, m: 'c' },
    { e: 'a', t: D0 + 2, l: 'notebook-1', m: 'c', via: 'menu', n: 1 }, { e: 'd', t: D0 + 1000, l: 'notebook-1', m: 'c', p: 40, n: 1 },
    { e: 'a', t: D0 + 3000, l: 'notebook-1', m: 'c', via: 'retry', n: 2 }, { e: 'w', t: D0 + 23000, l: 'notebook-1', m: 'c', n: 2, i: 50, ms: 20000 },
    { e: 'a', t: D0 + 30000, l: 'notebook-2', m: 'c', via: 'menu', n: 1 }, { e: 'd', t: D0 + 40000, l: 'notebook-2', m: 'c', p: 10, n: 1 },
    { e: 'q', t: D0 + 45000, l: 'notebook-2', m: 'c', st: 'dead', p: 10 }, { e: 'x', t: D0 + 60000, dur: 60000, att: 3 },
    { e: 's', t: D1, n: 2, dev: 'tablet', in: 'touch' },
    { e: 'a', t: D1 + 1, m: 'e', via: 'menu', l: 'endless', n: 1 }, { e: 'd', t: D1 + 9000, m: 'e', dist: 100, ms: 9000, c: 'fell', n: 1 },
    { e: 'a', t: D1 + 12000, m: 'e', via: 'retry', l: 'endless', n: 2 }, { e: 'd', t: D1 + 30000, m: 'e', dist: 200, ms: 18000, c: 'crash', n: 2 },
    { e: 'pb', t: D1 + 30001, m: 'e', k: 'dist', v: 200 }, { e: 'x', t: D1 + 40000, dur: 40000, att: 2 } ] },
  { pid: 'b', ev: [
    { e: 's', t: D0, n: 1, dev: 'phone', in: 'touch' },
    { e: 'tu', t: D0 + 0.1, k: 'start', rp: 0 }, { e: 'tu', t: D0 + 0.5, k: 'done', n: 1, fails: 0, hinted: 0, drew: 1, ms: 5000, rp: 0 },
    { e: 'a', t: D0 + 1, m: 'd', via: 'menu', day: '2026-09-01', l: 'daily:2026-09-01', n: 1 }, { e: 'd', t: D0 + 5000, m: 'd', l: 'daily:2026-09-01', dist: 50, ms: 5000, n: 1 },
    { e: 'a', t: D0 + 9000, m: 'd', via: 'retry', day: '2026-09-01', l: 'daily:2026-09-01', n: 2 }, { e: 'd', t: D0 + 20000, m: 'd', l: 'daily:2026-09-01', dist: 80, ms: 11000, n: 2 },
    { e: 'dr', t: D0 + 20500, day: '2026-09-01', dist: 80, rank: 3, n: 2 },
    { e: 's', t: D1, n: 2, dev: 'phone', in: 'touch' },
    { e: 'a', t: D1 + 1, m: 'd', via: 'menu', day: '2026-09-02', l: 'daily:2026-09-02', n: 1 } ] },
  { pid: 'c', ev: [
    { e: 's', t: NOW, n: 1, dev: 'desktop', in: 'mouse' }, { e: 'tu', t: NOW + 0.1, k: 'skipped' },
    { e: 'a', t: NOW + 1, m: 'z', via: 'menu', l: 'zen', n: 1 }, { e: 'd', t: NOW + 5000, m: 'z', dist: 20, n: 1 } ] },
];

(async () => {
  const b = await chromium.launch({ executablePath: CH });
  const p = await b.newPage();
  await p.goto('file://' + path.resolve(__dirname, '../public/admin/index.html'));
  const a = await p.evaluate((pl) => window.INKTEL.analyse(pl), players);
  check(a.players === 3 && a.sessions === 5, 'players and sessions', { players: a.players, sessions: a.sessions });
  check(a.retry.deaths === 6 && a.retry.immediate === 50, 'immediate retry rate: 3 of 6 deaths (Zen excluded)', a.retry);
  check(a.returns.eligible === 2 && a.returns.d1 === 100, 'D1 return: both day-old players came back', a.returns);
  check(a.modes.c.share === 33.3 && a.modes.e.share === 33.3 && a.modes.d.share === 33.3 && a.modes.z.share === 33.3, 'share of players trying each mode');
  check(a.modes.e.attemptsMedian === 2 && a.modes.d.attemptsMedian === 3, 'attempts per player per mode', { e: a.modes.e.attemptsMedian, d: a.modes.d.attemptsMedian });
  const n1 = a.campaign[0], n2 = a.campaign[1];
  check(n1.started === 1 && n1.completion === 100 && n1.toNext === 100 && n1.attemptsToWin === 2 && n1.inkLeft === 50 && n1.timeToWin === 20,
        'campaign: finish, go on, attempts, ink, time', n1);
  check(n2.started === 1 && n2.completed === 0 && n2.quits === 1 && n2.abandonedReachMedian === 10, 'campaign: where it was abandoned', n2);
  check(a.endless.runs === 2 && a.endless.distMedian === 150 && a.endless.pbs === 1, 'endless: runs, distance, bests', a.endless);
  check(a.dailyReturn.players === 1 && a.dailyReturn.multiDay === 100 && a.dailyReturn.nextDay === 100, 'daily return behaviour', a.dailyReturn);
  const day1 = a.daily.find((d) => d.day === '2026-09-01');
  check(day1 && day1.attempts === 2 && day1.best === 80 && day1.bestRank === 3, 'daily per day: attempts, best, rank', day1);
  check(a.sessionMedian === 20.5, 'session length median over 5 sessions (60, 40, 20.5, 5, 0 s)', a.sessionMedian);
  const T = a.tutorial;
  check(T.started === 2 && T.completion === 100 && T.drewBeforeHint === 50 && T.firstTry === 50 && T.hintShown === 50 && T.attemptsMedian === 1.5 && T.skipped === 1 && T.goOn === 100,
        'first-play opening: started, done, drew before a hint, first try, hint shown, tries, skipped, played on', T);
  check(a.hook.newBestShare === 100 && a.hook.deathsPerPlayer === 2, 'the hook: deaths per player, runs beating the last best', a.hook);
  // and it renders
  await p.evaluate((pl) => window.INKADMIN.ingest(pl), players);
  const txt = await p.evaluate(() => document.getElementById('out').innerText);
  check(/immediate retry/i.test(txt) && /notebook-1/.test(txt) && /Daily challenge/i.test(txt), 'the page renders the tables');
  await b.close();
  console.log(fails ? fails + ' FAILED' : 'all passed');
  process.exit(fails ? 1 : 0);
})();
