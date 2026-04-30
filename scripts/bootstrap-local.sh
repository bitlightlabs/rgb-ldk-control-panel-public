#!/usr/bin/env bash
set -euo pipefail

export VITE_REGTEST_API=http://host.docker.internal:3003
COMPOSE_FILE_NAME="${COMPOSE_FILE_NAME:-docker-compose-local.yml}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT/$COMPOSE_FILE_NAME"

echo "1. Starting docker compose..."
(
  cd "$ROOT"
  docker compose -f "$COMPOSE_FILE" up -d
)

echo "Docker services started."

echo "2. Starting Tauri dev..."

if command -v pnpm >/dev/null 2>&1; then
  nohup pnpm tauri dev 2>&1 &
  disown || true
else
  echo "pnpm not found. Run 'pnpm tauri dev' manually with:" >&2
fi
