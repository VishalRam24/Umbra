# BlockSuite-era backup

The **Affine / BlockSuite** integration was removed from the default app to restore the fast React canvas.

## Full snapshots (`~/Desktop/Umbra-backups/`)

| File | Era |
|------|-----|
| `umbra-blocksuite-before-legacy-canvas-*.tar.gz` | **With** BlockSuite (before switching back to the React canvas). |
| `umbra-legacy-react-canvas-*.tar.gz` | **Without** BlockSuite: current fast infinite-canvas Umbra (backup of this stack). |

There is **no separate tarball** of the *original* pre-BlockSuite tree from history—this repo never had commits at that point. The `umbra-legacy-react-canvas-*` archive is the canonical backup for the **non-BlockSuite** product going forward.

See `~/Desktop/Umbra-backups/README.md` for restore commands.

## On disk

- `vendor/blocksuite/` — vendored BlockSuite tree (not used by the current build). Safe to delete to save disk space if you only need the tarball.

## Saved app data

If your `localStorage` / Tauri save contained **only** `blocksuiteYdoc` and no `elements` map, the legacy canvas will start empty and the console will warn. Use the tarball above to run the BlockSuite build again and export or migrate manually.
