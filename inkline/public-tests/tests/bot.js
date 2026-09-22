/* The course checker. Plays generated courses in the real game engine,
 * fast-forwarded, drawing each chunk's reference solution when Inky comes
 * within reach of it, and reports where (if anywhere) a course could not be
 * survived. A course the reference player cannot get through is a generator
 * bug: an impossible section.
 *
 *   node tests/bot.js [--seeds 200] [--metres 1500] [--mode endless|daily|zen]
 *                     [--style ref|clumsy] [--from 1] [--width 1024 --height 768]
 *
 * Styles: ref draws the reference strokes exactly; clumsy draws them with a
 * wobble, lifted a little and 25% longer, like a hurried hand.
 */
const { chromium } = require('playwright');
const path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const SEEDS = +arg('seeds', 100), METRES = +arg('metres', 1500), MODE = arg('mode', 'endless');
const STYLE = arg('style', 'ref'), FROM = +arg('from', 1), W = +arg('width', 1024), H = +arg('height', 768);
const ONLY = arg('seed', null);
const CH = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PAGE = 'file://' + path.resolve(__dirname, '../public/index.html') + '?noanalytics';

async function main() {
  const b = await chromium.launch({ executablePath: CH });
  const p = await b.newPage({ viewport: { width: W, height: H } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await p.goto(PAGE);
  await p.waitForFunction(() => window.INKLINE && INKLINE.title);
  const seeds = ONLY ? [+ONLY] : Array.from({ length: SEEDS }, (_, i) => ((FROM + i) * 2654435761) >>> 0);
  const out = [];
  const t0 = Date.now();
  for (const seed of seeds) {
    const r = await p.evaluate(({ seed, METRES, MODE, STYLE }) => {
      INKLINE.freeze(true);
      INKLINE.mode(MODE, seed);
      const C = INKLINE.course(), G = INKLINE.levelInfo().ground;
      let k = 0, drew = 0, minInk = 1, wall = performance.now();
      const rnd = (function (a) { return function () { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; })(seed ^ 0x9e37);
      const target = METRES * 20 + 110;
      let st = INKLINE.state();
      while (st.state === 'play' && st.x < target && st.t < 1500) {
        while (k < C.refs.length && st.x >= C.refs[k].at) {
          const ref = C.refs[k++];
          let pts = ref.pts.map(q => ({ x: q[0], y: G - q[1] }));
          if (STYLE === 'clumsy') {
            // a hurried hand: starts early, ends late, wobbles, and sits a little high
            const a = pts[0], z = pts[pts.length - 1];
            const dense = [];
            const ex = [{ x: a.x - 30, y: a.y - 1 }].concat(pts, [{ x: z.x + 25, y: z.y - 1 }]);
            for (let i = 0; i < ex.length - 1; i++) {
              const n = Math.max(1, Math.round(Math.hypot(ex[i + 1].x - ex[i].x, ex[i + 1].y - ex[i].y) / 12));
              for (let j = 0; j < n; j++) dense.push({ x: ex[i].x + (ex[i + 1].x - ex[i].x) * j / n, y: ex[i].y + (ex[i + 1].y - ex[i].y) * j / n });
            }
            dense.push(ex[ex.length - 1]);
            pts = dense.map((q, i) => ({ x: q.x + (rnd() - 0.5) * 3, y: q.y - 1.5 + (rnd() - 0.5) * 4 }));
          }
          INKLINE.paint(pts); drew++;
        }
        INKLINE.tick(1 / 60, 3);
        st = INKLINE.state();
        if (st.ink < minInk) minInk = st.ink;
      }
      const ch = C.chunks.filter(c => c.x0 <= st.x + 50).pop();
      const res = { seed, state: st.state, reason: st.reason, dist: Math.round((st.x - 110) / 20), t: Math.round(st.t),
                    x: Math.round(st.x), h: Math.round(G - st.y), minInk: Math.round(minInk * 100), drew,
                    chunk: ch ? ch.kind + '#' + ch.i + '@' + Math.round(ch.x0) + ' d=' + ch.d : '', ms: Math.round(performance.now() - wall) };
      INKLINE.freeze(false);
      return res;
    }, { seed, METRES, MODE, STYLE });
    out.push(r);
    const ok = r.state === 'play' && r.dist >= METRES;
    if (!ok || process.env.VERBOSE) console.log((ok ? 'ok   ' : 'FAIL ') + JSON.stringify(r));
  }
  const fails = out.filter(r => !(r.state === 'play' && r.dist >= METRES));
  const byKind = {};
  for (const f of fails) { const k = f.chunk.split('#')[0] + ':' + f.reason; byKind[k] = (byKind[k] || 0) + 1; }
  console.log(`${MODE}/${STYLE}: ${out.length - fails.length}/${out.length} reached ${METRES} m ` +
              `(${((Date.now() - t0) / 1000).toFixed(0)}s)  min ink ${Math.min(...out.map(r => r.minInk))}%  ` +
              (fails.length ? 'failures ' + JSON.stringify(byKind) : ''));
  if (errs.length) console.log('page errors', errs.slice(0, 5));
  await b.close();
  process.exit(fails.length || errs.length ? 1 : 0);
}
main();
