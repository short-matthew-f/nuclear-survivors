# Nuclear Survivors

A top-down browser survival game set in a radioactive exclusion zone. Keep moving, let your carbine handle the infected, collect green cores, and mutate your loadout. Survive five minutes to extract.

## Setup and commands

Requires Node.js 22.12+ and npm. From the repository directory:

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite (usually http://127.0.0.1:5173).

| Task                     | Command           |
| ------------------------ | ----------------- |
| Develop                  | `npm run dev`     |
| Production build         | `npm run build`   |
| Preview production build | `npm run preview` |
| Test game rules          | `npm test`        |
| Format files             | `npm run format`  |
| Check formatting         | `npm run lint`    |

The production build is generated in `dist/` and can be served by any static web host. No server, accounts, credentials, or environment variables are required. Google Fonts are optional; system fonts are used if offline.

## How to play

- **WASD / arrow keys:** move. On a touchscreen, drag anywhere on the arena to move in that direction.
- Weapons automatically target the nearest enemy.
- Collect the green cores dropped by defeated enemies to gain experience.
- At each level, choose one of three randomly offered modifications. The game pauses while you choose.
- **Escape / P / pause button:** pause or resume. Switching tabs or losing focus also pauses the game.
- Sound is optional and starts muted. Enable it using the header button.
- Survive **05:00** to extract. If your health reaches zero, start a new run.
- Your longest survival time is saved locally in your browser when storage is available.

## Structure

- `src/game.js`: browser-independent simulation, upgrades, combat, and progression.
- `src/main.js`: Canvas rendering, input, audio, browser storage, and interface.
- `src/style.css`: responsive interface styles.
- `tests/game.test.js`: game-rule tests using Node's built-in test runner.
- `assets/`: reserved for future non-code assets. Current terrain and characters are drawn procedurally.

## Prototype scope

Includes one operator, one endless procedural zone, one automatic weapon, two enemy types, and six repeatable modifications. Decorative terrain is passable. There are no bosses, meta-progression, or online features yet.

## Automatic deployment

Play at [short-matthew-f.github.io/nuclear-survivors](https://short-matthew-f.github.io/nuclear-survivors/).

The GitHub Actions workflow in `.github/workflows/deploy.yml` installs locked dependencies, checks formatting, runs the tests, and builds the game. Every successful push to `main` automatically deploys `dist/` to GitHub Pages. Pull requests run the same checks without deploying. You can also run the workflow manually from the repository's Actions tab.

GitHub Pages must use **GitHub Actions** as its deployment source (Settings → Pages → Build and deployment). The workflow uses GitHub's built-in token with deployment permissions only on the deploy job; no additional secrets are required. Vite emits relative asset URLs so the game works under the repository's `/nuclear-survivors/` path and in local previews.
