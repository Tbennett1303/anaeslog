/* Initials: three letters, arcade style, for the leaderboards.
 *
 * After a splat, until there are initials, the card offers PUT YOUR INITIALS
 * ON THE LEADERBOARD (with a × to wave it away for good). The sheet has three
 * hand-drawn letter boxes with ▲ ▼; typing works too. Saving signs the boards
 * the player is already on. SETTINGS, the Daily page and the leaderboards all
 * open the same sheet.
 *
 *   node tests/sign.js            BASE=http://127.0.0.1:5000/ (emulators running)
 */
'use strict';
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const BASE = process.env.BASE || 'http://127.0.0.1:5000/';
let fails = 0;
const check = (ok, what, info) => { console.log((ok ? '  ok   ' : '  FAIL ') + what + (info === undefined ? '' : '  ' + JSON.stringify(info))); if (!ok) fails++; };

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.addInitScript(() => { try { localStorage.setItem('inkline.introSeen', '1'); localStorage.setItem('inkline.tutorialDone', '1'); } catch (e) {} });
  await p.goto(BASE + '?all');
  await p.waitForFunction(() => window.INKLINE && INKLINE.title);
  const tap = async (b) => { const v = await p.evaluate(() => INKLINE.view()); await p.mouse.click((b.x0 + b.x1) / 2 * v.scale, (b.y0 + b.y1) / 2 * v.scale); };
  const die = async () => {
    await p.evaluate(() => { const G = INKLINE.levelInfo().ground; INKLINE.place(INKLINE.state().x + 40, G + 260, 0, 400); });
    await p.waitForFunction(() => INKLINE.state().state === 'dead' && INKLINE.endButtons());
  };

  // a board entry of ours, still anonymous, that signing must rename
  const pid = await p.evaluate(() => INKLINE.analytics.pid);
  const esc = (s) => s.replace(/'/g, "'\\''");
  execSync(`node -e '${esc(`
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    const admin = require(${JSON.stringify(require.resolve('firebase-admin', { paths: [__dirname + '/../functions'] }))});
    admin.initializeApp({ projectId: 'demo-inkline' });
    const db = admin.firestore();
    db.collection('testLeaderboardEntries').doc('notebook-3_${pid}').set({ levelId: 'notebook-3', pid: '${pid}', displayName: 'ANONYMOUS', progress: 0.4, ink: 0.3, ms: 9000, key: 40e10 + 300e7 + (9999999 - 9000) })
      .then(() => db.collection('testLeaderboardMeta').doc('notebook-3').set({ ranked: 2 })).then(() => process.exit(0));
  `)}'`, { stdio: 'inherit' });
  await p.evaluate(() => INKLINE.progress.death('notebook-3', 0.4));

  // the first splat offers it
  await p.evaluate(() => INKLINE.level('notebook-1'));
  await die();
  let c = await p.evaluate(() => INKLINE.endButtons());
  check(!!c.boxes.sign && !!c.boxes.nosign, 'after a splat, with no initials: PUT YOUR INITIALS ON THE LEADERBOARD, and a ×', Object.keys(c.boxes));
  check(c.boxes.sign.y0 > c.boxes.again.y1 && c.boxes.sign.y0 > c.boxes.pages.y1, 'it sits at the bottom, under the choices');
  await tap(c.boxes.sign);
  check(await p.evaluate(() => INKLINE.sign.open), 'pressing it opens the initials sheet');
  check((await p.evaluate(() => INKLINE.state())).state === 'dead', 'and the run stays where it was (no retry underneath)');
  check(await p.evaluate(() => INKLINE.sign.word) === 'AAA', 'three letters, starting AAA');

  // ▲ ▼ and typing
  const shot = async () => p.evaluate(() => INKLINE.sign.word);
  await p.keyboard.press('ArrowUp'); await p.keyboard.press('ArrowUp');
  check(await shot() === 'CAA', '▲ turns the letter on (A → B → C)');
  await p.keyboard.press('ArrowDown');
  check(await shot() === 'BAA', '▼ turns it back');
  await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowDown');
  check(await shot() === 'B9A', 'the next letter, and ▼ from A wraps to 9');
  await p.keyboard.press('Backspace'); await p.keyboard.press('Backspace');
  await p.keyboard.type('sex');
  await p.keyboard.press('Enter');
  check(await p.evaluate(() => INKLINE.sign.open) && !(await p.evaluate(() => INKLINE.records.name)), 'a rude three are refused, and the sheet stays');
  await p.keyboard.press('ArrowLeft'); await p.keyboard.press('ArrowLeft');
  await p.keyboard.type('zap');
  await p.keyboard.press('Enter');
  check(await p.evaluate(() => INKLINE.records.name) === 'ZAP' && !(await p.evaluate(() => INKLINE.sign.open)), 'typing ZAP and Enter saves ZAP');
  await p.waitForTimeout(150);
  c = await p.evaluate(() => INKLINE.endButtons());
  check(!c.boxes.sign, 'with initials, the splat card no longer asks');

  // the boards already played are signed
  await p.waitForTimeout(1500);
  await p.evaluate(() => INKLINE.board.enter('notebook-3', 'campaign'));
  await p.waitForFunction(() => { const b = INKLINE.global.board('notebook-3'); return b && b.me; }, null, { timeout: 8000 });
  const me = await p.evaluate(() => INKLINE.global.board('notebook-3').me);
  check(me && me.name === 'ZAP', 'a board this player was already on now shows ZAP', me);
  await p.waitForFunction(() => INKLINE.board.boxes().name);
  const nameBox = await p.evaluate(() => INKLINE.board.boxes().name);
  await tap(nameBox);
  check(await p.evaluate(() => INKLINE.sign.open && INKLINE.sign.word === 'ZAP'), 'the leaderboard’s ON THE BOARD AS box opens the sheet, with ZAP in it');
  await p.keyboard.press('Escape');
  check(!(await p.evaluate(() => INKLINE.sign.open)) && await p.evaluate(() => INKLINE.records.name) === 'ZAP', 'Escape closes it and keeps ZAP');

  // the Daily page and SETTINGS open it too
  await p.evaluate(() => INKLINE.daily.enter()); await p.waitForFunction(() => INKLINE.daily.boxes().name);
  await tap(await p.evaluate(() => INKLINE.daily.boxes().name));
  check(await p.evaluate(() => INKLINE.sign.open), 'the Daily page’s box opens the sheet');
  await p.keyboard.press('Escape');
  await p.evaluate(() => INKLINE.settings.enter()); await p.waitForTimeout(700);
  await tap(await p.evaluate(() => INKLINE.settings.boxes().initials));
  check(await p.evaluate(() => INKLINE.sign.open), 'SETTINGS › INITIALS opens the sheet');
  await p.keyboard.press('Escape');

  // waved away, it stays away
  await p.evaluate(() => { INKLINE.records.name = ''; });
  await p.evaluate(() => INKLINE.level('notebook-1'));
  await die();
  c = await p.evaluate(() => INKLINE.endButtons());
  await tap(c.boxes.nosign);
  await p.waitForTimeout(150);
  c = await p.evaluate(() => INKLINE.endButtons());
  const st = await p.evaluate(() => INKLINE.state().state);
  check(c && !c.boxes.sign && st === 'dead', '× waves it away (and is not a retry)', { st, boxes: c && Object.keys(c.boxes) });
  await p.reload(); await p.waitForFunction(() => window.INKLINE && INKLINE.title);
  await p.evaluate(() => INKLINE.level('notebook-1'));
  await die();
  c = await p.evaluate(() => INKLINE.endButtons());
  check(!c.boxes.sign, 'and it stays away after a reload (SETTINGS still has it)');

  check(!errs.length, 'no page errors', errs);
  await b.close();
  console.log(fails ? fails + ' FAILED' : 'all passed');
  process.exit(fails ? 1 : 0);
})();
