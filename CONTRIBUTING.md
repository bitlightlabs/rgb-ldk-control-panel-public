# Contributing

Thanks for helping improve `rgb-ldk-control-panel`.

## Before you start

- Read [`README.md`](./README.md) for the project overview.
- Read [`GET-STARTED.md`](./GET-STARTED.md) if you need the local regtest environment.
- Keep changes focused. Avoid mixing unrelated fixes in a single pull request.

## Development setup

- Install prerequisites: Node.js + `pnpm`, and Rust toolchain (for Tauri dev).
- Install deps: `pnpm install`
- Build web assets: `pnpm build`
- Run the desktop app: `pnpm tauri dev`

Build-time frontend variables are documented in [`.env.example`](./.env.example). Keep real environment-specific values in local `.env` files or CI secrets.

## Local regtest environment

See `GET-STARTED.md`. The repo provides scripts to bootstrap a two-node regtest setup with Docker Compose:

- `./scripts/bootstrap-local.sh`
- `./scripts/reset-local.sh`
- `./scripts/fund-local.sh`
- `./scripts/mine-local.sh 6`

Note: the bootstrap flow generates local token files and node data under `example/` and `.tmp/` which are gitignored. Do not commit secrets.

## Tests

- End-to-end tests (requires Docker): `pnpm test:e2e`
- Frontend build smoke test: `pnpm build`

If tests fail due to leftover local state, try `./scripts/reset-local.sh` and re-run.

## Pull requests

- Keep PRs focused and small.
- Prefer adding/adjusting documentation for user-visible changes.
- If you touch the Docker Compose or scripts, verify `./scripts/bootstrap-local.sh` still works end-to-end.
- Do not commit secrets, token files, passphrases, or environment-specific screenshots/logs.
- Call out release-note-worthy changes in the PR description.
