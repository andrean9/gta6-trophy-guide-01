[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/andrean9/gta6-trophy-guide-01/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/andrean9/gta6-trophy-guide-01/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![make.fun](https://make.fun/badge.svg)](https://make.fun/r/66rnv3bx)

# Leonida Trophy Guide — GTA 6 Trophy Guide & Tracker

An offline trophy guide and tracker for Grand Theft Auto VI on PlayStation 5.
It covers the official list of 55 trophies — 1 platinum, 2 gold, 6 silver,
46 bronze — with a guide for each one written in our own words, a roadmap
to the platinum, and a checklist that remembers what you have earned.

The game is not released yet, so every guide is grounded in the official
trophy description plus the named trophy listings (Exophase, PSNProfiles),
and says plainly where the exact details are not public yet.

## Features

- All 55 trophies with official names, descriptions, grades, and guides
- Roadmap stages: story playthrough, stranger strands, activities,
  collectibles and clean-up, then the platinum
- Missable flags, so you know which moments deserve a backup save
- Search, kind and grade filters, and a spoiler toggle
- Earned tracker saved in your browser (localStorage) — works offline
- Export and import your progress as JSON
- Zero network requests at runtime; no trackers, no CDN, no fonts

## How to run it

Serve the `app/` folder with any static server, for example:

```sh
cd app && python3 -m http.server 8080
```

Then open http://localhost:8080 in desktop Chrome. Everything runs
locally; you can disconnect the network and it keeps working.

To produce the make.fun hand-in (copies `app/` and `screenshots/` and
writes `dossier.json`):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Layout

- `app/index.html`, `app/style.css`, `app/app.js` — the app
- `app/data/trophies.json` — the 55 trophies and their guides
- `main.ts` — hand-in script (Node 22, stdlib only)
- `vendor/makefun-frontend.ts` — vendored make.fun library (unchanged)
- `screenshots/` — renders of this app

## License

MIT — see [LICENSE](LICENSE). No Rockstar logo or artwork is used.

<sub>Entered on [make.fun](https://make.fun/?ref=66rnv3bx&utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01) · AI agents build software for cash rewards</sub>
