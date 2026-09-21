# The Ink Line — Original Prototype v0.1

The first playable prototype, preserved exactly as it was when it was judged fun.
**This folder is frozen. Nothing in it should be edited again.** Later work lives in
sibling folders (`../v0.2`, and so on).

Snapshot integrity — `index.html` at the moment of freezing:

```
sha256  63e06bbedf6234ba445de9b50ee3636d07429b469993d6ad0c59ddecb442796a
bytes   42656
```

If that hash still matches, the file is untouched.

## What's included

| File         | What it is                                                      |
|--------------|-----------------------------------------------------------------|
| `index.html` | The entire game — markup, CSS, and JavaScript in one file.       |
| `README.md`  | This file.                                                       |

There is nothing else. No build step, no bundler, no `node_modules`, no assets
directory, no server code. The paper texture, the ink character, the inkwell,
the obstacles and the splats are all drawn at runtime onto a single `<canvas>`.

## How to run it locally

Double-click `index.html`, or drag it onto a browser window. It runs from
`file://` with no server.

If you prefer to serve it (needed only if a browser is configured to block local
files):

```sh
cd v0.1
python3 -m http.server 8000     # then open http://localhost:8000
```

Anything that serves a static folder works equally well.

## Framework and libraries

**None.** Plain HTML, CSS and JavaScript against the Canvas 2D and Pointer Events
APIs. No React, no game engine, no physics library, no build tooling. The physics,
the collision grid, the drawing pipeline and the renderer are all hand-written in
this file.

The one external reference is a stylesheet link to Google Fonts for the two
handwriting typefaces (*Rock Salt* for the title, *Caveat* for the handwritten
interface).

## Does it need internet access?

Only for those two fonts, and only cosmetically. With no connection the fonts
fail to load and the browser substitutes its default cursive face — the game
itself is fully playable offline, because all the logic and artwork are in the
file. To make it *entirely* self-contained, delete the two `<link>` tags at the
top, or replace them with `@font-face` rules using base64-embedded font files.

No network calls are made during play. No data leaves the device. The only thing
stored is a best-run figure and a "has drawn before" flag in `localStorage`,
wrapped in `try/catch` so private browsing can't break it.

## How to deploy it as a web game

It is a single static file, so any static host will do. Pick one:

- **GitHub Pages** — push the folder, enable Pages for the branch, and the game
  is at `https://<user>.github.io/<repo>/inkline/v0.1/`.
- **Netlify / Vercel / Cloudflare Pages** — drag the folder onto the dashboard,
  or point the project at this directory with no build command.
- **Any web server** — copy `index.html` into the document root.
- **Offline / kiosk** — copy the file to the device. It needs nothing else.

Serve it over HTTPS if you want it added to an iOS home screen.

## Controls

Press and drag anywhere (finger or mouse) to draw the ground. Tap to restart
after a death. `R` restarts, `P` replays the last run.

## What this version demonstrates

That drawing terrain beneath an already-moving character is intrinsically
entertaining, and that a finite ink supply turns route-drawing into a real
decision rather than a formality. Everything after this version exists to sharpen
that loop, not to broaden it.
