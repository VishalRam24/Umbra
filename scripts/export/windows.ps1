$ErrorActionPreference = 'Stop'

# Builds Windows desktop bundles (.msi and NSIS installer).
npm run tauri build -- --bundles msi,nsis
