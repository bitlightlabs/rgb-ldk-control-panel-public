#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_DIR="${RGB_LDK_CONTROL_PANEL_CONFIG_DIR:-$ROOT/.tmp/app-config}"
CONTEXTS_PATH="${CONTEXTS_PATH:-$CONFIG_DIR/contexts.json}"
FUND_AMOUNT_BTC="${FUND_AMOUNT_BTC:-1.0}"

if [[ ! -f "$CONTEXTS_PATH" ]]; then
  echo "contexts.json not found: $CONTEXTS_PATH" >&2
  exit 1
fi

bitcoin_cli() {
  if [[ -n "${BITCOIND_RPC:-}" ]]; then
    local hostport="$BITCOIND_RPC"
    local user="${BITCOIND_RPC_USER:-btcuser}"
    local pass="${BITCOIND_RPC_PASSWORD:-btcpass}"
    bitcoin-cli -regtest -rpcconnect="${hostport%%:*}" -rpcport="${hostport##*:}" -rpcuser="$user" -rpcpassword="$pass" "$@"
    return
  fi

  local container="${BITCOIND_CONTAINER:-}"
  if [[ -z "$container" ]]; then
    container=$(docker ps --format '{{.Names}}' | grep -iE 'bitcoind|bitcoin' | head -n 1 || true)
  fi
  if [[ -n "$container" ]]; then
    docker exec -i "$container" bitcoin-cli -regtest -rpcuser=btcuser -rpcpassword=btcpass "$@"
    return
  fi

  local host="127.0.0.1"
  local port="18443"
  local user="${BITCOIND_RPC_USER:-btcuser}"
  local pass="${BITCOIND_RPC_PASSWORD:-btcpass}"
  if bitcoin-cli -regtest -rpcconnect="$host" -rpcport="$port" -rpcuser="$user" -rpcpassword="$pass" getblockchaininfo >/dev/null 2>&1; then
    bitcoin-cli -regtest -rpcconnect="$host" -rpcport="$port" -rpcuser="$user" -rpcpassword="$pass" "$@"
    return
  fi

  echo "No BITCOIND_RPC or bitcoind container found, and localhost RPC 127.0.0.1:18443 is unreachable." >&2
  echo "Set BITCOIND_RPC=host:port and BITCOIND_RPC_USER/PASSWORD, or BITCOIND_CONTAINER." >&2
  exit 1
}

get_node_addrs() {
  python3 - <<PY
import json
with open("$CONTEXTS_PATH", "r") as f:
    data = json.load(f)
for ctx in data.get("contexts", []):
    node_id = ctx.get("node_id")
    base = ctx.get("main_api_base_url")
    token_path = ctx.get("main_api_token_file_path")
    if not node_id or not base:
        continue
    print(f"{node_id}|{base}|{token_path or ''}")
PY
}

fetch_address() {
  local base="$1"
  local token_path="$2"
  local endpoint="$3"
  local url="${base%/}${endpoint}"
  local auth=()
  if [[ -n "$token_path" && -f "$token_path" ]]; then
    local token
    token=$(tr -d '\n' <"$token_path")
    auth=(-H "Authorization: Bearer $token")
  fi
  local resp
  resp=$(curl -sS -X POST "${auth[@]}" "$url")
  python3 - <<'PY' "$resp"
import json, sys
raw = sys.argv[1]
try:
    data = json.loads(raw)
    addr = data.get("address")
    if not addr:
        raise ValueError("missing address")
    print(addr)
except Exception as e:
    print(f"error: {e}: {raw}", file=sys.stderr)
    sys.exit(1)
PY
}

nodes=()
while IFS= read -r line; do
  [[ -z "$line" ]] && continue
  nodes+=("$line")
done < <(get_node_addrs)
if [[ ${#nodes[@]} -lt 1 ]]; then
  echo "No nodes found in contexts.json" >&2
  exit 1
fi

addrs=()
rgb_addrs=()
for line in "${nodes[@]}"; do
  IFS='|' read -r node_id base token_path <<<"$line"
  addr=$(fetch_address "$base" "$token_path" "/api/v1/wallet/new_address")
  rgb_addr=$(fetch_address "$base" "$token_path" "/api/v1/rgb/new_address")
  echo "${node_id}: wallet=${addr} rgb=${rgb_addr}"
  addrs+=("$addr")
  rgb_addrs+=("$rgb_addr")
  if [[ ${#addrs[@]} -ge 2 && ${#rgb_addrs[@]} -ge 2 ]]; then
    break
  fi
done

if [[ ${#addrs[@]} -lt 2 || ${#rgb_addrs[@]} -lt 2 ]]; then
  echo "Need at least 2 nodes to fund. Found ${#addrs[@]}." >&2
  exit 1
fi

for addr in "${addrs[@]}"; do
  bitcoin_cli sendtoaddress "$addr" "$FUND_AMOUNT_BTC" >/dev/null
  echo "Funded ${addr} with ${FUND_AMOUNT_BTC} BTC"
  done

for addr in "${rgb_addrs[@]}"; do
  bitcoin_cli sendtoaddress "$addr" "$FUND_AMOUNT_BTC" >/dev/null
  echo "Funded (rgb) ${addr} with ${FUND_AMOUNT_BTC} BTC"
done
