# The Ink Line — Firebase playtest deployment

The public game, a validated ingestion endpoint, and a private analytics
dashboard. The game itself is frozen v0.3: its script block is byte-identical
(sha256 `dc2d22b212c80abe…`) apart from one line pointing analytics at
`/api/collect`.

```
public/index.html        the game (v0.3 + document wrapper + disclosure line)
public/admin/index.html  the private dashboard (the playtest report + auth)
public/vendor/           Firebase SDK, served from this site, no CDN needed
functions/index.js       the only writer to the analytics collections
firestore.rules          public can neither read nor write analytics
firebase.json            hosting, the /api/collect rewrite, emulator ports
```

## Deploy

```sh
npm i -g firebase-tools          # if you do not have it
firebase login                   # opens a browser
cd inkline/firebase
firebase use --add               # pick your project; writes .firebaserc
(cd functions && npm install)
firebase deploy --only firestore:rules,functions,hosting
```

Two things must be done in the console first:

1. **Authentication → Sign-in method**: enable **Google** (or Email/Password —
   the dashboard supports both).
2. **Billing**: Cloud Functions require the **Blaze** plan. Set a budget alert
   while you are there (see below).

## Make yourself the administrator

There is no admin password and no UID in any file. Access is a document that
only you can create:

1. Open `https://YOUR-PROJECT.web.app/admin/` and sign in.
2. It will say you are not an administrator **and print your UID**.
3. Firestore console → create collection `admins` → document ID = that UID →
   any field (e.g. `note: "owner"`) → save.
4. Reload `/admin/`.

To add another administrator later, add another document. To revoke, delete it.
Clients cannot write this collection, so admin rights cannot be granted from a
browser.

## Security model

- The game ships **no Firebase SDK and no credentials**. It only POSTs to
  `/api/collect` on its own origin.
- That endpoint is a Cloud Function that rebuilds every event field by field
  from an allow-list: unknown event types and fields are dropped, types are
  enforced, numbers clamped, strings enum-checked, payloads capped at 32 KB and
  200 events, with per-player and per-IP rate limits held in memory.
- Firestore rules deny **all** client reads and writes of `players/**`. The
  function writes with the Admin SDK, which bypasses rules.
- Reads are allowed only when `/admins/{request.auth.uid}` exists — Firebase
  Authentication *and* a server-side check, not a client-side email test.
- `/admin/` being unguessable is not part of the model; the rules are.

## Data collected

Per anonymous browser id: sessions and whether a visit is a return, touch or
mouse, viewport size, attempt counts, and for each attempt its outcome —
progress %, ink left %, death cause, run length — plus completion time and ink
on finish, and session duration.

Not collected: names, emails, accounts, location, advertising ids,
fingerprinting, pointer trajectories, drawn lines. IP addresses are used for
rate limiting inside the function and are never written to Firestore.

The game shows "Anonymous playtest analytics are collected to improve the game."
on load, which fades after nine seconds.

## Export and deletion

`/admin/` → **Download JSON** (raw records) or **Download CSV** (per-player
table). Click any player row for that player's attempt-by-attempt history.

Delete everything:

```sh
firebase firestore:delete --recursive players
```

Each player also holds their own copy in their browser's localStorage under
`inkline.play.v1`; clearing site data removes it.

## Billing protection

- The function is capped at `maxInstances: 5`.
- Set a budget: Google Cloud console → Billing → Budgets & alerts → e.g. £5/month
  with email alerts at 50/90/100%.
- Firestore's free tier (50k reads, 20k writes per day) covers a playtest of
  this size comfortably; each attempt is a fraction of one write, since events
  are batched and only flushed on page hide or every 25 events.
- Optional, if the endpoint is ever abused: enable **App Check** with reCAPTCHA
  and require it on the function.

## Testing locally

```sh
firebase emulators:start --project demo-inkline --only hosting,functions,firestore,auth
```
Game at http://127.0.0.1:5000/, dashboard at http://127.0.0.1:5000/admin/. The
dashboard points itself at the emulators automatically on localhost.
