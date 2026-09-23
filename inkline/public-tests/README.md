# The Inkline — public tests (v0.8)

The finished game, in its test build: a four-world **Campaign** (twelve
pages), **Endless**, **Daily Challenge** and **Zen**, all on one engine.
Deployed only to https://theinkline-tests.web.app. Production (`../firebase/`,
v0.3) is not touched by anything in this folder; v0.4–v0.7 are frozen at
`../v0.4/` … `../v0.7/`, and `../archive/` holds a full recovery zip.

```
public/index.html      the game: one engine, four modes (no dependencies)
public/gen.js          the course generator, shared with the server
public/admin/          private telemetry dashboard (admin sign-in)
functions/             Cloud Functions, codebase "game": /api/daily, /api/track, /api/social
tools/                 export-campaign-levels.js (level geometry for the leaderboard check)
tests/                 generator, bots, simulated players, emulator, flow, tutorial, rules, dashboard
PLAN.md                the implementation plan this build followed
```

## v0.8 — final polish

A polish pass, not a redesign: nothing about the physics, the drawing, the
pages or their difficulty changed. What changed is how the game looks and
how it explains itself. This is the build that goes to external playtesting;
there are no further features.

**The idea, in one line: get as far as you can, get Inky home, use as little
ink as possible.** Progress is the measure; ink left is how tidily you did it.

### Each world draws in its own material (looks only)
The line you draw now belongs to the world. Collision is unchanged — every
material is drawn around the same centre line that Inky runs on, the same
ink is spent per unit, and the same dry-nib gaps appear.

- **Notebook** — the dark pen line, as before.
- **Blueprint** — a white drafting pencil: lighter, thinner, with graphite
  grain along one edge and no blots.
- **Highlighter** — a broad chisel-tip fluorescent yellow marker, translucent
  and multiplied onto the page so overlapping strokes deepen, with a slightly
  ragged lower edge and a crisp top edge: that edge is where Inky runs.
- **Crayon** — a chunky **rainbow crayon**: the colour turns red → orange →
  yellow → green → blue → purple → red by **distance along the stroke** (a
  full turn about every 860 units), never with time, with wax grain and a
  rough edge where it skips over the paper's tooth.

Cost, measured with a well's worth of line on screen (8 strokes × 500 units),
at 2× and 3× pixel density: 16.7 ms median frame in every world on desktop
and phone; 95th percentile 17–18 ms (crayon on a 2× desktop canvas: 18–21 ms).

### Progress first, ink second — everywhere
- **Opening worlds uses progress only.** A page counts as far as you have got
  on it (100% once Inky is home); a world is its three pages out of 300 and
  220 opens the next — two pages home and a fifth of the third, or any mix
  like it. Ink never opens anything and is never spent, banked or collected.
  Getting home always lets you go on. (v0.7 counted ink towards this; the new
  rule only ever gives a player more, so nothing that was open can close.)
- **Campaign page**: a finished page shows its tick and its best ink; an
  unfinished one, its furthest reach. A world with all three pages home gets
  an **ALL HOME** stamp.

### The finish
Inky crosses the line, gives a little hop with a few flecks of ink, and
**HOME!** is scribbled over him. Then the card: **HOME!**, and just two
measures — **PROGRESS 100%** and **INK LEFT 67%** — with the inkwell itself
lifted off the corner of the page onto the card, where it lands, sloshes and
settles on what is left. Under them, **NEW BEST!**, *first time home*, or
*best ink: 71%*. Below that only what matters next: a world that just opened
(with the padlock swinging open), or the quiet `Notebook 204 / 300 · 220 opens
Blueprint` while the next world is still shut. Again, replay, next — still a
tap. Crayon 3's house ending is unchanged.

### A failed run
**SPLAT!**, then the progress, big — **94%** — then **BEST: 96%** or **NEW
BEST!**, and quietly *off the page · 12% ink left*. Tap anywhere. The splat
itself is a touch more physical: the blob lands squashed flat against what
Inky hit and springs back round in about a seventh of a second, with a few
more flecks; nothing about it takes longer.

### Leaderboards: furthest, then ink, then time
Every campaign board ranks **progress first, ink left second, time third**, so
anyone who got further is always above anyone who did not, whatever their
ink. Rows read `1. ADA — 100% — 73.0% ink`, and the sheet says *furthest first
· then most ink left · then quickest*. Progress is ranked in whole percent
(what the player sees), so 94.0% and 94.9% tie and are separated by ink; a
finish is always exactly 100%. Internally the three are packed into one
whole number (`key`) so a single ordered field sorts a board and one count
ranks a player; it is never shown.

Runs that end part way now count: a death that beats your furthest reach on a
page you have not finished is sent with its trace and checked the same way a
finish is (the trace must end where the claimed progress is). Existing
entries — all finishes — are kept and given 100% the first time their board is
read (a one-off, recorded per page in `testLeaderboardMeta`); nothing is
deleted.

### Smaller things
- **Each page is labelled as it starts**: its name, in capitals, written onto
  the paper left to right in about two thirds of a second, with a red
  underline. Non-modal; Inky is already running. Retries do not repeat it.
- **The HUD** puts progress (now the biggest number, top right) and the
  inkwell first. Attempt, *‹ pages*, the timer and *sound* stay where they are
  but step back while Inky is running, and come forward when he stops, dies or
  gets home. The same in Endless, Daily and Zen (distance stays prominent).
- **Storm clouds**' bolts are drawn inside the cloud: only what kills looks
  like it.

### Tests added or changed
`tests/mastery.js` (progress rules, migration from v0.6 and v0.7 saves),
`tests/campaign-verify.js` (part-way runs on all twelve pages accepted, a
further claim or more ink refused; the ranking examples), and
`tests/social.emu.js` (real runs through the real function: finishes above
part-way runs, same progress ranked by ink, the old entry migrated and ranked
by its ink, own rank from the count, better replaces worse and never the other
way, a forged reach refused; run twice in a row).

## v0.7 — the finished campaign

> **Superseded in v0.8:** pages now count **progress only** (home = 100%) for
> opening worlds; ink left is shown beside progress and ranked on the
> leaderboards, and the per-page ink targets below are no longer used.

The last content pass. Campaign is now four worlds of three pages — Notebook,
Blueprint, **Highlighter**, **Crayon** — and then it stops: twelve handmade
pages, a mastery score for each, and an ending. Nothing else was added.

### Mastery: what a page is worth, and why

Every page is worth up to **100%**, in two plain halves:

- **up to 50% for getting there** — your furthest reach (getting home is the
  whole 50);
- **up to 50% for the ink you got home with** — measured against the page's
  target: finish with that much ink left (or more) for full marks.

So *home with the target ink = 100%*, *home with the well empty = 50%*, and
*reaching 84% without getting home = 42%*. It is the ink-left figure the game
and the leaderboards already used, made into a score a player can read: the
result card says `home 50 + ink 32 of 50`, then `19% ink left · 30% left is
full marks`. To improve, draw less — fewer, shorter, braver lines. Only the
best reach and the best ink ever recorded count, so a worse run can never
lower a score.

A world is its three pages, **out of 300**. **220 opens the next world**, so a
player can get there many ways — 100 + 70 + 50, 80 + 75 + 65, or 100 + 100 +
a good reach on the page they have not beaten — but three scrapes home (150)
are not enough. 300 is optional: a world at 300 gets a **PERFECT** stamp on
the campaign page and nothing else. All four worlds add up to **1200**, shown
small under CAMPAIGN; finishing Crayon 3 finishes the game whatever the total.

**Ink targets** (`par`, ink left as a share of the well). Each is 70% of what
a steady hand leaves on the page's tidiest reliable line — the line was found
by a search that shortens and drops strokes while every nudged version of the
route still gets home, then drawn by the simulated player at half the usual
error:

| Page | Ink for full marks | Tidy line, perfect hand | Tidy line, steady hand (median ink left) |
|---|---|---|---|
| Notebook 1 | 35% | 57% | 50% |
| Notebook 2 | 29% | 45% | 42% |
| Notebook 3 | 3% | 8% | 4% |
| Blueprint 1 | 54% | 80% | 77% |
| Blueprint 2 | 36% | 55% | 51% |
| Blueprint 3 | 33% | 51% | 47% |
| Highlighter 1 | 41% | 63% | 59% |
| Highlighter 2 | 30% | 61% | 43%* |
| Highlighter 3 | 25% | 42% | 35% |
| Crayon 1 | 30% | 48% | 43% |
| Crayon 2 | 22% | 35% | 31% |
| Crayon 3 | 17% | 30% | 24% |

\* Highlighter 2's tightest line was too tight for the steady hand to finish;
its target comes from the previous, slightly looser tidy line. The tidy lines
are saved as `tidy` in `tests/solutions/`, and every one finishes when
replayed. A player drawing the ordinary safe lines gets home with 0–5% ink
left (about 50–60%); 220 in a world means drawing noticeably tidier on at
least two of its pages.

Nothing new is stored: the scores are worked out from the records the game
already kept (best ink, furthest reach), so a player from v0.6 keeps every
number. A world, once open, stays open (`inkline.worlds.v1`), and anyone the
old rule had already let into Blueprint (two Notebook pages done) keeps it.

### Where it shows

- **Result card** (still instant, still tap-anywhere to go again): the run as a
  percentage, *best* or *new best* beside it, the two halves, the ink target,
  then the world: `Notebook 204 / 300%` over a pencil bar with a notch at 220
  and `16% more to open Blueprint` — or, when this run crossed it, a padlock
  swinging open and **BLUEPRINT IS OPEN**. A death that reaches far enough to
  open a world says so on the death card too. A world at 300 reads *every page
  mastered — PERFECT*; Crayon has nothing after it and never offers a world.
- **Campaign page**: each world on its own material (the notebook itself, a
  taped blueprint sheet, a marked-up printed strip, cartridge paper with a
  crayon border), its score and bar, each page's best under its circle, a tick
  on finished pages, padlocks on locked ones, *220% in Highlighter opens this
  · 43 to go* on a closed world, the PERFECT stamp, and Inky waiting at the
  next page. A newly opened world is drawn onto the page left to right the
  first time you see it, with *open!* written beside it.

### World 3 — Highlighter

A printed page someone has gone at with highlighters. Floors are swipes of
yellow, green, blue and orange under a pencil line, and a swipe is never level —
each one hands Inky speed or asks for it back. Danger is marked pink. A few
margin notes (*kick it?*, *keep your head down*, *catch him*) are written over
their own swipe. Faint typeset text and old swipes sit far back in the paper.

- **Highlighter 1** — ride the first swipe down and *kick* off its end over the
  void (a blot hangs where a brave kick passes; a low bridge is safe and dear),
  lay a line flat under the pink ceiling, hop three dashes, take the long
  orange swipe down, and flick the rock on the last floor.
- **Highlighter 2** — control. The green swipe carries Inky up and drops him
  off a ledge he cannot clear: *draw the catch where he will fall*. A tall
  block under a lid wants one ramp at one angle. Three swipes down are to be
  trusted. Then the slalom to the end: flick three blocks, each followed by a
  pink lid you must stay under.
- **Highlighter 3** — the world's finale. The biggest kick yet, off a long
  descent, with a blot at the top of the arc; three blocks climbing under three
  lids; a long drop into a pink tunnel with ink lying low in it; and the last
  climb under a lid, on whatever is left.

### World 4 — Crayon

A child's drawing on toothy cartridge paper: grass, earth, a sun and clouds in
outline (never solid, never dangerous), buildings with windows, storm clouds
scribbled dark with a red bolt, hot things scribbled red. Inky and your line
stay dark and plain.

- **Crayon 1** — hills that carry him, a river after the first, a fence whose
  posts drift apart until he can no longer roll across, a tree to jump from
  well back, and a pond of rising stepping stones.
- **Crayon 2** — very demanding. Down the big hill and over the river at its
  foot, up three buildings, then under a storm cloud that a straight line runs
  into — drop steeply, then flatten — and the pond, stone by stone.
- **Crayon 3** — the last page, the way home: speed down the hill and kick over
  the canyon under a storm cloud (not too hard), up two buildings, down again
  under another cloud, then everything at once with the well running low —
  the pond, the fence, one last rock — and up the hill to Inky's house.

**The end.** Crayon 3 finishes at a crayon house on the hill. Inky walks to the
door and goes in, the window lights, a curl of smoke goes up, and *home.* is
written over the roof. The card reads **HOME.** and *Inky is home · campaign
842 / 1200%*. The first time only, that takes about two and a half seconds;
after that the door is quick and the card is back to instant.

### Difficulty

The simulated imperfect player (`tests/human.js`, σ = 1, 200 tries a page)
drawing each page's ordinary route. *Past 70%* = share of all tries that die
in the last 30% of the page — the "nearly" feeling.

| Page | Win per try | Deaths past 70% | Median death |
|---|---|---|---|
| Notebook 1 | 37.5% | 38% | 78% |
| Notebook 2 | 10% | 79% | 96% |
| Notebook 3 (unchanged) | 0% | 50% | 69% |
| Blueprint 1 | 22% | 63% | 85% |
| Blueprint 2 | 9.5% | 49% | 90% |
| Blueprint 3 | 5% | 31% | 65% |
| **Highlighter 1** | 9.5% | 61% | 75% |
| **Highlighter 2** | 8.5% | 48% | 72% |
| **Highlighter 3** | 5.5% | 39% | 47% |
| **Crayon 1** | 10.5% | 59% | 89% |
| **Crayon 2** | 5.5% | 76% | 95% |
| **Crayon 3** | **2%** | 60% | 91% |

Worlds get harder on average (Notebook 16%, Blueprint 12%, Highlighter 8%,
Crayon 6% per try) and Crayon 3 is the hardest page in the game. The model is
harsher than a person on Notebook 3 (people finished it), so read the columns
as relative. The new pages were tuned until their deaths came late: early
walls were found and removed (a slalom that killed three tries in four at the
start of Highlighter 2 moved to its end; a 92-tall tree in Crayon 1 came down
to 62; pitched roofs, which threw Inky somewhere slightly different every
time, became flat-topped buildings).

### Playtest notes, page by page

Each new page was played by the scripted perfect hand (every saved route,
replayed stroke for stroke), by the simulated imperfect player (200 tries,
deaths located to the nearest 100 units), and looked at in the lab's overview
of the page, route and flight. For each:

| Page | The idea (is it clear?) | What makes it hard | Where the nearly-deaths are | Moment |
|---|---|---|---|---|
| Highlighter 1 | ramp, kick, bridge, hop, flick — all taught before | the kick's length; a flat line under the ceiling | the last rock (a third of all tries end there) | kicking through the blot over the void |
| Highlighter 2 | "catch him", "one ramp, one angle" | a catch drawn before he falls; the lidded wall | the slalom at the end | the catch |
| Highlighter 3 | everything from the world | ink: the safe line runs dry on the last ramp | the last climb under the lid, running dry | the big kick |
| Crayon 1 | hills, a river, a fence, a tree, stepping stones | the fence posts drifting apart; the rising stones | the pond (median death at 89%) | rolling the first posts, then not |
| Crayon 2 | the buildings, then "under the cloud" | shaping one line: steep, then flat | the pond (median death at 95%) | the line under the storm cloud |
| Crayon 3 | the whole game, on the way home | everything, with the well running low | the last rock and the last ramp (median 91%) | walking into the house |

Failures there are the player's: a line short, low, late or long. Two things
that failed people for the wrong reason were changed: a wall's top corner
now has a small bevel (the same worn corner the opening's platform has), so a
ramp arriving a few units low rides up instead of stopping dead; and fence
gaps are either clearly rollable (30) or clearly not (70+), never in between.
Retry is unchanged: tap anywhere, instantly, on every card.

**Things this pass did not change:** the opening, the title, Inky, physics,
drawing, Endless, Daily, Zen, the generator, the leaderboards and analytics
(the dashboard's campaign table simply lists twelve pages now), and the
Notebook and Blueprint pages (Notebook 3 is still the untouched original).

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
Four worlds of three pages — Notebook, Blueprint, Highlighter, Crayon — each a
different drawing medium on the same universe, and the player's own line is
drawn in it. Pages in a world open in order; a world opens at 220 / 300
progress in the one before (see *v0.8*).
Progress is saved on the device and nothing is bought or earned. Finishing a
page plays a short success sound and writes a red tick on the card; Inky runs
on through the line. The last page ends at his house.

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
| **Highlighter** — marker on a printed page | Highlighter 1 | Highlighter 2 | Highlighter 3 |
| **Crayon** — wax on cartridge paper | Crayon 1 | Crayon 2 | Crayon 3 (the end) |

The Highlighter and Crayon pages are described under *v0.7* above.

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

Per page, on the device (`inkline.campaign.v1`, unchanged since v0.4):
attempts, completions, best ink left, furthest reach, best time and the
attempt of the first completion. World progress is computed from these; the
only other key is `inkline.worlds.v1` (worlds opened, reveals and stamps seen,
campaign finished). Each page also has a global leaderboard (furthest, then
most ink left, then quickest), checked on the server against the page's
geometry.

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
| `node tests/admin.test.js` | dashboard metrics on a hand-checked dataset (twelve campaign pages), the opening's funnel and the hook metrics included | all passed |
| `node tests/mastery.js` | on the real page: a page counts its reach, never rounded up to home; home = 100 whatever the ink; best ink kept; best only; world = its pages; 219 shut, 220 open; open after reload and forever; a world opened by a death, shown on its card; 300 = ALL HOME, stamped once; 1200 in all; nothing after Crayon; an old player's records read unchanged, Blueprint kept, new worlds not handed out; blocked storage never breaks the page | all passed |
| `node tests/campaign-verify.js` | all twelve pages played in the real engine; the server check accepts each finish and each run cut short, and refuses a forged trace, forged ink and a claim to have got further; ranking order on worked examples | all passed |
| `node tests/social.emu.js` | campaign boards through the real function: finishes above part-way runs whatever the ink; same progress ranked by ink; an old entry migrated and ranked by its ink; own rank; better replaces worse, never the reverse; forged reach refused | all passed (twice in a row) |
| `node tests/board-ui.js` | the campaign leaderboard sheet offline: opens, turns pages, returns; play without Firebase | all passed |

Also re-run: every saved campaign route replayed stroke-for-stroke with a
perfect hand — the ordinary and the tidy line on all twelve pages finish;
the two routes kept as near-misses fail as documented (Notebook 3 `main` and
Highlighter 3 `safe` run dry). Notebook 3 against v0.5: identical ink to the thousandth, and both
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
cd ../firebase && firebase deploy --only firestore:rules,firestore:indexes
```

The indexes are the campaign boards' ordering (`levelId` + `key`); they only
add. If the CLI offers to delete indexes that are not in the file, answer No.

**Admin dashboard** at https://theinkline-tests.web.app/admin/. If Google
sign-in says the domain is not authorised, add `theinkline-tests.web.app` under
Authentication → Settings → Authorized domains. The same `admins/{uid}` document
that opens the v0.3 dashboard opens this one.

Add `?all` to the game URL to open every campaign page for testing, and
`?noanalytics` to play without sending telemetry.

## Future ideas

Deliberately out of scope for this build:

The game is finished; what follows is for after playtesting, telemetry and
balancing, not for now.

- Ghost lines: watch the Daily leader's run. It is already stored as a trace
  plus strokes.
- Replaying a shared Endless seed ("try my course").
- Streaks for playing the Daily on consecutive days.
- More chunk types for Endless: moving hazards, wind, one-way ink. (No more
  campaign worlds: the campaign is complete at four.)
- Server-side physics re-simulation for stronger daily anti-cheat.
- An "on this day" archive of past daily courses.
