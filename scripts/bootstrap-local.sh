#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE_NAME="${COMPOSE_FILE_NAME:-docker-compose.yml}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT/$COMPOSE_FILE_NAME"
EXAMPLE_DIR="$ROOT/example"
NODE1_SECRETS="$EXAMPLE_DIR/node1/secrets"
NODE2_SECRETS="$EXAMPLE_DIR/node2/secrets"
NODE1_DATA="$EXAMPLE_DIR/node1/data"
NODE2_DATA="$EXAMPLE_DIR/node2/data"

if [[ "${NO_RESET:-0}" != "1" ]]; then
  echo "Resetting local docker + data (set NO_RESET=1 to skip)..."
  bash "$ROOT/scripts/reset-local.sh"
fi

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Missing compose file: $COMPOSE_FILE" >&2
  exit 1
fi

mkdir -p "$NODE1_SECRETS" "$NODE2_SECRETS" "$NODE1_DATA" "$NODE2_DATA"

make_token() {
  local path="$1"
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 32 >"$path"
  else
    python - <<'PY' >"$path"
import secrets, base64
print(base64.b64encode(secrets.token_bytes(32)).decode())
PY
  fi
}

make_token "$NODE1_SECRETS/http.token"
make_token "$NODE1_SECRETS/control-http.token"
make_token "$NODE1_SECRETS/keystore.passphrase"
make_token "$NODE2_SECRETS/http.token"
make_token "$NODE2_SECRETS/control-http.token"
make_token "$NODE2_SECRETS/keystore.passphrase"

chmod 700 "$NODE1_SECRETS" "$NODE2_SECRETS"
chmod 600 "$NODE1_SECRETS"/*.token "$NODE2_SECRETS"/*.token
chmod 600 "$NODE1_SECRETS"/keystore.passphrase "$NODE2_SECRETS"/keystore.passphrase

cat >"$EXAMPLE_DIR/contexts.json" <<CTX
{
  "version": 1,
  "contexts": [
    {
      "node_id": "alex",
      "display_name": "Alex",
      "main_api_base_url": "http://127.0.0.1:8501/",
      "main_api_token_file_path": "$NODE1_SECRETS/http.token",
      "control_api_base_url": "http://127.0.0.1:8551/",
      "control_api_token_file_path": "$NODE1_SECRETS/control-http.token",
      "data_dir": "$NODE1_DATA",
      "p2p_listen": "rgb-node-alice:9735",
      "allow_non_loopback": false
    },
    {
      "node_id": "bob",
      "display_name": "Bob",
      "main_api_base_url": "http://127.0.0.1:8602/",
      "main_api_token_file_path": "$NODE2_SECRETS/http.token",
      "control_api_base_url": "http://127.0.0.1:8653/",
      "control_api_token_file_path": "$NODE2_SECRETS/control-http.token",
      "data_dir": "$NODE2_DATA",
      "p2p_listen": "rgb-node-bob:9735",
      "allow_non_loopback": false
    }
  ]
}
CTX

CONFIG_DIR="$ROOT/.tmp/app-config"
DATA_DIR="$ROOT/.tmp/app-data"
mkdir -p "$CONFIG_DIR" "$DATA_DIR"
cp "$EXAMPLE_DIR/contexts.json" "$CONFIG_DIR/contexts.json"

echo "contexts.json copied to: $CONFIG_DIR/contexts.json"

echo "Starting docker compose (takes around 80 secs)..."
(
  cd "$ROOT"
  docker compose -f "$COMPOSE_FILE" up -d
)

echo "Docker services started."
echo "P2P is only exposed inside the docker network (see contexts.json p2p_listen)."

# Restart Tauri dev app if running from this repo.
PIDS=$(ps -ax -o pid=,command= | grep -E "${ROOT}.*(tauri dev|vite)" | grep -v grep | awk '{print $1}') || true
if [[ -n "${PIDS}" ]]; then
  echo "Stopping existing dev processes: ${PIDS}"
  while read -r pid; do
    [[ -n "$pid" ]] && kill "$pid" || true
  done <<<"${PIDS}"
  sleep 1
fi

LOG_FILE="$ROOT/.tmp/tauri-dev.log"
mkdir -p "$(dirname "$LOG_FILE")"

if command -v pnpm >/dev/null 2>&1; then
  echo "Starting Tauri dev (logs: $LOG_FILE)"
  RGB_LDK_CONTROL_PANEL_CONFIG_DIR="$CONFIG_DIR" \
  RGB_LDK_CONTROL_PANEL_DATA_DIR="$DATA_DIR" \
  nohup pnpm tauri dev >"$LOG_FILE" 2>&1 &
  disown || true
else
  echo "pnpm not found. Run 'pnpm tauri dev' manually with:" >&2
  echo "  RGB_LDK_CONTROL_PANEL_CONFIG_DIR=\"$CONFIG_DIR\" RGB_LDK_CONTROL_PANEL_DATA_DIR=\"$DATA_DIR\" pnpm tauri dev" >&2
fi
