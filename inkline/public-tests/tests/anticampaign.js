/* The antigravity campaign.
 *   node tests/anticampaign.js
 *  - hidden until Inky gets home; then each page opens once that page has
 *    been finished the right way up
 *  - the ANTIGRAVITY switch on the campaign page turns the whole page over,
 *    and is remembered
 *  - antigravity pages keep their own numbers: nothing they do changes the
 *    campaign's, and they never open anything
 *  - every antigravity page: cuts in pairs (it finishes the right way up),
 *    nothing straddles a cut, gravity turns only at its lines, and its
 *    carried-over route gets home
 *  - a card says which it was; "next" goes to the next antigravity page */
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const CH = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PAGE = 'file://' + path.resolve(__dirname, '../public/index.html') + '?noanalytics';
const SHORT = { notebook: 'n', blueprint: 'b', highlighter: 'h', scratch: 's', crayon: 'c' };
const ROUTE = { 'notebook-1': 'cautious', 'notebook-2': 'moderate', 'notebook-3': 'eff', 'blueprint-1': 'trusting', 'blueprint-2': 'hopstairs', 'blueprint-3': 'trusting',
  'highlighter-1': 'eff', 'highlighter-2': 'safe', 'highlighter-3': 'k30', 'scratch-1': 'ref', 'scratch-2': 'ref', 'scratch-3': 'ref', 'crayon-1': 'safe', 'crayon-2': 'safe', 'crayon-3': 'ref' };

let failed = 0;
const check = (ok, what, extra) => {
  console.log((ok ? '  ok   ' : '  FAIL ') + what + (extra !== undefined ? '  ' + JSON.stringify(extra) : ''));
  if (!ok) failed++;
};

(async () => {
  const b = await chromium.launch({ executablePath: CH });
  const p = await b.newPage({ viewport: { width: 1024, height: 768 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const load = async () => { await p.goto(PAGE); await p.waitForFunction(() => window.INKLINE && INKLINE.title); };
  await load();
  await p.evaluate(() => localStorage.clear());
  await load();
  const S = (fn, arg) => p.evaluate(fn, arg);
  const ids = await S(() => INKLINE.worlds().flatMap((w) => w.levels));

  // 1. hidden until Inky gets home
  await S((ids) => { ids.slice(0, 14).forEach((id) => INKLINE.progress.win(id, 0.2, 30)); }, ids);      // everything but the house
  let st = await S(() => ({ open: INKLINE.unlocked('notebook-1:ag'), on: INKLINE.antiPref.on }));
  check(!st.open, 'fourteen pages home, but not the house: no antigravity yet', st);
  await S(() => { INKLINE.campaign.enter(true); INKLINE.antiPref.on = true; });
  check(!(await S(() => INKLINE.antiPref.on)), 'the switch cannot be turned on before then');
  await S(() => { INKLINE.level('crayon-3'); const G = INKLINE.levelInfo().ground; INKLINE.place(INKLINE.levelInfo().finish - 60, G - 170, 300, 0); });
  await p.waitForFunction(() => INKLINE.state().state === 'win', null, { timeout: 8000 });
  st = await S((ids) => ({ finished: INKLINE.mastery.finished, open: ids.map((id) => INKLINE.unlocked(id + ':ag')) }), ids);
  check(st.finished && st.open.every(Boolean), 'Inky home: every page finished the right way up has its antigravity page open', st.open);
  await S(() => { INKLINE.progress.clear(); INKLINE.progress.win('notebook-1', 0.2, 30); });
  st = await S((ids) => ids.map((id) => INKLINE.unlocked(id + ':ag')), ids);
  check(st[0] && !st[1], 'an antigravity page opens once its own page is home (and only then)', st.slice(0, 3));
  await S((ids) => ids.forEach((id) => INKLINE.progress.win(id, 0.2, 30)), ids);

  // 2. the switch
  const before = await S(() => ({ total: INKLINE.mastery.total(), check: INKLINE.mastery.check().length }));
  await S(() => { INKLINE.campaign.enter(true); INKLINE.campaign.toggleAnti(); });
  check(await S(() => INKLINE.antiPref.on), 'the switch turns the campaign page over');
  await p.waitForTimeout(600);
  await p.screenshot({ path: path.join(require('os').tmpdir(), 'inkline-campaign-antigravity.png') });
  await load();
  check(await S(() => INKLINE.antiPref.on), '…and is remembered after a reload');

  // 3. its own numbers
  await S(() => { INKLINE.progress.win('notebook-1:ag', 0.4, 30); INKLINE.progress.death('notebook-2:ag', 0.55); });
  const after = await S(() => ({ total: INKLINE.mastery.total(), check: INKLINE.mastery.check().length,
    n1: INKLINE.progress.get('notebook-1').bestInk, a1: INKLINE.progress.get('notebook-1:ag').bestInk, a2: INKLINE.mastery.level('notebook-2:ag') }));
  check(after.total === before.total && after.check === 0 && after.n1 === 0.2, 'antigravity results never touch the campaign’s numbers or open anything', { before, after });
  check(after.a1 === 0.4 && after.a2 === 55, 'they keep their own: best ink, how far', after);

  // 4. every page: structure, gravity, and its route home
  const res = [];
  for (const id of ids) {
    const sol = JSON.parse(fs.readFileSync(path.join(__dirname, 'solutions', 'sol-' + SHORT[id.split('-')[0]] + id.split('-')[1] + '-ag.json'), 'utf8'))[ROUTE[id]];
    res.push(await S(({ id, strokes }) => {
      INKLINE.freeze(true); INKLINE.level(id + ':ag');
      const L = INKLINE.levelDef(id + ':ag'), N = INKLINE.levelDef(id);
      const G = INKLINE.levelInfo().ground;
      const inv = (x) => L.flips.filter((f) => f <= x).length % 2 === 1;
      const straddle = L.hazards.concat(L.plinths.map((q) => ({ x: q.x0, w: q.x1 - q.x0 })))
        .some((h) => L.flips.some((f) => f > h.x && f < h.x + h.w));
      const marked = L.hazards.every((h) => !!h.inv === inv(h.x + h.w / 2)) && L.drops.every((d) => !!d.inv === inv(d.x));
      let k = 0, st = INKLINE.state(), g = st.grav, turns = [], lines = L.flips.slice();
      while (st.state === 'play' && st.t < 200) {
        while (k < strokes.length && st.x >= strokes[k].at) { INKLINE.paint(strokes[k].pts.map((q) => ({ x: q[0], y: G - q[1] }))); k++; }
        const x0 = st.x;
        INKLINE.tick(1 / 60, 1); st = INKLINE.state();
        if (st.grav !== g) { const f = lines.find((xf) => xf > x0 - 1e-6 && xf <= st.x + 1e-6); turns.push(f === undefined ? null : +(st.x - f).toFixed(1)); g = st.grav; }
      }
      return { id, state: st.state, flips: L.flips.length, even: L.flips.length % 2 === 0 && L.flips.length >= 2, straddle, marked,
               turns, same: N.ink === L.ink && N.drops.length === L.drops.length && N.hazards.length === L.hazards.length, card: INKLINE.cardText(),
               longer: Math.round((L.finish / N.finish - 1) * 100) };
    }, { id, strokes: sol }));
  }
  check(res.every((r) => r.even), 'every page has its gravity lines in pairs: it finishes the right way up', res.map((r) => r.flips));
  check(res.every((r) => !r.straddle && r.marked), 'no hazard or block across a line; everything marked the way up it stands');
  check(res.every((r) => r.same), 'the same page: same ink, blots and hazards as the original');
  check(res.every((r) => r.turns.length === r.flips && r.turns.every((d) => d !== null && d < 8)), 'gravity turns at each line as he crosses it, and nowhere else', res.map((r) => r.turns.length));
  check(res.every((r) => r.state === 'win'), 'every antigravity page gets home on its carried-over route', res.filter((r) => r.state !== 'win').map((r) => r.id + ':' + r.state));
  check(res.every((r) => /antigravity/.test(r.card || '')), 'the card says it was the antigravity page', res[0].card);
  console.log('  info longer than the original page by (%): ' + res.map((r) => r.id.replace(/-/, '') + ' ' + r.longer).join(', '));

  // 5. next goes on in antigravity
  const nx = await S(() => INKLINE.nextLevel('notebook-3:ag'));
  check(nx === 'blueprint-1:ag', '"next" after an antigravity page is the next antigravity page', nx);

  check(!errs.length, 'no page errors', errs);
  await b.close();
  console.log(failed ? failed + ' failed' : 'all passed');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
