/* Lightweight verification for TEST campaign leaderboards. This checks a
 * timed trace against the shipped level geometry and the player's ink marks;
 * it is not a full authoritative physics simulation. */
'use strict';
const Gen = require('./gen.js');
const levels = require('./campaign-levels.json').levels;

const MAXV = 900, BALL_R = 10, CELL = 64;
const integer = (v) => Number.isInteger(v) && Math.abs(v) < 1e8;
const bad = (reason) => ({ ok: false, reason });

function segDist(px, py, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0, len = dx * dx + dy * dy;
  let t = len ? ((px - x0) * dx + (py - y0) * dy) / len : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - x0 - t * dx, py - y0 - t * dy);
}

function verifyCampaignRun(levelId, run, inkLeft) {
  const level = levels[levelId];
  if (!level || !run || typeof run !== 'object' || Array.isArray(run)) return bad('shape');
  if (run.v !== Gen.VERSION || run.level !== levelId) return bad('version');
  const tr = run.trace, st = run.strokes;
  if (!Array.isArray(tr) || tr.length < 24 || tr.length % 4 || tr.length > 24000) return bad('trace-shape');
  if (!Array.isArray(st) || st.length > 500) return bad('strokes-shape');
  if (!tr.every(integer)) return bad('trace-type');
  const time = run.time, spent = run.spent, blots = run.blots;
  if (typeof time !== 'number' || !Number.isFinite(time) || time < 4 || time > 1200) return bad('time');
  if (typeof spent !== 'number' || !Number.isFinite(spent) || spent < 0 || spent > 20000) return bad('spent');
  if (!integer(blots) || blots < 0 || blots > level.drops.length) return bad('blots');
  if (typeof inkLeft !== 'number' || !Number.isFinite(inkLeft) || inkLeft < 0 || inkLeft > 1) return bad('ink');

  const samples = [];
  for (let i = 0; i < tr.length; i += 4) {
    if (tr[i + 3] !== 0 && tr[i + 3] !== 1) return bad('ground-type');
    samples.push({ t: tr[i] / 100, x: tr[i + 1] / 10, h: tr[i + 2] / 10, g: tr[i + 3] === 1 });
  }
  const first = samples[0], last = samples[samples.length - 1];
  if (first.t < 0 || first.t > 1.2 || Math.abs(first.x - 110) > 45 || first.h < -20 || first.h > 90) return bad('start');
  if (Math.abs(last.t - time) > 0.4 || last.x < level.finish - 15 || last.x > level.finish + 100) return bad('finish');
  if (level.finish - 110 > time * 700 + 100) return bad('average-speed');
  let maxX = first.x;
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1], b = samples[i], dt = b.t - a.t;
    if (dt < 0 || dt > 0.65) return bad('trace-gap');
    const lim = MAXV * 1.18 * Math.max(dt, 1 / 60) + 13;
    if (Math.abs(b.x - a.x) > lim || Math.abs(b.h - a.h) > lim) return bad('speed');
    if (b.x < -500 || b.x > level.finish + 100 || b.h < -800 || b.h > 1300) return bad('bounds');
    maxX = Math.max(maxX, b.x);
  }
  if (maxX < level.finish) return bad('progress');

  // A small spatial index for printed and player-drawn ground.
  const grid = new Map();
  const add = (x0, y0, x1, y1, t) => {
    const a = Math.floor(Math.min(x0, x1) / CELL), b = Math.floor(Math.max(x0, x1) / CELL);
    for (let c = a; c <= b; c++) {
      let arr = grid.get(c);
      if (!arr) grid.set(c, arr = []);
      arr.push([x0, y0, x1, y1, t]);
    }
  };
  for (const p of level.printed) for (let i = 1; i < p.length; i++)
    add(p[i - 1][0], p[i - 1][1], p[i][0], p[i][1], -1);
  for (const p of level.plinths) add(p[0], p[2], p[1], p[2], -1);

  let points = 0, drawn = 0;
  for (const s of st) {
    if (!Array.isArray(s) || s.length < 5 || s.length % 2 === 0 || !s.every(integer)) return bad('stroke-type');
    points += (s.length - 1) / 2;
    if (points > 20000) return bad('stroke-size');
    const t = s[0] / 100;
    if (t < 0 || t > time + 0.3) return bad('stroke-time');
    for (let i = 3; i < s.length; i += 2) {
      const x0 = s[i - 2] / 10, h0 = s[i - 1] / 10, x1 = s[i] / 10, h1 = s[i + 1] / 10;
      if (Math.min(x0, x1) < -500 || Math.max(x0, x1) > level.finish + 500 || Math.abs(h0) > 1300 || Math.abs(h1) > 1300) return bad('stroke-bounds');
      const length = Math.hypot(x1 - x0, h1 - h0);
      if (length > 1000) return bad('stroke-jump');
      drawn += length;
      add(x0, h0, x1, h1, t);
    }
  }
  if (drawn > spent * 1.12 + 70) return bad('drawn-ink');

  let grounded = 0, unsupported = 0;
  for (const q of samples) {
    if (!q.g) continue;
    grounded++;
    let supported = false;
    const c = Math.floor(q.x / CELL);
    for (let i = c - 1; i <= c + 1 && !supported; i++) {
      for (const seg of grid.get(i) || []) {
        if (seg[4] > q.t + 0.18) continue;
        if (segDist(q.x, q.h, seg[0], seg[1], seg[2], seg[3]) <= BALL_R + 8) { supported = true; break; }
      }
    }
    if (!supported) unsupported++;
  }
  if (grounded < 3 || unsupported > Math.max(5, grounded * 0.12))
    return { ok: false, reason: 'unsupported', grounded, unsupported };

  for (const h of level.hazards) {
    for (const q of samples) if (q.x > h.x + 5 && q.x < h.x + h.w - 5 && q.h > h.hBot + 5 && q.h < h.hTop - 5)
      return bad('hazard');
  }
  let passed = 0;
  for (const d of level.drops) {
    for (let i = 1; i < samples.length; i++) {
      const a = samples[i - 1], b = samples[i];
      if (Math.min(a.x, b.x) > d.x + 45 || Math.max(a.x, b.x) < d.x - 45) continue;
      if (segDist(d.x, d.h, a.x, a.h, b.x, b.h) <= 38) { passed++; break; }
    }
  }
  if (blots > passed) return bad('blot-path');
  if (spent > level.ink + blots * level.drop + 45) return bad('ink-budget');
  if (inkLeft * level.ink > level.ink - spent + blots * level.drop + 45) return bad('ink-mismatch');

  return { ok: true, ink: Math.round(inkLeft * 10000) / 10000, ms: Math.round(time * 1000) };
}

module.exports = { verifyCampaignRun, levels };
