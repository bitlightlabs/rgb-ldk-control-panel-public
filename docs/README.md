# rgb-ldk-control-panel docs

This directory contains project, release, and platform-specific notes for the desktop control panel.

## What this app is

`rgb-ldk-control-panel` is a Tauri desktop app that acts as a control plane for one host machine:

- Users can manage multiple nodes (each node typically runs in a container).
- The app provides a UI to view status, lock/unlock, and operate the node via its local control API.
- The app is not a web app and we are not building a browser extension for now.

## Tech stack

- Engine: Tauri 2.0 (Rust)
- Languages: TypeScript (frontend) + Rust (backend)
- Frontend framework: React 19
  - Reason: largest market share and hiring pool compared to Vue or Svelte
- State management: TanStack Query (React Query) + Zustand
  - Reason: TanStack Query for async server state; Zustand for local UI state
- Styling: Tailwind CSS
  - Reason: common modern frontend baseline; minimal training needed
- Component library: Shadcn UI or Ant Design (Desktop)
  - Reason: Shadcn for aesthetics and customization; AntD for admin-dashboard out-of-box
- Build tool: Vite
  - Reason: Tauri official default support and fast HMR
- Package manager: pnpm
  - Reason: smaller disk usage and stricter dependency management than npm

## Key decisions (current)

- Scope: local-only control plane for nodes on the same host.
- UI tech: Tauri.
- Default behavior: nodes must remain locked unless the user explicitly unlocks.
- Multi-node: UI supports switching contexts (node A, node B, ...), each with isolated credentials.
- Secrets: unlock passphrase is generated server-side; end users do not back it up and we avoid transmitting it.

## Documents

- [Project README](../README.md) — repository overview and development entry points
- [Contributing Guide](../CONTRIBUTING.md) — development setup, testing, and PR expectations
- [Security Policy](../SECURITY.md) — private vulnerability reporting guidance
- [Support Guide](../SUPPORT.md) — where to send support questions and issue reports
- [Release Workflow](../.github/RELEASE.md) — trigger conditions, CI jobs, and how to publish a release
- [macOS signing](./macos-signing.md) — local signing prerequisites and CI secrets used by the current workflow
