# Cross-Platform Build Skeleton

This repository includes the scaffold needed to build Umbra on host machines that already have the required native toolchains.

## Included Skeleton

- Desktop bundle targets configured in `src-tauri/tauri.conf.json`:
  - macOS: `app`, `dmg`
  - Windows: `msi`, `nsis`
- Export scripts in `scripts/export/`:
  - `macos.sh`
  - `windows.ps1`
  - `android.sh`
  - `ios.sh`
- Mobile scaffold placeholders:
  - `src-tauri/gen/android/`
  - `src-tauri/gen/apple/`

## Build Entry Commands

```bash
npm run build:macos
npm run build:windows
npm run build:android
npm run build:ios
```

## Notes

- This is skeleton-only setup. It does not install or configure SDKs/toolchains.
- Android and iOS builds require running `tauri ... init` on the target machine once.
- Windows installers should be built on Windows with Visual Studio Build Tools installed.
