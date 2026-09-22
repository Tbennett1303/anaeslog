# The Ink Line — v0.3

The external playtest build. Same game as [`../v0.2`](../v0.2) with two additions
and nothing else: anonymous playtest analytics, and a procedural sound design.

One self-contained `index.html`. No build step, no dependencies, no framework, no
backend. Open the file to play it; copy it to any static host to deploy it.

## What did not change

The point of this version is that the game is untouched. Verified by measurement
against the frozen v0.2 rather than by judgement:

| Check | v0.2 | v0.3 |
|---|---|---|
| Level geometry (source diff) | — | **identical** |
| Physics & ink constants (source diff) | — | **identical** |
| Ink spent by an identical drawn line | 531.964 | **531.964** |
| Flat cruise speed | 299.9 u/s | 300.0 u/s |
| Speed arriving on the plinth ramp | 43.8 u/s | 47.1 u/s |
| Tiny-ramp skill: 35-unit flick over the 38-tall rock | clears, x=1264 | **clears, x=1264** |
| Slam landing scrub | 218 u/s | 218 u/s |
| Death → playable again | 10 ms | 8 ms |
| Frame rate | 60.4 fps | 60.4 fps |

The small differences in ramp arrival are frame-timing jitter; the same build
varies by that much between runs.

## Sound

No music. No samples. Every sound is synthesised from noise and a couple of
oscillators, so nothing loops audibly and no two impacts are identical.

**The nib** is one noise source through two voices — a wet, low, controlled body
and a dry, bright scratch. Drawing speed sets the source's playback rate, so the
*rate of the grain* follows your hand; that is what stops it reading as a clip
being retriggered. A slow deliberate stroke is quiet and smooth, a panic scribble
is fast and energetic, sharp changes of direction catch briefly, and a nib held
still makes no sound at all.

**Ink level is audible.** As the well empties, the wet voice fades out, the dry
voice comes up and the filters open upward — measured, the nib's brightness runs
2079 Hz at full ink to 4699 Hz when dry. It tracks the existing visual dry-nib
thresholds, and it is a pen running out, not an alarm.

**The inkwell** answers physically: a collected blot is a rising drop-into-liquid
pitch, a small splash and the glass behind it, then a low settle under the ripple.
Short, and not a reward chime.

**Landings** reinforce the physics that already exist: a clean landing is light
and brief (56 ms, brighter), a slam is heavier and duller (100 ms, lower) —
matching the speed it costs you. The runner's travel is a whisper of paper, never
a footstep.

**Death** is a wet splat — a filtered burst, a wet body and a few flecks landing
after it — 163 ms in total, fired on the same frame as the visual splat and the
haptic. Then silence, and the restart is as fast as it was.

Sound is toggled by the handwritten **sound** in the corner or by **M**, and the
choice is remembered. A press that begins on that control waits to see what it
becomes: a tap toggles, a drag draws from where it began, so the control can never
eat a stroke.

Audio is built during the opening beat, while the runner is still standing on the
title, because building it costs about a tenth of a second — nearly all of it in
the `AudioContext` constructor — and that must never land on a tap. On a gesture
the game only calls `resume()`. Nothing in the audio path runs inside a pointer
handler: the game loop writes numbers to the graph once a frame.

If the Web Audio API is missing, blocked, or throws, the game plays normally in
silence.

## Analytics

Anonymous. No account, no login, no name, no email. A random id is kept in the
browser so a returning player can be told from a new one; it identifies a browser,
not a person. Nothing is uploaded unless you configure an endpoint (see below) —
by default the data never leaves the device.

Recorded, and only at meaningful moments (session start, attempt start, death,
completion, page hide):

- session number, whether it is a return visit, touch or mouse, viewport size
- attempt count, per session and lifetime
- for each death: progress %, ink left %, cause (from the game's existing death
  reasons), run length
- for each completion: attempt number, ink left, time
- session duration

Not recorded: pointer coordinates, drawing geometry, frame data, physics data, or
anything identifying. A full player record is about 1 KB.

If storage is blocked or full, if the endpoint is dead, or if the player is
offline, the functions become silent no-ops and the game continues normally.
All four cases are tested.

### Collecting a playtest

Set `ANALYTICS_ENDPOINT` — the `ENDPOINT` constant at the top of the analytics
module — to your own HTTPS URL. Events POST as JSON on page hide and every 25
events, via `sendBeacon`. Each body is `{pid, s, v, ev:[…]}`; append them to a
file, one JSON object per line, and the report tool reads that directly.

**Artifact hosting blocks outbound requests**, so a remote collection run needs the
file on your own host (Netlify, Cloudflare Pages, GitHub Pages — it is one static
file). Without an endpoint you can still collect by hand from any device you hold:
`INKLINE.analytics.export()` in the console returns the whole record.

### Reading the data

Open [`../tools/playtest-report.html`](../tools/playtest-report.html) and drop the
files in. It computes median and mean attempts per player, the share reaching 2,
5, 10 and 20 attempts, retry-after-death rate, median session duration, completion
rate, median attempts before completion, ink left at death and at completion, the
share returning in a later session, and where runs end as a distribution across
the level. It runs entirely in the page and uploads nothing. "Load sample data"
shows the report populated before a playtest exists.

There are no prompts anywhere in the game encouraging a retry. The retry rate is
meant to be the honest one.

## Console hooks

`INKLINE.analytics.summary()` · `.export()` · `.clear()` — this device's record.
`INKLINE.sound` — `ok`, `on`, `toggle()`, and `probe(kind, opts)`, which renders a
sound offline and returns its loudness, brightness and duration. Every audio
figure quoted above came from `probe`.
`INKLINE.state()` · `.record()` · `.paint()` · `.place()` · `.restart()` as before.

## Tested

60 fps held through frantic scribbling (worst frame 23 ms), one continuous
940-unit stroke, drawing hard against the screen edges and corners, two
simultaneous pointers, twenty back-to-back deaths and restarts, sustained play,
and hammering the sound toggle — with no page errors in any of it. Failure
injection covers no Web Audio, a throwing `AudioContext`, blocked storage,
full storage, and an unreachable endpoint; the game stays playable in all five.

## Not in this version, on purpose

No extra levels, daily challenge, leaderboards, names, accounts, multiplayer,
ghost lines, sharing, achievements, coins, shops, skins, adverts, purchases,
procedural levels, editor, themed paper, power-ups, unlocks or new obstacles.
Nothing can buy, earn or watch its way to more ink: running out means finding a
better line.
