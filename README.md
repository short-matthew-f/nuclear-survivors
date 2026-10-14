# Nuclear Survivors

A fullscreen, touch-first survival roguelite in a radioactive exclusion zone. Drag to move, let your weapons handle the infected, evolve your build, and bring salvage back to the bunker.

**[Play the game](https://short-matthew-f.github.io/nuclear-survivors/)**

## Field edition 1.6

- Edge-to-edge Canvas gameplay with a compact HUD. No page header, footer, sidebar, or keyboard movement.
- A floating analog thumbstick, multi-touch dash and selectable active abilities, automatic aiming, optional sound, and supported-device haptics.
- Six heroes: Nomad, Spark, Bastion, Morrow, Rook, and Vesper. Each has a signature weapon, a default active ability, and distinct passive traits. Recruitment includes the signature weapon and ability.
- Three unlockable sectors: Red Forest, The Drowned, and Dead Reactor, with different palettes, terrain decoration, atmosphere, and difficulty.
- Nine weapon families: Rustline carbine, Arc coil, Orbital saw, Rad bloom, Scorched earth mines, Cinder shotgun, Watchdog escorts, returning Scrap discus, and the Furnace flame cone. Each has five levels and a paired mutation that unlocks an evolution.
- Twenty-three upgrades with a directed build path: each level prioritizes your focused weapon, a mutation/evolution key, and a new weapon when a slot is available. New operations carry up to four weapon families. Two rerolls per run. Existing larger arsenals and pending choices are preserved.
- Ten regular enemy behaviors: shield-bearing riot husks, volatile bombers, telegraphed burrowers, and fungal healers join walkers, runners, brutes, ranged spitters, charging ravagers, and splitting brood.
- Three titan encounters, with projectile rings, targeted spreads, summons, radiation formations, and faster attacks at low health.
- Escalating hordes, telegraphed radiation hazards, medical supplies, salvage drops, supply caches, and boss relics.
- Eight-minute extraction missions, endless survival, and a daily UTC seed with a fixed starting loadout and no bunker bonuses. Daily scores are local; there is no online leaderboard.
- Permanent research, operator and zone unlocks, five field kits (four unlocked through achievements), three repeatable bounties, thirteen achievements, and an archive of the last eight runs.
- A five-chapter campaign with mission briefings, distinct required objectives, first-clear rewards, sector unlocks, and a story ending. Signals return until required rescues or relays are completed.
- Optional survivor rescues, relay restoration, and elite-guarded convoys. Each has a timed signal, a proximity objective, and distinct rewards.
- Elite enemies, temporary overdrive, shield and vacuum pickups, a field radar, and a one-time overtime commitment for four extra minutes and 75% bonus salvage.
- Original illustrated key art, nineteen hero/enemy/titan sprites plus a sentry sprite, eight environment props, and three painted ground textures. Source artwork and generation prompts are in `assets/art/`.
- Five active abilities: Shockwave, Field mend, Overclock, Cryo field, and Sentry. Equip one alongside Dash. Abilities, weapon blueprints, and six heroes can be unlocked permanently with salvage. Eight research tracks improve later operations.
- A procedural ambient score and weapon sounds, left-handed abilities, optional damage numbers and radar, and high/low rendering settings.
- Local daily best-score archive and export/import backups with replacement confirmation.
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

No environment variables, credentials, accounts, fixtures, or server are required. Tests use Node’s built-in test runner, including deterministic ten- and twenty-minute stress simulations, campaign objective gates, reward accounting, and migration of earlier saves.

## Controls and objectives

Drag anywhere on the field to move; drag slightly for slower movement. Use another finger to tap **Dash** or your equipped active ability. Change that ability and your starting weapon under Heroes → select a hero → Loadout. The same drag controls work with a mouse. Weapons automatically aim at the nearest enemy. The pause button freezes play; switching away from the app also pauses. Escape can toggle pause on desktop, but movement is entirely pointer-based.

The bunker offers ten field challenges as free alternatives to scrap purchases. It also sells hero recruitment, weapon blueprints, active abilities, and permanent research. Weapon unlocks enter future operations’ level-up pools and can be equipped as a starting weapon. Recruitment grants its listed signature weapon and ability, usable by your other heroes too. Earlier saves retain all seven old weapons and recruited heroes receive their signature abilities; current saved operations keep their original Shockwave and weapon pool. New profiles begin with Rustline, Orbital saw, and Rad bloom.

Green cores award experience. Pick one upgrade at each level. Weapon ranks change volley patterns, escort/blade counts, penetration, mine clusters, range, or firing cadence. Cards preview the exact next pattern and show the evolution key. Choosing a weapon makes it your focus for subsequent offers. Weapon upgrades reset their fire timer, and evolutions produce a visible transformation burst. Supply caches restore 15 health, award salvage, and pull cores closer. Medkits restore 35 health. Titan relics grant salvage and a choice of a rare run-changing relic. These choices pause the operation and are preserved in checkpoints. Follow the on-field marker to extraction, an active field event, a boss relic, or a supply cache. Enter an event’s marked circle and hold there until its progress fills; convoys require clearing their elite guards first.

Titans arrive at **1:30**, **3:30**, and **6:30**. In extraction mode, the rescue beacon opens at **8:00**. Follow its cyan marker and hold inside it for eight seconds. Progress slowly decays when you step outside. Endless mode continues with stronger titans and has no rescue. Story mode also requires the chapter’s listed rescue, relay, or titan objectives before extraction can open. Missing mission signals are offered again. When the beacon opens, Overtime offers a full heal and four more minutes for 75% extra run salvage; this commitment is available once and is disabled in daily challenges.

### Weapon evolutions

Reach weapon level five and obtain at least one rank of its matching mutation:

| Weapon           | Required mutation | Evolution                                                    |
| ---------------- | ----------------- | ------------------------------------------------------------ |
| Rustline carbine | Depleted uranium  | Railstorm: extra shots, faster fire, extra penetration       |
| Arc coil         | Deadeye           | Thunder God: more chain targets and faster strikes           |
| Orbital saw      | Lead skin         | Death Halo: additional blades with faster rotation           |
| Rad bloom        | Unstable isotope  | Supernova: larger, more frequent bursts                      |
| Scorched earth   | Hot rounds        | Hellfire: explosions leave burning ground                    |
| Cinder shotgun   | Split chamber     | Extinction: more pellets, penetration, and faster fire       |
| Scrap discus     | Adrenal glands    | Reaper wheel: additional returning blades and faster volleys |
| Furnace          | Unstable isotope  | Solar wind: wider, longer, faster flame cones                |
| Watchdog         | Hair trigger      | Wolfpack: additional escorts with faster fire                |

## Install and offline play

On iPhone/iPad, open the published game in Safari, tap **Share → Add to Home Screen**. On Android, use the in-game Install button when available, or **Install app** from the browser menu. Installation and fullscreen behavior depend on the browser. The app requests fullscreen display with standalone fallback; the in-game Settings screen also offers the Fullscreen API where supported.

The service worker precaches the production HTML, hashed JavaScript and CSS, manifest, icons, and all five artwork files. After a complete online load, the production game can launch offline. Service workers only register in production, so test this with `npm run build` followed by `npm run preview`. Localhost is a permitted development origin; deployed installs use HTTPS.

New builds wait until activated by **Update** on the deployment screen or until all older app windows close. The worker retains the previous build’s assets to handle tabs crossing an update.

Progress lives in local browser storage on that device and origin. Runs checkpoint every five seconds, on level-up, on pause, and when the page closes. Reopened runs offer **Resume operation** and start paused (or at the pending upgrade choice). Starting a new operation explicitly asks before replacing the previous checkpoint. Completed runs grant salvage once. Settings offers **Export Save** and **Restore Backup** for manual transfer; restoring explicitly asks before replacing current progression. Existing v2 progression and version-one run checkpoints migrate automatically. Clearing site data removes progress; progress does not sync between devices, browsers, localhost, and the live site.

## Structure

- `src/content.js`: operator, zone, weapon, upgrade, enemy, research, and achievement definitions.
- `src/build.js`: shared weapon patterns, rank identities, upgrade previews, evolution paths, and weapon-slot limits.
- `src/game.js`: browser-independent simulation, progression, abilities, AI, bosses, and extraction.
- `src/abilities.js`: active abilities, temporary overclock, and deployable sentries.
- `src/enemy-behavior.js`: encounter selection, shields, bomber warnings, burrowing, healing, freeze and burn status behavior.
- `src/expedition.js`: field events, elite conversion, mission objectives, and overtime.
- `src/art.js`: absolute artwork URLs shared by CSS and Canvas under the Pages project scope.
- `src/audio.js`: procedural score and sound synthesis, unlocked by the first user gesture.
- `src/render.js`: Canvas world, illustrated sprite/prop atlas sampling, terrain patterns, radar, effects, and touchstick drawing.
- `src/main.js`: menu routing, HUD, pointer input, audio, PWA installation, updates, and app lifecycle.
- `src/presentation.js`: pure menu rendering, hero pages, mission preparation, and debriefs.
- `src/menu-model.js`: validated deployment selections, loadout summaries, goals, and research comparisons.
- `src/menu.js`: per-view scroll, disclosure, and focus restoration.
- `src/profile.js`: validated persistent progression, research purchases, and run settlement.
- `src/checkpoint.js`: validated resumable run snapshots, projectile hit sets, and random-state restoration.
- `src/style.css`: fullscreen and responsive overlays, safe areas, and accessibility preferences.
- `tests/`: game rules, progression, checkpoint, stress, and offline worker tests.
- `assets/`: Vite public directory; PWA manifest, icons, screenshots, original artwork, and generation prompts. Audio is synthesized locally.
- `vite.config.js`: relative asset URLs and a build plugin generating a versioned precache worker.

## Automatic deployment

The GitHub Actions workflow in `.github/workflows/deploy.yml` installs locked dependencies, checks formatting, runs tests, and builds. Successful pushes to `main` automatically deploy `dist/` to GitHub Pages. Pull requests run the same checks without deploying. Manual deployment is also available from Actions.

GitHub Pages uses **GitHub Actions** as its source. Deployment permissions are restricted to the deploy job, using GitHub’s built-in token; no additional secrets are needed. Relative URLs keep both the site and PWA under `/nuclear-survivors/`.

## Current limits

Terrain props are decorative and passable; this is an open-arena survival game. Character artwork uses single painted poses with procedural movement, hit feedback, and ability effects. There is no multiplayer, cloud sync, online leaderboard, or app-store package. Offline launch was verified by stopping the production server, reloading the cached app, and starting a run. Touch interaction has been checked in a browser viewport; physical iOS/Android installation, simultaneous multi-touch, battery use, and haptics still need device testing.

### Field unlocks

Records → Goals shows requirements, saved progress, and rewards. Hero pages and Bunker → Armory also explain free unlock routes beside their alternative scrap prices. Feats are banked automatically when an operation ends, even on defeat; a feat never requires a second purchase. Hero rewards include their signature weapon and ability for all heroes. Previously purchased content stays owned. Existing achievements, best survival time, recent records, and enemy kill totals credit old saves; unrecorded weapon ranks are not guessed. Daily operations retain their fixed loadout while still contributing to field feats.

| Free reward                          | Field feat                                  |
| ------------------------------------ | ------------------------------------------- |
| Spark + Arc coil + Overclock         | Reach Rad bloom rank 3 in one operation     |
| Bastion                              | Defeat a titan                              |
| Morrow + Field mend                  | Complete a survivor rescue                  |
| Rook + Watchdog + Sentry             | Carry four weapon families                  |
| Vesper + Cinder shotgun + Cryo field | Defeat 50 Strays across operations          |
| Arc coil                             | Defeat 100 infected in one operation        |
| Scorched earth                       | Survive two minutes in one operation        |
| Scrap discus                         | Evolve a weapon                             |
| Furnace                              | Defeat 20 Cinder blisters across operations |
| Cryo field                           | Defeat 20 Graveclaws across operations      |

Design research and rationale: [docs/unlock-design.md](docs/unlock-design.md). `src/unlocks.js` owns the shared definitions, reward bundles, progress migration, and settlement rules.

Menu selections, equipment changes, purchases, and settings retain the current scroll position. Each screen and category remembers its position and expanded disclosures when you return; first visits start at the top. Menu DOM replacement is owned by `src/menu.js`; regression tests are in `tests/menu.test.js`.

### Mastery, titans, relics, and expeditions (1.4)

Heroes → select a hero → Mastery tracks each recruited hero separately. Survive two minutes with that hero to earn its first signature branch and alternate starting weapon; complete Fieldcraft and use the hero's signature ability eight times across operations to earn its second branch. Extract once as that hero to earn a cosmetic Veteran ember cape and color treatment. Progress is awarded when the operation ends, even on defeat. Selecting a branch equips the corresponding signature ability. Borrowed abilities retain their standard behavior. Previous records did not store hero identity or ability uses, so mastery begins with operations completed after this update; earlier ownership and scrap are preserved.

| Hero    | First branch            | Second branch                      | Alternate weapon |
| ------- | ----------------------- | ---------------------------------- | ---------------- |
| Nomad   | Repulsor knockback      | Demolition: smaller, harder blast  | Cinder shotgun   |
| Spark   | Chain reactor lightning | Redline: shorter, faster Overclock | Furnace          |
| Bastion | Bulwark protection      | Siegebreaker: concentrated blast   | Scrap discus     |
| Morrow  | Fallout medic radiation | Sanctuary healing field            | Scorched earth   |
| Rook    | Mobile swarm            | Stationary piercing siege battery  | Furnace          |
| Vesper  | Shatter explosions      | Permafrost field                   | Scrap discus     |

All three titans now have three health-based phases and visible attack warnings. The Groundskeeper alternates charges and slams; Mother of Spores uses summons, fans, and spore blooms; the Reactor Heart uses beam lanes and meltdown formations. Attached anchors, nests, and capacitors have separate health bars and can be targeted by weapons. Breaking a part interrupts the current attack and exposes the core for five seconds. Removing every part permanently exposes it. Parts reduce charging speed, summoning capacity, or beam count as appropriate. Parts grant salvage without counting as infected kills.

Six relics last for one operation and never consume weapon slots: Wildfire seed spreads burning deaths, Icebreaker bursts frozen kills, Fractal bearings split returning blades, Blood circuit heals from kills with a rate limit, Afterimage leaves damaging dash pools, and Salvage heart reduces ability cooldowns through pickups. Only compatible unowned relics are offered. If no compatible effects remain, the pickup grants Overdrive instead. Relic choices queue safely alongside normal level-up choices. Installed effects are listed in the pause menu and the Codex.

The field director rotates six events within an eight-minute operation. The original rescue, relay, and guarded convoy remain, including campaign objective priority. New moving convoys require staying near the truck through ambushes; survivor defense requires protecting a group and clearing three waves; reactor shutdown requires disabling three terminals and holding final containment. Convoys and survivor groups have destructible health, all signals expire, and rewards pay once only on completion. New events award a relic and 70–90 scrap; rescued groups also restore health and count toward rescue objectives.

`src/mastery.js` owns per-hero progression, styles, and branch cooldowns. `src/bosses.js` owns titan patterns, parts, and beam geometry. `src/relics.js` owns the relic catalog, drafts, and combat hooks. `tests/field-depth.test.js` covers these systems and their migrations. For repeatable visual checks, run `npm run dev` and open `/tests/fixtures/field-scenes.html`; this fixture does not read or write saves and is not part of the production build.

## Mobile presentation (1.5)

Four stable destinations organize preparation: **Deploy**, **Heroes**, **Bunker**, and **Records**. Deploy summarizes the actual next operation with a persistent launch/resume action. Heroes own their Loadout, Mastery path, and Appearance. Bunker contains shared Research and Armory; unlocking shared gear never silently changes a hero's equipment. Records contains the Archive, Goals, and expandable Codex. Settings returns to its opening context and stays within a paused operation.

Hero, mission, difficulty, zone, and chapter choices persist across reloads in the existing v2 profile. Locked heroes and sectors open details before an explicit scrap purchase. Research shows current and next bonuses. Debriefs show the complete scrap award, with secondary details collapsed and a direct retry/continue action.

The supplied mobile UX handbook informed this revision. See [the design and verification notes](docs/mobile-ux-review.md) for scope, screenshots, and device-testing limits.

## Combat presentation (1.6)

Level-up and relic choices use compact comparable cards. Weapon cards retain exact simulation previews; evolution requirements expand on demand. The combat HUD prioritizes health, cooldowns, time, and one objective: extraction, a required active story event, a titan, an optional event, or the next story goal. Kills, arsenal details, and bounties remain available in pause.

Enemy warnings use dashed outlines, active danger solid coral outlines, and patterned areas drawn over weapon effects. Enemy projectiles use pointed silhouettes. The survivor stays visible when hit; a local ring, source-direction marker, and brief HP-loss message distinguish received damage. Defeats include the recorded final source and an avoidance tip when known. Earlier checkpoints keep valid progression and do not invent missing hit history.

Resuming starts a three-second orientation countdown while simulation stays paused. **Resume now** skips it; **Stay paused** cancels it. Backgrounding cancels the countdown. New operations and upgrade selection resume normally.

`src/combat-ux.js` owns choice rendering, objective priority, and the UI-only resume clock. `src/damage.js` normalizes damage records and explanations; `src/threat-render.js` draws the late danger/received-hit layer. `tests/combat-ux.test.js` verifies collision attribution, revival/immunity, checkpoint migration, objective priority, and frozen resume timing. For visual checks, open `/tests/fixtures/combat-ux.html` during local development; this fixture never accesses saves and is excluded from the production build.
