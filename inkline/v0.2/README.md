# The Ink Line — v0.2

**Frozen.** The build that was judged fun and taken forward. Same game as
[`../v0.1`](../v0.1), sharpened. Nothing in this folder should be edited again;
v0.3 develops separately in `../v0.3` so this one stays available to compare
against and to revert to.

```
sha256  f1b5e551b713c64748c71ba6f830673cde38d83a0cf2f87379038d490191c12f
bytes   55439
```
 One
self-contained `index.html`, no build step, no dependencies, no framework. To
play it, open the file in a browser. To deploy it, copy the file to any static
host. It needs the network only for two cosmetic fonts and falls back to a
default cursive face without them.

v0.1 is frozen and untouched too. If anything in a later version feels worse,
these folders are the reference builds.

## What changed, and why

**Drawing feel** — the highest-priority area, and one real bug was found:
`pointerleave` was ending a stroke whenever the finger neared the canvas edge,
so lines cut out mid-panic. Only a genuine lift ends a stroke now. One pointer
owns the line, so a second finger or a resting palm can no longer hijack it.
Samples land every 3.6 units instead of 5, and a fast flick between two pointer
events is walked in steps rather than becoming one long straight chord.

The line is *not* smoothed, beautified or resampled into curves. The mark you
see and the ground the runner collides with are the same polyline, so panic
scribble stays exactly as ugly and as solid as you drew it.

**Physics** — the movement system is unchanged; two things were tuned:

- *Landing angle now matters.* An impact scrubs forward speed in proportion to
  how hard it lands: a clean, shallow landing costs nothing, a slam costs about
  a quarter of your speed. Measured on a 240-unit drop: 285 → 215 units/s.
- *Climbing costs more.* Drive falls off with slope, so a steep ramp bleeds
  speed rather than powering up it.

Measured against v0.1 so the feel didn't drift: flat cruise identical (300
units/s), arrival speed at the top of the plinth ramp equal or slightly better
(50 vs 43), and a 35-unit flick ramp still launches the runner over the 38-tall
rock — the "tiny ramp beats a big one" skill is intact and now cheaper than
drawing over the top.

**The inkwell** is a physical object rather than a meter. The level lags the
true figure so draining reads as a fall; the surface tilts as one plane against
changes in pace and settles on a spring; there is a meniscus at each wall,
etched fill marks on the glass, and dregs when it runs low. Collecting a blot
throws it across the screen into the bottle, which swells and ripples as it
lands. A soft paper halo keeps the level readable over cross-hatched terrain.

**The dry nib** is graded rather than a cliff: variation below 20%, noticeably
scratchy below 10%, visible gaps below 5%. The gaps are *ink only* — the ground
stays continuous, so low ink is still playable. At zero, dragging leaves a dry
scratch on the paper and no terrain at all. Nothing ever prints "NO INK".

**Death** is a splat, a short haptic where the device supports it, and a card
that leads with how far you got. Measured restart: 5–15 ms from tap to playable.

**Attempt counter** scratched in the corner, ticking over the instant you splat.

**Progress** shown as a percentage against a red-pen margin rule, with a nick
marking your furthest attempt. After a death the number counts up on the card.

**The level is unchanged.** Same obstacles, same order, same difficulty.

## The run record

Every attempt is captured as portable data — course id, outcome, timings, ink
spent, every stroke point with its timestamp, and the runner's per-frame path.
It drives the replay today. Deliberately, it depends on nothing about this
session, device or build, so the same records could later back a daily
challenge, a ghost line drawn behind you, or a shared replay. A full run is
roughly 10 KB of JSON. A completed run is kept in `localStorage`.

Schema version lives in `REC_V`. Read one with `INKLINE.record()`.

## Automation hook

`window.INKLINE` exposes `state()`, `record()`, `paint(points)`, `place(x, y, vx, vy)`
and `restart()` — the same paths the player's finger drives. It exists so runs
can be scripted and measured (every physics figure above came from it) and is
the seam a daily-challenge verifier would use.

## Tuning

The constants at the top of the file are the dials worth turning:
`GRAV`, `CRUISE`, `DRIVE`, `SLAM` (landing scrub), `INK_MAX`, `INK_DROP`,
`SCROLL` (forced camera creep), `MINSEG`/`MAXSEG` (line sampling), and the
`DRY_*` thresholds.

## Not in this version, on purpose

No accounts, leaderboards, coins, shops, skins, power-ups, multiplayer, ads,
achievements, procedural generation, level editor, daily challenge, sharing or
extra modes. The loop is run → draw → survive → splat → again.
