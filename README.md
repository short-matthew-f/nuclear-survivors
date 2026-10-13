# Nuclear Survivors

A fullscreen, touch-first survival roguelite in a radioactive exclusion zone. Drag to move, let your weapons handle the infected, evolve your build, and bring salvage back to the bunker.

**[Play the game](https://short-matthew-f.github.io/nuclear-survivors/)**

## What’s in field build 0.2

- Edge-to-edge Canvas gameplay with a compact HUD. No page header, footer, sidebar, or keyboard movement.
- A floating analog thumbstick, multi-touch dash and shockwave abilities, automatic aiming, optional sound, and supported-device haptics.
- Three operators: Nomad, Spark, and Bastion. Each has a distinct starting weapon and passive traits.
- Three unlockable sectors: Red Forest, The Drowned, and Dead Reactor, with different palettes, terrain decoration, atmosphere, and difficulty.
- Five weapon families: ballistic carbine, chain lightning, orbital saws, radiation bursts, and proximity mines. Each has five levels and a paired mutation that unlocks an evolution.
- Nineteen upgrade choices, with stacking mutations, upgrade caps, and two rerolls per run.
- Six regular enemy behaviors: walkers, runners, brutes, ranged spitters, charging ravagers, and splitting brood.
- Three titan encounters, with projectile rings, targeted spreads, summons, radiation formations, and faster attacks at low health.
- Escalating hordes, telegraphed radiation hazards, medical supplies, salvage drops, supply caches, and boss relics.
- Eight-minute extraction missions, endless survival, and a daily UTC seed with a fixed starting loadout and no bunker bonuses. Daily scores are local; there is no online leaderboard.
- Permanent research, operator and zone unlocks, three repeatable bounties, six achievements, and an archive of the last eight runs.
- Automatic run checkpoints and saved progression, with corrupted-save recovery.
- An installable PWA with offline precaching, maskable icons, device safe areas, and updates offered between runs. No external fonts, images, audio, or backend needed.

## Setup and commands

Requires Node.js 22.12+ and npm. From the repository directory:

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite (usually http://127.0.0.1:5173).

| Task                                       | Command           |
| ------------------------------------------ | ----------------- |
| Develop                                    | `npm run dev`     |
| Production build                           | `npm run build`   |
| Preview production / PWA                   | `npm run preview` |
| Test game rules, saves, and offline worker | `npm test`        |
| Format files                               | `npm run format`  |
| Check formatting                           | `npm run lint`    |

No environment variables, credentials, accounts, fixtures, or server are required. Tests use Node’s built-in test runner, including a deterministic ten-minute stress simulation.

## Controls and objectives

Drag anywhere on the field to move; drag slightly for slower movement. Use another finger to tap **Dash** or **Shockwave**. The same drag controls work with a mouse. Weapons automatically aim at the nearest enemy. The pause button freezes play; switching away from the app also pauses. Escape can toggle pause on desktop, but movement is entirely pointer-based.

Green cores award experience. Pick one upgrade at each level. Supply caches restore 15 health, award salvage, and pull cores closer. Medkits restore 35 health. Titan relics grant a bonus upgrade and salvage. Follow the on-field marker to the nearest cache or boss relic.

Titans arrive at **1:30**, **3:30**, and **6:30**. In extraction mode, the rescue beacon opens at **8:00**. Follow its cyan marker and hold inside it for eight seconds. Progress slowly decays when you step outside. Endless mode continues with stronger titans and has no rescue.

### Weapon evolutions

Reach weapon level five and obtain at least one rank of its matching mutation:

| Weapon           | Required mutation | Evolution                                              |
| ---------------- | ----------------- | ------------------------------------------------------ |
| Rustline carbine | Depleted uranium  | Railstorm: extra shots, faster fire, extra penetration |
| Arc coil         | Deadeye           | Thunder God: more chain targets and faster strikes     |
| Orbital saw      | Lead skin         | Death Halo: additional blades with faster rotation     |
| Rad bloom        | Unstable isotope  | Supernova: larger, more frequent bursts                |
| Scorched earth   | Hot rounds        | Hellfire: explosions leave burning ground              |

## Install and offline play

On iPhone/iPad, open the published game in Safari, tap **Share → Add to Home Screen**. On Android, use the in-game Install button when available, or **Install app** from the browser menu. Installation and fullscreen behavior depend on the browser. The app requests fullscreen display with standalone fallback; the in-game Settings screen also offers the Fullscreen API where supported.

The service worker precaches the production HTML, hashed JavaScript and CSS, manifest, and icons. After a complete online load, the production game can launch offline. Service workers only register in production, so test this with `npm run build` followed by `npm run preview`. Localhost is a permitted development origin; deployed installs use HTTPS.

New builds wait until activated by **Update** on the deployment screen or until all older app windows close. The worker retains the previous build’s assets to handle tabs crossing an update.

Progress lives in local browser storage on that device and origin. Runs checkpoint every five seconds, on level-up, on pause, and when the page closes. Reopened runs offer **Resume operation** and start paused (or at the pending upgrade choice). Starting a new operation replaces the previous checkpoint. Completed runs grant salvage once. Clearing site data removes progress; progress does not sync between devices, browsers, localhost, and the live site.

## Structure

- `src/content.js`: operator, zone, weapon, upgrade, enemy, research, and achievement definitions.
- `src/game.js`: browser-independent simulation, progression, abilities, AI, bosses, and extraction.
- `src/render.js`: procedural Canvas world, characters, effects, and touchstick drawing.
- `src/main.js`: menus, HUD, pointer input, audio, PWA installation, updates, and app lifecycle.
- `src/profile.js`: validated persistent progression, research purchases, and run settlement.
- `src/checkpoint.js`: validated resumable run snapshots, projectile hit sets, and random-state restoration.
- `src/style.css`: fullscreen and responsive overlays, safe areas, and accessibility preferences.
- `tests/`: game rules, progression, checkpoint, stress, and offline worker tests.
- `assets/`: Vite public directory; PWA manifest, icons, and screenshots. The current world and audio are procedural.
- `vite.config.js`: relative asset URLs and a build plugin generating a versioned precache worker.

## Automatic deployment

The GitHub Actions workflow in `.github/workflows/deploy.yml` installs locked dependencies, checks formatting, runs tests, and builds. Successful pushes to `main` automatically deploy `dist/` to GitHub Pages. Pull requests run the same checks without deploying. Manual deployment is also available from Actions.

GitHub Pages uses **GitHub Actions** as its source. Deployment permissions are restricted to the deploy job, using GitHub’s built-in token; no additional secrets are needed. Relative URLs keep both the site and PWA under `/nuclear-survivors/`.

## Current limits

Terrain is decorative and passable. There is no multiplayer, cloud sync, online leaderboard, or app-store package. Offline launch was verified by stopping the production server, reloading the cached app, and starting a run. Touch interaction has been checked in a browser viewport; physical iOS/Android installation, simultaneous multi-touch, battery use, and haptics still need device testing.
