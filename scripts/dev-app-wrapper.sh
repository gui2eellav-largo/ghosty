#!/bin/bash
# Creates a minimal .app bundle around the debug binary so macOS TCC
# can read the NSMicrophoneUsageDescription from Info.plist.
# Required on macOS 26+ where unbundled binaries crash on TCC checks.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
BINARY="$ROOT_DIR/src-tauri/target/debug/ghosty"
APP_DIR="$ROOT_DIR/src-tauri/target/debug/Ghosty.app"
CONTENTS_DIR="$APP_DIR/Contents"
MACOS_DIR="$CONTENTS_DIR/MacOS"

# Create .app bundle structure
mkdir -p "$MACOS_DIR"

# Copy Info.plist (with full bundle metadata)
cat > "$CONTENTS_DIR/Info.plist" << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleExecutable</key>
	<string>ghosty</string>
	<key>CFBundleIdentifier</key>
	<string>com.ghosty.app.dev</string>
	<key>CFBundleName</key>
	<string>Ghosty</string>
	<key>CFBundleVersion</key>
	<string>0.1.0</string>
	<key>CFBundleShortVersionString</key>
	<string>0.1.0</string>
	<key>CFBundlePackageType</key>
	<string>APPL</string>
	<key>NSMicrophoneUsageDescription</key>
	<string>Ghosty utilise le micro pour enregistrer votre voix et la transcrire en texte.</string>
	<key>NSAppleEventsUsageDescription</key>
	<string>Ghosty utilise Apple Events pour coller le texte transcrit dans l'application active.</string>
</dict>
</plist>
PLIST

# Symlink the binary (avoid copying on every rebuild)
ln -sf "$BINARY" "$MACOS_DIR/ghosty"

echo "[dev-app-wrapper] Created $APP_DIR"
