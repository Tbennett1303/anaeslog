/* THE INKLINE — course generator.
 *
 * One generator feeds every procedural mode: Endless (a random seed per run),
 * Daily (a seed from the UTC date, the same course for everyone) and Zen. The
 * leaderboard function loads this same file to rebuild the course a submitted
 * run was played on, so a seed has to give the same course on every device:
 * nothing in here reads the screen, the clock or Math.random, and it uses no
 * transcendental maths (sin, exp, pow) whose last bits may differ between
 * JavaScript engines. Only + − × ÷, sqrt and integer ops.
 *
 * Geometry comes out in the campaign's level format, in units above the ground
 * line (h), so the game and the server read it the same way:
 *   printed  {pts:[[x,h],…], cont:true}    ground, streamed in pieces that join
 *   hazards  {x, w, hTop, hBot, kind}      rock | block | ceil
 *   drops    {x, h}                        ink blots
 *   notes    blueprint annotations (dimensions, clearances)
 *
 * The course is built from chunks, each solvable on its own, and each carrying
 * a cautious reference solution (strokes a sensible player would draw). An ink
 * ledger runs that reference player along the course and puts a blot on the
 * floor ahead wherever they would otherwise dip below a reserve, so the course
 * can always be survived by reasonable drawing and wasteful drawing runs dry.
 * The slack in that ledger narrows as difficulty rises.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.InkGen = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const VERSION = 1;
  const U = 20;                  // world units per metre (Inky is one metre across)
  const START_X = 110;           // where Inky stands at the start of every run
  const OPEN_X0 = -320, OPEN_X1 = 620;
  const BAND_LO = -70, BAND_HI = 150;

  const CONFIG = {
    endless: { ink: 2400, drop: 500, K: 10000, d0: 0,    drops: true },
    daily:   { ink: 2400, drop: 500, K: 10000, d0: 0.12, drops: true },
    zen:     { ink: 2400, drop: 500, K: 12000, d0: 0,    drops: false },
  };
  const RESERVE = 0.22;          // the reference player never dips below this share of the well

  /* ── seeds ───────────────────────────────────────────────────────────── */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function fnv(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return h >>> 0;
  }
  function utcDay(ms) { return new Date(ms).toISOString().slice(0, 10); }
  function dailySeed(day) { return fnv('inkline/daily/' + day); }
  function seedLabel(seed) { return ('0000000' + (seed >>> 0).toString(16)).slice(-8).slice(0, 5); }

  const r2 = function (v) { return Math.round(v * 100) / 100; };
  const lerp = function (a, b, t) { return a + (b - a) * t; };
  const clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  /* A printed line through control points [x, h]: monotone cubic, never
     overshoots, flat at peaks and valleys. The same curve the campaign uses. */
  function path(ctrl) {
    const n = ctrl.length, xs = ctrl.map(function (q) { return q[0]; }), ys = ctrl.map(function (q) { return q[1]; });
    const d = [], m = new Array(n);
    for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
    m[0] = d[0]; m[n - 1] = d[n - 2];
    for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
      const a = m[i] / d[i], b = m[i + 1] / d[i], q = a * a + b * b;
      if (q > 9) { const k = 3 / Math.sqrt(q); m[i] = k * a * d[i]; m[i + 1] = k * b * d[i]; }
    }
    const out = [];
    for (let i = 0; i < n - 1; i++) {
      const x0 = xs[i], w = xs[i + 1] - x0, steps = Math.max(2, Math.round(w / 10));
      for (let k = 0; k < steps; k++) {
        const t = k / steps, t2 = t * t, t3 = t2 * t;
        out.push([r2(x0 + w * t), r2((2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * w * m[i]
                                  + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * w * m[i + 1])]);
      }
    }
    out.push([r2(xs[n - 1]), r2(ys[n - 1])]);
    return out;
  }
  function polyLen(pts) {
    let L = 0;
    for (let i = 1; i < pts.length; i++) L += Math.sqrt((pts[i][0] - pts[i - 1][0]) * (pts[i][0] - pts[i - 1][0]) + (pts[i][1] - pts[i - 1][1]) * (pts[i][1] - pts[i - 1][1]));
    return L;
  }

  /* how much a chunk wants before it: enough floor to settle and to read it */
  const APPROACH = { gap: 150, step: 180, ledge: 130, rock: 170, block: 300, tunnel: 280,
                     tgap: 300, hill: 130, valley: 130, stubs: 160 };

  /* ── the course ──────────────────────────────────────────────────────── */
  function Course(opts) {
    opts = opts || {};
    this.mode = CONFIG[opts.mode] ? opts.mode : 'endless';
    this.cfg = Object.assign({}, CONFIG[this.mode], opts.cfg || {});
    this.seed = (opts.seed >>> 0);
    this.rnd = mulberry32(this.seed ^ 0x5bd1e995);
    this.printed = []; this.hazards = []; this.drops = []; this.notes = [];
    this.chunks = []; this.refs = [];
    this.inkRef = this.cfg.ink;            // the reference player's well
    this.x = OPEN_X0; this.h = 0;
    this.piece = [[OPEN_X0, 0]];
    this.run(OPEN_X1 - OPEN_X0);
    this.flush();
    this.last = 'start';
    this.n = 0;
  }
  const C = Course.prototype;

  C.diff = function (x) {
    /* an S-curve: gentle for the first hundred metres, half way at K, and
       approaching (never reaching) the hardest the generator makes */
    const k = Math.max(0, x - START_X) / this.cfg.K;
    return this.cfg.d0 + (1 - this.cfg.d0) * k * k / (k * k + 1);
  };

  /* floor primitives: an open polyline extended in place */
  C.pt = function (x, h) { this.piece.push([r2(x), r2(h)]); this.x = x; this.h = h; };
  C.run = function (L) {
    if (L <= 0) return;
    const x0 = this.x, h = this.h, n = Math.max(1, Math.round(L / 10));
    for (let k = 1; k <= n; k++) this.pt(x0 + L * k / n, h);
  };
  C.ease = function (L, dh) {                 // smoothstep: flat at both ends
    const x0 = this.x, h0 = this.h, n = Math.max(2, Math.round(L / 10));
    for (let k = 1; k <= n; k++) { const t = k / n; this.pt(x0 + L * t, h0 + dh * t * t * (3 - 2 * t)); }
  };
  C.flush = function () {
    if (this.piece && this.piece.length >= 2) {
      this.printed.push({ pts: this.piece, cont: true });
      const e = this.piece[this.piece.length - 1];
      this.piece = [[e[0], e[1]]];
    }
  };
  C.close = function () { this.flush(); this.piece = null; };
  C.open = function (x, h) { this.piece = [[r2(x), r2(h)]]; this.x = x; this.h = h; };

  C.hazard = function (x, w, hTop, hBot, kind) {
    this.hazards.push({ x: r2(x), w: r2(w), hTop: r2(hTop), hBot: r2(hBot), kind: kind });
  };
  C.ref = function (pts, c) {
    const s = { at: r2(pts[0][0] - 200), pts: pts.map(function (q) { return [r2(q[0]), r2(q[1])]; }) };
    s.len = polyLen(s.pts);
    this.refs.push(s);
    c.need += s.len;
  };

  /* which chunk next: variety, a height band, and the difficulty curve */
  C.pick = function (d) {
    const h = this.h, last = this.last, rnd = this.rnd;
    if (this.n === 0) return 'gap';                      // the first thing on the page: keep the line going
    if (this.n === 1) return 'rock';
    const w = {
      gap:    1.4,
      rock:   1.0,
      ledge:  h > -20 ? 0.7 : 0,
      step:   d > 0.04 && h < 95 ? 0.35 + 0.8 * d : 0,
      hill:   0.75,
      valley: h > 0 ? 0.6 : 0,
      tunnel: d > 0.1 ? 0.35 + 0.6 * d : 0,
      block:  d > 0.18 ? 0.25 + 0.7 * d : 0,
      stubs:  d > 0.24 ? 0.3 + 0.8 * d : 0,
      tgap:   d > 0.38 ? 0.7 * d : 0,
    };
    if (h > 80) { w.ledge *= 2.2; w.valley *= 1.8; w.step = 0; }
    if (h < -30) { w.step *= 2.2; w.hill *= 1.6; }
    if (last !== 'gap') w[last] = 0;                     // never the same thing twice running
    else w.gap *= 0.5;
    let tot = 0;
    for (const k in w) tot += w[k];
    let v = rnd() * tot;
    for (const k in w) { v -= w[k]; if (v <= 0 && w[k] > 0) return k; }
    return 'gap';
  };

  /* one chunk: settle-in floor, then the feature */
  C.next = function () {
    const d = this.diff(this.x), rnd = this.rnd;
    const kind = this.pick(d);
    let A = 0;
    if (this.n > 0) {
      const rest = lerp(260, 110, d) + rnd() * lerp(220, 90, d);
      A = Math.max(APPROACH[kind] || 150, rest);
      if ((kind === 'tunnel' || kind === 'tgap' || kind === 'block') &&
          (this.last === 'step' || this.last === 'ledge' || this.last === 'stubs')) A += 120;
      if (this.cfg.drops && this.inkRef < 0.45 * this.cfg.ink) A = Math.max(A, kind === 'stubs' ? 300 : 210);   // room for blots
    }
    const a0 = this.x;
    this.run(A);
    const c = { i: this.n, kind: kind, x0: r2(this.x), a0: r2(a0), d: Math.round(d * 1000) / 1000, need: 0 };
    this['k_' + kind](d, c);
    c.x1 = r2(this.x);
    this.flush();

    /* the ledger: a cautious player uses more line than the reference, and
       less so as the course asks more of them */
    const f = 1.6 - 0.45 * d;
    const need = c.need * f;
    c.cost = Math.round(need);
    if (this.cfg.drops) {
      let slot = 0;
      const reserve = (RESERVE - 0.08 * d) * this.cfg.ink;       // less to spare, further on
      while (this.inkRef - need < reserve && slot < 3) {
        const dx = a0 + 45 + slot * 85;
        if (dx > c.x0 - 20 && slot > 0) break;
        this.drops.push({ x: r2(Math.min(dx, c.x0 - 10)), h: r2(this.floorAt(Math.min(dx, c.x0 - 10)) + 22) });
        this.inkRef = Math.min(this.cfg.ink, this.inkRef + this.cfg.drop);
        slot++;
      }
      this.inkRef -= need;
      c.inkRef = Math.round(this.inkRef);
    }
    this.chunks.push(c);
    this.last = kind;
    this.n++;
  };

  /* the floor height under x, from what has been printed (approach runs are flat) */
  C.floorAt = function (x) {
    for (let i = this.printed.length - 1; i >= 0; i--) {
      const p = this.printed[i].pts;
      if (x < p[0][0] || x > p[p.length - 1][0]) continue;
      for (let k = 1; k < p.length; k++) if (p[k][0] >= x) {
        const a = p[k - 1], b = p[k], t = b[0] > a[0] ? (x - a[0]) / (b[0] - a[0]) : 0;
        return a[1] + (b[1] - a[1]) * t;
      }
    }
    if (this.piece) for (let k = 1; k < this.piece.length; k++) if (this.piece[k][0] >= x) {
      const a = this.piece[k - 1], b = this.piece[k], t = b[0] > a[0] ? (x - a[0]) / (b[0] - a[0]) : 0;
      return a[1] + (b[1] - a[1]) * t;
    }
    return this.h;
  };

  /* ── the chunks ──────────────────────────────────────────────────────── */
  /* a gap: bridge it */
  C.k_gap = function (d, c) {
    const rnd = this.rnd;
    const w = lerp(110, 250, d) + rnd() * lerp(50, 150, d);
    let dh = (rnd() * 2 - 1) * lerp(14, 45, d);
    const x0 = this.x, h0 = this.h;
    const h1 = clamp(h0 + dh, BAND_LO + 10, BAND_HI - 10);
    this.close();
    this.open(x0 + w, h1);
    this.run(130);
    this.ref([[x0 - 40, h0 + 0.5], [x0 + w, h1 + 2], [x0 + w + 40, h1 + 0.5]], c);
    this.notes.push({ t: 'dim', x0: r2(x0), x1: r2(x0 + w), h: r2(Math.max(h0, h1) + 90), label: String(Math.round(w) * 10) });
  };

  /* a step up: a ramp that meets the ledge on top */
  C.k_step = function (d, c) {
    const rnd = this.rnd;
    const w = lerp(100, 140, d) + rnd() * 60;
    const dh = Math.min(BAND_HI - this.h, lerp(35, 70, d) + rnd() * lerp(15, 50, d));
    const x0 = this.x, h0 = this.h, h1 = h0 + dh;
    this.close();
    this.open(x0 + w, h1);
    this.run(270);
    this.ref(path([[x0 - 100, h0 + 0.5], [x0 - 30, h0 + 3], [x0 + w + 15, h1 + 3], [x0 + w + 70, h1 + 1]]), c);
    this.notes.push({ t: 'arrow', x: r2(x0 - 60), h: r2(h1 + 60), dx: 110, label: 'UP' });
  };

  /* a ledge: a free fall onto the floor below. Nothing to draw. */
  C.k_ledge = function (d, c) {
    const rnd = this.rnd;
    const dh = Math.min(this.h - BAND_LO, lerp(40, 70, d) + rnd() * lerp(20, 60, d));
    const x0 = this.x;
    this.close();
    this.open(x0, this.h - dh);
    this.run(300);
  };

  /* a rock (or two) on the floor: draw over it */
  C.k_rock = function (d, c) {
    const rnd = this.rnd, h = this.h;
    this.run(30);
    const w1 = 22 + rnd() * 10, t1 = 22 + rnd() * lerp(8, 16, d);
    const x1 = this.x;
    this.hazard(x1, w1, h + t1, h - 4, 'rock');
    this.run(w1);
    let xe = x1 + w1, top = t1;
    if (d > 0.3 && rnd() < 0.4) {
      this.run(80 + rnd() * 50);
      const w2 = 22 + rnd() * 10, t2 = 22 + rnd() * lerp(8, 16, d);
      this.hazard(this.x, w2, h + t2, h - 4, 'rock');
      this.run(w2);
      xe = this.x; top = Math.max(t1, t2);
    }
    this.run(230);
    this.ref(path([[x1 - 85, h + 0.5], [x1 - 18, h + top + 13], [xe + 18, h + top + 13], [xe + 85, h + 0.5]]), c);
  };

  /* a block: ramp over it, or flick over it; either way a long run-out */
  C.k_block = function (d, c) {
    const rnd = this.rnd, h = this.h;
    const w = 60 + rnd() * lerp(20, 50, d), top = 50 + rnd() * lerp(10, 30, d);
    const x0 = this.x;
    this.hazard(x0, w, h + top, h - 4, 'block');
    this.run(w);
    this.run(450);
    this.ref(path([[x0 - 130, h + 0.5], [x0 - 20, h + top + 16], [x0 + w + 20, h + top + 16], [x0 + w + 130, h + 0.5]]), c);
  };

  /* a tunnel: a ceiling over a level floor. Stay low. */
  C.k_tunnel = function (d, c) {
    const rnd = this.rnd, h = this.h;
    const L = 160 + rnd() * lerp(60, 160, d), clr = lerp(66, 50, d) + rnd() * 8;
    const x0 = this.x;
    this.hazard(x0, L, h + clr + 600, h + clr, 'ceil');
    this.run(L);
    this.run(180);
    this.notes.push({ t: 'vdim', x: r2(x0 + 24), h0: r2(h), h1: r2(h + clr), label: 'CLR ' + Math.round(clr) * 10 });
  };

  /* a tunnel with the floor missing inside it: a low, level bridge */
  C.k_tgap = function (d, c) {
    const rnd = this.rnd, h = this.h;
    const L = 320 + rnd() * 80, clr = 70 + rnd() * 8;
    const x0 = this.x;
    const gx = x0 + 70 + rnd() * 40, gw = 90 + rnd() * lerp(40, 110, d);
    this.hazard(x0, L, h + clr + 600, h + clr, 'ceil');
    this.run(gx - x0);
    this.close();
    this.open(gx + gw, h);
    this.run(Math.max(40, x0 + L - (gx + gw)));
    this.run(200);
    this.ref([[gx - 45, h + 0.5], [gx + gw + 45, h + 0.5]], c);
    this.notes.push({ t: 'vdim', x: r2(x0 + 24), h0: r2(h), h1: r2(h + clr), label: 'CLR ' + Math.round(clr) * 10 });
  };

  /* a hill: curvature is bounded (R >= ~260) so the crest cannot throw him */
  C.k_hill = function (d, c) {
    const rnd = this.rnd;
    const H = 30 + rnd() * lerp(15, 45, d);
    const w1 = Math.max(300, Math.sqrt(1600 * H)) + rnd() * 80;
    const plateau = rnd() * 120;
    const end = clamp((rnd() * 2 - 1) * 25, BAND_LO - this.h + 10, BAND_HI - this.h - 10);
    const w2 = Math.max(300, Math.sqrt(1600 * Math.abs(H - end))) + rnd() * 60;
    this.ease(w1, H);
    this.run(plateau);
    this.ease(w2, end - H);
    this.run(120);
  };

  /* a valley: speed on the way down, momentum on the way up */
  C.k_valley = function (d, c) {
    const rnd = this.rnd;
    const D = Math.min(this.h - BAND_LO, 35 + rnd() * lerp(20, 50, d));
    const w1 = Math.max(300, Math.sqrt(1600 * D)) + rnd() * 60;
    const bottom = rnd() * 100;
    const end = clamp((rnd() * 2 - 1) * 20, BAND_LO - this.h + 10, BAND_HI - this.h - 10);
    const w2 = Math.max(300, Math.sqrt(1600 * Math.abs(D + end))) + rnd() * 60;
    this.ease(w1, -D);
    this.run(bottom);
    this.ease(w2, D + end);
    this.run(120);
  };

  /* stubs: short printed pieces across a pit. They carry some of the line. */
  C.k_stubs = function (d, c) {
    const rnd = this.rnd;
    const n = 2 + (rnd() < 0.3 + 0.4 * d ? 1 : 0);
    const x0 = this.x, h0 = this.h;
    let xa = x0, ha = h0;                      // the end of the last solid thing
    this.close();
    for (let i = 0; i <= n; i++) {
      const last = i === n;
      const xb = xa + lerp(130, 190, d) + rnd() * lerp(30, 60, d);
      const hb = last ? clamp(h0 + (rnd() * 2 - 1) * 30, BAND_LO + 10, BAND_HI - 10)
                      : clamp(ha + (rnd() * 2 - 1) * lerp(30, 65, d), BAND_LO + 10, BAND_HI - 10);
      const sw = last ? 230 : 70 + rnd() * 30;
      this.open(xb, hb);
      this.run(sw);
      if (!last) this.close();
      this.ref([[xa - 30, ha + 0.5], [xb, hb + 2], [xb + 30, hb + 0.5]], c);
      xa = xb + sw; ha = hb;
    }
  };

  /* build ahead until the course reaches x */
  C.ensure = function (x) {
    let guard = 0;
    while (this.x < x && guard++ < 400) this.next();
    return this;
  };

  /* the level record the game reads: a live view onto the growing arrays */
  C.level = function (id, name) {
    return { id: id, world: this.mode === 'daily' ? 'blueprint' : 'notebook', name: name,
             ink: this.cfg.ink, drop: this.cfg.drop, finish: Infinity,
             printed: this.printed, plinths: [], hazards: this.hazards, drops: this.drops, notes: this.notes };
  };

  function metres(x) { return Math.max(0, (x - START_X) / U); }
  function units(m) { return m * U + START_X; }

  /* One number that sorts a daily run: distance first (tenths of a metre),
     then the time taken to get there, sooner being better. */
  function score(distM, timeS) {
    const d = Math.max(0, Math.min(999999, Math.floor(distM * 10 + 1e-6)));
    const t = Math.max(0, Math.min(99999, Math.round(timeS * 10)));
    return d * 100000 + (99999 - t);
  }

  return {
    VERSION: VERSION, U: U, START_X: START_X, CONFIG: CONFIG, RESERVE: RESERVE,
    Course: Course, create: function (opts) { return new Course(opts); },
    mulberry32: mulberry32, fnv: fnv, utcDay: utcDay, dailySeed: dailySeed, seedLabel: seedLabel,
    path: path, polyLen: polyLen, metres: metres, units: units, score: score,
  };
});
