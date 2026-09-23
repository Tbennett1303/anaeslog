/*  The Inkline (test build) — daily leaderboard and gameplay telemetry.
 *
 *  Codebase "game", deployed separately from the production "default"
 *  codebase (the v0.3 `collect` function), so neither deploy touches the
 *  other. The browser is not trusted: everything it sends is rebuilt field by
 *  field from an allow-list, and a daily run is checked against the course
 *  rebuilt from the date before it can reach the board.
 *
 *  Firestore rules deny every client (see ../../firebase/firestore.rules):
 *  the board is only ever read through this function, which returns names
 *  and numbers and never an id. The caller's IP is used for in-memory rate
 *  limiting only and is never stored.
 */
'use strict';

const { onRequest } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const Gen = require('./gen.js');
const { verifyRun } = require('./verify.js');
const { cleanName, dayWindow } = require('./util.js');

initializeApp();
const db = getFirestore();

const PID_RE = /^[a-f0-9]{8,32}$/;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/* ── helpers ─────────────────────────────────────────────────────────────── */
const num = (v, lo, hi) => {
  const n = typeof v === 'number' ? v : NaN;
  if (!isFinite(n)) return null;
  return Math.min(hi, Math.max(lo, n));
};
const int = (v, lo, hi) => { const n = num(v, lo, hi); return n === null ? null : Math.round(n); };
const str = (v, re, max) => (typeof v === 'string' && v.length <= max && re.test(v) ? v : null);

/* ── rate limiting, per instance, in memory ──────────────────────────────── */
const buckets = new Map();
function allow(key, limit, windowMs) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now > b.reset) { b = { n: 0, reset: now + windowMs }; buckets.set(key, b); }
  b.n++;
  if (buckets.size > 5000) for (const [k, v] of buckets) if (now > v.reset) buckets.delete(k);
  return b.n <= limit;
}
const ipOf = (req) => (req.get('x-forwarded-for') || req.ip || '').split(',')[0].trim() || 'unknown';

function body(req, res, max) {
  if (req.method !== 'POST') { res.set('Allow', 'POST'); res.status(405).json({ ok: false, error: 'method' }); return null; }
  const len = Number(req.get('content-length') || 0);
  if (len > max) { res.status(413).json({ ok: false, error: 'too-large' }); return null; }
  let b = req.body;
  if (typeof b === 'string' || Buffer.isBuffer(b)) {
    const text = b.toString('utf8');
    if (text.length > max) { res.status(413).json({ ok: false, error: 'too-large' }); return null; }
    try { b = JSON.parse(text); } catch (e) { res.status(400).json({ ok: false, error: 'json' }); return null; }
  }
  if (!b || typeof b !== 'object' || Array.isArray(b)) { res.status(400).json({ ok: false, error: 'shape' }); return null; }
  return b;
}

/* ── the daily board ─────────────────────────────────────────────────────── */
async function boardFor(day, pid) {
  const dayRef = db.collection('daily').doc(day);
  const runs = dayRef.collection('runs');
  const [daySnap, topSnap, meSnap] = await Promise.all([
    dayRef.get(), runs.orderBy('score', 'desc').limit(10).get(), runs.doc(pid).get(),
  ]);
  const dd = daySnap.exists ? daySnap.data() : {};
  const top = topSnap.docs.map((d, i) => {
    const r = d.data();
    return { rank: i + 1, name: r.name || '', dist: r.dist, time: r.time, me: d.id === pid };
  });
  let me = null;
  if (meSnap.exists) {
    const r = meSnap.data();
    me = { att: r.att || 0, dist: r.dist ?? null, time: r.time ?? null, rank: null };
    if (typeof r.score === 'number') {
      const above = await runs.where('score', '>', r.score).count().get();
      me.rank = above.data().count + 1;
    }
  }
  return { ok: true, day, players: dd.players || 0, runs: dd.runs || 0, top, me };
}

exports.daily = onRequest(
  { region: 'us-central1', memory: '256MiB', maxInstances: 5, cors: false },
  async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const b = body(req, res, 512 * 1024);
    if (!b) return;
    const op = b.op, pid = b.pid, day = b.day;
    if (typeof pid !== 'string' || !PID_RE.test(pid)) return res.status(400).json({ ok: false, error: 'pid' });
    if (typeof day !== 'string' || !DAY_RE.test(day)) return res.status(400).json({ ok: false, error: 'day' });
    const ip = ipOf(req);
    if (!allow('d:' + pid, 40, 60000) || !allow('di:' + ip, 400, 60000)) return res.status(429).json({ ok: false, error: 'rate' });

    const w = dayWindow(Date.now());
    const liveDay = day === w.today || (day === w.yesterday && w.graceOpen);

    try {
      if (op === 'board') {
        if (day !== w.today && day !== w.yesterday) return res.status(400).json({ ok: false, error: 'day' });
        return res.json(await boardFor(day, pid));
      }

      if (op === 'name') {
        if (!liveDay) return res.status(400).json({ ok: false, error: 'day' });
        const ref = db.collection('daily').doc(day).collection('runs').doc(pid);
        const snap = await ref.get();
        if (snap.exists) await ref.update({ name: cleanName(b.name) });
        return res.json({ ok: true });
      }

      if (op !== 'submit') return res.status(400).json({ ok: false, error: 'op' });
      if (!liveDay) return res.status(400).json({ ok: false, error: 'day' });
      if (!allow('ds:' + pid, 20, 60000)) return res.status(429).json({ ok: false, error: 'rate' });

      const att = int(b.att, 1, 100000) ?? 1;
      const name = typeof b.name === 'string' ? cleanName(b.name) : null;

      // a claimed best has to prove itself before the transaction
      let run = null, reason = null;
      if (b.run) {
        const v = verifyRun(day, b.run);
        if (v.ok) run = { dist: Math.round(v.dist * 10) / 10, time: Math.round(v.time * 100) / 100 };
        else reason = v.reason;
      }
      if (reason) {                               // refused: nothing is written
        console.warn('daily run rejected', day, reason);
        return res.status(422).json({ ok: false, counted: false, reason });
      }

      const dayRef = db.collection('daily').doc(day);
      const meRef = dayRef.collection('runs').doc(pid);
      let improved = false;
      await db.runTransaction(async (tx) => {
        const [meSnap, daySnap] = await Promise.all([tx.get(meRef), tx.get(dayRef)]);
        const prev = meSnap.exists ? meSnap.data() : null;
        const newRuns = Math.max(1, Math.min(200, att - (prev ? prev.att || 0 : 0)));
        const out = { att: Math.max(att, prev ? prev.att || 0 : 0), at: FieldValue.serverTimestamp() };
        if (name !== null) out.name = name;
        else if (!prev) out.name = '';
        if (run) {
          const sc = Gen.score(run.dist, run.time);
          if (!prev || typeof prev.score !== 'number' || sc > prev.score) {
            Object.assign(out, { dist: run.dist, time: run.time, score: sc });
            improved = true;
          }
        }
        tx.set(meRef, out, { merge: true });
        const dd = daySnap.exists ? daySnap.data() : null;
        tx.set(dayRef, {
          day,
          seed: Gen.dailySeed(day),
          players: (dd ? dd.players || 0 : 0) + (prev ? 0 : 1),
          runs: (dd ? dd.runs || 0 : 0) + newRuns,
          updated: FieldValue.serverTimestamp(),
        }, { merge: true });
      });

      const board = await boardFor(day, pid);
      return res.status(200).json({
        ok: true, counted: b.run ? true : null, improved,
        rank: board.me && board.me.rank, players: board.players, runs: board.runs,
        best: board.me ? { dist: board.me.dist, time: board.me.time } : null,
      });
    } catch (err) {
      console.error('daily failed', err);
      return res.status(500).json({ ok: false, error: 'store' });
    }
  }
);

/* ── gameplay telemetry ──────────────────────────────────────────────────── */
const YEAR_MS = 365 * 24 * 3600 * 1000;
const E = { s: 1, m: 1, a: 1, d: 1, w: 1, pb: 1, q: 1, do: 1, dr: 1, x: 1, tu: 1, lb: 1, nm: 1, wr: 1 };
const TUK = { start: 1, hint: 1, fail: 1, done: 1, skipped: 1 };
const TUWHY = { fell: 1, stuck: 1, back: 1 };
const MODES = { c: 1, e: 1, d: 1, z: 1 };
const CAUSES = { crash: 1, fell: 1, dry: 1, behind: 1 };
const INPUTS = { touch: 1, mouse: 1, pen: 1 };
const DEVS = { phone: 1, tablet: 1, desktop: 1 };
const VIA = { menu: 1, retry: 1 };
const QST = { play: 1, dead: 1, hidden: 1 };
const LVL_RE = /^[a-z0-9:\-]{1,40}$/;
const HEX_RE = /^[a-f0-9]{1,8}$/;

function cleanEvent(raw, now) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const e = raw.e;
  if (typeof e !== 'string' || !E[e]) return null;
  let t = num(raw.t, now - YEAR_MS, now + 86400000);
  if (t === null) t = now;
  const o = { e, t: Math.round(t) };
  const put = (k, v) => { if (v !== null && v !== undefined) o[k] = v; };
  const m = typeof raw.m === 'string' && MODES[raw.m] ? raw.m : null;
  const l = str(raw.l, LVL_RE, 40);
  switch (e) {
    case 's':
      put('n', int(raw.n, 1, 100000)); o.ret = raw.ret ? 1 : 0;
      put('in', INPUTS[raw.in] ? raw.in : null); put('dev', DEVS[raw.dev] ? raw.dev : null);
      put('w', int(raw.w, 0, 20000)); put('h', int(raw.h, 0, 20000));
      break;
    case 'm': if (!m) return null; o.m = m; break;
    case 'a':
      put('n', int(raw.n, 1, 1000000)); put('sa', int(raw.sa, 1, 1000000)); put('l', l); put('m', m);
      put('via', VIA[raw.via] ? raw.via : null); put('day', str(raw.day, DAY_RE, 10)); put('seed', str(raw.seed, HEX_RE, 8));
      break;
    case 'd':
      put('n', int(raw.n, 1, 1000000)); put('l', l); put('m', m);
      put('i', num(raw.i, 0, 100)); put('ms', int(raw.ms, 0, 7200000));
      put('c', CAUSES[raw.c] ? raw.c : null); put('dist', num(raw.dist, 0, 100000)); put('p', num(raw.p, 0, 100));
      put('k', str(raw.k, /^[a-z]{2,10}$/, 10));
      break;
    case 'w':
      put('n', int(raw.n, 1, 1000000)); put('l', l); put('m', m);
      put('i', num(raw.i, 0, 100)); put('ms', int(raw.ms, 0, 7200000)); o.p = 100;
      break;
    case 'pb':
      put('m', m); put('l', l); put('k', raw.k === 'dist' || raw.k === 'time' ? raw.k : null); put('v', num(raw.v, 0, 1000000));
      break;
    case 'q':
      put('n', int(raw.n, 1, 1000000)); put('l', l); put('m', m); put('st', QST[raw.st] ? raw.st : null);
      put('dist', num(raw.dist, 0, 100000)); put('p', num(raw.p, 0, 100));
      break;
    case 'do': put('day', str(raw.day, DAY_RE, 10)); break;
    case 'dr':
      put('day', str(raw.day, DAY_RE, 10)); put('dist', num(raw.dist, 0, 100000));
      put('rank', int(raw.rank, 1, 10000000)); put('n', int(raw.n, 1, 1000000));
      break;
    case 'lb': case 'nm':
      put('l', l); put('m', m); break;
    case 'wr':
      put('l', l); put('m', m); put('rank', int(raw.rank, 1, 10000000));
      o.improved = raw.improved ? 1 : 0; break;
    case 'x': put('dur', int(raw.dur, 0, 24 * 3600 * 1000)); put('att', int(raw.att, 0, 1000000)); break;
    case 'tu':                                    // the first-play opening
      if (!TUK[raw.k]) return null;
      o.k = raw.k;
      put('n', int(raw.n, 1, 10000)); put('fails', int(raw.fails, 0, 10000)); put('ms', int(raw.ms, 0, 3600000));
      put('why', TUWHY[raw.why] ? raw.why : null);
      if (raw.drew !== undefined) o.drew = raw.drew ? 1 : 0;
      if (raw.hinted !== undefined) o.hinted = raw.hinted ? 1 : 0;
      if (raw.rp !== undefined) o.rp = raw.rp ? 1 : 0;
      break;
  }
  return o;
}

exports.track = onRequest(
  { region: 'us-central1', memory: '256MiB', maxInstances: 5, cors: false },
  async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const b = body(req, res, 64 * 1024);
    if (!b) return;
    const pid = b.pid;
    if (typeof pid !== 'string' || !PID_RE.test(pid)) return res.status(400).json({ ok: false, error: 'pid' });
    if (!Array.isArray(b.ev) || !b.ev.length || b.ev.length > 200) return res.status(400).json({ ok: false, error: 'events' });
    if (!allow('t:' + pid, 60, 60000) || !allow('ti:' + ipOf(req), 400, 60000)) return res.status(429).json({ ok: false, error: 'rate' });
    const now = Date.now();
    const ev = [];
    for (const raw of b.ev) { const c = cleanEvent(raw, now); if (c) ev.push(c); }
    if (!ev.length) return res.status(400).json({ ok: false, error: 'no-valid-events' });
    const n = (k) => ev.filter((x) => x.e === k).length;
    try {
      const ref = db.collection('g_players').doc(pid);
      const batch = db.batch();
      batch.set(ref, {
        pid, environment: 'test', lastSeen: FieldValue.serverTimestamp(),
        sessions: FieldValue.increment(n('s')), attempts: FieldValue.increment(n('a')),
        deaths: FieldValue.increment(n('d')), wins: FieldValue.increment(n('w')),
        batches: FieldValue.increment(1),
      }, { merge: true });
      batch.set(ref.collection('ev').doc(), {
        pid, environment: 'test', at: FieldValue.serverTimestamp(),
        s: int(b.s, 0, 100000) ?? 0, sid: str(b.sid, /^[a-f0-9]{1,16}$/, 16) || '', ev,
      });
      await batch.commit();
    } catch (err) {
      console.error('track write failed', err);
      return res.status(500).json({ ok: false, error: 'store' });
    }
    return res.status(204).send('');
  }
);

// Campaign competition is isolated from production analytics and Daily.
exports.social = require('./social.js').createSocial(db);
