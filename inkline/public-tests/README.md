# The Inkline — public tests (v0.6)

The complete game, in its test build: **Campaign**, **Endless**, **Daily
Challenge** and **Zen**, all on one engine. Deployed only to
https://theinkline-tests.web.app. Production (`../firebase/`, v0.3) is not
touched by anything in this folder; v0.4 and v0.5 are frozen at `../v0.4/`
and `../v0.5/`, and `../archive/` holds a full recovery zip.

```
public/index.html      the game: one engine, four modes (no dependencies)
public/gen.js          the course generator, shared with the server
public/admin/          private telemetry dashboard (admin sign-in)
functions/             Cloud Functions, codebase "game": /api/daily, /api/track
tests/                 generator, bots, simulated players, emulator, flow, tutorial, rules, dashboard
PLAN.md                the implementation plan this build followed
```

## v0.6 — restoring the hook

v0.5 worked but had got too easy. The original prototype's pull was that it
was simple and hard: *I know what to draw* — splat — *nearly* — retry. This
pass restores that without adding features.

### The first-play opening (it is the tutorial, and it is the title)
A first-time player never sees a menu. Inky drops onto a notebook page with a
small gap and a slightly higher platform, and starts to run. Nothing explains
anything. If a ramp is drawn, he rolls up it — and without stopping, the page
slides on, the pen draws the familiar U ahead of him, he rides it into the
wall, **splat**, and only then is *THE INKLINE / Draw the path. Get Inky home.*
written, and the menu with it. One continuous sequence.

- **Help only when needed.** If Inky falls and nothing was drawn (or three
  tries have failed whatever was drawn), the next try carries a pencilled
  *Draw a line for Inky* and a loose dotted ramp — a suggestion, not a stencil.
  Anyone who starts drawing never sees it.
- **Failing is part of it.** A fall is a splat and an instant restart of the
  short opening; a line that blocks him stops him, then the same. No message,
  no checkpoint.
- **Once.** `inkline.tutorialDone` is stored when he gets up; later visits get
  the usual U intro. The platform has a worn corner, so a ramp that arrives a
  little low rides up it instead of into it — a first-timer's natural line works.
- **Replay** from the pencil note *how to play* at the bottom-left of the front
  page (never alongside the modes). For testing: `?tutorial` plays it, `?fresh`
  forgets it (and the intro), `INKLINE.title.forget()` from the console.

### Difficulty: simple idea, demanding execution
Difficulty was measured, not guessed, with `tests/human.js` — a simulated
imperfect player that knows roughly what to draw (a level's intended route, a
generated course's reference lines) and draws it like a hand: it starts late
or early, overdraws a little, sits high or low, wobbles, draws at hand speed,
cannot draw off-screen, and cannot draw what has scrolled away. σ scales the
error. Notebook 3 — the original, externally tested level, unchanged — is the
yardstick: players reached 70–95% and kept retrying.

**Campaign** (σ = 1, win rate per try; *past 70%* = share of all tries that
die in the last 30% of the page — the "nearly" feeling):

| Page | v0.5 win | v0.5 past 70% | v0.6 win | v0.6 past 70% | v0.6 median death |
|---|---|---|---|---|---|
| Notebook 1 (1-1) | 42% | 8% | 37.5% | 38% | 78% |
| Notebook 2 (1-2) | 41% | 39% | 10% | 79% | 96% |
| Notebook 3 (1-3, unchanged) | 0% | 40% | 0% | 50% | 69% |
| Blueprint 1 (2-1) | 41% | 28% | 22% | 63% | 85% |
| Blueprint 2 (2-2) | 19% | 13% | 9.5% | 49% | 90% |
| Blueprint 3 (2-3) | 1.3% | 16% | 5% | 31% | 65% |

200 tries per page. The model is harsher than a person on Notebook 3 (people
finished it; the model's error never lines up the whole page), so read the
columns as relative: every page other than Notebook 3 is now 2–4× harder to
win, and most deaths now come late (Notebook 2 and Blueprint 2 median deaths
are at 90–96% of the page). Blueprint 3's early wall is gone — v0.5 lost its
tries on the stair, v0.6 loses them in the second half. Blueprint 1 opens
World 2 a notch below Notebook 3 on purpose (a new material, new obstacles);
Blueprint 2 and 3 then go past Notebook 2.

What changed in the levels (their identity and geometry kept):
- **Notebook 1** is a real level now (the opening taught the ramp): less ink,
  a softer first ledge, a longer last gap — so the pressure comes late.
- **Notebook 2**: the well is sized so that a generous line arrives at the
  stubs dry; finishing takes the hill's lip, the flick and tidy stubs.
- **Blueprint 1**: the lintel's clearance is tight (a line must lie flat under
  it), the girder is higher, the final drop longer.
- **Blueprint 2**: a lower lintel; ink with nothing to spare.
- **Blueprint 3**: the long stair is gentler until its last step (it was an
  early wall that wasted retries); the budget is tighter — the hard part is late.
- **Notebook 3**: unchanged. It is the benchmark.

**Physics — removing the bad frustration.** Inky used to stop dead against
the tiniest corner: a line meeting a ledge 3 units short, or the start of a
bridge lying a unit above the floor, which could also throw him twenty units
into the air. A rolling ball goes over a step lower than its radius, so now
he does: any corner up to 9.5 units above his feet is climbed with exactly the
lift it needs, keeping his speed. Anything taller is still a wall. This makes
"the controls didn't do what I asked" much rarer; difficulty had to come back
from fair things — ink, clearances, aim, speed.

**Endless and Daily** (generator v2, shared by both; Daily starts slightly
further up the curve, so it is never easier). Most of the ground is drawn by
the player now, as in the original level: long **voids**, high **perches** to
ramp onto and get down from, **low bridges** under ceilings after a descent,
**launches** down a slope onto a short landing, a block with a **tempting blot**
high over it (ink for the brave line), tunnels with a gap inside, stubs,
steeper **steps**. Difficulty rises fast (half-way at 170 m) and keeps
climbing past 600 m. Later on, one thing lands you straight into the next, and
the ink ledger's slack shrinks until a wasteful line runs dry. Printed hills
and valleys are now rare breathers.

Same simulated player drawing each generated course's reference lines, 300
seeds per row, runs capped at 3 km. *Old* is the v0.5 generator under the
v0.6 physics, so the difference is the courses alone:

| Player | Generator | median | reach 100 m | 300 m | 500 m | 1 km |
|---|---|---|---|---|---|---|
| weaker (σ 1.3) | v0.5 | 607 m | 92% | 76% | 59% | 28% |
| weaker (σ 1.3) | **v0.6** | **339 m** | 85% | 56% | 27% | 7% |
| steady (σ 1) | v0.5 | 1358 m | 97% | 92% | 85% | 63% (21% hit the 3 km cap) |
| steady (σ 1) | **v0.6** | **590 m** | 96% | 81% | 59% | 27% |

So the first 100 m is a warm-up that still needs lines drawn, 100–300 m is
where a weaker hand is lost, and past 300 m the course is fiendish: a steady
hand reaches 1 km a quarter of the time (it did so two-thirds of the time
before). Most runs end with Inky left behind by the page (a line that
slows or stalls him, or one drawn too late) rather than in a crash.

Every generated course is still provably survivable: a perfect player drawing
the reference lines finishes 300/300 Endless seeds to 3 km (desktop and iPad
Pro sizes), 200/200 Daily seeds to 2 km on a phone, 100/100 Zen seeds.

### Analytics added
- `tu` events for the opening: start (and whether it was a replay), hint shown,
  each fail (why: fell / stuck / back; whether anything was drawn), done
  (tries, fails, hinted, drew before any hint, time), skipped (already done).
- Deaths in Endless/Daily carry the kind of section that killed (`k`).
- The dashboard adds **The hook** (deaths per player, immediate retry, share of
  runs beating the player's last best on that level or mode), **First-play
  opening** (started, got up, drew before any hint, first try, hint shown,
  tries, time, played on), and **what ends Endless runs**.


## The front page

*THE INKLINE* — *Draw the path. / Get Inky home.* A line draws itself, Inky
rides it into a wall, splat; then the choices are written in:

- **CAMPAIGN**
- **ENDLESS** — with a pencilled *or zen* in the margin
- **DAILY CHALLENGE** — with *today's course* (and your best today) under it

A first visit is the played opening (above), which ends here. Later visits
play the beat with the choices there at once; any tap that is not a choice
skips to the finished page. *how to play* (bottom-left) replays the opening.

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
| `node tests/gen.test.js 20000` | the server's copy of gen.js is the game's; seed → same course (built at once or streamed); a day → same seed; day turns at 00:00 UTC; score order; over 20,000 seeds × 2 km (every tenth to 4 km): heights in band, hazards on ground, tunnels ≥ 36 clear, blots on floors, reference ledger never dry | all passed (v0.6) |
| `node tests/bot.js --seeds 300 --metres 3000` | the real engine, fast-forwarded, reference player on 300 Endless seeds | 300/300 reached 3 km |
| `… --seeds 20 --metres 10000` | long runs | 20/20 reached 10 km |
| `… --mode daily --width 390 --height 844` | Daily on a phone, portrait | 200/200 reached 2 km |
| `… --mode zen --width 844 --height 390` | Zen on a phone, landscape | 100/100 reached 1.5 km |
| `… --style clumsy` | wobbly, over-long, slightly high lines | 2/300 reached 2 km — by design since v0.6 (v0.5: 1000/1000); sloppy lines now die, mostly on stubs, steps and perches |
| `node tests/human.js …` | the simulated imperfect player: campaign win rates and where people die; Endless reach (tables above) | see *v0.6 — restoring the hook* |
| `node tests/tutorial.js` | the first-play opening: no menu, a drawn ramp gets him up and hands over to the U, the splat and the menu; a fall resets at once; the hint only after a fall with nothing drawn (or three failures); stored once; *how to play* replays it; `?tutorial`, `?fresh`; mouse and touch; phone; analytics events | all passed (file and hosted) |
| `node tests/daily.emu.js` | two players play today's course; board, ranks, counts, names, no ids; 10 forged or malformed submissions refused (edited distance, stretched trace, a sample inside a hazard, lines removed, ink overspent, blots never passed, sped up, wrong version, old day, bad id); rate limit; telemetry stored with no IP; the opening's events accepted | all passed |
| `node tests/flow.js` | a first visit plays the opening; mouse (desktop) and touch (phone) through every mode; result card, stray-tap guard, retry in 10 ms, home, zen respawn, name field, a Daily run drawn live and accepted by the server, Esc, campaign, no console errors | all passed |
| `node tests/rollover.js` | a run across midnight counts for its day; the retry is tomorrow's course; pages turn over | all passed |
| `node tests/rules.emu.js` | public and non-admin cannot read anything; admin can; nobody writes; nobody self-promotes | all passed |
| `node tests/admin.test.js` | dashboard metrics on a hand-checked dataset, the opening's funnel and the hook metrics included | all passed |

Also re-run: every saved campaign route replayed stroke-for-stroke with a
perfect hand — Notebook 1 `cautious`, Notebook 2 `moderate`, Notebook 3
`eff`, Blueprint 1 `trusting`, Blueprint 2 `hopstairs`, Blueprint 3 `trusting`
all finish. Notebook 3 against v0.5: identical ink to the thousandth, and both
of its saved routes end identically on both builds (`eff` finishes; `main`, a
near-miss line, runs dry at 79% on both). Frame time 2.5 km into a run with
~80 lines drawn: 16.7 ms median, 17 ms 95th percentile and about 22 ms worst,
on desktop and phone viewports (the first frames straight after the test's
fast-forward can reach ~50 ms; real play never fast-forwards). Load to first
frame: under 0.25 s locally.

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
