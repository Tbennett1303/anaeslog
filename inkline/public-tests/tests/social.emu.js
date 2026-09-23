/* Campaign leaderboards against the emulators: furthest first, then most ink
 * left, then quickest. Real runs are played in the page and sent through the
 * real function; an entry from before progress was ranked is migrated.
 *   firebase emulators:start --only functions,firestore,hosting --project demo-inkline
 *   node tests/social.emu.js */
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const { rankKey } = require('../functions/campaign-verify.js');
const CH = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const API = (process.env.BASE || 'http://127.0.0.1:5000') + '/api/social';
const FS = process.env.FS || 'http://127.0.0.1:8080/v1/projects/demo-inkline/databases/(default)/documents';
const LEVEL = 'notebook-1';

let failed = 0;
const check = (ok, what, extra) => {
  console.log((ok ? '  ok   ' : '  FAIL ') + what + (extra !== undefined ? '  ' + JSON.stringify(extra) : ''));
  if (!ok) failed++;
};
const post = async (body) => { const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return { status: r.status, j: await r.json().catch(() => ({})) }; };
const pid = (n) => (n.toString(16) + 'ab12cd34ef56ab78').slice(0, 16);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  await fetch(FS.replace('/v1/', '/emulator/v1/'), { method: 'DELETE' });
  const sol = JSON.parse(fs.readFileSync(path.join(__dirname, 'solutions/sol-n1.json'), 'utf8'));
  const b = await chromium.launch({ executablePath: CH });
  const p = await b.newPage({ viewport: { width: 1024, height: 768 } });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.goto('file://' + path.resolve(__dirname, '../public/index.html') + '?noanalytics');
  await p.waitForFunction(() => window.INKLINE && INKLINE.title);
  const play = (plan) => p.evaluate(({ level, plan }) => {
    INKLINE.freeze(true); INKLINE.level(level);
    const G = INKLINE.levelInfo().ground;
    let i = 0, s = INKLINE.state();
    for (let f = 0; f < 24000 && s.state === 'play'; f++) {
      while (i < plan.length && s.x >= plan[i].at) { INKLINE.paint(plan[i].pts.map(([x, h]) => ({ x, y: G - h }))); i++; }
      INKLINE.tick(1 / 60, 1); s = INKLINE.state();
    }
    const run = INKLINE.dailyRun(); run.level = level;
    return { state: s.state, ink: s.ink, progress: s.progress, run };
  }, { level: LEVEL, plan });

  const waste = { at: 0, pts: [[300, 150], [560, 150]] };                 // a line in the air: ink spent, nothing gained
  const runs = {
    tidyHome: await play(sol.tidy),
    cautiousHome: await play(sol.cautious),
    cutTidy: await play(sol.tidy.slice(0, -1)),
    cutTidyWaste: await play([waste].concat(sol.tidy.slice(0, -1))),
    early: await play(sol.cautious.slice(0, 3)),
  };
  await b.close();
  const want = { tidyHome: 'win', cautiousHome: 'win', cutTidy: 'dead', cutTidyWaste: 'dead', early: 'dead' };
  for (const k in runs) check(runs[k].state === want[k], k + ' plays to ' + want[k], { progress: Math.round(runs[k].progress * 1000) / 10, ink: Math.round(runs[k].ink * 1000) / 10 });
  check(Math.floor(runs.cutTidy.progress * 100) === Math.floor(runs.cutTidyWaste.progress * 100) && runs.cutTidyWaste.ink < runs.cutTidy.ink,
    'the two cut runs end at the same percent, one with less ink', [runs.cutTidy.progress, runs.cutTidyWaste.progress]);

  // an entry written before progress was ranked (a finish, no progress, no key)
  const oldPid = pid(0x99);
  await fetch(FS + '/testLeaderboardEntries?documentId=' + LEVEL + '_' + oldPid, { method: 'POST', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { levelId: { stringValue: LEVEL }, pid: { stringValue: oldPid }, displayName: { stringValue: 'OLDTIMER' }, ink: { doubleValue: 0.3 }, ms: { integerValue: '20000' } } }) });

  // everyone starts, waits as long as a real run takes, then reports
  const players = { tidyHome: pid(1), cautiousHome: pid(2), cutTidy: pid(3), cutTidyWaste: pid(4), early: pid(5) };
  const tokens = {};
  for (const k in players) tokens[k] = (await post({ op: 'start', level: LEVEL, pid: players[k] })).j.token;
  check(Object.values(tokens).every(Boolean), 'every player gets a run token');
  const longest = Math.max(...Object.values(runs).map((r) => r.run.time));
  await sleep(Math.max(4200, longest * 1000 * 0.65));
  const sent = {};
  for (const k in players) {
    const r = runs[k];
    sent[k] = r.state === 'win'
      ? await post({ op: 'win', level: LEVEL, pid: players[k], token: tokens[k], ink: r.ink, run: r.run })
      : await post({ op: 'death', level: LEVEL, pid: players[k], token: tokens[k], progress: r.progress * 100, ink: r.ink, run: r.run });
    check(sent[k].status === 200 && sent[k].j.ok, k + ' accepted' + (sent[k].j.rank ? ', ranked #' + sent[k].j.rank : ''), sent[k].status === 200 ? undefined : sent[k].j);
  }

  // the board
  const board = (await post({ op: 'board', level: LEVEL, pid: players.cutTidy })).j;
  const expect = Object.keys(runs).map((k) => ({ k, key: rankKey(runs[k].state === 'win' ? 1 : runs[k].progress, Math.round(runs[k].ink * 10000) / 10000, Math.round(runs[k].run.time * 1000)) }))
    .concat([{ k: 'OLDTIMER', key: rankKey(1, 0.3, 20000) }]).sort((a, b) => b.key - a.key);
  const names = { OLDTIMER: 'OLDTIMER' };
  const got = board.top.map((r) => r.name === 'OLDTIMER' ? 'OLDTIMER' : Object.keys(players).find((k) => runs[k] && Math.abs(r.ink - Math.round(runs[k].ink * 10000) / 10000) < 1e-9 && Math.abs((r.progress >= 1 ? 1 : r.progress) - (runs[k].state === 'win' ? 1 : runs[k].progress)) < 1e-6));
  check(JSON.stringify(got) === JSON.stringify(expect.map((e) => e.k)), 'board order: furthest, then ink, then time', { got, rows: board.top.map((r) => [Math.floor(r.progress * 100 + 1e-9), Math.round(r.ink * 1000) / 10]) });
  const homes = board.top.filter((r) => r.progress >= 1).length, firstPart = board.top.findIndex((r) => r.progress < 1);
  check(firstPart === homes, 'every finish is above every run that ended part way, whatever the ink');
  check(got.indexOf('cutTidy') < got.indexOf('cutTidyWaste'), 'same progress: more ink left ranks higher');
  check(got.indexOf('OLDTIMER') > got.indexOf('tidyHome') && got.indexOf('OLDTIMER') < got.indexOf('cautiousHome'), 'the old entry was kept, counted as a finish, and ranked by its ink');
  check(board.me && board.me.rank === got.indexOf('cutTidy') + 1, 'the caller\'s own rank comes from the count', board.me);
  check(board.top.every((r) => !('pid' in r) && !('key' in r)), 'rows carry no ids and no internal key');

  // improving, and not getting worse
  let t = (await post({ op: 'start', level: LEVEL, pid: players.cutTidy })).j.token;
  await sleep(Math.max(4200, runs.tidyHome.run.time * 650));
  const up = await post({ op: 'win', level: LEVEL, pid: players.cutTidy, token: t, ink: runs.tidyHome.ink, run: runs.tidyHome.run });
  check(up.j.ok && up.j.improved && up.j.rank <= 2, 'a part-way player who then gets home moves up to the finishes', up.j);
  t = (await post({ op: 'start', level: LEVEL, pid: players.tidyHome })).j.token;
  await sleep(Math.max(4200, runs.cutTidy.run.time * 650));
  const down = await post({ op: 'death', level: LEVEL, pid: players.tidyHome, token: t, progress: runs.cutTidy.progress * 100, ink: runs.cutTidy.ink, run: runs.cutTidy.run });
  const after = (await post({ op: 'board', level: LEVEL, pid: players.tidyHome })).j;
  check(down.j.ok && !down.j.improved && after.me.progress >= 1, 'a worse run later never replaces a better one', { improved: down.j.improved, me: after.me });

  // forged
  t = (await post({ op: 'start', level: LEVEL, pid: pid(7) })).j.token;
  await sleep(Math.max(4200, runs.early.run.time * 650));
  const forged = await post({ op: 'death', level: LEVEL, pid: pid(7), token: t, progress: 97, ink: runs.early.ink, run: runs.early.run });
  check(forged.status === 422, 'a run claiming to have got further than its trace is refused', forged.j);

  console.log(failed ? failed + ' failed' : 'all passed');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
