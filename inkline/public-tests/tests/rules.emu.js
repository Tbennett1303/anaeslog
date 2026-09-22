/* Firestore rules for the test build's collections, on the emulator:
 * nobody reads or writes them from a browser except an admin reading.
 *   node tests/rules.emu.js    (Firestore emulator on :8080)
 * Loads ../firebase/firestore.rules (the one rules file for the project) into
 * the running emulator, then asks as: nobody, a signed-in stranger, an admin.
 */
const fs = require('fs'), path = require('path');
const HOST = process.env.FS_HOST || 'http://127.0.0.1:8080';
const PROJECT = 'demo-inkline';
const DOCS = `${HOST}/v1/projects/${PROJECT}/databases/(default)/documents`;
let fails = 0;
const check = (ok, msg, x) => { console.log((ok ? '  ok   ' : '  FAIL ') + msg + (x !== undefined ? '  ' + JSON.stringify(x) : '')); if (!ok) fails++; };
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const token = (uid) => b64({ alg: 'none', kid: 'fakekid', typ: 'JWT' }) + '.' + b64({
  iss: 'https://securetoken.google.com/' + PROJECT, aud: PROJECT, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600,
  auth_time: Math.floor(Date.now() / 1000), sub: uid, user_id: uid, firebase: { sign_in_provider: 'custom', identities: {} } }) + '.';
const as = (who) => who === 'owner' ? { Authorization: 'Bearer owner' } : who ? { Authorization: 'Bearer ' + token(who) } : {};
const get = async (p, who) => (await fetch(DOCS + p, { headers: as(who) })).status;
const put = async (p, who) => (await fetch(DOCS + p, { method: 'PATCH', headers: Object.assign({ 'Content-Type': 'application/json' }, as(who)),
  body: JSON.stringify({ fields: { x: { integerValue: '1' } } }) })).status;

(async () => {
  const rules = fs.readFileSync(path.join(__dirname, '../../firebase/firestore.rules'), 'utf8');
  const r = await fetch(`${HOST}/emulator/v1/projects/${PROJECT}:securityRules`, { method: 'PUT', body: JSON.stringify({ rules: { files: [{ content: rules }] } }) });
  check(r.ok, 'project rules loaded into the emulator');
  // seed as the server would (owner bypasses rules)
  for (const d of ['/g_players/aaaa1111bbbb2222', '/g_players/aaaa1111bbbb2222/ev/b1', '/daily/2026-09-22', '/daily/2026-09-22/runs/aaaa1111bbbb2222', '/admins/admin-uid', '/players/p1'])
    await put(d, 'owner');
  for (const [p, label] of [['/g_players/aaaa1111bbbb2222', 'telemetry player'], ['/g_players/aaaa1111bbbb2222/ev/b1', 'telemetry batch'],
                            ['/daily/2026-09-22', 'daily counts'], ['/daily/2026-09-22/runs/aaaa1111bbbb2222', 'a daily run'], ['/players/p1', 'v0.3 analytics']]) {
    check((await get(p, null)) === 403, 'public cannot read ' + label);
    check((await get(p, 'stranger')) === 403, 'a signed-in non-admin cannot read ' + label);
    check((await get(p, 'admin-uid')) === 200, 'an admin can read ' + label);
    check((await put(p, null)) === 403 && (await put(p, 'admin-uid')) === 403, 'nobody writes ' + label + ' from a client (admin included)');
  }
  // collection-group read of telemetry, as the dashboard does it
  const cg = async (who) => (await fetch(`${DOCS}:runQuery`, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, as(who)),
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'ev', allDescendants: true }] } }) })).status;
  check((await cg('stranger')) === 403 && (await cg('admin-uid')) === 200, 'collection-group telemetry read: admin only');
  check((await put('/admins/stranger', 'stranger')) === 403, 'nobody can make themselves an admin');
  // restore open rules for the other emulator tests
  await fetch(`${HOST}/emulator/v1/projects/${PROJECT}:securityRules`, { method: 'PUT', body: JSON.stringify({ rules: { files: [{ content: "rules_version='2'; service cloud.firestore { match /databases/{d}/documents { match /{x=**} { allow read, write: if true; } } }" }] } }) });
  console.log(fails ? fails + ' FAILED' : 'all passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
