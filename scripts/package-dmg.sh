#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=== PulseJam AI DMG Packaging & Code Signing Pipeline ==="

APP_SOURCE="$ROOT_DIR/src-tauri/target/release/bundle/macos/PulseJam.app"
DMG_BUILDER="$ROOT_DIR/src-tauri/target/release/bundle/dmg/bundle_dmg.sh"
ICNS_FILE="$ROOT_DIR/src-tauri/target/release/bundle/dmg/PulseJam.icns"
OUTPUT_DIR="$ROOT_DIR/src-tauri/target/release/bundle/dmg"
OUTPUT_DMG="$OUTPUT_DIR/PulseJam_0.1.0_aarch64.dmg"
STAGING_DIR="$ROOT_DIR/build/dmg_staging"

if [ ! -d "$APP_SOURCE" ]; then
    echo "❌ Error: App bundle not found at $APP_SOURCE"
    echo "Please build the app first with: npm run tauri:build"
    exit 1
fi

echo "1. Deep ad-hoc code signing and cleaning app bundle..."
xattr -cr "$APP_SOURCE" 2>/dev/null || true
find "$APP_SOURCE" -name ".DS_Store" -delete 2>/dev/null || true
codesign --force --deep -s - "$APP_SOURCE"
codesign --verify --deep --strict "$APP_SOURCE"
echo "✅ Code signature verified successfully!"

echo "2. Preparing DMG staging directory..."
rm -rf "$STAGING_DIR"
mkdir -p "$STAGING_DIR"

echo "Copying PulseJam.app to staging..."
cp -R "$APP_SOURCE" "$STAGING_DIR/PulseJam.app"

# Clean any quarantine from staged files
xattr -cr "$STAGING_DIR/PulseJam.app" 2>/dev/null || true

# Add First-Time Open Guide
cat << 'EOF' > "$STAGING_DIR/First-Time-Open-Guide.txt"
============================================================
           PulseJam AI — macOS First-Time Launch Guide
============================================================

Thank you for downloading PulseJam AI!

PulseJam is an open-source, independent release.
macOS Gatekeeper protects your Mac by checking downloaded apps.
Follow these quick steps to open PulseJam for the first time:

METHOD 1: Standard macOS Bypass (No Terminal Needed)
------------------------------------------------------------
1. Drag "PulseJam" into the "Applications" folder.
2. In Applications, open PulseJam:
   • On macOS Sequoia (15+):
     When the prompt appears, open System Settings > Privacy & Security.
     Scroll down to Security and click "Open Anyway".
   • On macOS Sonoma / Ventura / Earlier:
     Right-Click (or Control-Click) PulseJam.app in Applications and
     select "Open", then click "Open" in the confirmation dialog.

METHOD 2: One-Click Helper Script
------------------------------------------------------------
Double-click "Open-PulseJam.command" in this disk image.
It will automatically clear the quarantine flag and launch the app!

METHOD 3: Quick Terminal Command (Instant)
------------------------------------------------------------
Paste this command into your Terminal:
   xattr -cr /Applications/PulseJam.app && open /Applications/PulseJam.app
============================================================
EOF

# Add executable launcher script
cat << 'EOF' > "$STAGING_DIR/Open-PulseJam.command"
#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"
clear
echo "======================================================"
echo "           PulseJam AI — Launch Assistant            "
echo "======================================================"
echo ""

if [ -d "/Applications/PulseJam.app" ]; then
    echo "--> Clearing Gatekeeper quarantine on /Applications/PulseJam.app..."
    xattr -cr /Applications/PulseJam.app 2>/dev/null || true
    echo "--> Launching PulseJam AI..."
    open /Applications/PulseJam.app
    echo ""
    echo "PulseJam AI launched successfully! You may now close this window."
elif [ -d "$DIR/PulseJam.app" ]; then
    echo "--> Installing PulseJam to /Applications..."
    cp -R "$DIR/PulseJam.app" /Applications/
    xattr -cr /Applications/PulseJam.app 2>/dev/null || true
    echo "--> Launching PulseJam AI..."
    open /Applications/PulseJam.app
    echo ""
    echo "PulseJam AI installed and launched successfully! You may now close this window."
else
    echo "❌ PulseJam.app not found. Please drag PulseJam to Applications."
fi
sleep 2
EOF
chmod +x "$STAGING_DIR/Open-PulseJam.command"

echo "3. Creating DMG..."
rm -f "$OUTPUT_DMG"
rm -f "$OUTPUT_DIR/rw.PulseJam_0.1.0_aarch64.dmg"

"$DMG_BUILDER" \
    --volname "PulseJam" \
    --volicon "$ICNS_FILE" \
    --icon-size 120 \
    --window-size 660 400 \
    --icon "PulseJam.app" 140 180 \
    --app-drop-link 340 180 \
    --icon "Open-PulseJam.command" 520 180 \
    --hide-extension "PulseJam.app" \
    --hide-extension "Open-PulseJam.command" \
    "$OUTPUT_DMG" \
    "$STAGING_DIR"

echo "4. Copying DMG to public/downloads for static hosting..."
mkdir -p "$ROOT_DIR/public/downloads"
cp "$OUTPUT_DMG" "$ROOT_DIR/public/downloads/PulseJam_0.1.0_aarch64.dmg"

echo "5. Uploading updated DMG to GitHub Release v0.1.0..."
gh release upload v0.1.0 "$ROOT_DIR/public/downloads/PulseJam_0.1.0_aarch64.dmg" --clobber

echo "=== Packaging & Release Complete! ==="
