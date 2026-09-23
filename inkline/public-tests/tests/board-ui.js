/* TEST UI smoke: offline leaderboard, mobile resize, and play without network. */
'use strict';
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 390, height: 780 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
  await page.goto('file://' + path.resolve(__dirname, '../public/index.html') + '?fresh&noanalytics');
  await page.waitForFunction(() => window.INKLINE && INKLINE.title.phase === 'tutorial');
  const before = await page.evaluate(() => INKLINE.title.tut.n);
  await page.setViewportSize({ width: 390, height: 700 });
  const after = await page.evaluate(() => INKLINE.title.tut.n);
  if (before !== after) throw new Error('Mobile browser-height change reset tutorial');
  console.log('  ok   mobile height change preserves the opening attempt');

  await page.evaluate(() => INKLINE.board.enter('notebook-1', 'campaign'));
  await page.waitForFunction(() => INKLINE.scene() === 'leaderboard');
  await page.keyboard.press('ArrowRight');
  if ((await page.evaluate(() => INKLINE.board.level)) !== 'notebook-2') throw new Error('Board level navigation');
  await page.screenshot({ path: '/tmp/inkline-v06-board.png' });
  await page.keyboard.press('Escape');
  if ((await page.evaluate(() => INKLINE.scene())) !== 'campaign') throw new Error('Board back navigation');
  console.log('  ok   leaderboard opens, changes level, and returns to Campaign offline');

  await page.evaluate(() => INKLINE.level('notebook-1'));
  await page.waitForTimeout(100);
  if ((await page.evaluate(() => INKLINE.state().state)) !== 'play') throw new Error('Game stopped without Firebase');
  if (errors.length) throw new Error('Page errors: ' + errors.join(', '));
  console.log('  ok   campaign plays with Firebase unavailable, no page errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
