#!/usr/bin/env bash
set -euo pipefail

N="${1:-6}"
if ! [[ "$N" =~ ^[0-9]+$ ]]; then
  echo "Usage: $0 [blocks]" >&2
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

addr=$(bitcoin_cli getnewaddress)
bitcoin_cli generatetoaddress "$N" "$addr" >/dev/null

echo "Mined $N blocks to ${addr}"
