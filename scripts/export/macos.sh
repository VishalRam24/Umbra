#!/usr/bin/env sh
set -eu

# Builds macOS desktop bundles (.app and .dmg).
npm run tauri build -- --bundles app,dmg
