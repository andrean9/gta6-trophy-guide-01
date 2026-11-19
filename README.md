# Leonida Trophy Guide

[![Competition](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![Rank](https://make.fun/badge/gta6-trophy-guide-01/andrean9/gta6-trophy-guide-01/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![Reward](https://make.fun/badge/gta6-trophy-guide-01/andrean9/gta6-trophy-guide-01/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

An offline guide and tracker for every PlayStation 5 trophy in Grand Theft
Auto VI, built for the [make.fun](https://make.fun/?ref=66rnv3bx&utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
bounty *Build the best GTA 6 trophy guide*. It covers the full official list
of 55 trophies — 1 platinum, 2 gold, 6 silver and 46 bronze — with each
trophy's official name, description and grade, a guide written for this entry
in its own words, and a checklist that remembers your progress.

## What it does

- **Every trophy, guided.** Each of the 55 trophies has its official
  PlayStation name, description and grade, plus a guide that says what to
  do and where its facts come from (Exophase and PSNProfiles). The game is
  not released yet, so where a detail is not public the guide says so
  instead of inventing it.
- **A tracker.** Tick trophies off as you earn them; progress is saved in
  the browser (localStorage) and can be exported to a JSON file and
  imported back.
- **Filters.** Narrow the list by kind (story, collectibles, activities,
  combat, exploration, economy, free roam, completion), by grade, by
  free-text search, by earned-only, or by missable-only.
- **Spoiler mode.** Hides the names, descriptions and guides of story
  trophies until they are earned, so the list stays safe to browse
  mid-playthrough.
- **Roadmap to the platinum.** The 55 trophies are arranged into five
  stages in play order, each with its own progress bar, from the opening
  mission through cleanup to the platinum.
- **Missable flags.** Trophies that can be missed are flagged with their
  reasoning, built from the official descriptions.
- **Detail panel.** Click any trophy to open its full guide, sources and
  earned toggle beside the list.

The app is plain static files under `app/` — no build step, no libraries,
no network request at run time. It works with the network off. No Rockstar
Games logo, artwork or game screenshots are used anywhere; the look is the
entry's own.

## Run it

Serve `app/` with any static HTTP server and open the page:

```sh
cd app
python3 -m http.server 8080
```

Then open <http://localhost:8080> in desktop Chrome. (Opening `index.html`
directly from disk does not work: the page loads its trophy data with a
fetch, which needs an HTTP server.)

## Hand it in

`main.ts` (Node 22, standard library only) copies `app/` and
`screenshots/` to the output directory and writes `dossier.json` there
with the vendored make.fun library. Outside the grader,
`MAKEFUN_OUTPUT_DIR` stands in for `/output`:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Layout

- `app/index.html`, `app/style.css`, `app/app.js` — the guide and tracker.
- `app/data/trophies.json` — the 55 trophies, the roadmap stages and the
  guides.
- `main.ts` — the hand-in program.
- `vendor/makefun-frontend.ts` — the kit's dossier library, unchanged.
- `screenshots/` — real renders of this app, taken by its maker.

## License

MIT — see [LICENSE](LICENSE).
