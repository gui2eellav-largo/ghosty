#!/bin/bash
# Dev mode that wraps the binary in a .app bundle for macOS 26+ TCC compatibility.
# Usage: npm run tauri:dev:app
#
# This is needed because macOS 26 requires NSMicrophoneUsageDescription in a proper
# .app bundle Info.plist — the __info_plist Mach-O section is no longer sufficient
# for unbundled binaries.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
APP_DIR="$ROOT_DIR/src-tauri/target/debug/Ghosty.app"

# 1. Start Vite in background
cd "$ROOT_DIR"
npx vite &
VITE_PID=$!

# Wait for Vite to be ready
echo "[dev-app] Waiting for Vite on :5173..."
for i in $(seq 1 30); do
  if curl -s http://localhost:5173/ > /dev/null 2>&1; then
    echo "[dev-app] Vite ready."
    break
  fi
  sleep 0.5
done

# 2. Build Rust binary
echo "[dev-app] Building Rust binary..."
(cd "$ROOT_DIR/src-tauri" && cargo build --no-default-features 2>&1)

# 3. Create .app wrapper
bash "$SCRIPT_DIR/dev-app-wrapper.sh"

# 4. Reset TCC for our dev bundle ID (first time only)
tccutil reset Microphone com.ghosty.app.dev 2>/dev/null || true

# 5. Launch the .app
echo "[dev-app] Launching $APP_DIR ..."
open -W "$APP_DIR"
EXIT_CODE=$?

# Cleanup
kill $VITE_PID 2>/dev/null || true
exit $EXIT_CODE
