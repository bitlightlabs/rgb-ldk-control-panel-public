# rgb-ldk-control-panel

Desktop control plane for managing one or more local `rgbldkd` nodes running as containers on the same host.

This repository contains the desktop UI, local development helpers, and release packaging for the control panel.

## Current scope

- Tauri desktop app with a React + TypeScript frontend and a Rust backend
- Multi-node context management for local or locally reachable `rgbldkd` instances
- Local regtest workflow for development, demos, and end-to-end testing
- Packaging and release automation for macOS, Linux, and Windows

## Status

The project is under active development. Interfaces, flows, and local setup tooling may continue to evolve between releases.

## Tech stack

- Tauri 2.0 (Rust) + React 19 (TypeScript)
- TanStack Query + Zustand
- Tailwind CSS
- Shadcn UI
- Vite + pnpm

## Repository layout

- `src/`: frontend application code
- `src-tauri/`: Tauri backend, packaging, and desktop capabilities
- `scripts/`: local development and regtest helper scripts
- `docs/`: project, release, and platform-specific documentation
- `e2e-tests/`: end-to-end tests and WebdriverIO configuration

## Development

Prereqs:

- Rust toolchain
- Node.js + pnpm
- Docker Desktop or Docker Engine with Compose v2 for local regtest flows

Quick start (local regtest):

- Read `GET-STARTED.md`
- `pnpm install`
- `./scripts/bootstrap-local.sh`

Run UI only:

- `pnpm install`
- `pnpm tauri dev`

Build the frontend bundle:

- `pnpm build`

Run end-to-end tests:

- `pnpm test:e2e`

## Environment variables

The frontend reads build-time configuration from Vite `VITE_*` environment variables. Supported variables are documented in [`.env.example`](./.env.example).

Keep environment-specific values in local `.env` files or CI/CD secrets, not in committed docs or screenshots.

## Notes

- Node APIs are provided by `rgbldkd` over its HTTP interfaces.
- This UI intentionally does not accept unlock passphrases; `Unlock` calls `POST /control/unlock` with `{}` (server-managed passphrase only).

## Documentation

- [`GET-STARTED.md`](./GET-STARTED.md): local regtest setup and common workflows
- [`CONTRIBUTING.md`](./CONTRIBUTING.md): development workflow and pull request expectations
- [`SECURITY.md`](./SECURITY.md): private vulnerability reporting guidance
- [`SUPPORT.md`](./SUPPORT.md): where to send bugs, feature requests, and support questions
- [`.github/RELEASE.md`](./.github/RELEASE.md): release pipeline behavior and publishing steps

## License

Dual-licensed under either MIT or Apache-2.0, at your option.
