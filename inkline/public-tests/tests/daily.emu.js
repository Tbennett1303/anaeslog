/* The daily board, end to end, against the Firebase emulators:
 *
 *   firebase emulators:start --only functions,firestore,hosting --project demo-inkline
 *   node tests/daily.emu.js
 *
 * Two players play today's course in the real game (fast-forwarded, drawing
 * the reference lines, then stopping so the page ends the run), the game
 * submits on its own, and the board, ranks and counts are checked. Then the
 * first player's real run is tampered with in every way the verifier knows
 * about, and each forgery must be refused. Telemetry is checked in Firestore.
 */
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:5000';
const FS = process.env.FS || 'http://127.0.0.1:8080/v1/projects/demo-inkline/databases/(default)/documents';
const CH = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let fails = 0;
const check = (ok, msg, extra) => { console.log((ok ? '  ok   ' : '  FAIL ') + msg + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!ok) fails++; };

async function player(b, metres) {
  const ctx = await b.newContext({ viewport: { width: 1024, height: 768 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await p.goto(BASE + '/');
  await p.waitForFunction(() => window.INKLINE && INKLINE.title);
  p.errs = errs; p.ctx = ctx;
  p.play = (m) => p.evaluate((m) => {
    INKLINE.freeze(true);
    INKLINE.mode('daily');
    const C = INKLINE.course(), G = INKLINE.levelInfo().ground;
    let k = 0, st = INKLINE.state();
    const stopAt = m * 20 + 110;
    while (st.state === 'play' && st.t < 900) {
      while (st.x < stopAt && k < C.refs.length && st.x >= C.refs[k].at) INKLINE.paint(C.refs[k++].pts.map(q => ({ x: q[0], y: G - q[1] })));
      INKLINE.tick(1 / 60, 3); st = INKLINE.state();
    }
    INKLINE.freeze(false);
    return { state: st.state, dist: st.dist, reason: st.reason };
  }, m);
  p.result = async () => {
    await p.waitForFunction(() => { const r = INKLINE.state().result; return r && r.net !== 'sending'; }, null, { timeout: 15000 });
    return p.evaluate(() => INKLINE.state().result);
  };
  p.api = (body) => p.evaluate(async (body) => {
    const r = await fetch('/api/daily', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    let j = null; try { j = await r.json(); } catch (e) {}
    return { status: r.status, j };
  }, body);
  p.pid = () => p.evaluate(() => INKLINE.analytics.pid);
  return p;
}

(async () => {
  const b = await chromium.launch({ executablePath: CH });
  const day = new Date().toISOString().slice(0, 10);
  console.log('daily board on ' + day);

  const A = await player(b), B = await player(b);
  await A.evaluate(() => { INKLINE.records.name = 'Ada'; });
  const a1 = await A.play(320);
  check(a1.state === 'dead' && a1.dist > 300, 'A plays today\'s course and the page ends the run', a1);
  const ra = await A.result();
  check(ra.net === 'ok' && ra.rank === 1, 'A\'s run is verified and ranked #1', { net: ra.net, rank: ra.rank, players: ra.players });
  const forged = await A.evaluate(() => INKLINE.dailyRun());
  const pidA = await A.pid();

  const b1 = await B.play(160);
  const rb = await B.result();
  check(rb.net === 'ok' && rb.rank === 2 && rb.players === 2, 'B, shorter, is #2 of 2', { net: rb.net, rank: rb.rank, players: rb.players });

  // a worse run from A: counted as a run, the best stays
  await A.play(60);
  const ra2 = await A.result();
  check(ra2.net === 'ok' && ra2.rank === 1 && !ra2.newPb, 'A\'s worse run keeps A at #1', { rank: ra2.rank, newPb: ra2.newPb });

  const pidB = await B.pid();
  const bd = await B.api({ op: 'board', day, pid: pidB });
  check(bd.status === 200 && bd.j.top.length === 2 && bd.j.top[0].name === 'Ada' && bd.j.top[1].me === true && bd.j.me.rank === 2,
        'board: top rows, names, the caller marked', bd.j.top);
  check(bd.j.runs === 3 && bd.j.players === 2, 'board: 2 players, 3 runs', { players: bd.j.players, runs: bd.j.runs });
  check(!/[a-f0-9]{16}/.test(JSON.stringify(bd.j)), 'board never returns a player id');

  // the page shows it
  await B.evaluate(() => INKLINE.daily.enter());
  await B.waitForFunction(() => INKLINE.daily.status === 'ok', null, { timeout: 8000 });
  check(true, 'daily page reads the board');

  // forgeries, using A's real run
  const sub = (run, extra) => A.api(Object.assign({ op: 'submit', day, pid: pidA, att: 9, dist: run.dist, time: run.time, run }, extra || {}));
  const J = (o) => JSON.parse(JSON.stringify(o));
  let f = J(forged); f.dist += 200;
  let r = await sub(f); check(r.status === 422 && r.j.reason === 'dist-mismatch', 'claimed distance edited → refused', r.j && r.j.reason);
  f = J(forged); for (let i = 1; i < f.trace.length; i += 4) f.trace[i] += Math.round(i * 60);
  f.dist = Math.round((Math.max(...f.trace.filter((v, i) => i % 4 === 1)) / 10 - 110) / 20 * 10) / 10;
  r = await sub(f); check(r.status === 422, 'trace stretched further (and distance to match) → refused', r.j && r.j.reason);
  f = J(forged);
  const hz = await A.evaluate((maxX) => INKLINE.course().hazards.find(h => h.x + h.w < maxX && h.kind !== 'ceil'), (forged.trace[forged.trace.length - 3]) / 10);
  if (hz) {
    let best = -1, bd = 1e9;
    for (let i = 1; i < f.trace.length; i += 4) { const d = Math.abs(f.trace[i] / 10 - (hz.x + hz.w / 2)); if (d < bd) { bd = d; best = i; } }
    f.trace[best] = Math.round((hz.x + hz.w / 2) * 10); f.trace[best + 1] = Math.round(((hz.hTop + hz.hBot) / 2) * 10);
    r = await sub(f); check(r.status === 422 && r.j.reason === 'hazard', 'a sample moved inside a ' + hz.kind + ' → refused', r.j && r.j.reason);
  }
  f = J(forged); f.strokes = [];
  r = await sub(f); check(r.status === 422 && (r.j.reason === 'unsupported' || r.j.reason === 'behind'), 'lines removed (flying over gaps) → refused', r.j && r.j.reason);
  f = J(forged); f.spent = 99999;
  r = await sub(f); check(r.status === 422 && r.j.reason === 'ink', 'more ink than the well and blots allow → refused', r.j && r.j.reason);
  f = J(forged); f.blots = 999;
  r = await sub(f); check(r.status === 422 && r.j.reason === 'blots', 'blots never passed → refused', r.j && r.j.reason);
  f = J(forged); f.time = f.time / 3; for (let i = 0; i < f.trace.length; i += 4) f.trace[i] = Math.round(f.trace[i] / 3);
  r = await sub(f); check(r.status === 422, 'run sped up ×3 → refused', r.j && r.j.reason);
  f = J(forged); f.v = 99;
  r = await sub(f); check(r.status === 422 && r.j.reason === 'version', 'wrong generator version → refused', r.j && r.j.reason);
  r = await sub(J(forged), { day: '2020-01-01' }); check(r.status === 400, 'an old day → refused');
  r = await A.api({ op: 'board', day, pid: 'not-a-pid' }); check(r.status === 400, 'bad id → refused');
  r = await sub(J(forged)); check(r.status === 200 && r.j.counted === true && r.j.improved === false, 'the genuine run still verifies (and is not an improvement)', r.j);
  const after = await B.api({ op: 'board', day, pid: pidB });
  check(after.j.top[0].name === 'Ada' && Math.abs(after.j.top[0].dist - ra.dist) < 1.5, 'forgeries changed nothing on the board', after.j.top[0]);

  // names
  r = await B.api({ op: 'name', day, pid: pidB, name: 'Bo <b>' });
  r = await B.api({ op: 'board', day, pid: pidB });
  check(r.j.top[1].name === 'Bo b', 'name change is cleaned and shown', r.j.top[1].name);
  await B.api({ op: 'name', day, pid: pidB, name: 'f.u.c.k' });
  r = await B.api({ op: 'board', day, pid: pidB });
  check(r.j.top[1].name === '', 'a rude name shows as anonymous', r.j.top[1].name);

  // rate limit
  const C = await player(b);
  const pidC = await C.pid();
  const codes = await C.evaluate(async ({ day, pid }) => {
    const out = [];
    for (let i = 0; i < 50; i++) {
      const r = await fetch('/api/daily', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ op: 'board', day, pid }) });
      out.push(r.status);
    }
    return out;
  }, { day, pid: pidC });
  check(codes.filter(c => c === 429).length >= 5 && codes[0] === 200, 'rate limit answers 429 after 40 a minute', { ok: codes.filter(c => c === 200).length, limited: codes.filter(c => c === 429).length });

  // telemetry landed, and nothing identifying beyond the random id
  await A.evaluate(() => { INKLINE.analytics.flush(); });
  await new Promise(r => setTimeout(r, 1500));
  const docs = await (await fetch(FS + '/g_players?pageSize=50', { headers: { Authorization: 'Bearer owner' } })).json();
  const ids = (docs.documents || []).map(d => d.name.split('/').pop());
  check(ids.includes(pidA) && ids.includes(pidB), 'telemetry stored per anonymous id', ids.length);
  const evs = await (await fetch(FS + '/g_players/' + pidA + '/ev?pageSize=50', { headers: { Authorization: 'Bearer owner' } })).json();
  const all = JSON.stringify(evs);
  check(/"stringValue":"a"/.test(all) && /"stringValue":"d"/.test(all) && /"stringValue":"retry"|"stringValue":"menu"/.test(all), 'attempt/death events with mode and via');
  check(!/127\.0\.0\.1|x-forwarded|userAgent|Mozilla/.test(all), 'no IP or user agent stored');
  check(/"stringValue":"tu"/.test(all) && /"stringValue":"start"/.test(all), 'the first-play opening is recorded (tutorial started)');
  const dayDoc = await (await fetch(FS + '/daily/' + day, { headers: { Authorization: 'Bearer owner' } })).json();
  check(!!dayDoc.fields && !JSON.stringify(dayDoc).includes('127.0.0.1'), 'day document holds counts only');

  const errs = [].concat(A.errs, B.errs, C.errs);
  check(!errs.length, 'no page errors', errs.slice(0, 3));
  await b.close();
  console.log(fails ? fails + ' FAILED' : 'all passed');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
