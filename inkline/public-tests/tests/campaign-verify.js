/* Real game runs against the TEST campaign verifier, without a Firebase write. */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { verifyCampaignRun } = require('../functions/campaign-verify.js');

const files = {
  'notebook-1': 'sol-n1.json', 'notebook-2': 'sol-n2.json', 'notebook-3': 'sol-n3.json',
  'blueprint-1': 'sol-b1.json', 'blueprint-2': 'sol-b2.json', 'blueprint-3': 'sol-b3.json',
  'highlighter-1': 'sol-h1.json', 'highlighter-2': 'sol-h2.json', 'highlighter-3': 'sol-h3.json',
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
    const result = await page.evaluate(({ level, plan }) => {
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
      return { state: s.state, reason: s.reason, ink: s.ink, run };
    }, { level, plan });
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
    await page.close();
  }
  await browser.close();
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
