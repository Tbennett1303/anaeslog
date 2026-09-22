# The Inkline — public tests (v0.5)

The complete game, in its test build: **Campaign**, **Endless**, **Daily
Challenge** and **Zen**, all on one engine. Deployed only to
https://theinkline-tests.web.app. Production (`../firebase/`, v0.3) is not
touched by anything in this folder; v0.4 is frozen at `../v0.4/`, and
`../archive/` holds a full recovery zip.

```
public/index.html      the game: one engine, four modes (no dependencies)
public/gen.js          the course generator, shared with the server
public/admin/          private telemetry dashboard (admin sign-in)
functions/             Cloud Functions, codebase "game": /api/daily, /api/track
tests/                 generator, bot, emulator, flow, rollover, rules, dashboard
PLAN.md                the implementation plan this build followed
```

## The front page

*THE INKLINE* — *Draw the path. / Get Inky home.* A line draws itself, Inky
rides it into a wall, splat; then the choices are written in:

- **CAMPAIGN**
- **ENDLESS** — with a pencilled *or zen* in the margin
- **DAILY CHALLENGE** — with *today's course* (and your best today) under it

First visit plays the whole beat (~4 s); after that the choices are there at
once, and any tap that is not a choice skips to the finished page.

## The modes

All four modes share the same physics, input, ink, sound and splat. A mode
only chooses where the course comes from and what happens when a run ends.

### Campaign
Two worlds of three pages (Notebook, Blueprint) that teach one idea at a time,
unchanged from v0.4 apart from the finish. Progress is saved on the device,
open, locked and finished pages are clear at a glance, and nothing is bought or
earned. Finishing a page now plays a short success sound and writes a red tick
on the card; the tick is written again on the pages view, and a finished world
says *all three done*. Inky runs on through the line instead of freezing.

### Endless
Tap ENDLESS and you are running: a new generated course every run, harder the
further you go. HUD: distance (20 units = 1 m, Inky is a metre across), time,
the inkwell, and your best, both in the corner and as a red pencil mark on the
page where your best run ended. Passing it says *past your best!*.

Death shows the result instantly — **distance, time, best** — with **RETRY**
as the obvious action: tap anywhere (after a 0.2 s guard so a finger still
drawing doesn't retry by accident), Space or Enter. Retry to a moving run takes
about 10 ms. Small links: *home*, *zen*. Kept on the device: best distance,
longest survival, attempts.

### Daily Challenge
One course per UTC day, the same for everyone, played as often as you like.
The Daily page shows the date, today's course number, your best today and
attempts, your global rank, players and runs today, the top 10, and your name
on the board (optional; tap to edit). The course is a blueprint sheet. A run
that starts before midnight UTC counts for its own day.

### Zen
Reached from ENDLESS. The same generated courses with no pressure: unlimited
ink, no page scrolling you along, no timer, no leaderboard. A fall puts Inky
back on good ground a second or so behind where it happened.

## The course generator (`public/gen.js`)

One deterministic generator feeds Endless (random seed), Daily (seed from the
UTC date) and Zen, and the server loads the same file to check daily runs. It
reads no screen, clock or `Math.random` and uses only arithmetic and `sqrt`,
so a seed gives the same course on every device.

**Chunks** — each one solvable on its own, built in height-above-ground units:

| Chunk | What it asks |
|---|---|
| gap | bridge it |
| step up | a ramp that meets the ledge on top |
| ledge | a free drop onto the floor below |
| rock (or two) | draw over it |
| block | ramp or flick over it, long run-out after |
| tunnel | ceiling over a level floor — stay low |
| tunnel over a gap | a low, level bridge under the ceiling |
| hill / valley | ride it (curvature bounded so the crest cannot launch him) |
| stubs | short printed pieces across a pit |

**Difficulty** follows an S-curve in distance, gentle for the first ~150 m,
half-way at 500 m. It brings wider gaps, taller steps, lower tunnels, shorter
rests and more hazard chunks, and draws them in more often. Daily starts a
little further up the curve.

**Ink.** Every chunk carries a cautious reference solution. An ink ledger runs
that reference player along the course and puts blots on the floor ahead
whenever they would dip below a reserve. The slack (1.6× the reference line
early, 1.2× late) and the reserve both shrink with distance, so sensible
drawing always survives and wasteful drawing runs dry.

## The daily board

**Ranking.** Distance first; then the time taken to get there, sooner being
better. Survival time alone would reward dawdling, and the page scrolls anyway,
so distance is the honest measure of progress. Both are packed into one
sortable number, so no composite index is needed.

**Submitting.** After every daily run the game reports it (never during a run).
It sends the full run — Inky's position 5× a second and the lines drawn,
simplified — only when it beats your best today.

**Checks** (`functions/verify.js`, lightweight by design). The server rebuilds
the day's course from the date with `gen.js` and refuses a run if:
- the trace is malformed, or its time or distance don't match the claim;
- anything moves faster than the game's speed limit;
- Inky outruns the page's forced scroll;
- a sample sits inside a hazard or below the page;
- Inky is on the ground where there was neither printed ground nor a line
  drawn by then;
- more ink was drawn than the well plus the blots the run actually passed.

A refused run writes nothing. This stops edited requests and invented runs; a
forger who builds a physically consistent run from scratch can still pass it.

**Privacy.** No account: the browser's random id (the same one the analytics
use) plus an optional name, which is cleaned and filtered. The board is only
read through the function and never returns an id. IPs are used for in-memory
rate limiting only and never stored. Firestore rules deny every client, and
admins can read only through the existing `admins/{uid}` gate.

## Analytics

Sent in batches to `/api/track` from menus, result cards and page hide — never
during a run. Everything is allow-listed server-side into `g_players/{pid}/ev`,
separate from the v0.3 data.

| | Events |
|---|---|
| Everywhere | session (with input type and device class), mode chosen, session end (duration) |
| Campaign | attempt (with level and whether it was a retry), death (progress, ink left, cause), win (time, ink left), quit (where it was left) |
| Endless | attempt (seed, retry flag), death (distance, time, cause), new best |
| Daily | page open (date), attempt (day), death (distance), result (rank), repeat days |

`/admin/` (sign-in plus `admins/{uid}`) computes:
- immediate retry rate (overall and by mode)
- attempts per player
- session length
- campaign level-to-level conversion, with attempts, time and ink at first
  win and where abandoners stopped
- share of players trying each mode, and attempts per player per mode
- Endless distance and survival
- Daily per day, next-day and multi-day Daily return
- D1 return

It can also read the local browser's own data, for testing without a backend.

## Campaign pages

| | Learn | Apply | Master |
|---|---|---|---|
| **Notebook** — ink on paper | Notebook 1 | Notebook 2 | Notebook 3 (the original, unchanged) |
| **Blueprint** — white ink on cyanotype | Blueprint 1 | Blueprint 2 | Blueprint 3 |

### What each page teaches

- **Notebook 1 — the line is the ground.** Bridge a gap, draw over a low rock,
  climb (it costs speed), ride a slope down (it gives speed back), catch a blot.
  Short gaps, plenty of ink.
- **Notebook 2 — speed is a resource.** A hill's lip throws Inky over the first
  pit by itself: don't draw. A beam over a pit wants a low line. A block can be
  ramped at great cost or flicked cheaply off the hill's speed. The stubs cost
  whatever your habits cost.
- **Notebook 3 — the original playtest level**, exactly as tested. Its geometry,
  ink and physics are verified identical to v0.3; only its name is new.
- **Blueprint 1 — read the drawing.** Stairs up are solid: draw a ramp over the
  nosings. The roof's trajectory is sketched on the sheet — trust it. A lintel's
  clearance is dimensioned. A girder does half the bridging for you.
- **Blueprint 2 — stairs down are free.** Hop them; drawing over them only spends
  ink. A truss is missing a member. Columns step up, then down by just too much
  to fall naturally. Off the last column, don't draw: bridge it level and the line
  carries Inky into the beam.
- **Blueprint 3 — everything, tighter.** A long stair to ramp, a roof launch, two
  lintels over one pit with a single beam to rest on, a block off a short
  run-up, an incomplete truss, a long sparse finish.

Blueprint annotations are part of the puzzle and are honest: every dashed
trajectory is drawn from the measured flight, not an estimate.

### Playtested

Each level was played by scripted players who draw each line as Inky arrives,
the way a person does, and every route below was re-run together under load
with identical results.

| Level | Route | Result | Ink left |
|---|---|---|---|
| Notebook 1 | clumsy, wobbly, over-long lines | finished | 47% |
| | cautious bridges | finished | 63% |
| | efficient flicks | finished | 85% |
| Notebook 2 | bridges everything, even over the lip | finished | 0% |
| | trusts the lip | finished | 17% |
| | lip + block flick | finished | 40% |
| Blueprint 1 | cautious | finished | 64% |
| | trusts the drawn arc | finished | 73% |
| | efficient | finished | 82% |
| Blueprint 2 | ramps over the stairs + bridges all | finished | 0% |
| | hops the stairs | finished | 21% |
| | efficient | finished | 52% |
| | bridges level off the last column | hits the beam | — |
| Blueprint 3 | bridges everything | runs dry at 98% | — |
| | trusts the arc | finished | 1% |
| | efficient | finished | 18% |

Things the playtests found and fixed: sharp crests throw Inky into the air so he
never rides the slope (crests are now curved); tight bowls stop him dead (bowls
now have a wide radius); a spline overshot its control points (replaced with a
monotone curve that cannot); a beam placed too close after a drop was physically
impossible to pass, because a line can hold Inky up but never pull him down
faster than he falls (that section was redesigned around not drawing).

Also verified: the whole journey by touch and by mouse, locked pages refusing,
unlock order, the win card's next, 60 fps on the busiest Blueprint sheet.

### Campaign records

Per page, on the device: attempts, completions, best ink left, furthest reach,
best time and the attempt of the first completion — everything a future 1–3
ink-drop rating needs, stored so that can be added without changing it.

Campaign pages show the player's own numbers. `Global.get(levelId)` in the
page is where per-level global statistics would plug in (see Future ideas);
the only global board in this build is the Daily Challenge's.

## Tests

Run from this folder. Browser tests need Playwright (`npm i -D playwright`,
or `NODE_PATH` pointing at an install). The emulator tests need
`firebase emulators:start --only functions,firestore,hosting --project demo-inkline`.

| Test | What it proves | Last result |
|---|---|---|
| `node tests/gen.test.js 20000` | the server's copy of gen.js is the game's; seed → same course (built at once or streamed); a day → same seed; day turns at 00:00 UTC; score order; over 20,000 seeds × 2 km: heights in band, hazards on ground, tunnels ≥ 46 clear, blots on floors, reference ledger never dry | all passed |
| `node tests/bot.js --seeds 1000 --metres 2000` | the real engine, fast-forwarded, reference player on 1,000 Endless seeds | 1000/1000 reached 2 km, min ink 31% |
| `… --style clumsy` | wobbly, over-long, slightly high lines | 1000/1000, min ink 16% |
| `… --seeds 30 --metres 10000` | long runs | 30/30 reached 10 km |
| `… --mode daily --width 390 --height 844` | Daily on a phone, portrait | 300/300 reached 1.5 km |
| `… --mode zen --width 844 --height 390` | Zen on a phone, landscape | 200/200 reached 1.5 km |
| `node tests/daily.emu.js` | two players play today's course; board, ranks, counts, names, no ids; 10 forged or malformed submissions refused (edited distance, stretched trace, a sample inside a hazard, lines removed, ink overspent, blots never passed, sped up, wrong version, old day, bad id); rate limit; telemetry stored with no IP | all passed |
| `node tests/flow.js` | mouse (desktop) and touch (phone) through every mode; result card, stray-tap guard, retry, home, zen respawn, name field, a Daily run drawn live and accepted by the server, Esc, campaign, no console errors | all passed |
| `node tests/rollover.js` | a run across midnight counts for its day; the retry is tomorrow's course; pages turn over | all passed |
| `node tests/rules.emu.js` | public and non-admin cannot read anything; admin can; nobody writes; nobody self-promotes | all passed |
| `node tests/admin.test.js` | dashboard metrics on a hand-checked dataset | all passed |

Also re-run: all six campaign levels with their saved solutions (same results
as v0.4), and Notebook 3 against v0.3 (same ink to the thousandth, same
cruise, same reach). Frame time 2.5 km into a run with 56 lines drawn: 16.7 ms
median and 20 ms worst, on desktop and phone viewports. Load to first frame:
under 0.25 s locally.

## Deploy to the test site (not production)

`firebase.json` here names Hosting site **theinkline-tests** and Functions
codebase **game**. Neither can overwrite the production site or the production
`collect` function (codebase `default`).

```sh
cd inkline/public-tests
firebase login                              # if not already
firebase use --add                          # the Inkline project; writes .firebaserc
(cd functions && npm install)
firebase deploy --only functions:game,hosting:theinkline-tests
```

The predeploy step copies `public/gen.js` into `functions/` so the server always
checks runs with the game's generator.

**Firestore rules** are one file for the whole project (`../firebase/firestore.rules`).
This build adds admin-only reads for `g_players` and `daily`, and changes
nothing for the v0.3 collections:

```sh
cd ../firebase && firebase deploy --only firestore:rules
```

**Admin dashboard** at https://theinkline-tests.web.app/admin/. If Google
sign-in says the domain is not authorised, add `theinkline-tests.web.app` under
Authentication → Settings → Authorized domains. The same `admins/{uid}` document
that opens the v0.3 dashboard opens this one.

Add `?all` to the game URL to open every campaign page for testing, and
`?noanalytics` to play without sending telemetry.

## Future ideas

Deliberately out of scope for this build:

- Global campaign statistics on each page: completions, attempts, and best ink
  left by everyone. The `Global.get` seam is ready.
- A 1–3 ink-drop rating per campaign page, from best ink left.
- Ghost lines: watch the Daily leader's run. It is already stored as a trace
  plus strokes.
- Replaying a shared Endless seed ("try my course").
- Streaks for playing the Daily on consecutive days.
- More worlds (Chalkboard, Newspaper) and more chunk types: moving hazards,
  wind, one-way ink.
- Server-side physics re-simulation for stronger daily anti-cheat.
- An "on this day" archive of past daily courses.
