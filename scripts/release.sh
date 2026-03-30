#!/bin/bash
set -euo pipefail

# ─────────────────────────────────────────────────────
# Ghosty Release Script
# Builds a signed update, bumps version, creates GitHub Release
# ─────────────────────────────────────────────────────

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}▸${NC} $1"; }
warn()  { echo -e "${YELLOW}▸${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1" >&2; exit 1; }

# ── Pre-checks ──────────────────────────────────────
command -v gh >/dev/null 2>&1 || error "gh CLI not found. Install: brew install gh"
command -v jq >/dev/null 2>&1 || error "jq not found. Install: brew install jq"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# Check signing key
KEY_PATH="$HOME/.tauri/ghosty.key"
if [ ! -f "$KEY_PATH" ]; then
  error "Signing key not found at $KEY_PATH. Run: npx tauri signer generate -w ~/.tauri/ghosty.key"
fi

# ── Version ─────────────────────────────────────────
CURRENT_VERSION=$(jq -r '.version' src-tauri/tauri.conf.json)
info "Current version: v$CURRENT_VERSION"

if [ -z "${1:-}" ]; then
  # Auto-bump patch
  IFS='.' read -r major minor patch <<< "$CURRENT_VERSION"
  NEW_VERSION="$major.$minor.$((patch + 1))"
else
  NEW_VERSION="$1"
fi

echo ""
read -rp "$(echo -e "${YELLOW}▸${NC} Release version v$NEW_VERSION? [Y/n] ")" confirm
if [[ "$confirm" =~ ^[Nn] ]]; then
  echo "Aborted."
  exit 0
fi

# ── Bump version in config files ────────────────────
info "Bumping version to $NEW_VERSION..."

# tauri.conf.json
jq --arg v "$NEW_VERSION" '.version = $v' src-tauri/tauri.conf.json > /tmp/tauri-conf.json
mv /tmp/tauri-conf.json src-tauri/tauri.conf.json

# package.json
jq --arg v "$NEW_VERSION" '.version = $v' package.json > /tmp/package.json
mv /tmp/package.json package.json

# Cargo.toml (simple sed for version line)
sed -i '' "s/^version = \".*\"/version = \"$NEW_VERSION\"/" src-tauri/Cargo.toml

# ── Build ───────────────────────────────────────────
info "Building signed release..."
export TAURI_SIGNING_PRIVATE_KEY="$KEY_PATH"

# Prompt for key password
read -rsp "$(echo -e "${YELLOW}▸${NC} Signing key password: ")" TAURI_SIGNING_PRIVATE_KEY_PASSWORD
echo ""
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD

npm run tauri:build

# ── Locate artifacts ────────────────────────────────
BUNDLE_DIR="src-tauri/target/release/bundle"
DMG=$(find "$BUNDLE_DIR/dmg" -name "*.dmg" 2>/dev/null | head -1)
APP_TAR=$(find "$BUNDLE_DIR/macos" -name "*.app.tar.gz" 2>/dev/null | head -1)
APP_SIG=$(find "$BUNDLE_DIR/macos" -name "*.app.tar.gz.sig" 2>/dev/null | head -1)

[ -z "$DMG" ] && error "DMG not found in $BUNDLE_DIR/dmg"
[ -z "$APP_TAR" ] && error "App tarball not found in $BUNDLE_DIR/macos"
[ -z "$APP_SIG" ] && error "Signature not found in $BUNDLE_DIR/macos"

info "Artifacts:"
echo "  DMG: $DMG"
echo "  App: $APP_TAR"
echo "  Sig: $APP_SIG"

# ── Generate latest.json ───────────────────────────
SIGNATURE=$(cat "$APP_SIG")
REPO_URL=$(gh repo view --json url -q '.url')
DOWNLOAD_URL="$REPO_URL/releases/download/v$NEW_VERSION/$(basename "$APP_TAR")"
PUB_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

cat > /tmp/latest.json <<EOJSON
{
  "version": "$NEW_VERSION",
  "notes": "Release v$NEW_VERSION",
  "pub_date": "$PUB_DATE",
  "platforms": {
    "darwin-aarch64": {
      "signature": "$SIGNATURE",
      "url": "$DOWNLOAD_URL"
    },
    "darwin-x86_64": {
      "signature": "$SIGNATURE",
      "url": "$DOWNLOAD_URL"
    }
  }
}
EOJSON

info "Generated latest.json"

# ── Commit version bump ────────────────────────────
git add src-tauri/tauri.conf.json package.json src-tauri/Cargo.toml
git commit -m "chore: bump version to v$NEW_VERSION"
git tag "v$NEW_VERSION"
git push && git push --tags

# ── Create GitHub Release ──────────────────────────
info "Creating GitHub Release v$NEW_VERSION..."
gh release create "v$NEW_VERSION" \
  "$DMG" \
  "$APP_TAR" \
  "$APP_SIG" \
  /tmp/latest.json \
  --title "Ghosty v$NEW_VERSION" \
  --notes "Release v$NEW_VERSION" \
  --latest

RELEASE_URL=$(gh release view "v$NEW_VERSION" --json url -q '.url')
echo ""
info "Release published: $RELEASE_URL"
info "Users will auto-update on next app launch."
