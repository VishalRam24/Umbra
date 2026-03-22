# Vendored dependencies

## `blocksuite/`

BlockSuite + Affine packages used by Umbra’s edgeless editor. This tree is a **project-local copy** (moved from the old `refer/source/AFFiNE-canary/blocksuite` path) so Vite and Tauri only touch paths under the Umbra repo.

Vite resolves `@blocksuite/*` via `vite-plugin-blocksuite-local.mjs` and `vite-plugin-blocksuite-aliases.mjs`, both rooted at `vendor/blocksuite`.

To refresh from upstream AFFiNE, replace the contents of `vendor/blocksuite` with a matching `blocksuite` directory from the AFFiNE repo, restore **`vendor/blocksuite/tsconfig.json`** (Umbra uses a small standalone stub so Vite does not need the parent repo’s `tsconfig.web.json`), then re-run `npm run build`.
