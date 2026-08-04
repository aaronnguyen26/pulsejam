#!/usr/bin/env bash
set -e

echo "🧹 Cleaning macOS Finder detritus & quarantine extended attributes..."

# Targets to clean and sign
TARGET_APP="src-tauri/target/release/bundle/macos/PulseJam.app"
INSTALLED_APP="/Applications/PulseJam.app"

clean_and_sign() {
    local APP_PATH="$1"
    if [ -d "$APP_PATH" ]; then
        echo "--> Processing $APP_PATH..."
        # Remove quarantine attribute and Finder info detritus
        xattr -cr "$APP_PATH" 2>/dev/null || true
        find "$APP_PATH" -name ".DS_Store" -delete 2>/dev/null || true
        
        # Deep ad-hoc code sign
        codesign --force --deep -s - "$APP_PATH"
        echo "✅ Successfully ad-hoc signed $APP_PATH"
    fi
}

clean_and_sign "$TARGET_APP"
clean_and_sign "$INSTALLED_APP"

echo "✨ macOS app bundle fix complete!"
