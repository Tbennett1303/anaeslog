/*  Checks a submitted daily run against the course it claims to be on.
 *
 *  Lightweight and deliberately so: it does not re-simulate the physics. It
 *  rebuilds the day's course from the date with the game's own generator and
 *  asks whether the reported run could have happened on it:
 *
 *    - the trace is well formed, starts where every run starts, and its time
 *      and distance agree with what is claimed;
 *    - nothing moves faster than the game's speed limit allows;
 *    - Inky never keeps ahead of the page's forced scroll by cheating it —
 *      he is always in front of where the camera must have been;
 *    - no sample sits inside a hazard, or far below where the page ends;
 *    - whenever Inky was on the ground there was ground there: printed, or a
 *      line that had been drawn by then;
 *    - the ink drawn fits the well plus the blots the run actually passed.
 *
 *  Upside-down stretches (after a gravity line) are built mirrored by the
 *  generator and marked `inv`; they are reflected here exactly as the game
 *  reflects them (h -> MIRROR - h), so every check reads the course as played.
 *
 *  A forger who fabricates a physically consistent run can still get past
 *  this; editing a number in a request cannot.
 */
'use strict';
const Gen = require('./gen.js');

const MAXV = 900, SCROLL = 110, BALL_R = 10;
const MAX_SAMPLES = 25000, MAX_STROKES = 4000, MAX_POINTS = 80000;

const isInt = (v) => Number.isInteger(v) && Math.abs(v) < 1e9;

function segDist(px, py, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy;
  let t = L2 > 0 ? ((px - x0) * dx + (py - y0) * dy) / L2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const qx = x0 + dx * t - px, qy = y0 + dy * t - py;
  return Math.sqrt(qx * qx + qy * qy);
}

function verifyRun(day, run) {
  const bad = (reason) => ({ ok: false, reason });
  if (!run || typeof run !== 'object') return bad('shape');
  if (run.v !== Gen.VERSION) return bad('version');
  const tr = run.trace, st = run.strokes;
  if (!Array.isArray(tr) || tr.length < 8 || tr.length % 4 || tr.length > MAX_SAMPLES * 4) return bad('trace-shape');
  if (!Array.isArray(st) || st.length > MAX_STROKES) return bad('strokes-shape');
  for (const v of tr) if (!isInt(v)) return bad('trace-type');
  let nPts = 0;
  for (const s of st) {
    if (!Array.isArray(s) || s.length < 5 || s.length % 2 === 0) return bad('stroke-shape');
    for (const v of s) if (!isInt(v)) return bad('stroke-type');
    nPts += (s.length - 1) / 2;
  }
  if (nPts > MAX_POINTS) return bad('stroke-size');
  const time = +run.time, dist = +run.dist, spent = +run.spent, blots = +run.blots;
  if (!isFinite(time) || time <= 0 || time > 3600) return bad('time');
  if (!isFinite(dist) || dist < 0 || dist > 100000) return bad('dist');
  if (!isFinite(spent) || spent < 0 || !Number.isInteger(blots) || blots < 0) return bad('ink-shape');

  // samples, in game units
  const S = [];
  for (let i = 0; i < tr.length; i += 4) S.push({ t: tr[i] / 100, x: tr[i + 1] / 10, h: tr[i + 2] / 10, g: tr[i + 3] === 1 });
  if (S[0].t > 1 || Math.abs(S[0].x - Gen.START_X) > 40 || S[0].h < -20 || S[0].h > 80) return bad('start');
  let maxX = S[0].x;
  for (let i = 1; i < S.length; i++) {
    const a = S[i - 1], b = S[i], dt = b.t - a.t;
    if (dt < 0) return bad('time-order');
    if (dt > 0.6) return bad('trace-gap');
    const lim = MAXV * 1.15 * Math.max(dt, 1 / 60) + 12;
    if (Math.abs(b.x - a.x) > lim || Math.abs(b.h - a.h) > lim) return bad('speed');
    if (b.x > maxX) maxX = b.x;
  }
  const last = S[S.length - 1];
  if (Math.abs(last.t - time) > 0.35) return bad('time-mismatch');
  const traceDist = Gen.metres(maxX);
  if (Math.abs(traceDist - dist) > 1.5) return bad('dist-mismatch');
  if (maxX - Gen.START_X > time * 700 + 50) return bad('avg-speed');

  // the course, as it was that day
  const C0 = Gen.create({ mode: 'daily', seed: Gen.dailySeed(day) }).ensure(maxX + 800);
  const cfg = C0.cfg, M = Gen.MIRROR;
  const C = {
    printed: C0.printed.map((f) => f.inv ? { pts: f.pts.map((q) => [q[0], M - q[1]]) } : f),
    hazards: C0.hazards.map((h) => h.inv ? Object.assign({}, h, { hTop: M - h.hBot, hBot: M - h.hTop }) : h),
    drops: C0.drops.map((d) => d.inv ? Object.assign({}, d, { h: M - d.h }) : d),
  };

  // the strokes, in units
  const strokes = st.map((s) => {
    const pts = [];
    for (let i = 1; i < s.length; i += 2) pts.push([s[i] / 10, s[i + 1] / 10]);
    return { t0: s[0] / 100, pts };
  });
  const firstDraw = strokes.length ? Math.min(...strokes.map((s) => s.t0)) : Infinity;

  // the forced scroll starts with the first line and never stops
  for (const q of S) {
    if (q.t > firstDraw + 0.3 && q.x < SCROLL * (q.t - firstDraw) - 26 - 40) return bad('behind');
    if (q.h < -620) return bad('below');
  }

  // hazards: the centre of the ball can never be inside one
  for (const hz of C.hazards) {
    const x0 = hz.x + 3, x1 = hz.x + hz.w - 3, h0 = hz.hBot + 3, h1 = hz.hTop - 3;
    if (hz.x > maxX + 20) break;
    for (const q of S) if (q.x > x0 && q.x < x1 && q.h > h0 && q.h < h1) return bad('hazard');
  }

  // ground: printed, or drawn by then
  const CELL = 64, grid = new Map();
  const add = (x0, y0, x1, y1, t) => {
    const a = Math.floor(Math.min(x0, x1) / CELL), b = Math.floor(Math.max(x0, x1) / CELL);
    for (let i = a; i <= b; i++) { let arr = grid.get(i); if (!arr) grid.set(i, arr = []); arr.push([x0, y0, x1, y1, t]); }
  };
  for (const f of C.printed) for (let i = 1; i < f.pts.length; i++) add(f.pts[i - 1][0], f.pts[i - 1][1], f.pts[i][0], f.pts[i][1], -1);
  let drawn = 0;
  for (const s of strokes) for (let i = 1; i < s.pts.length; i++) {
    const a = s.pts[i - 1], b = s.pts[i];
    drawn += Math.hypot(b[0] - a[0], b[1] - a[1]);
    add(a[0], a[1], b[0], b[1], s.t0);
  }
  let grounded = 0, unsupported = 0;
  for (const q of S) {
    if (!q.g) continue;
    grounded++;
    let ok = false;
    const c = Math.floor(q.x / CELL);
    for (let i = c - 1; i <= c + 1 && !ok; i++) {
      const arr = grid.get(i);
      if (!arr) continue;
      for (const sg of arr) {
        if (sg[4] > q.t + 0.15) continue;
        if (segDist(q.x, q.h, sg[0], sg[1], sg[2], sg[3]) <= BALL_R + 6) { ok = true; break; }
      }
    }
    if (!ok) unsupported++;
  }
  if (grounded > 10 && unsupported > Math.max(3, grounded * 0.04)) return bad('unsupported');

  // ink: what was drawn fits the well and the blots the run went past
  let passed = 0;
  for (const d of C.drops) {
    if (d.x > maxX + 30) continue;                 // not in x order
    for (let i = 1; i < S.length; i++) {
      const a = S[i - 1], b = S[i];
      if (Math.max(a.x, b.x) < d.x - 40 || Math.min(a.x, b.x) > d.x + 40) continue;
      if (segDist(d.x, d.h, a.x, a.h, b.x, b.h) <= 24 + 14) { passed++; break; }
    }
  }
  if (blots > passed) return bad('blots');
  if (spent > cfg.ink + blots * cfg.drop + 40) return bad('ink');
  if (drawn > spent * 1.03 + 60) return bad('drawn');

  return { ok: true, dist: Math.min(dist, traceDist), time: last.t, maxX };
}

module.exports = { verifyRun };
