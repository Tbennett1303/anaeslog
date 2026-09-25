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

  const VERSION = 2;
  const U = 20;                  // world units per metre (Inky is one metre across)
  const START_X = 110;           // where Inky stands at the start of every run
  const REGION_UNITS = 300 * U;  // Endless changes material every 300 metres
  const REGION_BUFFER = 150;     // 7.5 metres of plain ground on each side of the line

  /* Antigravity (Endless only). Gravity changes only at a gravity line, a
     place in the course the player can see coming. An upside-down stretch is
     the mirror image of an ordinary one about h = MIRROR / 2: the generator
     builds it the ordinary way and marks it `inv`, and whoever draws or plays
     it reflects every height h to MIRROR - h. Because the physics is the same
     mirrored, every chunk, its reference line and its ink cost stay exactly
     as fair upside down as the right way up. */
  const MIRROR = 80;             // h -> 80 - h: the course's height band maps onto itself
  const FLIP_H = -30;            // the floor at a gravity line (the far side's is at 110): 120 to fall
  const FLIP_OUT = 520;          // plain ground on the far side: fall, land, look round
  const FIRST_FLIP_M = 200;      // the first ANTIGRAVITY line
  const OPEN_X0 = -320, OPEN_X1 = 620;
  const BAND_LO = -70, BAND_HI = 150;

  /* M: the distance (in metres) at which difficulty is half way. The curve
     is steep on purpose: a few seconds to settle, a proper test by 100 m,
     the spirit of the original level by 300 m, and fiendish after that. */
  const CONFIG = {
    endless: { ink: 2400, drop: 500, M: 170, d0: 0,    drops: true, flips: true },
    daily:   { ink: 2400, drop: 500, M: 170, d0: 0.08, drops: true },
    zen:     { ink: 2400, drop: 500, M: 240, d0: 0,    drops: false },
  };
  const RESERVE = 0.2;           // the reference player's floor at the start; it narrows to 0.04

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
                     tgap: 300, hill: 130, valley: 130, stubs: 160, void: 140, perch: 170,
                     low: 200, high: 300, launch: 120 };
  /* chunks that need Inky settled and rolling before them; the rest can come
     hard on the heels of the last thing, further on */
  const SETTLE = { block: 1, tunnel: 1, tgap: 1, low: 1, high: 1 };

  /* ── the course ──────────────────────────────────────────────────────── */
  function Course(opts) {
    opts = opts || {};
    this.mode = CONFIG[opts.mode] ? opts.mode : 'endless';
    this.cfg = Object.assign({}, CONFIG[this.mode], opts.cfg || {});
    this.seed = (opts.seed >>> 0);
    this.rnd = mulberry32(this.seed ^ 0x5bd1e995);
    this.printed = []; this.hazards = []; this.drops = []; this.notes = [];
    this.chunks = []; this.refs = []; this.runins = [];
    this.inkRef = this.cfg.ink;            // the reference player's well
    this.x = OPEN_X0; this.h = 0;
    this.piece = [[OPEN_X0, 0]];
    this.run(OPEN_X1 - OPEN_X0);
    this.flush();
    this.last = 'start';
    this.n = 0;
    this.inv = false;                      // building an upside-down stretch
    this.flips = [];                       // x of every gravity line so far
    this.nextFlip = this.cfg.flips ? units(FIRST_FLIP_M) : Infinity;
  }
  const C = Course.prototype;

  C.diff = function (x) {
    /* rises fast: about 0.37 at 100 m, 0.64 at 300 m, 0.75 at 500 m, and on
       towards 1, which is the hardest the chunks are ever made */
    const m = Math.max(0, x - START_X) / U;
    const base = this.cfg.d0 + (1 - this.cfg.d0) * m / (m + this.cfg.M);
    /* past 600 m it keeps climbing beyond the ordinary scale: a long run
       should be worth showing someone */
    return Math.min(1.2, base + Math.max(0, m - 600) / 2500);
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
      this.printed.push(this.inv ? { pts: this.piece, cont: true, inv: 1 } : { pts: this.piece, cont: true });
      const e = this.piece[this.piece.length - 1];
      this.piece = [[e[0], e[1]]];
    }
  };
  C.close = function () { this.flush(); this.piece = null; };
  C.open = function (x, h) { this.piece = [[r2(x), r2(h)]]; this.x = x; this.h = h; };

  C.hazard = function (x, w, hTop, hBot, kind) {
    const hz = { x: r2(x), w: r2(w), hTop: r2(hTop), hBot: r2(hBot), kind: kind };
    if (this.inv) hz.inv = 1;
    this.hazards.push(hz);
  };
  /* which way gravity pulls at x: the number of gravity lines at or before it */
  C.invAt = function (x) {
    let n = 0;
    for (let i = 0; i < this.flips.length && this.flips[i] <= x; i++) n++;
    return (n & 1) === 1;
  };
  C.ref = function (pts, c) {
    const inv = this.inv;                  // reference lines are kept the right way up: they are drawn as they are
    const s = { at: r2(pts[0][0] - 200), pts: pts.map(function (q) { return [r2(q[0]), r2(inv ? MIRROR - q[1] : q[1])]; }) };
    s.len = polyLen(s.pts);
    this.refs.push(s);
    c.need += s.len;
  };

  /* which chunk next: variety, a height band, and the difficulty curve */
  C.pick = function (d) {
    const h = this.h, last = this.last, rnd = this.rnd;
    if (this.n === 0) return 'gap';                      // the first thing on the page: keep the line going
    if (this.n === 1) return 'rock';
    if (this.n === 2) return 'void';
    /* mostly ground you draw yourself, as the original level was; printed
       hills and valleys are only for breath */
    const w = {
      gap:    1.0 - 0.5 * d,
      void:   0.9 + 0.2 * d,
      rock:   0.8 - 0.4 * d,
      ledge:  h > -20 ? 0.45 - 0.2 * d : 0,
      step:   h < 95 ? 0.5 + 1.3 * d : 0,
      hill:   0.3 * (1 - d),
      valley: h > 0 ? 0.25 * (1 - d) : 0,
      tunnel: d > 0.1 ? 0.35 * (1 - d) : 0,
      block:  d > 0.15 ? 0.3 + 0.5 * d : 0,
      stubs:  d > 0.2 ? 0.4 + 1.3 * d : 0,
      tgap:   d > 0.3 ? 0.3 + 0.9 * d : 0,
      perch:  d > 0.2 && h < 60 ? 0.4 + 1.3 * d : 0,
      low:    d > 0.25 && h > -10 ? 0.4 + 1.0 * d : 0,
      high:   d > 0.3 ? 0.35 + 0.4 * d : 0,
      launch: d > 0.3 && h > -10 ? 0.4 + 0.7 * d : 0,
    };
    if (h > 80) { w.ledge *= 2.2; w.valley *= 1.8; w.low *= 1.8; w.step = 0; w.perch = 0; }
    if (h < -30) { w.step *= 2.2; w.hill *= 1.6; w.perch *= 1.5; }
    if (last !== 'gap' && last !== 'void') w[last] = 0;  // never the same thing twice running
    else w[last] *= 0.4;
    let tot = 0;
    for (const k in w) tot += w[k];
    let v = rnd() * tot;
    for (const k in w) { v -= w[k]; if (v <= 0 && w[k] > 0) return k; }
    return 'gap';
  };

  /* one chunk: settle-in floor, then the feature */
  C.nextChunk = function () {
    /* upside down is new to everyone: the first stretch is a good deal
       gentler than the ground either side of it, later ones a little */
    const d = this.diff(this.x) * (this.inv ? (this.flips.length <= 1 ? 0.55 : 0.8) : 1), rnd = this.rnd;
    const notes0 = this.notes.length, drops0 = this.drops.length;
    const kind = this.pick(d);
    let A = 0;
    if (this.n > 0) {
      /* the breath before it: shorter further on, and gone altogether after a
         landing when the next thing can follow straight away */
      const rest = lerp(190, 30, d) + rnd() * lerp(150, 30, d);
      const need = SETTLE[kind] ? APPROACH[kind] : APPROACH[kind] * lerp(1, 0.5, d);
      A = Math.max(need, rest);
      if (this.tight && !SETTLE[kind]) A = Math.min(A, 40 + rnd() * 60);
      this.tight = false;
      if (SETTLE[kind] && (this.last === 'step' || this.last === 'ledge' || this.last === 'stubs' ||
                           this.last === 'perch' || this.last === 'launch' || this.last === 'void')) A += 150;   // let a hop land first
      if (this.cfg.drops && this.inkRef < 0.5 * this.cfg.ink) A = Math.max(A, kind === 'stubs' || kind === 'void' || kind === 'perch' ? 300 : 210);   // room for blots
    }
    const a0 = this.x;
    this.run(A);
    const c = { i: this.n, kind: kind, x0: r2(this.x), a0: r2(a0), d: Math.round(d * 1000) / 1000, need: 0 };
    const refStart = this.refs.length, dropStart = this.drops.length;
    this['k_' + kind](d, c);
    c.x1 = r2(this.x);
    this.flush();

    /* the ledger: a cautious player uses more line than the reference, and
       less so as the course asks more of them */
    const f = Math.max(1.03, lerp(1.5, 1.06, d));
    const need = c.need * f;
    c.cost = Math.round(need);
    if (this.cfg.drops) {
      const reserve = Math.max(0.03, lerp(0.2, 0.04, d)) * this.cfg.ink;       // less to spare, further on
      /* blots go on the floor before the feature: its own approach first, and
         when that is short, further back on whatever floor came before */
      /* only on floor Inky is known to roll along: this chunk's run-in first,
         then earlier run-ins, newest first (never under a ramp or where he
         would be in the air) */
      const cand = [];
      if (c.x0 - a0 >= 40) for (let x = a0 + Math.min(45, (c.x0 - a0) / 2); x < c.x0 - 10; x += 85) cand.push(x);
      for (let j = this.runins.length - 1; j >= 0 && cand.length < 30; j--) {
        const r = this.runins[j];
        for (let x = r[0]; x < r[1]; x += 85) cand.push(x);
      }
      for (let i = 0; i < cand.length && this.inkRef - need < reserve; i++) {
        const x = cand[i], fl = this.solidAt(x);
        if (fl === null || this.hazardNear(x, 45) || this.drops.some(function (q) { return Math.abs(q.x - x) < 60; })) continue;
        this.drops.push(this.invAt(x) ? { x: r2(x), h: r2(fl + 22), inv: 1 } : { x: r2(x), h: r2(fl + 22) });
        this.inkRef = Math.min(this.cfg.ink, this.inkRef + this.cfg.drop);
      }
      // (appended, not sorted: a course built in steps must equal one built at once)
      this.inkRef -= need;
      c.inkRef = Math.round(this.inkRef);
      /* the reference player picks the blots up before drawing what they pay
         for (a person draws as they go and grabs them on the way) */
      let lastBlot = -Infinity;
      for (let i = dropStart; i < this.drops.length; i++) if (this.drops[i].x > lastBlot) lastBlot = this.drops[i].x;
      if (lastBlot > -Infinity) for (let i = refStart; i < this.refs.length; i++) {
        const r = this.refs[i];
        if (lastBlot < r.pts[0][0]) r.at = r2(Math.max(r.at, lastBlot + 12));
      }
    }
    if (c.x0 - a0 >= 80) { this.runins.push([a0 + 30, c.x0 - 20]); if (this.runins.length > 8) this.runins.shift(); }
    if (this.inv) {
      c.inv = 1;
      for (let i = notes0; i < this.notes.length; i++) this.notes[i].inv = 1;
      for (let i = drops0; i < this.drops.length; i++) if (this.drops[i].b) this.drops[i].inv = 1;
    }
    this.chunks.push(c);
    this.last = kind;
    this.n++;
    /* further on, one thing lands you straight into the next */
    if (!this.tight && d > 0.35 && (kind === 'gap' || kind === 'step' || kind === 'stubs' || kind === 'perch' || kind === 'rock' || kind === 'block') && rnd() < d)
      this.tight = true;
  };

  /* Two things in Endless want a plain stretch of ground around them: the
     line where one world's material becomes the next (every 300 m), and a
     gravity line. Try the next normal chunk first; if it would reach the
     protected stretch, discard that chunk and finish the approach plainly.
     Random numbers consumed by a discarded chunk are fine: generation is
     still deterministic whether ensure() is called once or in many steps. */
  C.next = function () {
    if (this.mode !== 'endless') { this.nextChunk(); return; }
    const boundary = START_X + Math.max(1, Math.floor((this.x - START_X) / REGION_UNITS) + 1) * REGION_UNITS;
    let ev = { kind: 'region', from: boundary - REGION_BUFFER, at: boundary };
    if (this.nextFlip < Infinity) {
      /* long enough to bring the floor to the gravity line's height gently */
      const lead = 120 + Math.max(160, 2.6 * Math.abs(FLIP_H - this.h));
      if (this.nextFlip - lead < ev.from) ev = { kind: 'flip', from: this.nextFlip - lead, at: this.nextFlip };
    }
    const bridge = () => { if (ev.kind === 'flip') this.flipBridge(); else this.regionBridge(boundary); };
    if (this.x >= ev.from) { bridge(); return; }

    const s = { x: this.x, h: this.h, piece: this.piece && this.piece.map(q => q.slice()),
                printed: this.printed.length, hazards: this.hazards.length, drops: this.drops.length,
                notes: this.notes.length, chunks: this.chunks.length, refs: this.refs.length,
                runins: this.runins.map(q => q.slice()), inkRef: this.inkRef,
                last: this.last, n: this.n, tight: this.tight };
    /* a few tries for something that fits before the stretch, so the plain
       ground before a line stays short */
    for (let tries = 0; tries < (ev.from - this.x > 260 ? 4 : 1); tries++) {
      this.nextChunk();
      if (this.x <= ev.from) return;
      this.x = s.x; this.h = s.h; this.piece = s.piece && s.piece.map(q => q.slice());
      this.printed.length = s.printed; this.hazards.length = s.hazards;
      this.drops.length = s.drops; this.notes.length = s.notes;
      this.chunks.length = s.chunks; this.refs.length = s.refs;
      this.runins = s.runins.map(q => q.slice()); this.inkRef = s.inkRef;
      this.last = s.last; this.n = s.n; this.tight = s.tight;
    }
    bridge();
  };

  /* a world's edge: plain ground across the line */
  C.regionBridge = function (boundary) {
    const from = boundary - REGION_BUFFER, to = boundary + REGION_BUFFER;
    const x0 = this.x;
    const approach = Math.max(0, from - x0);
    if (approach > 400) {                // a gentle contour before the level crossing
      const rise = this.h > 80 ? -12 : 12;
      this.ease(approach / 2, rise);
      this.ease(approach / 2, -rise);
    }
    this.run(to - this.x);
    this.flush();
    if (to - x0 >= 80) {
      this.runins.push([x0 + 30, to - 20]);
      if (this.runins.length > 8) this.runins.shift();
    }
    this.chunks.push({ i: this.n++, kind: 'region', a0: r2(x0), x0: r2(x0), x1: r2(to),
                       d: Math.round(this.diff(x0) * 1000) / 1000, cost: 0,
                       inkRef: Math.round(this.inkRef), boundary: r2(boundary) });
    this.last = 'region'; this.tight = false;
  };

  /* A gravity line. The floor eases to FLIP_H and runs level to just past
     the line; on the far side a floor starts just before it, 120 units
     away in the direction Inky will now fall, and runs on plain for
     FLIP_OUT. He crosses, falls, lands on it without anything being drawn,
     and has the best part of two seconds to take in what happened. */
  C.flipBridge = function () {
    const x0 = this.x, dh = FLIP_H - this.h;
    const ease = Math.abs(dh) < 0.5 ? 0 : Math.max(160, 2.6 * Math.abs(dh));
    let at = Math.max(this.nextFlip, x0 + ease + 120);            // never steeper than the lead allows
    const kB = Math.round((at - START_X) / REGION_UNITS), B = START_X + kB * REGION_UNITS;
    if (kB >= 1 && at > B - 16 * U && at < B + 20 * U) at = B + 20 * U;
    at = r2(at);
    const L = at - 100 - x0;
    if (ease) this.ease(L, dh); else this.run(L);
    this.run(at + 40 - this.x);
    this.close();
    this.flips.push(at);
    this.inv = !this.inv;
    this.open(at - 40, FLIP_H);
    this.run(FLIP_OUT + 40);
    this.flush();
    /* blots only once he has landed on the far side */
    this.runins.push([at + 300, at + FLIP_OUT - 20]);
    if (this.runins.length > 8) this.runins.shift();
    const d = this.diff(at);
    this.chunks.push({ i: this.n++, kind: 'flip', a0: r2(x0), x0: r2(x0), x1: r2(this.x), at: at, inv: this.inv ? 1 : 0,
                       d: Math.round(d * 1000) / 1000, cost: 0, inkRef: Math.round(this.inkRef) });
    this.last = 'flip'; this.tight = false;
    /* the next line: a short first stretch upside down, longer ones later;
       the right way up in between, less of it the further you get */
    const dd = Math.min(1, d), rnd = this.rnd;
    const m = this.inv ? (this.flips.length === 1 ? 100 : lerp(90, 190, dd) + rnd() * 40)
                       : lerp(260, 110, dd) + rnd() * 60;
    let next = at + units(m) - START_X;
    /* never close to a world's edge: its line may cross the plain ground
       after the landing, but not the approach or the fall */
    const k = Math.round((next - START_X) / REGION_UNITS), E = START_X + k * REGION_UNITS;
    if (k >= 1 && next > E - 16 * U && next < E + 20 * U) next = next < E + 2 * U ? E - 16 * U : E + 20 * U;
    this.nextFlip = r2(next);
  };

  /* printed floor under x, or null over a gap; recent pieces only */
  C.solidAt = function (x) {
    for (let i = this.printed.length - 1; i >= Math.max(0, this.printed.length - 24); i--) {
      const p = this.printed[i].pts;
      if (x < p[0][0] || x > p[p.length - 1][0]) continue;
      for (let k = 1; k < p.length; k++) if (p[k][0] >= x) {
        const a = p[k - 1], b = p[k], t = b[0] > a[0] ? (x - a[0]) / (b[0] - a[0]) : 0;
        return a[1] + (b[1] - a[1]) * t;
      }
    }
    return null;
  };
  C.hazardNear = function (x, pad) {
    for (let i = this.hazards.length - 1; i >= Math.max(0, this.hazards.length - 8); i--) {
      const h = this.hazards[i];
      if (h.kind !== 'ceil' && x > h.x - pad && x < h.x + h.w + pad) return true;
    }
    return false;
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
    const w = lerp(140, 300, d) + rnd() * lerp(60, 150, d);
    let dh = (rnd() * 1.5 - 0.45) * lerp(22, 60, d);            // mostly up: meet it on top
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
    const w = lerp(110, 85, d) + rnd() * lerp(60, 40, d);           // steeper further on: aim matters more
    const dh = Math.min(BAND_HI - this.h, w + 45, lerp(50, 125, d) + rnd() * lerp(15, 45, d));   // never steeper than ~45°
    const x0 = this.x, h0 = this.h, h1 = h0 + dh;
    this.close();
    this.open(x0 + w, h1);
    this.run(lerp(270, 200, d));
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
    const w1 = 22 + rnd() * 14, t1 = lerp(26, 38, d) + rnd() * lerp(8, 18, d);
    const x1 = this.x;
    this.hazard(x1, w1, h + t1, h - 4, 'rock');
    this.run(w1);
    let xe = x1 + w1, top = t1;
    if (d > 0.25 && rnd() < 0.5) {
      this.run(80 + rnd() * 50);
      const w2 = 22 + rnd() * 14, t2 = lerp(26, 38, d) + rnd() * lerp(8, 18, d);
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
    const w = 60 + rnd() * lerp(20, 60, d), top = lerp(55, 85, d) + rnd() * lerp(10, 30, d);
    const x0 = this.x;
    this.hazard(x0, w, h + top, h - 4, 'block');
    this.run(w);
    this.run(lerp(450, 330, d));
    this.ref(path([[x0 - 130, h + 0.5], [x0 - 20, h + top + 16], [x0 + w + 20, h + top + 16], [x0 + w + 130, h + 0.5]]), c);
  };

  /* a tunnel: a ceiling over a level floor. Stay low. */
  C.k_tunnel = function (d, c) {
    const rnd = this.rnd, h = this.h;
    const L = 180 + rnd() * lerp(80, 200, d), clr = lerp(52, 36, d) + rnd() * 6;
    const x0 = this.x;
    this.hazard(x0, L, h + clr + 600, h + clr, 'ceil');
    this.run(L);
    this.run(180);
    this.notes.push({ t: 'vdim', x: r2(x0 + 24), h0: r2(h), h1: r2(h + clr), label: 'CLR ' + Math.round(clr) * 10 });
  };

  /* a tunnel with the floor missing inside it: a low, level bridge */
  C.k_tgap = function (d, c) {
    const rnd = this.rnd, h = this.h;
    const L = 320 + rnd() * 100, clr = lerp(56, 40, d) + rnd() * 6;
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
    const n = 2 + (rnd() < 0.3 + 0.5 * d ? 1 : 0) + (d > 0.6 && rnd() < 0.4 ? 1 : 0);
    const x0 = this.x, h0 = this.h;
    let xa = x0, ha = h0;                      // the end of the last solid thing
    this.close();
    for (let i = 0; i <= n; i++) {
      const last = i === n;
      const xb = xa + lerp(150, 230, d) + rnd() * lerp(30, 70, d);
      const hb = last ? clamp(h0 + (rnd() * 2 - 1) * 30, BAND_LO + 10, BAND_HI - 10)
                      : clamp(ha + (rnd() * 2 - 1) * lerp(40, 95, d), BAND_LO + 10, BAND_HI - 10);
      const sw = last ? 200 : lerp(85, 50, d) + rnd() * 25;
      this.open(xb, hb);
      this.run(sw);
      if (!last) this.close();
      this.ref([[xa - 30, ha + 0.5], [xb, hb + 2], [xb + 30, hb + 0.5]], c);
      xa = xb + sw; ha = hb;
    }
  };

  /* a void: the floor simply stops, and the next is a long way off. Draw
     the ground yourself, all of it, while the page moves. */
  C.k_void = function (d, c) {
    const rnd = this.rnd;
    const W = lerp(260, 560, d) + rnd() * lerp(80, 200, d);
    const x0 = this.x, h0 = this.h;
    const h1 = clamp(h0 + (rnd() * 1.5 - 0.35) * lerp(30, 90, d), BAND_LO + 10, BAND_HI - 10);   // more often up: meet it on top
    this.close();
    this.open(x0 + W, h1);
    this.run(lerp(160, 90, d));
    this.ref([[x0 - 40, h0 + 0.5], [x0 + W, h1 + 2], [x0 + W + 40, h1 + 0.5]], c);
    this.notes.push({ t: 'dim', x0: r2(x0), x1: r2(x0 + W), h: r2(Math.max(h0, h1) + 90), label: String(Math.round(W) * 10) });
    this.tight = d > 0.45;
  };

  /* a perch: a high, short platform across a void — ramp up onto it, meet
     it on top, then get down the far side to the floor below */
  C.k_perch = function (d, c) {
    const rnd = this.rnd;
    const x0 = this.x, h0 = this.h;
    const g1 = lerp(230, 210, d) + rnd() * 70;
    const hp = Math.min(BAND_HI + 20, h0 + lerp(80, 145, d) + rnd() * 30);
    const pw = lerp(190, 100, d) + rnd() * 50;
    const g2 = lerp(170, 300, d) + rnd() * 60;
    const h2 = clamp(h0 + (rnd() * 2 - 1) * 30, BAND_LO + 10, BAND_HI - 10);
    const px = x0 + g1, pe = px + pw;
    this.close();
    this.open(px, hp); this.run(pw); this.close();
    this.open(pe + g2, h2); this.run(lerp(180, 120, d));
    this.ref(path([[x0 - 40, h0 + 0.5], [x0 + 20, h0 + 5], [px - 10, hp + 3], [px + 30, hp + 1]]), c);
    this.ref([[pe - 25, hp + 0.5], [pe + g2, h2 + 2], [pe + g2 + 40, h2 + 0.5]], c);
    this.notes.push({ t: 'arrow', x: r2(px), h: r2(hp + 60), dx: 110, label: 'UP' });
  };

  /* a low bridge: the floor stops, a ceiling hangs over the void below it,
     and the line has to get down under it in time and stay there */
  C.k_low = function (d, c) {
    const rnd = this.rnd;
    const x0 = this.x, h0 = this.h;
    const dh = Math.min(h0 - BAND_LO - 10, lerp(30, 85, d) + rnd() * 20);
    const hf = h0 - dh;
    // room to get down before it, even arriving fast off a slope
    const cx = Math.max(150, 1.3 * 450 * Math.sqrt(2 * Math.max(dh, 1) / 420)) + rnd() * 50;
    const cw = lerp(220, 360, d) + rnd() * 60;
    const clr = lerp(46, 34, d) + rnd() * 5;
    const xE = x0 + cx + cw + lerp(70, 35, d);
    this.hazard(x0 + cx, cw, hf + clr + 600, hf + clr, 'ceil');
    this.close();
    this.open(xE, hf); this.run(180);
    this.ref([[x0 - 30, h0 + 0.5], [x0 + cx - 15, hf + 2], [xE, hf + 2], [xE + 40, hf + 0.5]], c);
    this.notes.push({ t: 'vdim', x: r2(x0 + cx + 24), h0: r2(hf), h1: r2(hf + clr), label: 'CLR ' + Math.round(clr) * 10 });
  };

  /* a block with a blot high over it: going high for the ink is steeper,
     slower and further to fall; going low is safe and dry */
  C.k_high = function (d, c) {
    const rnd = this.rnd, h = this.h;
    const w = 60 + rnd() * lerp(25, 50, d), top = 50 + rnd() * lerp(10, 30, d);
    const x0 = this.x;
    this.hazard(x0, w, h + top, h - 4, 'block');
    this.drops.push({ x: r2(x0 + w / 2), h: r2(h + top + 62), b: 1 });
    this.run(w);
    this.run(450);
    this.ref(path([[x0 - 130, h + 0.5], [x0 - 20, h + top + 16], [x0 + w + 20, h + top + 16], [x0 + w + 130, h + 0.5]]), c);
  };

  /* a launch: down a slope for speed, then the floor stops — a fast bridge
     to a short landing, and the next thing comes straight after */
  C.k_launch = function (d, c) {
    const rnd = this.rnd;
    const D = Math.min(this.h - BAND_LO - 10, lerp(50, 95, d) + rnd() * 20);
    this.ease(Math.max(280, Math.sqrt(1600 * Math.max(D, 1))) + rnd() * 40, -D);
    this.run(30);
    const x0 = this.x, h0 = this.h;
    const G = lerp(180, 300, d) + rnd() * 60;
    const hl = clamp(h0 + 5 + rnd() * lerp(15, 45, d), BAND_LO + 10, BAND_HI - 10);   // landing a little above: fast, and on top
    this.close();
    this.open(x0 + G, hl); this.run(lerp(150, 80, d) + rnd() * 30);
    this.ref([[x0 - 40, h0 + 0.5], [x0 + G, hl + 2], [x0 + G + 40, hl + 0.5]], c);
    this.tight = d > 0.35;
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
    VERSION: VERSION, U: U, START_X: START_X, CONFIG: CONFIG, RESERVE: RESERVE, MIRROR: MIRROR,
    Course: Course, create: function (opts) { return new Course(opts); },
    mulberry32: mulberry32, fnv: fnv, utcDay: utcDay, dailySeed: dailySeed, seedLabel: seedLabel,
    path: path, polyLen: polyLen, metres: metres, units: units, score: score,
  };
});
