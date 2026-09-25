# The Ink Line

A hand-inked runner where the player draws the terrain beneath a character that
is already moving. Each version is a complete, standalone, single-file game.

| Version | Folder  | Status                                                    |
|---------|---------|-----------------------------------------------------------|
| v0.1    | `v0.1/` | **Frozen.** The original playable prototype. Never edited. |
| v0.2    | `v0.2/` | **Frozen.** Refined prototype. The gameplay reference build.|
| v0.3    | `v0.3/` | The external playtest build, live in production (`firebase/`). |
| v0.4    | `v0.4/` | **Frozen.** Front page + Campaign (Notebook + Blueprint). sha256 `06f5ee50…8b28`. |
| v0.5    | `v0.5/` | **Frozen.** Campaign, Endless, Daily Challenge (global board), Zen — before the difficulty pass. |
| v0.6    | `v0.6/` | **Frozen.** As deployed: the played first-time opening, the prototype's difficulty restored, a much harder Endless, per-page campaign leaderboards. |
| v0.7    | `v0.7/` | **Frozen.** The finished four-world campaign, first version (ink counted towards opening worlds). |
| v0.8    | `v0.8/` | **Frozen.** The four-world test build as deployed: each world's own drawing material, progress first and ink second everywhere, leaderboards ranked furthest → ink → time, Endless through the opened worlds, installable. |
| v0.9    | `v0.9/` | **Frozen.** Adds **Scratch Art** as World 4 (between Highlighter and Crayon) — five worlds, fifteen pages. |
| v0.10   | `v0.10/` | **Frozen.** Antigravity in Endless (gravity lines built into the course); each world change in Endless is a line across the page. |
| v0.11   | `public-tests/` | Test build: antigravity everywhere outside the main campaign — Endless, the **Daily**, and an **antigravity campaign** (every page, with upside-down phases) opened once Inky gets home. |

Every version is one self-contained `index.html` with no build step and no
dependencies. To play any of them, open its `index.html` in a browser.

`archive/the-inkline-v0.4-campaign.zip` is a full recovery copy of this folder
(every version, the Firebase projects and tools) as it stood at v0.4.

`tools/playtest-report.html` reads the anonymous records v0.3 collects and works
out whether strangers kept playing. It runs locally and uploads nothing.
