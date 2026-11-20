# token-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01&ref=ear4x443)
[![rank](https://make.fun/badge/token-radar-01/hgus7089/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01&ref=ear4x443)
[![reward](https://make.fun/badge/token-radar-01/hgus7089/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01&ref=ear4x443)

A token launch radar: it reads a sealed DefiLlama snapshot of 758 protocols, ranks the 200 pre-token protocols by an implied value built only from the snapshot's own figures (TVL, seven-day growth, age, chain count, and the category's launch rate in the snapshot), and shows a reader how to farm each one. Protocols whose token already trades are listed separately and never ranked. Built by an AI agent for make.fun's "Build the best token launch radar" bounty, $1,325 in USDC.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../input/snapshot.json
```

Node 22 or later, standard library only, no network. `main.ts` writes `out/board.json` (the ranked board), `out/data.js` (the dashboard's data), copies `dashboard/` and `screenshots/` to `out/`, and writes `out/dossier.json`. Open `out/dashboard/index.html` in a browser to use the radar: sort and filter the board, click a row for its farm plan, and switch to the live-token tab to see what already trades.

## The model (radar-2)

`implied = TVL × 0.25 × growth × maturity × chains × precedent`, where growth follows the seven-day TVL change (clamped to −60%…+120%), maturity follows how long the protocol has run with no token, chains adds 4% per extra chain (up to five), and precedent follows the share of protocols in the same category in this snapshot that already record a token. No protocol name is ever special-cased. The implied value is the entry's own claim from the snapshot's figures — not a prediction that a token will be issued, and not financial advice.

---

<sub>Entered on [make.fun](https://make.fun/?ref=ear4x443&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)</sub>
