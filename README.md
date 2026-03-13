# rgb-ldk-control-panel

Desktop control plane for managing one or more local `rgbldkd` nodes running as containers on the same host.

Status: WIP.

## Tech stack (planned)

- Tauri 2.0 (Rust) + React 19 (TypeScript)
- TanStack Query + Zustand
- Tailwind CSS
- Shadcn UI
- Vite + pnpm

## Dev

Prereqs:

- Rust toolchain
- Node.js + pnpm

Quick start (local regtest):

- Read `GET-STARTED.md`
- `pnpm install`
- `./scripts/bootstrap-local.sh`

Run UI only:

- `pnpm install`
- `pnpm tauri dev`

## Notes

- Node APIs are provided by `rgbldkd` (see the upstream node project's HTTP API docs). A future change will source DTOs + docs from `rgb-ldk-api` as a submodule.
- This UI intentionally does not accept unlock passphrases; `Unlock` calls `POST /control/unlock` with `{}` (server-managed passphrase only).

## License

Dual-licensed under either MIT or Apache-2.0, at your option.
