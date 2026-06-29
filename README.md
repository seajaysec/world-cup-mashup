# Family World Cup 2026 Tracker 🏆

A dead-simple, mobile-first tracker for the family's 2026 World Cup pick'em. Each
person picked a team; this shows how everyone's doing, who's still in it, who's
out, what's coming up, and who's winning (or losing) the family prizes.

- **Pick your name** to follow your team — it's remembered in your browser only
  (localStorage), no accounts.
- **Standings** rank everyone best → worst. The top is on track to **win it all**
  (👑); the bottom is the wooden spoon for **losing the whole thing** (🥄).
- **Roster** shows who has which team, who's knocked out, and which teams nobody
  picked.
- **Schedule** lists upcoming matches and results in your local time zone, with
  venues — filter to just your team or all family teams.

## Data

Tournament data comes from the public-domain
[`openfootball/worldcup.json`](https://github.com/openfootball/worldcup.json)
feed (`2026/worldcup.json`), fetched live in the browser. If the live fetch
fails, the app falls back to the last cached copy and then to a snapshot bundled
at build time (`public/worldcup-2026.snapshot.json`), so it never shows a blank
screen.

Knockout-round slots in the feed use placeholders like `W74` (winner of match 74)
and `L101` (loser of match 101). The app resolves these itself from match
results, so the bracket is correct even when the upstream feed hasn't filled in a
name yet.

## How the prizes work

There's one unified leaderboard. Picks are ordered by how far the team got
(Champion → Runner-up → 3rd → 4th → quarter-finals → Round of 16 → Round of 32 →
out in the group stage). Teams still alive rank above teams out at the same
stage. Ties are broken by group-stage **points**, then **goal difference**, then
**goals scored**, then pre-tournament favoredness.

- **Wins it all** = the pick at the top of the board.
- **Loses the whole thing** = the lowest-ranked real team (the wooden spoon).

The two for-fun picks that aren't actually in the World Cup (Galaxy 🌌, Denver
Nuggets 🏀) are shown with flair but pinned to the bottom, out of the running.

## Editing the picks

Everything family-specific lives in two files:

- `src/data/roster.ts` — who picked what. To change a pick, edit the `team`
  (use the feed's spelling, or add an alias in `teams.ts`). Mark non-World-Cup
  picks with `joke: true`.
- `src/data/teams.ts` — each team's flag, group, and favoredness `tier`
  (`favorite` / `contender` / `darkhorse` / `longshot`). The tiers are a
  subjective pre-tournament guess; tune them to taste. The `TEAM_ALIASES` map
  there handles spelling differences (e.g. `Congo DR` → `DR Congo`).

## Develop

```bash
npm install
npm run dev        # local dev server
npm test           # run the logic tests (Vitest)
npm run build      # type-check + production build into dist/
npm run preview    # preview the production build
```

The ranking and elimination logic is covered by tests in `test/` that run
against the bundled snapshot.

## Deploy (GitHub Pages)

A GitHub Actions workflow (`.github/workflows/deploy.yml`) builds and deploys to
GitHub Pages on every push. To enable it once:

1. Go to **Settings → Pages** and set **Source** to **GitHub Actions**.
2. Push to the deploying branch; the workflow builds, tests, and publishes.

The site is served from a sub-path, so Vite's `base` is set to
`/world-cup-mashup/` in `vite.config.ts`. If you rename the repo, update that
value (or set `BASE_PATH` when building).
