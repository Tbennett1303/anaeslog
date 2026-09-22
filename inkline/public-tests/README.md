# The Inkline — public tests (v0.4)

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

## What did not change

Level 1, physics, drawing, ink, sound design, inkwell, restart and difficulty.
Measured against frozen v0.3 after entering through the front page: identical
ink spent by an identical line (531.964), same cruise speed, the 35-unit flick
still clears the 38-tall rock, restart 6 ms, 60 fps.

## Analytics in this build

Off. `ENDPOINT` is empty, so test plays stay on the device and never mix with
the production playtest data. (Attempts are still recorded locally.)

## Deploy to the test channel

A Firebase Hosting **preview channel** on the same project. It gets its own URL
and cannot affect the live site.

```sh
cd inkline/public-tests
firebase use --add                                   # choose the same project; writes .firebaserc
firebase hosting:channel:deploy public-tests --expires 30d
```

The command prints the test URL (`https://<project>--public-tests-<hash>.web.app`).
Redeploying the same channel keeps the same URL. Preview channels expire; rerun
the command to extend it.

If your existing test build is a separate Hosting *site* rather than a channel,
deploy with `firebase deploy --only hosting:<site-name>` after adding that site
as a target in this folder's `firebase.json`.
