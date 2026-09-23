/* A simulated imperfect player, for measuring difficulty rather than proving
 * solvability. It knows roughly what to draw (a level's intended solution, or
 * a generated course's reference lines), and draws it the way a hand does:
 *
 *   - it starts each line when Inky is some way off, and only once the start
 *     is on screen; it cannot draw off the right edge, and anything that has
 *     scrolled off the left is gone;
 *   - the pen moves at a hand's speed, so a long line is still being drawn
 *     while Inky runs, and a late start can be too late;
 *   - every line is a little off: starts and ends early or late, sits a
 *     little high or low, tilts, and wobbles.
 *
 * sigma scales the error (0 = the exact solution, 1 = an ordinary player,
 * 1.5 = a new one). The game runs fast-forwarded through the real engine.
 *
 *   node tests/human.js --level notebook-3 --sol tests/solutions/sol-n3.json --route main --n 300 --sigma 1
 *   node tests/human.js --mode endless --n 300 --sigma 1
 */
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const CH = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PAGE = process.env.PAGE || ('file://' + path.resolve(__dirname, '../public/index.html') + '?noanalytics');

/* the player, as it runs inside the page */
function attempt(o) {
  let s = o.seed >>> 0;
  const rnd = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const gauss = () => { let u = 0, v = 0; while (u === 0) u = rnd(); v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const sg = o.sigma;
  INKLINE.freeze(true);
  if (o.tune) INKLINE.tune(o.level, o.tune);
  if (o.level) INKLINE.level(o.level); else INKLINE.mode(o.mode, o.courseSeed);
  const G = INKLINE.levelInfo().ground, VW = INKLINE.view().VW;
  const C = o.level ? null : INKLINE.course();
  const plan = o.level ? o.strokes : null;

  function noisy(ref) {
    const pts = ref.map((q) => [q[0], q[1]]);
    const a = pts[0][0], b = pts[pts.length - 1][0], w = Math.max(1, b - a);
    const dx0 = (gauss() * 14 - 10) * sg, dx1 = (gauss() * 18 + 10) * sg;       // people overdraw more than they fall short       // people overdraw more than they fall short
    const dyA = gauss() * 2.5 * sg, dyB = gauss() * 4 * sg, dyAll = gauss() * 3 * sg;
    const A1 = Math.abs(gauss()) * 2.2 * sg, L1 = 90 + rnd() * 120, P1 = rnd() * 6.28;
    const dense = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const n = Math.max(1, Math.round(Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]) / 8));
      for (let j = 0; j < n; j++) dense.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * j / n, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * j / n]);
    }
    dense.push(pts[pts.length - 1]);
    return dense.map((q) => {
      const u = (q[0] - a) / w;
      const x = q[0] + dx0 + (dx1 - dx0) * u;
      const h = q[1] + dyAll + dyA + (dyB - dyA) * u + A1 * Math.sin((q[0] / L1) * 6.28 + P1) + gauss() * 0.7 * sg;
      return { x, y: G - h };
    });
  }

  let k = 0, cur = null, cool = 0, drew = 0;
  let st = INKLINE.state();
  const dt = 1 / 60, target = o.targetX || Infinity;
  while (st.state === 'play' && st.t < o.maxT && st.x < target) {
    const list = plan || C.refs;
    if (!cur && cool <= 0 && k < list.length) {
      const r = list[k].pts || list[k];
      const lead = 150 + rnd() * 230;
      const x0 = r[0][0];
      // start when Inky is near enough, and the start is on the page
      if ((st.x >= x0 - lead && x0 < st.camX + VW - 20) || st.x > x0) {
        let pts = noisy(r);
        // anything already behind the page's left edge can no longer be drawn
        pts = pts.filter((p) => p.x > st.camX + 6);
        k++;
        if (pts.length > 1) {
          cur = { pts, i: 0, v: (650 + rnd() * 550) * (sg > 1 ? 0.9 : 1), down: false, budget: 0 };
        }
      }
    }
    if (cur) {
      cur.budget += cur.v * dt;
      while (cur.i < cur.pts.length) {
        const p = cur.pts[cur.i];
        if (p.x > st.camX + VW - 8) break;                       // wait for the page to bring it on
        if (p.x < st.camX + 4) { cur.i++; continue; }             // gone
        if (!cur.down) { cur.down = INKLINE.pen.down(p); cur.i++; if (!cur.down) { cur.i = cur.pts.length; } continue; }
        const q = cur.pts[cur.i - 1] || p;
        const d = Math.hypot(p.x - q.x, p.y - q.y);
        if (cur.budget < d) break;
        cur.budget -= d;
        INKLINE.pen.move(p);
        cur.i++;
      }
      if (cur.i >= cur.pts.length) { INKLINE.pen.up(); cur = null; drew++; cool = 0.12 + rnd() * 0.2; }
    }
    cool -= dt;
    INKLINE.tick(dt, 1);
    st = INKLINE.state();
  }
  INKLINE.pen.up();
  INKLINE.freeze(false);
  if (o.debug) {
    const r = INKLINE.record();
    return { strokes: r.strokes.map((sk) => { const a = []; for (let i = 0; i < sk.p.length; i += 5) if (i % 25 === 0) a.push([Math.round(sk.p[i]), Math.round(G - sk.p[i + 1]), sk.p[i + 2]]); return a; }),
             path: r.path.filter((q, i) => i % 6 === 0).map((q) => [q[0], Math.round(q[1]), Math.round(G - q[2]), Math.round(q[4]), q[6]]), st };
  }
  let kind = null;
  let seen = null;
  if (C) {
    const passed = C.chunks.filter((q) => q.a0 <= st.x + 10);
    const ch = passed[passed.length - 1]; kind = ch ? ch.kind : null;
    seen = {}; passed.forEach((q) => { seen[q.kind] = (seen[q.kind] || 0) + 1; });
  }
  return { state: st.state, reason: st.reason, progress: st.progress, dist: st.dist, t: st.t, ink: st.ink, drew, x: Math.round(st.x), h: Math.round(G - st.y), kind, seen };
}

async function main() {
  const N = +arg('n', 200), sigma = +arg('sigma', 1), level = arg('level', null), mode = arg('mode', null);
  const W = +arg('width', 1024), H = +arg('height', 768), seed0 = +arg('seed', 1);
  let strokes = null;
  if (level) {
    const sol = JSON.parse(fs.readFileSync(arg('sol'), 'utf8'));
    const route = arg('route', Object.keys(sol)[0]);
    strokes = sol[route].map((s) => s.pts);
  }
  const b = await chromium.launch({ executablePath: CH });
  const P = 4, pages = [];
  for (let i = 0; i < P; i++) {
    const p = await b.newPage({ viewport: { width: W, height: H } });
    await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    await p.goto(PAGE);
    await p.waitForFunction(() => window.INKLINE && INKLINE.title);
    pages.push(p);
  }
  if (process.env.DEBUG_I) {
    const i = +process.env.DEBUG_I;
    const o = { debug: true, tune: arg('tune') ? JSON.parse(arg('tune')) : null, seed: (seed0 * 7919 + i * 2654435761) >>> 0, sigma, level, mode, strokes, maxT: 400,
                courseSeed: (seed0 * 104729 + i * 40503) >>> 0 };
    const r = await pages[0].evaluate(attempt, o);
    console.log(JSON.stringify(r.st));
    r.strokes.forEach((sk, j) => console.log('stroke', j, JSON.stringify(sk)));
    const lo = +(process.env.LO || 0), hi = +(process.env.HI || 1e9);
    r.path.filter((q) => q[1] >= lo && q[1] <= hi).forEach((q) => console.log('  t=' + q[0].toFixed(2) + ' x=' + q[1] + ' h=' + q[2] + ' cam=' + q[3] + (q[4] ? ' g' : '')));
    await b.close(); return;
  }
  const res = [];
  let next = 0;
  await Promise.all(pages.map(async (p) => {
    while (next < N) {
      const i = next++;
      const o = { tune: arg('tune') ? JSON.parse(arg('tune')) : null, seed: (seed0 * 7919 + i * 2654435761) >>> 0, sigma, level, mode, strokes, maxT: +arg('maxt', 400),
                  courseSeed: mode === 'daily' ? null : ((seed0 * 104729 + i * 40503) >>> 0), targetX: arg('metres') ? +arg('metres') * 20 + 110 : null };
      const r = await p.evaluate(attempt, o); r.i = i; res.push(r);
    }
  }));
  await b.close();
  report(res, level, mode, sigma);
}

function report(res, level, mode, sigma) {
  const n = res.length;
  if (level) {
    const wins = res.filter((r) => r.state === 'win');
    const deaths = res.filter((r) => r.state !== 'win');
    const hist = new Array(10).fill(0);
    deaths.forEach((r) => hist[Math.min(9, Math.floor(r.progress * 10))]++);
    const near = deaths.filter((r) => r.progress >= 0.7).length;
    const causes = {};
    deaths.forEach((r) => { causes[r.reason] = (causes[r.reason] || 0) + 1; });
    const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[s.length >> 1] : null; };
    console.log(`${level} σ=${sigma}: win ${(wins.length / n * 100).toFixed(1)}%  (≈${wins.length ? (n / wins.length).toFixed(1) : '∞'} tries)  ` +
      `deaths ≥70%: ${(near / n * 100).toFixed(0)}% of tries  median death at ${deaths.length ? Math.round(med(deaths.map((r) => r.progress)) * 100) : '-'}%  ` +
      `ink left at win ${wins.length ? Math.round(med(wins.map((r) => r.ink)) * 100) + '%' : '-'}`);
    if (process.env.WHERE) {
      const w = {};
      deaths.forEach((r) => { const k = r.reason + '@' + Math.round(r.x / 100) * 100; w[k] = (w[k] || 0) + 1; if (process.env.WHERE === 'i') console.log('     i=' + r.i + ' ' + r.reason + ' x=' + r.x + ' h=' + r.h); });
      console.log('   where: ' + Object.entries(w).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => k + '×' + v).join('  '));
    }
    console.log('   deaths by progress (10% bins): ' + hist.map((h) => String(h).padStart(3)).join(' ') + '   causes ' + JSON.stringify(causes));
  } else {
    const d = res.map((r) => r.dist).sort((a, b) => a - b);
    const at = (m) => (res.filter((r) => r.dist >= m).length / n * 100).toFixed(0) + '%';
    const q = (p) => Math.round(d[Math.min(n - 1, Math.floor(p * n))]);
    const causes = {};
    res.forEach((r) => { causes[r.reason || r.state] = (causes[r.reason || r.state] || 0) + 1; });
    if (process.env.WHERE === 'i') res.filter((r) => r.state === 'dead').forEach((r) => console.log('     i=' + r.i + ' ' + r.kind + ':' + r.reason + ' x=' + r.x + ' h=' + r.h));
    const bk = {};
    res.filter((r) => r.state === 'dead').forEach((r) => { const k = (r.kind || '?') + ':' + r.reason; bk[k] = (bk[k] || 0) + 1; });
    const enc = {}, dk = {};
    res.forEach((r) => { for (const k in r.seen || {}) enc[k] = (enc[k] || 0) + r.seen[k]; if (r.state === 'dead' && r.kind) dk[r.kind] = (dk[r.kind] || 0) + 1; });
    console.log('   lethality: ' + Object.keys(enc).sort((a, b) => (dk[b] || 0) / enc[b] - (dk[a] || 0) / enc[a]).map((k) => k + ' ' + Math.round((dk[k] || 0) / enc[k] * 100) + '% of ' + enc[k]).join('  '));
    console.log('   killed by: ' + Object.entries(bk).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + '×' + v).join('  '));
    console.log(`${mode} σ=${sigma}: median ${q(0.5)} m  p25 ${q(0.25)}  p75 ${q(0.75)}  p90 ${q(0.9)}  ` +
      `reach 100m ${at(100)}  300m ${at(300)}  500m ${at(500)}  1000m ${at(1000)}   ${JSON.stringify(causes)}`);
  }
}
main().catch((e) => { console.error(e); process.exit(2); });
