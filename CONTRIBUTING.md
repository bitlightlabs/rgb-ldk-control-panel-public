# Contributing

Thanks for helping improve `rgb-ldk-control-panel`.

## Development setup

- Install prerequisites: Node.js + `pnpm`, and Rust toolchain (for Tauri dev).
- Install deps: `pnpm install`
- Build web assets: `pnpm build`
- Run the desktop app: `pnpm tauri dev`

## Local regtest environment

See `GET-STARTED.md`. The repo provides scripts to bootstrap a two-node regtest setup with Docker Compose:

- `./scripts/bootstrap-local.sh`
- `./scripts/reset-local.sh`
- `./scripts/fund-local.sh`
- `./scripts/mine-local.sh 6`

Note: the bootstrap flow generates local token files and node data under `example/` and `.tmp/` which are gitignored. Do not commit secrets.

## Tests

- End-to-end tests (requires Docker): `pnpm test:e2e`

If tests fail due to leftover local state, try `./scripts/reset-local.sh` and re-run.

## Pull requests

- Keep PRs focused and small.
- Prefer adding/adjusting documentation for user-visible changes.
- If you touch the Docker Compose or scripts, verify `./scripts/bootstrap-local.sh` still works end-to-end.
