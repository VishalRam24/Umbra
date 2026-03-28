#!/usr/bin/env sh
set -eu

# Initialize Android native project once per clone.
# If already initialized, this command is a no-op.
npm run tauri android init

# Builds Android app bundle/apk using local Android toolchain.
npm run tauri android build
