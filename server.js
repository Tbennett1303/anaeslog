const express    = require('express');
const Datastore  = require('nedb-promises');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const cors       = require('cors');
const { v4: uuidv4 } = require('uuid');
const path       = require('path');
const fs         = require('fs');

const app        = express();
const JWT_SECRET = process.env.JWT_SECRET || 'anaes-logbook-secret-change-in-prod';
const PORT       = process.env.PORT || 3000;
const DB_DIR     = path.join(__dirname, 'data');

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR);

// ── Datastores ────────────────────────────────────────────────────────────────
const db = {
  users:   Datastore.create({ filename: path.join(DB_DIR, 'users.db'),   autoload: true }),
  entries: Datastore.create({ filename: path.join(DB_DIR, 'entries.db'), autoload: true }),
  tpls:    Datastore.create({ filename: path.join(DB_DIR, 'templates.db'), autoload: true }),
  custom:  Datastore.create({ filename: path.join(DB_DIR, 'custom.db'),  autoload: true }),
};

// Ensure unique email index
db.users.ensureIndex({ fieldName: 'email', unique: true });

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Auth middleware ───────────────────────────────────────────────────────────
const auth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(header.split(' ')[1], JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// ── Auth ──────────────────────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name, gmc_number, hospital } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const hash = bcrypt.hashSync(password, 10);
    const id   = uuidv4();
    await db.users.insert({ _id: id, email: email.toLowerCase(), password: hash, name, gmc_number, hospital, created_at: new Date() });
    const token = jwt.sign({ id, email: email.toLowerCase() }, JWT_SECRET, { expiresIn: '90d' });
    res.json({ token, user: { id, email, name, gmc_number, hospital } });
  } catch {
    res.status(400).json({ error: 'Email already registered' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await db.users.findOne({ email: email?.toLowerCase() });
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'Invalid email or password' });
  const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '90d' });
  res.json({ token, user: { id: user._id, email: user.email, name: user.name, gmc_number: user.gmc_number, hospital: user.hospital } });
});

app.put('/api/auth/profile', auth, async (req, res) => {
  const { name, gmc_number, hospital } = req.body;
  await db.users.update({ _id: req.user.id }, { $set: { name, gmc_number, hospital } });
  res.json({ success: true });
});

app.get('/api/auth/profile', auth, async (req, res) => {
  const u = await db.users.findOne({ _id: req.user.id });
  if (!u) return res.status(404).json({ error: 'User not found' });
  res.json({ id: u._id, email: u.email, name: u.name, gmc_number: u.gmc_number, hospital: u.hospital });
});

// ── Entries ───────────────────────────────────────────────────────────────────
app.get('/api/entries', auth, async (req, res) => {
  const entries = await db.entries.find({ user_id: req.user.id }).sort({ date: -1, created_at: -1 });
  res.json(entries.map(cleanEntry));
});

app.post('/api/entries', auth, async (req, res) => {
  const e = { ...req.body, _id: req.body.id || uuidv4(), user_id: req.user.id, created_at: req.body.created_at || new Date() };
  delete e.id;
  await db.entries.insert(e);
  res.json({ id: e._id });
});

app.put('/api/entries/:id', auth, async (req, res) => {
  const { id } = req.params;
  const found = await db.entries.findOne({ _id: id, user_id: req.user.id });
  if (!found) return res.status(404).json({ error: 'Entry not found' });
  const upd = { ...req.body, updated_at: new Date() };
  delete upd.id; delete upd._id; delete upd.user_id;
  await db.entries.update({ _id: id, user_id: req.user.id }, { $set: upd });
  res.json({ success: true });
});

app.delete('/api/entries/:id', auth, async (req, res) => {
  await db.entries.remove({ _id: req.params.id, user_id: req.user.id }, {});
  res.json({ success: true });
});

// Bulk sync
app.post('/api/sync', auth, async (req, res) => {
  const { entries = [] } = req.body;
  for (const e of entries) {
    const exists = await db.entries.findOne({ _id: e.id });
    const doc = { ...e, _id: e.id || uuidv4(), user_id: req.user.id };
    delete doc.id;
    if (exists) await db.entries.update({ _id: doc._id }, { $set: doc });
    else         await db.entries.insert(doc);
  }
  const all = await db.entries.find({ user_id: req.user.id }).sort({ date: -1, created_at: -1 });
  res.json({ success: true, entries: all.map(cleanEntry) });
});

// ── Templates ─────────────────────────────────────────────────────────────────
app.get('/api/templates', auth, async (req, res) => {
  const tpls = await db.tpls.find({ user_id: req.user.id }).sort({ name: 1 });
  res.json(tpls.map(t => ({ id: t._id, name: t.name, data: t.data })));
});

app.post('/api/templates', auth, async (req, res) => {
  const id  = uuidv4();
  await db.tpls.insert({ _id: id, user_id: req.user.id, name: req.body.name, data: req.body.data });
  res.json({ id });
});

app.put('/api/templates/:id', auth, async (req, res) => {
  await db.tpls.update({ _id: req.params.id, user_id: req.user.id }, { $set: { name: req.body.name, data: req.body.data } });
  res.json({ success: true });
});

app.delete('/api/templates/:id', auth, async (req, res) => {
  await db.tpls.remove({ _id: req.params.id, user_id: req.user.id }, {});
  res.json({ success: true });
});

// ── Custom options ────────────────────────────────────────────────────────────
app.get('/api/custom-options', auth, async (req, res) => {
  const opts = await db.custom.find({ user_id: req.user.id });
  const grouped = {};
  opts.forEach(o => {
    if (!grouped[o.category]) grouped[o.category] = [];
    grouped[o.category].push({ id: o._id, value: o.value });
  });
  res.json(grouped);
});

app.post('/api/custom-options', auth, async (req, res) => {
  const id = uuidv4();
  await db.custom.insert({ _id: id, user_id: req.user.id, category: req.body.category, value: req.body.value });
  res.json({ id });
});

app.delete('/api/custom-options/:id', auth, async (req, res) => {
  await db.custom.remove({ _id: req.params.id, user_id: req.user.id }, {});
  res.json({ success: true });
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function cleanEntry(e) {
  const { _id, ...rest } = e;
  return { id: _id, ...rest };
}

// ── SPA fallback ──────────────────────────────────────────────────────────────
app.get('*', (_, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => {
  console.log(`\n  AnaesLog running at http://localhost:${PORT}\n`);
});
