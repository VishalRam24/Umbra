# Export Scripts

These scripts provide a thin, repository-tracked entrypoint for platform exports.

## Scripts

- `macos.sh` -> `tauri build -- --bundles app,dmg`
- `windows.ps1` -> `tauri build -- --bundles msi,nsis`
- `android.sh` -> `tauri android init && tauri android build`
- `ios.sh` -> `tauri ios init && tauri ios build`

They assume host dependencies are already installed.
