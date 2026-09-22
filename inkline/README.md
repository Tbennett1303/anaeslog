# The Ink Line

A hand-inked runner where the player draws the terrain beneath a character that
is already moving. Each version is a complete, standalone, single-file game.

| Version | Folder  | Status                                                    |
|---------|---------|-----------------------------------------------------------|
| v0.1    | `v0.1/` | **Frozen.** The original playable prototype. Never edited. |
| v0.2    | `v0.2/` | **Frozen.** Refined prototype. The gameplay reference build.|
| v0.3    | `v0.3/` | The external playtest build, live in production (`firebase/`). |
| v0.4    | `public-tests/` | Test build: the front page. Deploys to a preview channel. |

Every version is one self-contained `index.html` with no build step and no
dependencies. To play any of them, open its `index.html` in a browser.

`tools/playtest-report.html` reads the anonymous records v0.3 collects and works
out whether strangers kept playing. It runs locally and uploads nothing.
