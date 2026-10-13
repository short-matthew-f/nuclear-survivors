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
