#!/usr/bin/env bash
# Launch both dev servers: backend (Spring Boot) and frontend (Next.js).
# The backend always runs the dev profile: port 8000 and the dev database
# (backend-springboot/todo-dev.db). The prod port 5555 and the personal prod
# database (todo-prod/todo.db) are only produced/used by update-prod.sh — dev
# must never touch them, even if a config file was left dirty after a prod build.
# Usage: ./dev.sh   (Ctrl+C stops everything)
set -euo pipefail
set -m  # each server gets its own process group so cleanup can kill descendants

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

declare -a PIDS=()

start() {
  local name="$1" dir="$2"
  shift 2
  echo "[dev] starting $name ($dir): $*"
  (cd "$ROOT/$dir" && exec "$@") &
  PIDS+=("$!")
}

cleanup() {
  trap - INT TERM EXIT
  echo ""
  echo "[dev] shutting down all servers..."
  for pid in "${PIDS[@]}"; do
    kill -- "-$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
}
trap cleanup INT TERM EXIT

start "backend " "backend-springboot" ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
start "frontend" "frontend-next"      npm run dev

# If any server exits, stop the rest so you never run with a missing piece.
set +e
wait -n
status=$?
set -e
echo "[dev] a server exited (status $status); stopping the others."
exit "$status"
