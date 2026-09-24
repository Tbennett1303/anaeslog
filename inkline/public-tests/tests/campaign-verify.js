/* Real game runs against the TEST campaign verifier, without a Firebase write. */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { verifyCampaignRun, rankKey } = require('../functions/campaign-verify.js');

const files = {
  'notebook-1': 'sol-n1.json', 'notebook-2': 'sol-n2.json', 'notebook-3': 'sol-n3.json',
  'blueprint-1': 'sol-b1.json', 'blueprint-2': 'sol-b2.json', 'blueprint-3': 'sol-b3.json',
  'highlighter-1': 'sol-h1.json', 'highlighter-2': 'sol-h2.json', 'highlighter-3': 'sol-h3.json',
  'scratch-1': 'sol-s1.json', 'scratch-2': 'sol-s2.json', 'scratch-3': 'sol-s3.json',
  'crayon-1': 'sol-c1.json', 'crayon-2': 'sol-c2.json', 'crayon-3': 'sol-c3.json',
};
const pageURL = 'file://' + path.resolve(__dirname, '../public/index.html') + '?noanalytics';

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  let failed = 0;
  for (const [level, file] of Object.entries(files)) {
    const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
    await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
    await page.goto(pageURL);
    await page.waitForFunction(() => window.INKLINE && INKLINE.title);
    const solutions = JSON.parse(fs.readFileSync(path.join(__dirname, 'solutions', file), 'utf8'));
    const plan = solutions.eff || solutions.main || Object.values(solutions)[0];
    const play = (plan) => page.evaluate(({ level, plan }) => {
      INKLINE.freeze(true);
      INKLINE.level(level);
      const G = INKLINE.levelInfo().ground;
      let i = 0, s = INKLINE.state();
      for (let frame = 0; frame < 24000 && s.state === 'play'; frame++) {
        while (i < plan.length && s.x >= plan[i].at) {
          INKLINE.paint(plan[i].pts.map(([x, h]) => ({ x, y: G - h })));
          i++;
        }
        INKLINE.tick(1 / 60, 1);
        s = INKLINE.state();
      }
      const run = INKLINE.dailyRun(); run.level = level;
      return { state: s.state, reason: s.reason, ink: s.ink, progress: s.progress, run };
    }, { level, plan });
    const result = await play(plan);
    const checked = verifyCampaignRun(level, result.run, result.ink);
    const ok = result.state === 'win' && checked.ok;
    console.log((ok ? '  ok   ' : '  FAIL ') + level + ': ' + result.state + ', ' + (result.ink * 100).toFixed(1) + '% ink, verifier ' + (checked.ok ? 'accepted' : JSON.stringify(checked)));
    if (!ok) failed++;
    if (result.state === 'win') {
      const bogus = verifyCampaignRun(level, { ...result.run, trace: [0, 1100, 400, 1] }, 0.999);
      if (bogus.ok) { failed++; console.log('  FAIL malformed forged trace accepted'); }
      const inflated = verifyCampaignRun(level, result.run, 0.999);
      if (result.ink < 0.9 && inflated.ok) { failed++; console.log('  FAIL forged 99.9% ink accepted'); }
    }
    // a run that ends part way: the same route without its last line
    const cut = await play(plan.slice(0, -1));
    if (cut.state === 'dead' && cut.run.time >= 4) {
      const pc = verifyCampaignRun(level, cut.run, cut.ink, { progress: cut.progress });
      const further = verifyCampaignRun(level, cut.run, cut.ink, { progress: Math.min(0.99, cut.progress + 0.15) });
      const richer = verifyCampaignRun(level, cut.run, Math.min(1, cut.ink + 0.3), { progress: cut.progress });
      const ok2 = pc.ok && !further.ok && (cut.ink > 0.69 || !richer.ok);
      console.log((ok2 ? '  ok   ' : '  FAIL ') + level + ' part way: ' + Math.floor(cut.progress * 100) + '% (' + cut.reason + '), accepted ' + pc.ok +
        (pc.ok ? '' : ' ' + JSON.stringify(pc)) + '; claiming 15% further refused (' + further.reason + ')' + '; claiming more ink refused (' + (richer.reason || 'n/a') + ')');
      if (!ok2) failed++;
    }
    await page.close();
  }
  // the order a board keeps: furthest, then ink, then time
  const ex = [['A 94% 80% ink', rankKey(0.94, 0.80, 30000)], ['B 91% 98% ink', rankKey(0.91, 0.98, 20000)],
              ['C home 42% ink', rankKey(1, 0.42, 30000)], ['D home 67% ink', rankKey(1, 0.67, 40000)],
              ['E home 67% ink, quicker', rankKey(1, 0.67, 35000)], ['F 94.9% 80% ink', rankKey(0.949, 0.80, 30000)]];
  const order = ex.slice().sort((a, b) => b[1] - a[1]).map((e) => e[0][0]).join('');
  const orderOk = order === 'EDCAFB' || order === 'EDCFAB';
  console.log((orderOk ? '  ok   ' : '  FAIL ') + 'ranking: home beats any part-way run; further beats more ink; then ink; then time  ' + order);
  if (!orderOk) failed++;
  const same = rankKey(0.94, 0.80, 30000) === rankKey(0.949, 0.80, 30000);
  console.log((same ? '  ok   ' : '  FAIL ') + '94.0% and 94.9% are the same progress (whole percent, as shown)');
  if (!same) failed++;
  await browser.close();
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
