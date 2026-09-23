/* Campaign mastery and world progression, proved on the real page.
 *   node tests/mastery.js
 * Level score = up to 50 for reach (home = 50) + up to 50 for ink left
 * against the level's target; world = its three levels; 220 opens the next
 * world; best only; stored on the device; players from the previous build
 * keep what they had. */
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const CH = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PAGE = 'file://' + path.resolve(__dirname, '../public/index.html') + '?noanalytics';

let failed = 0;
const check = (ok, what, extra) => {
  console.log((ok ? '  ok   ' : '  FAIL ') + what + (extra !== undefined ? '  ' + JSON.stringify(extra) : ''));
  if (!ok) failed++;
};

(async () => {
  const b = await chromium.launch({ executablePath: CH });
  const ctx = await b.newContext({ viewport: { width: 1024, height: 768 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const load = async () => { await p.goto(PAGE); await p.waitForFunction(() => window.INKLINE && INKLINE.title); };
  await load();
  await p.evaluate(() => localStorage.clear());
  await load();

  const W = await p.evaluate(() => INKLINE.worlds());
  check(W.length === 4 && W.map((w) => w.id).join() === 'notebook,blueprint,highlighter,crayon', 'four worlds, in order', W.map((w) => w.id));
  check(W.every((w) => w.levels.length === 3), 'three pages each, twelve in all');

  // helpers inside the page
  const S = (fn, arg) => p.evaluate(fn, arg);
  const state = () => S(() => {
    const M = INKLINE.mastery, ws = INKLINE.worlds();
    return { worlds: ws.map((w) => M.world(w)), open: ws.map((w) => M.isOpen(w)), total: M.total(),
             levels: Object.fromEntries(ws.flatMap((w) => w.levels).map((id) => [id, M.level(id)])) };
  });
  const par = (id) => S((id) => INKLINE.levelPar(id), id);

  // 1. a fresh player
  let st = await state();
  check(st.open.join() === 'true,false,false,false', 'a new player has Notebook only', st.open);
  check(st.total === 0, 'and nothing on the board', st.total);

  // 2. the score of one page
  const p1 = await par('notebook-1');
  await S(() => INKLINE.progress.death('notebook-1', 0.84));
  st = await state();
  check(st.levels['notebook-1'] === 42, 'reaching 84% without getting home: 42', st.levels['notebook-1']);
  await S(() => INKLINE.progress.death('notebook-1', 0.9995));
  st = await state();
  check(st.levels['notebook-1'] === 49, 'a hair short of home is still under 50', st.levels['notebook-1']);
  await S(() => INKLINE.progress.win('notebook-1', 0, 30));
  st = await state();
  check(st.levels['notebook-1'] === 50, 'home dry: 50', st.levels['notebook-1']);
  await S((x) => INKLINE.progress.win('notebook-1', x, 30), p1 / 2);
  st = await state();
  check(st.levels['notebook-1'] === 75, 'home with half the target ink: 75', st.levels['notebook-1']);
  await S((x) => INKLINE.progress.win('notebook-1', x, 30), p1);
  st = await state();
  check(st.levels['notebook-1'] === 100, 'home with the target ink: 100', st.levels['notebook-1']);
  await S((x) => INKLINE.progress.win('notebook-1', x, 30), Math.min(1, p1 * 2));
  st = await state();
  check(st.levels['notebook-1'] === 100, 'more than the target is still 100', st.levels['notebook-1']);

  // 3. best only
  await S(() => { INKLINE.progress.win('notebook-1', 0, 40); INKLINE.progress.death('notebook-1', 0.1); });
  st = await state();
  check(st.levels['notebook-1'] === 100, 'a worse win and a death later: still 100', st.levels['notebook-1']);
  await S(() => INKLINE.progress.death('notebook-2', 0.6));
  await S(() => INKLINE.progress.death('notebook-2', 0.3));
  st = await state();
  check(st.levels['notebook-2'] === 30, 'an earlier death at 30% does not undo the 60% reach', st.levels['notebook-2']);

  // 4. three pages make the world
  const p2 = await par('notebook-2');
  await S((x) => INKLINE.progress.win('notebook-2', x, 30), p2);          // 100
  await S(() => INKLINE.progress.death('notebook-3', 0.38));               // 19
  st = await state();
  check(st.worlds[0] === st.levels['notebook-1'] + st.levels['notebook-2'] + st.levels['notebook-3'], 'the world is the sum of its pages', st.worlds[0]);

  // 5. the threshold
  check(st.worlds[0] === 219 && !st.open[1], '219 / 300: Blueprint stays shut', { notebook: st.worlds[0], open: st.open[1] });
  const unlockedB1 = await S(() => INKLINE.unlocked('blueprint-1'));
  check(!unlockedB1, '…and its first page cannot be played');
  await S(() => INKLINE.progress.death('notebook-3', 0.40));               // 20
  st = await state();
  check(st.worlds[0] === 220 && st.open[1], '220 / 300: Blueprint opens', { notebook: st.worlds[0], open: st.open[1] });
  check(await S(() => INKLINE.unlocked('blueprint-1')) && !(await S(() => INKLINE.unlocked('blueprint-2'))), 'its first page opens; the rest in order');

  // 6. it stays open
  await load();
  st = await state();
  check(st.open[1] && st.worlds[0] === 220, 'after a reload: still open, still 220', st);
  await S(() => { const r = INKLINE.progress.get('notebook-3'); r.bestProg = 0; });   // numbers can only go up, but even if one were lost…
  st = await state();
  check(st.open[1], '…an open world never closes again');

  // 7. the next world opens from a death that reaches far enough, and the card says so
  const pb = await Promise.all(['blueprint-1', 'blueprint-2'].map(par));
  await S((x) => { INKLINE.progress.win('blueprint-1', x[0], 30); INKLINE.progress.win('blueprint-2', x[1], 30); }, pb);
  await S(() => { INKLINE.level('blueprint-3'); const G = INKLINE.levelInfo().ground; INKLINE.place(6300, G + 150, 0, 300); });
  await p.waitForFunction(() => INKLINE.state().state === 'dead', null, { timeout: 5000 });
  const note = await S(() => { const s = INKLINE.state(); return { prog: s.progress, open: INKLINE.mastery.isOpen(INKLINE.worlds()[2]) }; });
  check(note.open, 'Blueprint 200 + reaching 96% of Blueprint 3 (48) opens Highlighter', note);
  await p.waitForTimeout(700);
  await p.screenshot({ path: path.join(require('os').tmpdir(), 'inkline-unlock-on-death.png') });

  // 8. perfect
  const pn3 = await par('notebook-3');
  await S((x) => INKLINE.progress.win('notebook-3', x, 30), pn3);
  st = await state();
  check(st.worlds[0] === 300, 'all three at their targets: 300 / 300', st.worlds[0]);
  await S(() => INKLINE.campaign.enter(true));
  await p.waitForTimeout(900);
  check(await S(() => INKLINE.mastery.perfectSeen(INKLINE.worlds()[0])), 'the campaign page stamps Notebook PERFECT (and remembers it)');
  await p.screenshot({ path: path.join(require('os').tmpdir(), 'inkline-campaign-perfect.png') });

  // 9. the last world has nothing after it
  const all = W.flatMap((w) => w.levels);
  const pars = await Promise.all(all.map(par));
  await S((x) => { x.ids.forEach((id, i) => INKLINE.progress.win(id, x.pars[i], 30)); }, { ids: all, pars });
  st = await state();
  check(st.total === 1200 && st.worlds.every((v) => v === 300), 'every page at its target: 1200 / 1200', st.total);
  check(st.open.every(Boolean), 'every world open', st.open);
  const after = await S(() => INKLINE.mastery.check());
  check(Array.isArray(after) && after.length === 0, 'nothing further to open after Crayon');
  await S(() => { INKLINE.level('crayon-2'); const G = INKLINE.levelInfo().ground; INKLINE.place(4700, G - 12, 300, 0); });
  await p.waitForFunction(() => INKLINE.state().state === 'win', null, { timeout: 5000 });
  await p.waitForTimeout(600);
  const txt = await S(() => INKLINE.cardText());
  check(txt && !/to open/.test(txt) && /Crayon/.test(txt), 'a Crayon result names Crayon and offers nothing to open', txt);

  // 10. players from the previous build
  const legacy = { 'notebook-1': { attempts: 12, wins: 3, bestInk: 0.12, bestProg: 1, bestTime: 30, firstWin: 4 },
                   'notebook-2': { attempts: 30, wins: 1, bestInk: 0.02, bestProg: 1, bestTime: 40, firstWin: 30 },
                   'notebook-3': { attempts: 9, wins: 0, bestInk: null, bestProg: 0.71, bestTime: null, firstWin: null },
                   'blueprint-1': { attempts: 5, wins: 0, bestInk: null, bestProg: 0.4, bestTime: null, firstWin: null } };
  await S((d) => { localStorage.clear(); localStorage.setItem('inkline.campaign.v1', JSON.stringify(d)); localStorage.setItem('inkline.tutorialDone', '1'); }, legacy);
  await load();
  st = await state();
  const kept = await S(() => { const r = INKLINE.progress.get('notebook-1'); return { attempts: r.attempts, wins: r.wins, bestInk: r.bestInk }; });
  check(kept.attempts === 12 && kept.wins === 3 && kept.bestInk === 0.12, 'an old record is read unchanged', kept);
  check(st.open[1], 'Blueprint, opened by the old rule (two Notebook pages done), stays open', { notebook: st.worlds[0], open: st.open });
  check(!st.open[2] && !st.open[3], 'the new worlds are not handed out', st.open);
  check(st.levels['notebook-3'] === 35, 'an unfinished old page counts its reach (71% → 35)', st.levels['notebook-3']);
  await S((d) => { const one = { 'notebook-1': d['notebook-1'] }; localStorage.clear(); localStorage.setItem('inkline.campaign.v1', JSON.stringify(one)); }, legacy);
  await load();
  st = await state();
  check(!st.open[1], 'with one Notebook page done under the old rule, Blueprint waits for 220', st.open);

  // 11. storage that throws never breaks the page
  await ctx.addInitScript(() => { const bad = function () { throw new Error('blocked'); }; Storage.prototype.getItem = bad; Storage.prototype.setItem = bad; });
  const p2page = await ctx.newPage();
  const errs2 = []; p2page.on('pageerror', (e) => errs2.push(e.message));
  await p2page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p2page.goto(PAGE); await p2page.waitForFunction(() => window.INKLINE && INKLINE.title);
  await p2page.evaluate(() => INKLINE.campaign.enter(true)); await p2page.waitForTimeout(300);
  check(!errs2.length, 'blocked storage: the campaign page still draws', errs2);

  check(!errs.length, 'no page errors', errs);
  await b.close();
  console.log(failed ? failed + ' failed' : 'all passed');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
