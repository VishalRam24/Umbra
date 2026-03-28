#!/usr/bin/env sh
set -eu

# Initialize iOS native project once per clone.
# If already initialized, this command is a no-op.
npm run tauri ios init

# Builds iOS app using local Apple toolchain.
npm run tauri ios build
