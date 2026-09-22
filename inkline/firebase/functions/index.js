/*  The Ink Line — analytics ingestion.
 *
 *  The browser is not trusted, so nothing it sends reaches Firestore unchecked.
 *  Every event is rebuilt field by field from an allow-list: unknown fields are
 *  dropped, types are enforced, numbers are range-clamped, strings are capped
 *  and enum-checked. Anything malformed is rejected with a 400.
 *
 *  This is the only writer to the analytics collections; Firestore rules deny
 *  all client writes (see firestore.rules).
 *
 *  The caller's IP is used for in-memory rate limiting only. It is never
 *  written to Firestore, and neither is anything else identifying.
 */
'use strict';

const { onRequest } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

const MAX_BODY_BYTES = 32 * 1024;
const MAX_EVENTS     = 200;
const PID_RE         = /^[a-f0-9]{8,32}$/;
const EVENT_TYPES    = { s: 1, a: 1, d: 1, w: 1, x: 1 };
const CAUSES         = { crash: 1, fell: 1, dry: 1, behind: 1 };
const INPUTS         = { touch: 1, mouse: 1, pen: 1 };
const YEAR_MS        = 365 * 24 * 3600 * 1000;

/* ── helpers ─────────────────────────────────────────────────────────────── */
const num = (v, lo, hi) => {
  const n = typeof v === 'number' ? v : NaN;
  if (!isFinite(n)) return null;
  return Math.min(hi, Math.max(lo, n));
};
const int = (v, lo, hi) => {
  const n = num(v, lo, hi);
  return n === null ? null : Math.round(n);
};

/* ── rate limiting, per instance, in memory ──────────────────────────────── */
const buckets = new Map();
function allow(key, limit, windowMs) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now > b.reset) { b = { n: 0, reset: now + windowMs }; buckets.set(key, b); }
  b.n++;
  if (buckets.size > 5000) {                       // cheap eviction
    for (const [k, v] of buckets) { if (now > v.reset) buckets.delete(k); }
  }
  return b.n <= limit;
}

/* ── validation ──────────────────────────────────────────────────────────── */
function cleanEvent(raw, now) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const e = raw.e;
  if (typeof e !== 'string' || !EVENT_TYPES[e]) return null;

  // client clock is untrusted: keep it only if plausible, else stamp server time
  let t = num(raw.t, now - YEAR_MS, now + 86400000);
  if (t === null) t = now;

  const out = { e, t: Math.round(t) };

  if (e === 's') {
    out.n   = int(raw.n, 1, 100000) ?? 1;
    out.ret = raw.ret ? 1 : 0;
    if (typeof raw.in === 'string' && INPUTS[raw.in]) out.in = raw.in;
    const w = int(raw.w, 0, 20000), h = int(raw.h, 0, 20000);
    if (w !== null) out.w = w;
    if (h !== null) out.h = h;
  } else if (e === 'a') {
    out.n  = int(raw.n, 1, 100000) ?? 1;
    const sa = int(raw.sa, 1, 100000);
    if (sa !== null) out.sa = sa;
  } else if (e === 'd' || e === 'w') {
    out.n  = int(raw.n, 1, 100000) ?? 1;
    out.p  = num(raw.p, 0, 100) ?? 0;
    out.i  = num(raw.i, 0, 100) ?? 0;
    out.ms = int(raw.ms, 0, 3600000) ?? 0;
    if (e === 'd' && typeof raw.c === 'string' && CAUSES[raw.c]) out.c = raw.c;
  } else if (e === 'x') {
    out.dur = int(raw.dur, 0, 24 * 3600 * 1000) ?? 0;
    out.att = int(raw.att, 0, 100000) ?? 0;
  }
  return out;
}

exports.collect = onRequest(
  { region: 'us-central1', memory: '256MiB', maxInstances: 5, cors: false },
  async (req, res) => {
    res.set('Cache-Control', 'no-store');

    if (req.method !== 'POST') {
      res.set('Allow', 'POST');
      return res.status(405).json({ ok: false, error: 'method' });
    }
    const len = Number(req.get('content-length') || 0);
    if (len > MAX_BODY_BYTES) return res.status(413).json({ ok: false, error: 'too-large' });

    let body = req.body;
    if (typeof body === 'string' || Buffer.isBuffer(body)) {
      const text = body.toString('utf8');
      if (text.length > MAX_BODY_BYTES) return res.status(413).json({ ok: false, error: 'too-large' });
      try { body = JSON.parse(text); } catch (e) { return res.status(400).json({ ok: false, error: 'json' }); }
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ ok: false, error: 'shape' });
    }

    const pid = body.pid;
    if (typeof pid !== 'string' || !PID_RE.test(pid)) {
      return res.status(400).json({ ok: false, error: 'pid' });
    }
    if (!Array.isArray(body.ev) || body.ev.length === 0 || body.ev.length > MAX_EVENTS) {
      return res.status(400).json({ ok: false, error: 'events' });
    }

    // IP is used here and nowhere else; it is never persisted
    const ip = (req.get('x-forwarded-for') || req.ip || '').split(',')[0].trim() || 'unknown';
    if (!allow('p:' + pid, 60, 60000) || !allow('i:' + ip, 300, 60000)) {
      return res.status(429).json({ ok: false, error: 'rate' });
    }

    const now = Date.now();
    const ev = [];
    for (const raw of body.ev) {
      const c = cleanEvent(raw, now);
      if (c) ev.push(c);
    }
    if (!ev.length) return res.status(400).json({ ok: false, error: 'no-valid-events' });

    const counts = { a: 0, d: 0, w: 0, s: 0 };
    for (const e of ev) counts[e.e] = (counts[e.e] || 0) + 1;

    try {
      const playerRef = db.collection('players').doc(pid);
      const batch = db.batch();
      batch.set(playerRef, {
        pid,
        // no firstSeen here: a merge would overwrite it on every batch. The
        // dashboard derives first-seen from the earliest event it holds.
        lastSeen:  FieldValue.serverTimestamp(),
        attempts:  FieldValue.increment(counts.a),
        deaths:    FieldValue.increment(counts.d),
        wins:      FieldValue.increment(counts.w),
        sessions:  FieldValue.increment(counts.s),
        batches:   FieldValue.increment(1),
      }, { merge: true });
      batch.set(playerRef.collection('batches').doc(), {
        pid,
        at: FieldValue.serverTimestamp(),
        session: int(body.s, 0, 100000) ?? 0,
        ev,
      });
      await batch.commit();
    } catch (err) {
      console.error('write failed', err);
      return res.status(500).json({ ok: false, error: 'store' });
    }

    return res.status(204).send('');
  }
);
