# The Inkline — public tests (v0.4)

Front page, Campaign, and six levels across two worlds.

The test build for the next phase. Production (`../firebase/`, v0.3) is not
touched by anything in this folder.

## What is new: the front page

The game now opens on the first page of the notebook instead of straight into
Level 1:

- **THE INKLINE** is written in, then *Draw the path. / Get Inky home.* in red pen.
- A line draws itself across the page, dips into a long shallow U, and stands a
  short wall up at the far end.
- Inky runs in from the left margin, rides the U — faster at the bottom — and
  goes straight into the wall. Splat.
- After a beat of silence the choices are written in: **CAMPAIGN**, and
  **ENDLESS** / **LEADERBOARD** marked *soon*.

It runs on the level engine — the same collision grid, physics substeps, stroke
renderer, splat and sound graph — so Inky's run is the game's real physics, not
a canned animation. Nothing on this page counts as a playtest attempt; attempts
start when CAMPAIGN is chosen.

**Timing.** First visit: the splat lands at about 4 s on every screen shape
(3.9–4.5 s measured on iPad, phone and desktop, both orientations) and the
choices are ready at about 5 s. A tap anywhere that is not a choice skips
straight to the finished page. After the first viewing the choices are written
in at once (usable at ~0.7 s) while the little run plays behind them.

**Choices.** Hover or press draws an ink underline under a word. CAMPAIGN turns
the page into Level 1. The locked choices answer with a dry-nib scratch and a
shake. Arrow keys and Enter work too, and **Esc** during a level returns to the
front page.

## The Campaign

CAMPAIGN opens a hand-drawn page of worlds, each with three pages (levels): a
circled number per page, a red tick once it is finished with the best ink left
in pencil beneath it, or the furthest reach if not. Inky waits on the next page
to play. Blueprint is a sheet taped into the notebook, visible before it opens.

**Unlocking.** Pages open in order within a world. Finishing any two Notebook
pages opens Blueprint — so Notebook 3 is never a wall. Nothing to spend or
count. Add `?all` to the URL to open every page for testing.

Each level opens with its own name written where THE INKLINE sits on the front
page, with your record for that page under it, and Inky runs past both. The win
card offers **next**, **again** and **replay**; **‹ pages** (top left, or Esc)
returns to the campaign at any time.

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

### Records

Per page, on the device: attempts, completions, best ink left, furthest reach,
best time and the attempt of the first completion — everything a future 1–3
ink-drop rating needs, stored so that can be added without changing it.

**Global statistics are not wired in.** There is no global leaderboard in this
codebase, so every screen shows the player's own numbers. `Global.get(levelId)`
in the page is the one place a global source plugs in; the level pages and the
line written under each level's name already render it when it answers.

## What did not change

Physics, drawing, ink behaviour, sound design, inkwell and restart. Notebook 3
is the original level: geometry identical to v0.3 by numeric comparison,
identical ink spent by an identical line (531.964), same speeds, the 35-unit
flick still clears the 38-tall rock, restart 6 ms, 60 fps.

## Analytics in this build

Off. `ENDPOINT` is empty, so test plays stay on the device and never mix with
the production playtest data. (Attempts are still recorded locally.)

## Deploy to the test site

This folder deploys only to the Hosting site **theinkline-tests**
(https://theinkline-tests.web.app) — `firebase.json` names it, so it cannot touch
the production site, which is deployed separately from `../firebase/`.

```sh
cd inkline/public-tests
firebase use --add                  # choose the Inkline project; writes .firebaserc
firebase deploy --only hosting
```

Add `?all` to the URL to open every page for testing:
https://theinkline-tests.web.app/?all
