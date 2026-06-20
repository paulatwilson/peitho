#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if ! command -v bun >/dev/null 2>&1; then
  echo "Bun is required. Install from https://bun.sh/" >&2
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Installing workspace dependencies..."
  bun install
fi

port_available() {
  PEITHO_PORT_PROBE="$1" bun --eval '
    const server = Bun.serve({
      port: Number(process.env.PEITHO_PORT_PROBE),
      fetch: () => new Response("probe"),
    });
    server.stop(true);
  ' >/dev/null 2>&1
}

if [ -z "${PORT:-}" ]; then
  for candidate in 43117 43118 43119 43120 43121; do
    if port_available "$candidate"; then
      export PORT="$candidate"
      break
    fi
  done
fi

if [ -z "${PORT:-}" ]; then
  echo "No free Peitho-Composer dev port found in 43117-43121." >&2
  echo "Set PORT manually, for example: PORT=43200 ./dev.sh" >&2
  exit 1
fi

echo "Starting Peitho-Composer"
echo "URL: http://localhost:${PORT}"
echo "Commands: rs + enter restarts, q + enter quits"
echo

DEV_PID=""

start_dev() {
  (
    cd "$ROOT_DIR/apps/peitho-composer"
    exec bun run src/server.ts
  ) &
  DEV_PID="$!"
}

stop_dev() {
  if [ -n "$DEV_PID" ] && kill -0 "$DEV_PID" >/dev/null 2>&1; then
    kill "$DEV_PID" >/dev/null 2>&1 || true
    wait "$DEV_PID" >/dev/null 2>&1 || true
  fi
  DEV_PID=""
}

restart_dev() {
  echo
  echo "Restarting Peitho-Composer..."
  stop_dev
  start_dev
}

quit_dev() {
  echo
  echo "Stopping Peitho-Composer..."
  stop_dev
  exit 0
}

trap quit_dev INT TERM

start_dev

while IFS= read -r command; do
  case "$command" in
    rs)
      restart_dev
      ;;
    q)
      quit_dev
      ;;
    "")
      ;;
    *)
      echo "Unknown command: $command"
      echo "Commands: rs + enter restarts, q + enter quits"
      ;;
  esac
done

quit_dev
