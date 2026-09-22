# THE INKLINE — completing the game: implementation plan

Base: the v0.4 test build (`public/index.html`), which has one engine (physics, ink, strokes,
splat, sound, page turn), a level registry, the Campaign page and the front page. It is
frozen at `../v0.4/`. Production (`../firebase/`, v0.3) stays as it is.

## 1. One course generator, shared (`public/gen.js`)
- Plain script with no dependencies. It loads in the browser (`window.InkGen`) and in Node
  (`require`), so the leaderboard function rebuilds exactly the course the player ran.
- **Deterministic.** It uses a mulberry32 PRNG and integer/float arithmetic only: no
  `Math.sin`/`exp` and nothing that depends on the screen. seed → identical course on
  every device. Daily seed = FNV-1a of `inkline/daily/YYYY-MM-DD` (UTC).
- **Output** is the campaign's level format in height-above-ground units (`printed`
  polylines, `hazards`, `drops`, `notes`) streamed chunk by chunk with `ensure(x)`.
- **Chunks** (each one is solvable on its own):
  | Group | Chunks |
  |---|---|
  | Floors | run, gap, step up, safe ledge drop, smooth hill/valley (curvature bounded so the crest can't launch Inky) |
  | Obstacles | rock, tunnel (ceiling over a level floor), tunnel over a gap, block with a long run-out, stubs |
- **Difficulty** `d = x/(x+K)`: wider gaps, taller steps, rarer rests, more hazard
  chunks, and less ink slack.
- **Every chunk carries a cautious reference solution** (strokes plus ink cost). An ink
  ledger places blots on the floor ahead whenever the reference player would drop below a
  reserve. Early on the slack factor is generous; late it is tight. So the course is
  always survivable with sensible drawing, and wasteful drawing runs dry.
- **Configs:**
  | Mode | Seed | Ink | Other |
  |---|---|---|---|
  | endless | random | normal | |
  | daily | date | normal | starts a little further up the curve |
  | zen | random | unlimited | no scroll pressure |

## 2. Modes in the one engine (`index.html`)
- `MODE`: campaign | endless | daily | zen. Gen modes build `LEVEL` from the course and
  stream new chunks in as the camera advances. The collision grid, hazards, drops and
  render lists are pruned behind the camera. Physics and input are untouched.
- **Endless:** a new random seed per run. The HUD shows distance (20 units = 1 m),
  time and the inkwell. A pencil "best" mark sits in the world at your PB. The result
  card appears instantly with DISTANCE, TIME, PB and a big RETRY; tapping anywhere
  retries (after a 0.2 s guard). Local PB distance, PB time and attempts are kept.
- **Daily:** the page shows the date, today's course, your best today, your global rank,
  player and run counts, the top 10, an optional name, and PLAY. Unlimited attempts.
  Every run is reported after death, with its trace only when it beats your best today.
  Runs that span midnight UTC count for the day they started.
- **Zen:** reached from ENDLESS (a pencil "zen" note). Unlimited ink, no forced scroll,
  no result card. A crash respawns Inky at the last safe floor. No leaderboard.
- **Home:** CAMPAIGN / ENDLESS (· zen) / DAILY CHALLENGE, with "today's course" under it.
- **Campaign:** the 6 levels are unchanged. Adds a success sound, a red tick drawn onto
  the win card, the new tick animating on the pages view, a world-complete note, and a
  quit (abandon) event.

## 3. Ranking and anti-cheat (Cloud Functions, codebase `game`, `functions/`)
- **Score:** distance first, with shorter time breaking ties (reaching the same point
  sooner is better). It is packed into one sortable number, so only automatic
  single-field indexes are needed.
- **`POST /api/daily`**
  - `op: submit`: the server derives the seed from the day, which must be today, or
    yesterday within a 15-minute grace. It rebuilds the course with `gen.js` and checks
    the trace (5 Hz: t, x, h, grounded) and the simplified strokes:
    - time and distance agree with the trace; the speed is plausible; the trace never
      falls behind the camera creep;
    - no sample is inside a hazard or below the kill line;
    - grounded samples are supported by printed ground or by a stroke drawn by then;
    - ink drawn ≤ well + blots actually passed.

    Passing runs update `daily/{day}/runs/{pid}` if they are better, plus the day
    counters.
  - `op: board`: returns the top 10 (names only, never ids), your rank (a count
    aggregation), and the player and run counts.
- **`POST /api/track`:** allow-listed telemetry into `g_players/{pid}/ev`, separate from
  the v0.3 data.
- Rate limits are per id and per IP, in memory. No IPs are stored. Firestore rules deny
  every client; admins read telemetry only through the existing `admins/{uid}` gate.

## 4. Analytics
- **Events:** session (with input and device), mode, attempt (mode, level or seed or day,
  retry flag), death (distance or progress, time, ink, cause), win, PB, quit/abandon,
  daily result (rank), and session end.
- **`public/admin/`** computes these metrics:
  - immediate retry rate
  - attempts per player
  - session length
  - level-to-level conversion in the campaign
  - Endless and Daily attempts per player
  - share of players trying each mode
  - D1 return
  - Daily return
- Flushing happens on menus, result cards and page hide, never during a run.

## 5. Feel and polish
- A one-euro filter on mouse input only; touch stays raw.
- Success sound; subtle UI clicks; mute persists.

## 6. Tests (definition of done)
1. **Node:** generator determinism, identical daily seeds, date rollover, static
   sanity, and the reference ink ledger across thousands of seeds.
2. **Headless bot in the real engine**, fast-forwarded: reference and clumsy players on
   hundreds of seeds and long runs, to catch impossible sections.
3. **Emulator:** submit, rank, rejection of forged runs, rate limits, rollover.
4. **Browser flows:** all modes with mouse and touch, phone and tablet viewports, no
   console errors, 6 campaign levels re-run with the saved solutions.
