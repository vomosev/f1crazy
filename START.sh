#!/usr/bin/env bash
#
# START.sh — boot the F1 Crazy Express API (server/index.js)
#
# Usage:
#   ./START.sh            # install deps if needed, then start the API in the background
#
# The Next.js frontend is built/served separately (`npm run build`).
# This script ONLY launches the backend API process.
#
set -euo pipefail

# ---------------------------------------------------------------------------
# Always operate from the repository root (the directory holding this script)
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$SCRIPT_DIR"

# ---------------------------------------------------------------------------
# Environment defaults (do not override anything already exported)
# ---------------------------------------------------------------------------
export NODE_ENV="${NODE_ENV:-production}"
export PORT="${PORT:-4119}"
export SSL_ENABLED="${SSL_ENABLED:-true}"
export SSL_CERT_PATH="${SSL_CERT_PATH:-/home/arx-app/backends/certs/certificate.crt}"
export SSL_KEY_PATH="${SSL_KEY_PATH:-/home/arx-app/backends/certs/private.key}"

# Load .env if present so DB_*/SESSION_SECRET are available to this shell too.
if [ -f ".env" ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
  # Re-assert PORT default in case .env omitted it
  export PORT="${PORT:-4119}"
fi

# If TLS is requested but the cert/key are missing, fall back to plain HTTP
# so the process still boots instead of crashing on readFileSync.
if [ "${SSL_ENABLED}" = "true" ]; then
  if [ ! -r "${SSL_CERT_PATH}" ] || [ ! -r "${SSL_KEY_PATH}" ]; then
    echo "[START.sh] WARNING: SSL_ENABLED=true but certificate or key is unreadable."
    echo "[START.sh]          cert: ${SSL_CERT_PATH}"
    echo "[START.sh]          key : ${SSL_KEY_PATH}"
    echo "[START.sh]          Falling back to HTTP."
    export SSL_ENABLED="false"
  fi
fi

# ---------------------------------------------------------------------------
# Pre-flight checks
# ---------------------------------------------------------------------------
if ! command -v node >/dev/null 2>&1; then
  echo "[START.sh] ERROR: node is not installed or not on PATH." >&2
  exit 1
fi

if [ ! -f "server/index.js" ]; then
  echo "[START.sh] ERROR: server/index.js not found in ${SCRIPT_DIR}." >&2
  exit 1
fi

mkdir -p logs

# ---------------------------------------------------------------------------
# Dependencies
# ---------------------------------------------------------------------------
if [ ! -d "node_modules" ]; then
  echo "[START.sh] node_modules missing — running npm install --omit=dev ..."
  if ! command -v npm >/dev/null 2>&1; then
    echo "[START.sh] ERROR: npm is not installed or not on PATH." >&2
    exit 1
  fi
  npm install --omit=dev
fi

# ---------------------------------------------------------------------------
# Stop any previously started instance tracked by api.pid
# ---------------------------------------------------------------------------
if [ -f "api.pid" ]; then
  OLD_PID="$(cat api.pid 2>/dev/null || true)"
  if [ -n "${OLD_PID}" ] && kill -0 "${OLD_PID}" >/dev/null 2>&1; then
    echo "[START.sh] Stopping existing API process (PID ${OLD_PID}) ..."
    kill "${OLD_PID}" >/dev/null 2>&1 || true
    sleep 2
    if kill -0 "${OLD_PID}" >/dev/null 2>&1; then
      kill -9 "${OLD_PID}" >/dev/null 2>&1 || true
    fi
  fi
  rm -f api.pid
fi

# ---------------------------------------------------------------------------
# Launch
# ---------------------------------------------------------------------------
echo "[START.sh] Starting F1 Crazy API on port ${PORT} (SSL_ENABLED=${SSL_ENABLED}) ..."
nohup node server/index.js >> logs/api.log 2>&1 &
API_PID=$!
echo "${API_PID}" > api.pid

# Give the process a moment, then verify it is still alive.
sleep 2
if kill -0 "${API_PID}" >/dev/null 2>&1; then
  echo "[START.sh] F1 Crazy API running with PID ${API_PID} (logs/api.log)"
else
  echo "[START.sh] ERROR: API failed to start. Last 40 log lines:" >&2
  tail -n 40 logs/api.log >&2 || true
  rm -f api.pid
  exit 1
fi

exit 0