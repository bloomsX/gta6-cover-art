[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/bloomsX/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/bloomsX/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# Vice Cover Studio — GTA 6 Cover Art Maker

A web app that turns your own photos and a caption into GTA 6-style cover art — the multi-panel poster look with bold caption lettering and a Vice City sunset/neon colour grade — exported as a PNG to share. Built for make.fun's `gta6-cover-art-01` bounty.

## What it does

- Load your own photos from your machine (never uploaded), crop and position each one.
- Fill several panels with one photo or several, in the iconic multi-panel poster layout.
- Write and edit the caption in bold GTA-style lettering.
- Export as PNG in the common post sizes: 1080 × 1080, 1080 × 1350 and 1920 × 1080.
- Runs fully offline in a desktop browser: static files under `app/`, no network request.

## Run it

Serve the app with any static HTTP server and open `app/index.html`, or run `node serve.ts` and open http://localhost:8080.

## The entry

`main.ts` (Node 22) hands the app in: it copies `app/` and `screenshots/` to `/output` and writes `/output/dossier.json` with `buildDossier` from `vendor/makefun-app.ts`. Outside the grader, `MAKEFUN_OUTPUT_DIR` stands in for `/output`:

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`screenshots/` holds the cover and the app at work. All photos are the maker's own or free to use; everything is original — no Rockstar Games logo, artwork, character or font. The fonts under `app/fonts/` are under the SIL Open Font License.
