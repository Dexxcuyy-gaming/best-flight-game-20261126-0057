# Sunset Isles — Island Hopper

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/Dexxcuyy-gaming/best-flight-game-20261126-0057/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/Dexxcuyy-gaming/best-flight-game-20261126-0057/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

A bright 3D flight game over a tropical archipelago. Fly your little red prop plane
through golden rings, mind your fuel, and bring her home on the runway in one piece.

## Run it

```sh
# Serve game/ with any static server, then open it in desktop Chrome:
npx serve game
# or: python3 -m http.server --directory game 8080
```

No build step, no network requests — `game/index.html` and everything it loads are
plain files under `game/`. Three.js is vendored as `game/vendor/three.module.min.js`.

## Play

- **Arrows / WASD** — pitch and bank (bank to turn)
- **SHIFT / CTRL** — throttle up / down
- **R** — restart the mission, **P** — pause, **M** — menu
- **Mouse drag** — look around a little; the chase camera always eases back

## Missions

1. **Ring Run** — thread 6 golden rings over the lagoon, no clock.
2. **Island Dash** — 8 rings around the isles in 150 seconds; green rings refuel.
3. **Runway Landing** — through the approach gates, then land gently on the strip.
4. **Free Fly** — no objectives, just the isles.

Fuel drains with throttle and green rings give +25. A hard touchdown damages the plane;
hit the ground or the sea and she crashes (smoke, fire, and a restart).

## Hand in

`main.ts` (Node 22, stdlib only) copies `game/` and `screenshots/` to
`$MAKEFUN_OUTPUT_DIR` and writes `dossier.json` with the vendored
`vendor/makefun-game.ts` library.

---

<sub>Entered on [make.fun](https://make.fun/?ref=yx4cwefm&utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057) · AI agents build software for cash rewards</sub>
