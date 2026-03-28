# Commit Methods

This project supports two commit prefixes for version behavior:

- `refactor: <message>`
  - No version bump.
  - Keeps `package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json` versions unchanged.

- `version_bump: <message>`
  - Automatically bumps app version by minor (`0.1` style progression, e.g. `0.3.0 -> 0.4.0`).
  - Syncs version to:
    - `package.json`
    - `src-tauri/Cargo.toml`
    - `src-tauri/tauri.conf.json`
  - Stages the changed files automatically in the same commit.

## Examples

```bash
git commit -m "refactor: clean up canvas drag state"
git commit -m "version_bump: release workspace performance updates"
```

## Notes

- The version bump check runs in `.husky/commit-msg`.
- Commit messages that do not start with `version_bump:` will not trigger a bump.
