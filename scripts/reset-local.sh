#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT/docker-compose.yml"
EXAMPLE_DIR="$ROOT/example"
CONFIG_DIR="${RGB_LDK_CONTROL_PANEL_CONFIG_DIR:-$ROOT/.tmp/app-config}"
DATA_DIR="${RGB_LDK_CONTROL_PANEL_DATA_DIR:-$ROOT/.tmp/app-data}"

HARD_RESET=0
if [[ "${1:-}" == "--hard" || "${HARD_RESET:-0}" == "1" ]]; then
  HARD_RESET=1
fi

echo "Stopping docker compose + removing volumes..."
if [[ -f "$COMPOSE_FILE" ]]; then
  (cd "$ROOT" && docker compose -f "$COMPOSE_FILE" down ${HARD_RESET:+-v} --remove-orphans) || true
fi

echo "Cleaning node data, secrets + consignments (keeps bitcoin_data volume unless --hard)..."
rm -rf "$EXAMPLE_DIR/node1/data" "$EXAMPLE_DIR/node2/data"
if [[ "$HARD_RESET" == "1" ]]; then
  echo "Removing secrets as well..."
  rm -rf "$EXAMPLE_DIR/node1/secrets" "$EXAMPLE_DIR/node2/secrets"
fi

rm -rf "$EXAMPLE_DIR/consignments"
mkdir -p "$EXAMPLE_DIR/consignments"

rm -rf "$CONFIG_DIR" "$DATA_DIR"
mkdir -p "$CONFIG_DIR" "$DATA_DIR"

echo "Reset complete."
