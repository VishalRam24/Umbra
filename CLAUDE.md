# Umbra — Claude Code Context

Umbra is a **Tauri v2 + React 19 + Zustand** desktop app: a Milanote-style infinite canvas editor for macOS.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, TypeScript, Tailwind CSS v3 |
| State | Zustand 5 + Immer middleware |
| Build | Vite 6, port **1420** |
| Desktop | Tauri v2 (Rust backend, WKWebView) |
| Persistence | localStorage (browser) + `state.json` via Tauri IPC |

---

## Dev Commands

```bash
npm run dev          # Vite only (browser at localhost:1420)
npm run tauri dev    # Full Tauri app (use this for real testing)
npm run typecheck    # tsc --noEmit
```

> **Always prefer `npm run tauri dev`** for testing — the browser preview and the Tauri WKWebView behave differently (see Known Differences below).

---

## Tauri MCP (Debug Tool)

The app has `tauri-plugin-mcp-bridge = "0.10"` embedded (debug builds only). The companion MCP server `@hypothesi/tauri-mcp-server@0.10` is configured globally in `~/.claude.json` and project-level in `.mcp.json`.

**On every new session**, the `tauri` MCP is available with these tools:
- `tauri__take_screenshot` — screenshot the real Tauri window (WKWebView)
- `tauri__execute_js` — run JS directly inside the WKWebView
- `tauri__send_mouse_click` / `tauri__send_keyboard_input` — interact with the real app
- `tauri__get_app_logs` — read Rust + webview console output
- `tauri__call_ipc_command` — invoke Tauri backend commands (`save_state`, `load_state`, etc.)
- `tauri__monitor_resources` — CPU/memory

**Workflow:** run `npm run tauri dev`, then use `tauri__*` tools to debug inside the actual WKWebView — not the browser.

---

## Architecture

### State (`src/store/useBoardStore.ts`)
- Flat `elements: Record<string, BoardElement>` map — all boards/notes/etc
- `parentBoardId` creates implicit tree hierarchy
- `currentBoardId` = which board is open (= `activeWorkspaceId` at root level)
- `boardStack: string[]` = drill-down navigation history
- Auto-saves: localStorage on every mutation + Tauri `state.json` (IPC)

### Element Types (15 total)
`note | board | text | link | comment | document | checklist | table | image | drawing | file | arrow | column`

### Key Files
```
src/
  App.tsx                          # view === "home" → HomePage, else → CanvasWorkspace
  store/useBoardStore.ts           # Zustand store (517 lines) — all state + actions
  features/canvas/InfiniteCanvas.tsx   # Pan, zoom, marquee, DnD
  features/elements/CanvasElementCard.tsx  # All element rendering (674 lines)
  features/toolbar/LeftToolbar.tsx     # Tool buttons + drag-to-canvas
  features/home/HomePage.tsx           # Workspace grid
  lib/canvasDnD.ts                     # Drag & drop logic (toolbar + file drop)
  lib/desktopApi.ts                    # Tauri IPC wrappers (isTauri guard)
  lib/useKeyboardShortcuts.ts          # Cmd+C/V/A/D, Delete, arrows, Escape
src-tauri/src/main.rs            # Rust commands: save_state, load_state, import_asset, etc.
```

---

## Known Chrome vs WKWebView Differences (Fixed)

These discrepancies were found and fixed on **2026-03-20**:

### 1. Toolbar Drag & Drop (`canvasDnD.ts`, `LeftToolbar.tsx`)
- **Problem:** HTML5 `dataTransfer.setData()` with custom MIME type `application/x-umbra-element-type` silently fails in WKWebView. Dragging tools from toolbar → canvas did nothing in Tauri.
- **Fix:** Pointer-based drag system using `pointerdown/pointermove/pointerup` + ghost element + `CustomEvent("umbra-toolbar-drop")`. HTML5 DnD kept as fallback for file drops in Chrome.

### 2. Wheel / Zoom (`InfiniteCanvas.tsx`)
- **Problem:** React's `onWheel` registers as a **passive listener** in WKWebView — `e.preventDefault()` is silently ignored → page bounces instead of panning/zooming.
- **Fix:** Native `addEventListener("wheel", handler, { passive: false })` in `useEffect`. Viewport ref pattern avoids stale closure.

### 3. Toolbar onClick (`LeftToolbar.tsx`)
- **Problem:** Pointer-drag refactor accidentally removed `onClick`, breaking keyboard + programmatic clicks.
- **Fix:** Restored `onClick={handleClick}` with `didDragRef` guard to prevent double-fire after drag.

---

## Tauri IPC Commands (Rust)

| Command | Args | Description |
|---|---|---|
| `save_state` | `json: String` | Write state to `~/.../com.umbra.app/umbra_data/state.json` |
| `load_state` | — | Read state file |
| `import_asset` | `sourcePath, fileName` | Copy file to `assets/` dir, returns `{asset_id, path}` |
| `get_asset_path` | `assetId` | Lookup asset file path by UUID |
| `open_file_external` | `path` | Open file in system default app |
| `copy_asset_to_path` | `assetId, destPath` | Export asset to user-chosen location |

Data stored at: `~/Library/Application Support/com.umbra.app/umbra_data/`

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Cmd+A` | Select all (non-arrows) |
| `Cmd+C / Cmd+V` | Copy / paste (+30px offset) |
| `Cmd+D` | Duplicate selected |
| `Arrow keys` | Nudge 10px (`Shift` = 50px) |
| `Delete / Backspace` | Move to trash |
| `Escape` | Deselect |
| `Space + drag` | Pan canvas |
| `Alt + drag` | Pan canvas |
| `Cmd + scroll` | Zoom |
| `Double-click canvas` | Create note at cursor |
| `Double-click board card` | Drill into board |
