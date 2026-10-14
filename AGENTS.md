# Repository Guidelines

## Project Structure & Module Organization

This repository has no source code, tests, or assets yet. When adding the first implementation, keep application code in `src/`, automated tests in `tests/`, and non-code assets in `assets/`. Group related files by feature, and document any different layout in this guide.

## Build, Test, and Development Commands

No build system or run command is configured. Add a project-level README with exact setup and local run commands alongside the first implementation. Provide one repeatable command for each supported task: build, test, and formatting or linting. Avoid instructions that depend on an uncommitted local setup.

## Coding Style & Naming Conventions

Follow the conventions of the language and framework selected for the project. Keep formatting automated: commit the formatter configuration and include its command in the README. Use descriptive names for modules and functions; keep filenames consistent within each directory. Prefer small, focused changes over unrelated cleanup.

## Testing Guidelines

No test framework or coverage target is established. Add tests with new behavior and bug fixes, placing them in `tests/` or the framework's standard test location. Name tests for the behavior they verify, such as `test_player_takes_damage`. Document how to run the full suite and any required test fixtures or environment variables.

## Commit & Pull Request Guidelines

There is no Git history in this directory from which to infer a commit convention. Use short, imperative commit subjects that describe the change, such as `Add player movement`. Keep pull requests focused and include a summary, verification steps, and links to relevant issues. Include screenshots or a short recording when a change affects visible behavior.

## Configuration & Secrets

Do not commit credentials or machine-specific settings. Provide example configuration files for required values and document each variable in the README.

## Current Implementation

The initial game is a vanilla JavaScript Canvas application built with Vite. Application code is in `src/`, Node test-runner tests are in `tests/`, and future non-code assets belong in `assets/`. Use `npm ci` to install, `npm run dev` to develop, `npm run build` to build, `npm test` to test, `npm run format` to format, and `npm run lint` to check formatting. See README.md for controls and full setup instructions.

## Expanded Game (Field Build 0.2)

Keep simulation and content definitions browser-independent (`src/game.js`, `src/content.js`). Rendering belongs in `src/render.js`; menus, audio, and touch input in `src/main.js`. Progression persistence is in `src/profile.js`, and resumable operations in `src/checkpoint.js`. `assets/` is Vite's public directory and contains the PWA manifest and icons. The build plugin in `vite.config.js` generates the service worker. Do not register a worker during development, add external runtime asset dependencies, or introduce keyboard movement. Verify changes to saves, abilities, progression, or PWA behavior with meaningful tests in `tests/`. Gameplay fills the viewport; menus and essential controls overlay the arena.

## Field Edition 1.0

`src/expedition.js` owns field events, elite conversion, campaign objective queries, and overtime. `src/audio.js` synthesizes the score and effects after a user gesture. Campaign chapters, difficulties, field kits, and evolution requirements are defined in `src/content.js`. Preserve v2 profile and version-one checkpoint migration. The four original raster assets in `assets/art/` use regular atlases; their layouts and exact generation prompts are documented there. Add any new runtime public asset to both precache and content hashing in `vite.config.js`. Do not silently replace saves or remove the backup restoration confirmation.

## Upgrade Design (Field Edition 1.1)

`src/build.js` is the shared source of truth for weapon patterns used by simulation, rendering, and card previews. Keep those three consumers in agreement. New offers cap arsenals at four weapon families and preserve the focused weapon/evolution path. Preserve older pending choices and larger saved arsenals. Test weapon-pattern changes and offer generation in `tests/build.test.js`.

## Roster and Armory (Field Edition 1.2)

`src/abilities.js` handles the equipped active ability and sentries; `activateNova` remains a compatibility entry point. `src/enemy-behavior.js` owns encounter selection and special enemy/status updates. Profiles track weapon/ability ownership and per-hero starting loadouts. Hero recruitment grants signature gear. Keep pre-1.2 profiles’ seven weapon families and existing operations’ Shockwave/weapon pool during migration. `assets/art/roster.png` adds a 4-by-2 atlas and must remain in the offline worker precache and hash inputs.

## Field Unlocks

`src/unlocks.js` owns challenge definitions, ownership queries, reward bundles, and saved progress migration. Challenges are free alternatives to existing scrap purchases, never extra gates. Award them once at run settlement, preserve previously owned content, and credit only historical feats supported by saved records. Keep single-operation bests separate from cumulative enemy hunts. Changes require progression and migration tests in `tests/unlocks.test.js`.

## Field Systems (1.4)

`src/mastery.js` owns per-hero mastery, branch/style validation, and branch cooldowns. Signature branches apply only to that hero's signature ability; daily runs use standard branches and field outfits. `src/bosses.js` owns titan health phases, telegraphs, breakable parts, and beam geometry. `src/relics.js` owns compatible relic drafts, queues, and kill hooks. Preserve pending relic drafts alongside level-up offers, and keep burst hooks bounded to prevent recursive shatter chains. Checkpoint version one and profile version two remain supported with optional field migration. New event staging lives in `src/expedition.js`; keep existing campaign signal priority and old active events valid. Verify these interactions in `tests/field-depth.test.js` and the twenty-minute simulation. The manual renderer fixture in `tests/fixtures/field-scenes.html` is local development only and never accesses saves.

## Mobile Presentation (1.5)

`src/presentation.js` owns pure menu markup; `src/menu-model.js` owns deployment validation, loadout summaries, goals, and research comparisons. `src/main.js` routes four destinations (Deploy, Heroes, Bunker, Records) and contextual subpages. Hero Loadout/Mastery/Appearance are separate from shared Bunker Research/Armory. Keep unlock and equip actions distinct. `src/menu.js` retains scroll, disclosures, and focus per view. Optional deployment fields must never invalidate older profiles. Test these behaviors in `tests/presentation.test.js` and `tests/menu.test.js`.

## Combat Presentation (1.6)

`src/combat-ux.js` owns upgrade/relic markup, primary objective priority, and the resume gate. Countdown orientation is UI-only; keep the simulation paused and cancel on backgrounding. `src/damage.js` owns normalized last-hit/fatal-hit records; attribute actual collision sources and never guess missing historical damage. Normalize optional hit fields during checkpoint migration. `src/threat-render.js` draws danger after weapon effects and local received-hit feedback. Keep visual warning geometry consistent with collision geometry. Verify changes in `tests/combat-ux.test.js`; `tests/fixtures/combat-ux.html` is a save-free development fixture only.
