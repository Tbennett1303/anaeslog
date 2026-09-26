# The Inkline — public tests (v0.13)

The finished game: a five-world **Campaign** (fifteen pages), **Endless**,
**Daily Challenge** and **Zen**, all on one engine. **This is now the
canonical game**, at https://theinkline-tests.web.app, and it deploys only
there. The old production project (`../firebase/`, v0.3) is not touched by
anything in this folder; v0.4–v0.12 are frozen at `../v0.4/` … `../v0.12/`,
and `../archive/` holds a full recovery zip.

```
public/index.html      the game: one engine, four modes (no dependencies)
public/gen.js          the course generator, shared with the server
public/admin/          private telemetry dashboard (admin sign-in)
functions/             Cloud Functions, codebase "game": /api/daily, /api/track, /api/social
tools/                 export-campaign-levels.js (level geometry for the leaderboard check)
tests/                 generator, bots, simulated players, emulator, flow, tutorial, rules, dashboard
PLAN.md                the implementation plan this build followed
```

## v0.13 — Initials, a new paper for every Daily, and the Daily page and leaderboards laid out again

### Initials: three letters, arcade style

Names used to be typed into a text field that only appeared if you found the
small "name on the board ✎" line on the Daily page or on a leaderboard, and a
campaign board entry started as ANONYMOUS on every page. Now a player has
**three initials**, used on every board:

- **Where it is offered:** at the bottom of the card after a splat (Campaign,
  Endless, Daily — not Zen), a red box **✎ PUT YOUR INITIALS ON THE
  LEADERBOARD**, until initials are set or it is waved away with its **×**
  (remembered: `inkline.nosign`). It is also always in **SETTINGS ›
  INITIALS**, and in an **ON THE BOARD AS ABC ✎** box on the Daily page and
  on every leaderboard (✎ ADD YOUR INITIALS when there are none).
- **The sheet:** YOUR INITIALS, three hand-drawn letter boxes (Rock Salt, the
  title's hand) with a pencil ▲ above and ▼ below each; the box being
  written is darker with a red line under it. Tap ▲ ▼ (A–Z then 0–9,
  wrapping), or just type them; arrows and Backspace move along. One big
  **SAVE ABC** box and a smaller **CANCEL**. Starts from the first three
  letters of an old name, or AAA. A handful of rude three-letter words are
  refused on the page ("not those three — try others"); the server's own
  name check still applies.
- **Saving signs the boards:** today's Daily run (if any) and every campaign
  board this player has a run on are renamed at once. After that, any run
  that lands on a board and comes back anonymous is signed straight away.
  Stored in the same place as before (`inkline.modes.v1` → `name`), so an
  old name keeps showing until initials are chosen. No server change.

### The Daily is on a different paper every day

It was always on Blueprint. Now each day's Daily — its page and its run — is
on one of the five papers (Notebook, Blueprint, Highlighter, Scratch Art,
Crayon), the same for everyone that day. The order is random: the days are
dealt in runs of five, each run a fresh seeded shuffle of the papers, and a
run never starts on the paper the previous one ended on. So each paper turns
up once in every five days and the paper never repeats two days running
(`dailyPaper(day)` in `index.html`; `tests/papers.js` checks two years of
days). Looks only: the course, its generator version and the board are
unchanged.

### The Daily page

- One big boxed **PLAY** (the front page's style), then one line for how you
  stand ("your best today: 397 m", "rank #13 of 37 · 3 tries"), then the ON
  THE BOARD AS box, then when the next course comes.
- TODAY'S BOARD as a clean table (rank, initials, distance, time) with your
  own row in red — and, if you are outside the top ten, "…" and your row
  underneath. It no longer runs into the footer.
- Two columns on a wide screen; one, larger, on a phone held upright.

### The leaderboards

- Room at the top: LEADERBOARD, then the page name between two boxed arrows
  **‹ NOTEBOOK 1 ›** (the old "‹ level / level ›" links at the very bottom
  are gone), then "128 tried · 41 made it home".
- A table with headings (NAME, REACHED, INK LEFT, TIME), your row in red,
  "…" and your row when you are outside the top ten, and the ON THE BOARD AS
  box underneath. The "furthest first · then most ink left · then quickest"
  line is gone; the columns read in that order.
- Larger on a phone held upright.

### Tests

- `tests/sign.js` (new, emulators) — the splat card offers initials under
  the choices; the sheet opens without retrying; AAA; ▲ ▼ wrap; typing;
  a rude three refused; ZAP saved; the card stops asking; an existing
  anonymous board entry is renamed ZAP; the leaderboard, Daily page and
  SETTINGS open the sheet; × waves it away for good (and is not a retry).
- `tests/flow.js` — the Daily name step now uses the initials sheet, and the
  Daily board shows the run under the initials.
- `tests/flow.js` — the Endless hand-drawn line now traces that (random)
  course's own first bridge, instead of a fixed flat line that did not
  bridge every first gap (about one run in four failed on it).
- `tests/papers.js` (new) — the Daily's paper: one of five every day, never
  the same two days running, all five in every run of five days, a random
  (not cyclic) order, the same paper for the same day, and the run and the
  page both on it.

## v0.12 — Choices you can read at a glance, and music

The front page's choices were words with an underline that only appeared on
hover, so it was not obvious they could be pressed. Now there are four, and
each one sits in a hand-drawn box:

- **PLAY** — the campaign (the page it opens is still headed CAMPAIGN). The
  first choice and the heaviest box, in the title's hand.
- **ENDLESS** — with "or zen" pencilled beside it, as before.
- **DAILY CHALLENGE** — today's course written inside its box.
- **SETTINGS** — a new page.

Two by two on a wide or landscape screen, one column on a phone held upright.
Every box is drawn in by the pen as its label is written, and then never sits
quite still: corners and sides drift about a unit, slowly, each on its own
(nothing moves with *reduce motion* on). Hovered or focused, a box breathes a
little more and takes a wash of ink; pressed, it sinks and thickens.
Arrow keys move between the four, Enter chooses.

**SETTINGS** holds what used to sit in the corners of the front page:
**SOUND** on/off (a hand-drawn switch; the same setting as before, still
remembered in `inkline.sound`, and `M` still toggles it anywhere), **MUSIC**
on/off (below), and **HOW TO PLAY** (plays the opening page again). `‹ back`
or Esc goes home. The small "sound" in the corner of the other pages stays
where it was, and is the sound effects only.

### The end of a run: one card, one obvious way on

The splat and finish cards were busy: the corner notes (attempt, ‹ pages,
progress rule, time, inkwell, sound) stayed up around them, the level showed
through, the finish card had three look-alike underlined words plus a
leaderboard link, and a splat on a campaign page had no choices at all, only
a small "tap anywhere". Now:

- The page steps back: a wash of paper over the level, the corner notes gone,
  the card opaque.
- The card says what happened, the one number and the best to beat.
  - **Campaign splat:** OFF THE PAGE / SPLAT! / OUT OF INK / LEFT BEHIND,
    then how far (48%), then "best 55%" or NEW BEST! (and a world that has
    just opened, if one has).
  - **Campaign finish:** the page, HOME!, the ink that came home (the
    inkwell still flies onto the card beside it) and the best ink to beat.
    "PROGRESS 100%" is gone (home is 100%), and so is the x / 300 note.
  - **Endless / Daily:** the distance, and the best to beat (and the Daily
    rank).
- Under it, boxed choices in the front page's hand-drawn, wobbling style:
  **one big box for the obvious next step**, smaller boxes beside it.

| After | Big box | Smaller boxes |
|---|---|---|
| a splat on a page | TRY AGAIN | ‹ PAGES |
| getting home | NEXT PAGE › (BACK TO THE PAGES on the last one) | TRY AGAIN · REPLAY · LEADERBOARD (with your rank) |
| Endless | TRY AGAIN | HOME · ZEN MODE |
| the Daily | TRY AGAIN | TODAY’S BOARD · HOME |

Space/Enter is always the big box (after a finish that is now NEXT PAGE, not
another go; R still plays again). After a splat a tap anywhere off the card
is TRY AGAIN, so a retry is as quick as ever; after a finish a tap off the
card does nothing — the choice is on the card. Taller boxes and text on a
phone held upright.

### Music: "The Inkwell"

`public/music/the-inkwell.mp3` (84 s, 2 MB) starts the moment Inky splats
against the wall on the front page — after the opening for a first-time
player, after the little run for everyone else — and then loops under
everything (runs, the campaign page, boards, settings) for as long as the page
is open. Returning home never restarts it.

- It is fetched and decoded in the background while the opening plays, then
  played from a buffer, so the loop has no gap; the last 6 ms are eased down
  so the join cannot click. It sits under the sound effects (gain 0.42).
- It has its own audio context: SOUND off silences the effects and leaves the
  music; MUSIC off fades it and holds its place (`inkline.music`, default on).
  With MUSIC off it is not even downloaded.
- A hidden tab pauses it; it resumes where it was.
- Browsers do not allow sound before the page has been touched. A first-time
  player has drawn a line long before the splat, so it starts on the splat. A
  returning player whose splat comes before any tap hears it from the start
  at their first tap.
- **Touch screens.** Only certain events count as that touch: a key, a mouse
  button, or on a phone/tablet a finger *lifting* (pointerup/touchend) — a
  finger landing does not. Audio used to be woken only on pointerdown, so on
  iPad and iPhone it never started (no music, and the effects came late if at
  all). Both audio contexts are now woken by every honoured event, built on
  the spot if they are not built yet, and given a silent tick the first time
  (iOS needs something played to unlock). On a touch screen the first line
  of the opening is therefore silent until the finger lifts; after that
  everything is heard.
- **The pen sits under the music**: its scratch is now 30% of the level it
  had before the game had a soundtrack (measured: 0.30× at every drawing
  speed). Other effects are unchanged.
- Offline (installed), the service worker keeps a copy once it has played.

The playtest-analytics notice sits lower on a short landscape screen so it
does not cross the boxes while it fades. Nothing about play, scoring, saved
progress or the boards has changed.

### Tests changed

- `tests/endcard.js` (new) — every box on every end card pressed at desktop
  and phone sizes: splat (TRY AGAIN, ‹ PAGES, tap off = retry, Space),
  finish (NEXT PAGE, TRY AGAIN, REPLAY, LEADERBOARD, Enter = next, tap off =
  nothing), Endless (HOME, ZEN MODE), Daily (TODAY’S BOARD); the big box is
  the biggest and no two boxes overlap.
- `tests/music.js` (new) — silent before the splat; decoded during the
  opening; starts at the splat; plays on through a run and home; MUSIC off/on
  (remembered); SOUND off leaves it; a hidden tab pauses and resumes it; with
  MUSIC off a new visit neither plays nor downloads it; on a tablet with
  iOS's rule faked, a finger landing cannot start audio and lifting starts
  both contexts.
- `tests/flow.js` — four boxed choices that do not overlap and do move;
  "or zen" found by its own box; SETTINGS turns sound off and on (and it is
  remembered); Esc from SETTINGS goes home; PLAY opens the campaign.
- `tests/tutorial.js` — the opening is replayed from SETTINGS › HOW TO PLAY.

## v0.11 — Antigravity everywhere but the main campaign

Antigravity is now a core mechanic of everything outside the campaign itself:
Endless (v0.10), the **Daily Challenge**, and an **antigravity campaign** —
every page again, with upside-down phases — that stays hidden until Inky has
got home.

### The Daily has gravity lines
The same lines as Endless (the first at 200 m, gentle at first, never without
the arrow and the dotted line), on the same course for everyone. The Daily
stays on its blueprint. The generator is now **version 3**: the server
rebuilds the day's course with it and reflects the upside-down stretches
exactly as the game does before checking a run, and a day's board belongs to
one version of the course (`daily/<day>_v3`), so the day this is deployed
starts a fresh board instead of ranking runs from two different courses
together. A player on a cached older page is refused ('version') and picks
the new page up on reload.

### The antigravity campaign
**Unlock.** When Inky gets home (Crayon 3, the house), an **ANTIGRAVITY
off/on** switch appears at the foot of the campaign page, written in with
*new!* the first time. Each antigravity page opens once that page has been
finished the right way up. Before Inky is home the switch is not there and
cannot be set.

**The switch** turns the whole campaign page over: the heading reads
*antigravity · x / 1500%*, a small red arrow points up beside each world, and
every circle, tick, reach and best ink is the antigravity page's own. It is
remembered on the device. `A` toggles it from the keyboard.

**Separate scores.** An antigravity page keeps its own reach, wins and best
ink (`<page>:ag` in the progress record), and its own leaderboard. Nothing it
does changes the campaign's numbers, and it never opens a world — the card
says *antigravity · Notebook 155 / 300* instead. "Next" goes to the next
antigravity page.

**The pages.** Each is its own page cut open at a few places. At each cut a
plain gravity crossing is let in, the same one Endless uses — the floor
levels to no higher than h 0 and runs to the line (with the big arrow and the
dotted line), and past it a floor at least 60 units away in the new direction
runs plain for 19 m before easing back to where the page was — and the page
carries on the other way up: everything from one cut to the next is mirrored
(h → 80 − h). The page's own ground, rocks, lids, blocks (hanging, upside
down), blots and route are all still there, just not the same way up. Cuts
come in pairs, so every page finishes the right way up (and Crayon 3 still
ends at the house).

| World | Pages: upside-down phases (in the page's own x) |
|---|---|
| Notebook | 1: 1510–2880 · 2: 960–2440 · 3: 530–2500 |
| Blueprint | 1: 540–2530 · 2: 860–2660 · 3: 2560–4630 |
| Highlighter | 1: 1000–1640 and 2300–3890 · 2: 900–1990 and 2890–3520 · 3: 2070–4940 |
| Scratch Art | 1: 2210–3600 · 2: 600–2220 · 3: 1800–3900 and 4700–5760 |
| Crayon | 1: 1900–2540 and 3130–4060 · 2: 540–1840 · 3: 2000–5440 |

**Where the cuts go.** Only where the page's route runs on printed ground at
an ordinary pace, with nothing to jump over or draw across the cut. A tool
found every such place (`ground under x, level, no hazard or block within 120,
no stroke of any saved route across it`); the choice among them was checked by
Inky's speed there on the ordinary page — a cut at the foot of a slope takes
away the speed a jump after it needs (Blueprint 3's first choice did exactly
that), and a cut mid-flight takes away the flight. Pages grow by 15–69%
(the crossings are plain ground; the challenge between them is the page's).

**How hard.** The physics upside down is the exact mirror of the physics the
right way up, so an upside-down phase is exactly as fair as the stretch of
page it came from. The simulated imperfect player — which knows where to
draw — finds each antigravity page within noise of its original (Notebook 1
32% against 37%; Blueprint 3 5.7% against 5.0%; Crayon 3 1.7% against 2%;
deaths still come late). What makes these pages harder for a person — having
to draw above him, reading the page the other way up, twice — is exactly
what that model cannot feel, so it is for playtesting to measure: the pages
report under their own ids (`notebook-1:ag` …) in analytics, so the
dashboard's campaign table shows them separately.

**Routes.** Every page's saved routes are carried over by
`tools/export-anti-routes.js` into `tests/solutions/sol-*-ag.json` (strokes
move with their stretch and are mirrored where it is upside down; none may
cross a cut). One route was touched where it sat on a knife edge (Blueprint 1
`trusting`: a ramp that met a ledge exactly at its height now ends 6 above
it). Every page's reference route gets home on its antigravity page, drawn
point by point or as whole strokes.

### Tests added or changed
`tests/anticampaign.js` (new): hidden until Inky is home; a page's
antigravity version opens once the page is home; the switch turns the page
over and is remembered; antigravity results never touch the campaign's
numbers or open anything; every page has its lines in pairs, nothing across a
line, everything marked the right way up, the same ink, blots and hazards,
gravity turning at each line and nowhere else, and gets home on its
carried-over route; the card says antigravity; "next" stays in antigravity.
`tests/campaign-verify.js`: all thirty pages, finished and cut short, through
the server check. `tests/social.emu.js`: an antigravity finish is verified and
ranked on its own board, not the page's; a run from the other page is refused.
`tests/daily.emu.js`: the day's board under its course version; A's genuine
run passes the first gravity line and is verified. `tests/gen.test.js` and
`tests/antigravity.js`: the Daily has lines, Zen never does.
`functions/campaign-levels.json` now holds thirty pages, the antigravity ones
as played (mirrored where upside down).

## v0.10 — Antigravity (Endless), and worlds that change at a line

### Antigravity
Endless now and then turns gravity over. It never happens silently: gravity
changes only where Inky crosses a **gravity line**, a sign built into the
course. As he comes up to it there is a huge hand-drawn arrow in the
background — **↑** before ANTIGRAVITY, **↓** before NORMAL GRAVITY — drawn in
the material of the world he is in (a pen outline, hatched, in the Notebook;
a clean technical outline with a centre line on the Blueprint; a fat
translucent swipe with a pen outline in Highlighter; scratched through to the
rainbow in Scratch Art; chunky wax coloured in and gone round twice in
Crayon), then a dotted line straight down the page with **ANTIGRAVITY** (or
**NORMAL GRAVITY**) written up it. Inky glances the way he is about to fall
as he gets close.

The instant he crosses: gravity reverses, the page gives a small bump, he
squashes a little, there is a soft knock — and he starts to fall the other
way, by exactly the same rules. Nothing else changes and nothing explains it.
The page, the paper and the HUD stay upright; lines already drawn stay where
they are; the controls are the same. Upside down, the ground is above him, so
the line you draw goes above him. His legs hang towards whatever he is
falling towards.

**Where.** The first line is at **200 m** (a few metres later if the ground
needs longer to level out), once a run has settled in; the first stretch
upside down is short (80–100 m) and gentle. After that the lines come
more often and the stretches upside down get longer as Endless gets harder:
upside down for 90–230 m, then the right way up for 110–320 m. A gravity line
never sits within 16 m before or 20 m after a world's edge. Only Endless
turns over; Daily (so the shared board, and its server check) and Zen never
do, and the Campaign is unchanged. *(v0.11: the Daily has gravity lines too,
and the campaign has antigravity pages.)*

**How it is kept fair.** The generator knows where each line is before it
gets there. Around a line it lays plain ground on purpose: the floor eases to
a set height and runs level to the line; on the far side a floor starts just
before the line, 120 units away in the direction he will now fall, and runs
level with nothing on it for 26 m. So after every line he falls onto ground
without anything being drawn, and has the best part of two seconds to take it
in (he is down within 1.2 s). No hazard within 15 m before or 26 m after a
line; no blot where he is in the air. Upside-down stretches are built from
the same chunks as ever and **mirrored**: a gentler difficulty for the first
(×0.55) and a little gentler after (×0.8).

### How gravity works (for the inverted campaign, later)
Gravity is one number, `GS` (1 down, -1 up), which the existing physics reads —
there is no second physics. Where the physics had quietly assumed "down" it
now reads `GS`: gravity itself, the rule that lets him roll up over a small
corner (which way is "above his feet", and which way the lift goes), what
counts as ground under him (a surface facing against gravity), how much the
drive eases off when he is climbing, the camera, the fall off the page, the
ink flecks and splat, and his legs. `GRAV_BASE` is the page's own way up
(always down for now); a course turns it over at each of its lines, and
gravity at any x is fixed by how many lines lie before x.

An upside-down stretch is the mirror image of an ordinary one about h = 40
(`Gen.MIRROR = 80`: h → 80 − h), and the camera frames the mirror image of
what it would frame the right way up (Inky near the top, room on the side he
falls towards). Because the physics is exactly symmetric, every chunk, its
reference line and its ink cost are exactly as fair upside down. This is
tested directly: a campaign page played the right way up, and the same page
mirrored with gravity pulling up and every line drawn mirrored, give the same
run — x identical, y the exact mirror image (to the last bit), the same ink.

### Worlds change at a line
In Endless a world now ends at a plain ruled line down the page. To the left
is the old material, to the right the new, both on screen as the line goes
by — nothing flashes or switches across the screen. The new world's name is
written small down the top of the line; the HUD is split by the same line so
it always reads against its paper. The plain ground laid across each world's
edge is now 7.5 m either side (it was 25 m), and the generator tries a few
chunks that fit before it before settling for plain ground, so the lead-in is
short. Papers are kept two at a time, so both sides draw every frame.

### Tests
`tests/antigravity.js` (new): the mirror test above; falling off the top is
the same fall as off the bottom; 30 Endless seeds to 1.5 km on their
reference lines — gravity turns exactly as he crosses a line and nowhere
else, after every line (252 of them) he lands on the far side with nothing
drawn, he is always on screen, every run is still going; the first line is
at 200 m; Daily and Zen never turn over. `tests/gen.test.js`: across 3000
seeds, level ground before each line, something to land on after it, no
hazard or blot in the way, no line by a world's edge, everything marked the
right way up; the daily fingerprint is unchanged (`2ee21ff3de043c77`).
Unchanged and passing: every campaign route replays to the same ink figures,
the reference bot reaches 2 km on 100/100 Endless seeds (and Daily and Zen
60/60), and the regions, mastery, flow, leaderboard, rules and dashboard
tests. The simulated ordinary player (σ = 1, 300 runs) reaches a median of
687 m in Endless (768 m before), 88% of runs reach 300 m, and no one in 1245
crossings died at a gravity line.

Analytics: a death upside down records its section as `up` + kind (for
example `upstep`), in the existing field, so the dashboard shows how
upside-down sections go without any server change.

## v0.9 — Scratch Art

The build deployed to the test site before this change (the v0.8 polish plus
the installable shell and Endless's world names) is the baseline, frozen at
`../v0.8/`. One world is added; nothing else about the game changes.

**Where it sits.** Scratch Art is **World 4**, between Highlighter and
Crayon: Notebook → Blueprint → Highlighter → **Scratch Art** → Crayon. Crayon
keeps the ending (the house). 220 / 300 in Highlighter opens Scratch Art, and
220 / 300 in Scratch Art opens Crayon. The campaign total is now out of 1500.

**Players from the four-world build.** Nothing is wiped or recounted:
progress, best scores, leaderboard entries, identity and unlocks are all
kept. Anyone who already had Crayon open keeps it, and finds Scratch Art
open as well (a world added in front of one you have reached is never a
gate); the campaign page reveals it with *open!* the first time they look.
Someone part way through Highlighter opens Scratch Art by the same 220 rule
as ever. Endless picks the world up from the campaign automatically:
Notebook → Blueprint → Highlighter → Scratch Art → Crayon → Notebook…, each
opened world for 300 m.

### The look

A child's rainbow scratch-art sheet: waxy near-black over soft rainbow bands.

- **The rainbow is fixed in the sheet**, not in the pen: soft diagonal bands
  lie under the whole page, and a scratch shows whatever colour is beneath
  it. A line changes colour as it crosses the bands; two lines that cross
  show the same colour where they meet; the printed ground shows the same
  sheet. Colours are chalky, not neon (64% saturation).
- **Your line** is the rainbow core in short runs of one colour read off the
  sheet, pale grooves where the point dragged, and edges chipped unevenly by
  the dark wax. While you draw, a few flakes of wax (dark curls with a lit
  edge, and the odd fleck of colour) come away at the stylus and drop — a
  fixed pool of 48, none at all with reduced motion.
- **Printed ground** is scratched with a ruler: even rainbow with a pale lip
  along the top where Inky runs. **Stars** (the world's short floors) have a
  little burst scratched under them.
- **Danger** is scratched hard where the sheet is only red and orange, under
  the usual cream hatching and outline — it reads as the hot thing at a
  glance. **Blocks** are scratched solid, faintly.
- **The sheet itself**: grain in the coating, uneven sheen, a moon, a spiral,
  a few stars and a half-filled patch already scratched up in the sky — dim,
  thin and high, so none of it reads as ground.
- **Inky, words and the inkwell** are scratched pale cream, the way the
  Blueprint draws them white: the most readable thing on a dark page.

Only the look changes: collision is the same centre line in every world. The
line costs about what Crayon's does (three passes; the core is solid-colour
runs rather than a gradient, which was measurably dearer in software
rendering).

### The pages

Scratch Art's own ideas: **join the stars** (short floors with gaps — the
line between them is the test), **ride the comet** (long printed swoops that
hand Inky speed and throw him off their tails), **the hot tunnel** (lay one
long flat line under a low ceiling of danger) and **fireworks** (small hot
rocks to flick over, often under a hot sky that says *kick low*). A star has
a little tail on its left (18 across, 12 up) so a join that arrives a touch
low is lifted onto it — the join is the test, not the corner; the lidded
blocks in Scratch Art 3 have the same.

- **Scratch Art 1** — join three stars, ride the comet down and let its tail
  throw you over the dark (a blot hangs high for anyone who kicks), keep low
  under the hot patch, climb three stars, drop to the last floor and flick
  two fireworks on what is left.
- **Scratch Art 2** — control. Down the comet straight into the hot tunnel:
  one long flat line, do not lift. Three stars up out of the dark, three
  fireworks (one kick each), a ledge that ends over nothing (*catch him* on
  the low star), then four stars climbing under their lids.
- **Scratch Art 3** — the last sheet, everything at once: over the hill and
  down the comet, kick off its tail over the dark, the hot tunnel, three
  blocks under three lids, the long drop and the catch, two fireworks under a
  hot sky, and the last three stars up to the end on whatever is left.

### Difficulty

Simulated imperfect player (`tests/human.js`, σ = 1, 400 tries, two seeds),
drawing each page's intended route (`tests/solutions/sol-s*.json`, `ref`):

| Page | Win per try | Deaths past 70% | Median death | Tidy route leaves |
|---|---|---|---|---|
| Scratch Art 1 | ~10% | 83% | 88% | 35% ink |
| Scratch Art 2 | ~7.5% | 72% | 85% | 50% ink |
| Scratch Art 3 | ~4.5% | 80% | 84% | 43% ink |

Between Highlighter (9.5 / 8.5 / 5.5%) and Crayon (10.5 / 5.5 / 2%), and
harder page by page. Deaths are late: early walls found by the model (the
star corners, the blocks' corners, a comet kick that fell a few units short)
were removed, and ink was then tightened until the end of each page is where
runs fail. A tidy line — the route optimiser's, robust to small nudges —
finishes each page with a third to a half of the well left, so the ink score
has room.

### Tests added or changed
`tests/mastery.js` (five worlds in order; Scratch Art opens at 220 in
Highlighter and opens Crayon at 220; a v0.8 player with Crayon keeps
everything, finds Scratch Art open, and sees it revealed; totals out of 1500),
`tests/regions.js` (Endless: all five in campaign order and round, each named,
identical path with one world or five), `tests/campaign-verify.js` (fifteen
pages, part way and home), `functions/campaign-levels.json` re-exported
(fifteen pages), and the admin dashboard's campaign table lists fifteen pages.

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

### Endless travels through the worlds
An Endless run starts in the Notebook and, every **300 m**
(`ENDLESS_REGION_M` at the top of `public/index.html`, one number to tune
after playtesting), moves on to the next world **the player has opened in the
Campaign**, in campaign order, and round again: Notebook → Blueprint →
Highlighter → Crayon → Notebook… With only the Notebook open it stays in the
Notebook; with two, they alternate. A world opened in the Campaign joins from
the next Endless run. The list is read when a run starts, and the region is
chosen by the furthest distance reached, so it never flickers at a boundary.

The change happens inside the same run: the page is pulled away over the new
one (the same hand page-turn the menus use, about 0.4 s), and the new world's
name is written across the top and underlined, then fades (about 2 s).
Nothing stops, resets or waits. Everything visual follows — paper, printed
ground, hazards, blots, the inkwell and the player's drawing material (pen,
white drafting pencil, highlighter, rainbow crayon); lines already on screen
are redrawn in the new material, as if on the new page. The generator's
blueprint annotations only appear on blueprint pages.

The course, the physics and Endless's difficulty curve are untouched:
`tests/regions.js` plays the same seed with the same lines with one world open
and with four, and Inky's path is identical to the sample. The Daily stays on
its blueprint and Zen in the Notebook. A switch costs 8–23 ms once (the new
paper is drawn), hidden under the page-turn.

### Tests added or changed
`tests/regions.js` (Endless: Notebook only stays; two alternate; four in order
and round; a region every 300 m; each named; identical path whatever the
worlds; a retry starts in the Notebook; Daily and Zen unchanged; played live
across a boundary), `tests/mastery.js` (progress rules, migration from v0.6 and v0.7 saves),
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
further you go, travelling through the worlds you have opened in the Campaign
(a new one every 300 m; see *v0.8*). HUD: distance (20 units = 1 m, Inky is a metre across), time,
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
| `node tests/admin.test.js` | dashboard metrics on a hand-checked dataset (fifteen campaign pages), the opening's funnel and the hook metrics included | all passed |
| `node tests/mastery.js` | on the real page: a page counts its reach, never rounded up to home; home = 100 whatever the ink; best ink kept; best only; world = its pages; 219 shut, 220 open; open after reload and forever; a world opened by a death, shown on its card; 300 = ALL HOME, stamped once; five worlds in order; 1500 in all; nothing after Crayon; an old player's records read unchanged, Blueprint kept, new worlds not handed out; Scratch Art opens at 220 in Highlighter and opens Crayon; a v0.8 player with Crayon keeps everything and finds Scratch Art open and revealed; blocked storage never breaks the page | all passed |
| `node tests/campaign-verify.js` | all fifteen pages played in the real engine; the server check accepts each finish and each run cut short, and refuses a forged trace, forged ink and a claim to have got further; ranking order on worked examples | all passed |
| `node tests/regions.js` | Endless visits only the opened worlds, in campaign order, 300 m each, named as they arrive; the run's path is identical whatever worlds are open; retry starts in the Notebook; Daily and Zen unchanged | all passed |
| `node tests/anticampaign.js` | the antigravity campaign: hidden until Inky is home, each page opened by its own page, the switch (remembered), separate numbers that open nothing, every page's lines in pairs and its route home, cards, "next" | all passed |
| `node tests/antigravity.js` | mirror symmetry (a page mirrored with gravity up is the same run, exactly); falling off the top is a fall; 30 Endless seeds: gravity turns only at a line, he always lands on the far side with nothing drawn, always on screen, every run survives to 1.5 km; first line at 200 m; Daily and Zen never turn over | all passed |
| `node tests/social.emu.js` | campaign boards through the real function: finishes above part-way runs whatever the ink; same progress ranked by ink; an old entry migrated and ranked by its ink; own rank; better replaces worse, never the reverse; forged reach refused | all passed (twice in a row) |
| `node tests/board-ui.js` | the campaign leaderboard sheet offline: opens, turns pages, returns; play without Firebase | all passed |

Also re-run: every saved campaign route replayed stroke-for-stroke with a
perfect hand — the ordinary and the tidy line on all fifteen pages finish;
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
