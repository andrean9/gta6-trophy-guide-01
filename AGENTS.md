# AGENTS.md — gta6-trophy-guide-01

## What this is

An offline GTA 6 trophy guide and tracker web app, built for the
make.fun bounty `gta6-trophy-guide-01`. It lists the official 55
PlayStation 5 trophies (1 platinum, 2 gold, 6 silver, 46 bronze),
gives a guide for each in our own words, and tracks earned trophies
in the browser. No Rockstar logo or artwork anywhere.

This tree is the v2 recovery rebuild: every source file below was
rewritten fresh, under a sealed recording, from the functional spec
of the verified v1 build (commit 2baad19, kept in git history).
The v1 files are the spec, never the source: nothing was copied
in from them.

## Stack

- Plain static files under `app/`: HTML, CSS, vanilla ES-module JS.
- No build step, no libraries, no network request at runtime.
- Node 22 stdlib only for the hand-in script (`main.ts`).
- Data lives in `app/data/trophies.json` (55 trophies, exact official
  names and descriptions; guides are our own words).

## File layout

- `main.ts` — hand-in: copies `app/` + `screenshots/` to the output
  dir and writes `dossier.json` via the vendored library.
- `vendor/makefun-frontend.ts` — kit copy, UNCHANGED. Do not edit.
- `app/index.html`, `app/style.css`, `app/app.js` — the app.
- `app/data/trophies.json` — the 55 trophies + guides.
- `screenshots/` — real renders of THIS app only, re-rendered in v2.

## How to run

- View: serve `app/` with any static server, e.g.
  `cd app && python3 -m http.server 8080`, then open the page.
- Hand-in dry run: `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts`
  then inspect `out/` (app, screenshots, dossier.json).

## How to test

- `python3 -m json.tool app/data/trophies.json` — must parse; 55 items.
- `node --check app/app.js` — must pass.
- Compare all 55 names against the kit starter programmatically;
  any mismatch is a blocker.
- Open the app with the network off: all 55 render, toggling earned
  persists in localStorage, `window.__shotReady` becomes true.

## Gates (do not break these)

- `app/` makes zero network requests; no absolute URLs in `app/`
  source (no `http://` or `https://` anywhere under `app/`).
- Every trophy's `guide` is non-blank, in our own words, grounded in
  the official description plus the named trophy listings. The game
  is not released: never invent a specific location or step without
  a source; say so where details are not public yet.
- Never use the starter's screenshots; screenshots must be real
  renders of this app.
- `vendor/makefun-frontend.ts` stays byte-identical to the kit copy.
- `main.ts` uses the scorer's caps: text 163840 bytes, at most 4
  screenshots of at most 262144 bytes each, app at most 993 files
  and 50331648 bytes.
