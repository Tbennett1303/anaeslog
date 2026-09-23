/* TEST-only campaign stats and best-per-player leaderboard. All reads and
 * writes go through this function; Firestore client rules remain closed.
 *
 * Ranking: furthest first, then most ink left, then quickest — packed by
 * campaign-verify's rankKey into one whole number (`key`), so one ordered
 * field sorts a board and one count query ranks a player. Finished runs are
 * sent on `win`; a run that ends part way is sent on `death` when it is the
 * player's furthest yet. Entries written before progress was ranked were all
 * finishes: they are given progress 100% and a key the first time a board is
 * read, and nothing is deleted. */
'use strict';
const { randomBytes } = require('crypto');
const { onRequest } = require('firebase-functions/v2/https');
const { FieldValue } = require('firebase-admin/firestore');
const { cleanName } = require('./util.js');
const { levels, verifyCampaignRun, rankKey } = require('./campaign-verify.js');

const PID_RE = /^[a-f0-9]{16,32}$/;
const TOKEN_RE = /^[a-f0-9]{36}$/;
const rate = new Map();
function allowed(key, limit, period) {
  const now = Date.now();
  let b = rate.get(key);
  if (!b || now > b.until) b = { n: 0, until: now + period };
  b.n++; rate.set(key, b);
  if (rate.size > 5000) for (const [k, v] of rate) if (now > v.until) rate.delete(k);
  return b.n <= limit;
}
const ipOf = (req) => (req.get('x-forwarded-for') || req.ip || '').split(',')[0].trim() || 'unknown';

function createSocial(db) {
  const entries = db.collection('testLeaderboardEntries');
  const globalRef = (level) => db.collection('testPublicLevels').doc(level);
  const playerRef = (level, pid) => db.collection('testLevelPlayers').doc(level).collection('players').doc(pid);
  const entryRef = (level, pid) => entries.doc(level + '_' + pid);

  async function rankFor(level, key) {
    const higher = await entries.where('levelId', '==', level).where('key', '>', key).count().get();
    return higher.data().count + 1;
  }

  // entries from before progress was ranked: all finishes, so progress 100.
  // Done once per level, and remembered in the database (not in an instance).
  const metaRef = (level) => db.collection('testLeaderboardMeta').doc(level);
  async function migrate(level) {
    const meta = await metaRef(level).get();
    if (meta.exists && meta.get('ranked') >= 2) return;
    const all = await entries.where('levelId', '==', level).get();
    const batch = db.batch();
    all.forEach((d) => {
      if (typeof d.get('key') === 'number') return;
      const ink = d.get('ink') || 0, ms = d.get('ms') || 0;
      batch.update(d.ref, { progress: 1, key: rankKey(1, ink, ms) });
    });
    batch.set(metaRef(level), { ranked: 2, at: FieldValue.serverTimestamp() });
    await batch.commit();
  }

  const row = (level, pid, d) => ({ name: d.get('displayName') || 'ANONYMOUS', progress: d.get('progress') == null ? 1 : d.get('progress'),
    ink: d.get('ink'), ms: d.get('ms'), key: d.get('key') });

  async function boardFor(level, pid) {
    await migrate(level);
    const [stats, top, mine] = await Promise.all([
      globalRef(level).get(),
      entries.where('levelId', '==', level).orderBy('key', 'desc').limit(10).get(),
      pid ? entryRef(level, pid).get() : Promise.resolve(null),
    ]);
    const rows = top.docs.map((d, i) => {
      const r = row(level, pid, d); delete r.key;
      return Object.assign({ rank: i + 1, me: !!pid && d.id === level + '_' + pid }, r);
    });
    let me = null;
    if (mine && mine.exists) {
      const r = row(level, pid, mine);
      me = { name: r.name, progress: r.progress, ink: r.ink, ms: r.ms, rank: null };
      try { me.rank = await rankFor(level, r.key); } catch (e) { console.warn('campaign rank unavailable', e.code); }
    }
    const s = stats.exists ? stats.data() : {};
    return { ok: true, level, name: levels[level].name,
      stats: { attempted: s.attempted || 0, completed: s.completed || 0, deaths: s.deaths || 0, progress: s.progress || {} },
      top: rows, me };
  }

  /* keep a player's best run on the board: better means a higher key */
  function keepBest(tx, level, pid, old, checked) {
    const oldKey = old.exists ? (typeof old.get('key') === 'number' ? old.get('key') : rankKey(1, old.get('ink') || 0, old.get('ms') || 0)) : -1;
    const improved = checked.key > oldKey;
    if (improved) tx.set(entryRef(level, pid), {
      levelId: level, pid, displayName: old.exists ? old.get('displayName') || 'ANONYMOUS' : 'ANONYMOUS',
      progress: checked.progress, ink: checked.ink, ms: checked.ms, key: checked.key, updatedAt: FieldValue.serverTimestamp(),
    });
    return improved;
  }

  return onRequest({ region: 'us-central1', memory: '256MiB', maxInstances: 5, cors: false }, async (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (req.method !== 'POST') { res.set('Allow', 'POST'); return res.status(405).json({ ok: false, error: 'method' }); }
    const max = 256 * 1024;
    if (Number(req.get('content-length') || 0) > max) return res.status(413).json({ ok: false, error: 'size' });
    let b = req.body;
    if (typeof b === 'string' || Buffer.isBuffer(b)) {
      try { b = JSON.parse(b.toString('utf8')); } catch (e) { return res.status(400).json({ ok: false, error: 'json' }); }
    }
    if (!b || typeof b !== 'object' || Array.isArray(b) || JSON.stringify(b).length > max)
      return res.status(400).json({ ok: false, error: 'shape' });
    const { op, level, pid } = b;
    if (typeof level !== 'string' || !Object.hasOwn(levels, level)) return res.status(400).json({ ok: false, error: 'level' });
    if (pid != null && (typeof pid !== 'string' || !PID_RE.test(pid))) return res.status(400).json({ ok: false, error: 'pid' });
    if (op !== 'board' && !pid) return res.status(400).json({ ok: false, error: 'pid' });
    const ip = ipOf(req);
    if (!allowed('ip:' + ip, 240, 60000) || (pid && !allowed('pid:' + pid, 100, 60000)))
      return res.status(429).json({ ok: false, error: 'rate' });

    try {
      if (op === 'board') return res.json(await boardFor(level, pid));
      if (op === 'start') {
        if (!allowed('start:' + pid, 24, 60000)) return res.status(429).json({ ok: false, error: 'rate' });
        const token = randomBytes(18).toString('hex'), now = Date.now();
        await db.runTransaction(async (tx) => {
          const ref = playerRef(level, pid), old = await tx.get(ref);
          if (!old.exists || !old.get('attempted'))
            tx.set(globalRef(level), { attempted: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
          tx.set(ref, { attempted: true, attempts: FieldValue.increment(1), token, startedAt: now, used: false }, { merge: true });
        });
        return res.json({ ok: true, token });
      }
      if (op === 'death') {
        if (typeof b.token !== 'string' || !TOKEN_RE.test(b.token) || typeof b.progress !== 'number' || !Number.isFinite(b.progress) || b.progress < 0 || b.progress > 100)
          return res.status(400).json({ ok: false, error: 'payload' });
        // a furthest-yet run comes with its trace, and can go on the board
        let checked = null;
        if (b.run != null) {
          if (!allowed('far:' + pid, 20, 60000)) return res.status(429).json({ ok: false, error: 'rate' });
          checked = verifyCampaignRun(level, b.run, b.ink, { progress: b.progress / 100 });
          if (!checked.ok) return res.status(422).json({ ok: false, error: checked.reason });
        }
        let accepted = false, improved = false;
        await db.runTransaction(async (tx) => {
          const ref = playerRef(level, pid);
          const [old, entry] = await Promise.all([tx.get(ref), checked ? tx.get(entryRef(level, pid)) : Promise.resolve(null)]);
          if (!old.exists || old.get('used') || old.get('token') !== b.token) return;
          if (checked) {
            const elapsed = Date.now() - old.get('startedAt');
            if (elapsed < checked.ms * 0.6 || elapsed > 20 * 60 * 1000) return;
            improved = keepBest(tx, level, pid, entry, checked);
          }
          const bucket = String(Math.floor(b.progress / 5) * 5);
          tx.update(ref, { used: true });
          tx.set(globalRef(level), { deaths: FieldValue.increment(1), progress: { [bucket]: FieldValue.increment(1) }, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
          accepted = true;
        });
        if (!accepted) return res.status(400).json({ ok: false });
        if (!checked) return res.json({ ok: true });
        const board = await boardFor(level, pid);
        return res.json({ ok: true, improved, rank: board.me && board.me.rank, me: board.me });
      }
      if (op === 'win') {
        if (!allowed('win:' + pid, 10, 60000)) return res.status(429).json({ ok: false, error: 'rate' });
        if (typeof b.token !== 'string' || !TOKEN_RE.test(b.token)) return res.status(400).json({ ok: false, error: 'token' });
        const checked = verifyCampaignRun(level, b.run, b.ink);
        if (!checked.ok) return res.status(422).json({ ok: false, error: checked.reason });
        let improved = false;
        await db.runTransaction(async (tx) => {
          const pRef = playerRef(level, pid), eRef = entryRef(level, pid), gRef = globalRef(level);
          const [player, old] = await Promise.all([tx.get(pRef), tx.get(eRef)]);
          if (!player.exists || player.get('used') || player.get('token') !== b.token) throw new Error('attempt');
          const elapsed = Date.now() - player.get('startedAt');
          if (elapsed < 4000 || elapsed > 20 * 60 * 1000 || elapsed < checked.ms * 0.6) throw new Error('attempt');
          improved = keepBest(tx, level, pid, old, checked);
          if (!player.get('completed')) tx.set(gRef, { completed: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
          tx.update(pRef, { used: true, completed: true, lastWinAt: FieldValue.serverTimestamp() });
        });
        const board = await boardFor(level, pid);
        return res.json({ ok: true, improved, rank: board.me && board.me.rank, me: board.me, stats: board.stats });
      }
      if (op === 'name') {
        const name = cleanName(b.name);
        if (!name) return res.status(400).json({ ok: false, error: 'name' });
        const ref = entryRef(level, pid), snap = await ref.get();
        if (!snap.exists) return res.status(403).json({ ok: false, error: 'qualify' });
        await ref.update({ displayName: name, updatedAt: FieldValue.serverTimestamp() });
        return res.json({ ok: true, name });
      }
      return res.status(400).json({ ok: false, error: 'op' });
    } catch (e) {
      if (e.message === 'attempt') return res.status(400).json({ ok: false, error: 'attempt' });
      console.error('campaign social failed', e);
      return res.status(500).json({ ok: false, error: 'store' });
    }
  });
}

module.exports = { createSocial };
