#!/bin/bash
#
# fix-macos.sh — remove macOS Gatekeeper blocks from Avinya HRMS Monitor.
#
# The app is built without an Apple Developer ID (no paid account), so macOS
# flags it as "damaged" when downloaded. This script strips the quarantine
# flag and applies a local ad-hoc signature so the app opens normally.
#
# Usage:
#   ./fix-macos.sh                      # fixes /Applications/Avinya HRMS Monitor.app
#   ./fix-macos.sh /path/to/App.app     # fixes a custom location
#

set -euo pipefail

APP_PATH="${1:-/Applications/Avinya HRMS Monitor.app}"

if [ ! -d "$APP_PATH" ]; then
  echo "ERROR: App not found at '$APP_PATH'"
  echo "If you haven't installed it yet, open the DMG and drag"
  echo "'Avinya HRMS Monitor' into the Applications folder first."
  exit 1
fi

echo "Fixing: $APP_PATH"

echo "  [1/3] Removing quarantine flag..."
xattr -cr "$APP_PATH" 2>/dev/null || true

echo "  [2/3] Applying local code signature..."
codesign --force --deep --sign - "$APP_PATH"

echo "  [3/3] Verifying signature..."
codesign --verify --deep --strict "$APP_PATH"

echo "Done — launching Avinya HRMS Monitor..."
open "$APP_PATH"
