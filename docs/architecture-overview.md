# Architecture Overview

## Data Model

Every item on the canvas is a `BoardElement`:

```typescript
interface BoardElement {
  id: string;
  type: "board" | "note" | "link" | "image" | "column" | "checklist";
  parentBoardId: string | null;   // null = root level
  position: { x: number; y: number };
  content: string;
  createdAt: number;
}
```

Elements are stored in a flat normalised map (`Record<string, BoardElement>`).
The `parentBoardId` field creates an implicit tree: every element belongs to
exactly one parent board (or the root when `null`).

## Board Navigation (Drill-Down)

The store tracks a `currentBoardId` (the board the user is "inside") and a
`boardStack` (history of previously visited boards).

- **Visible elements** are computed by filtering: `parentBoardId === currentBoardId`.
- **Enter board**: pushes current ID onto the stack, sets `currentBoardId` to the target.
- **Go back**: pops the stack and restores the previous board ID.

```
Root (null)
  ├── Board A  (parentBoardId: null)
  │     ├── Note 1  (parentBoardId: A)
  │     └── Board B (parentBoardId: A)
  │           └── Note 2 (parentBoardId: B)
  └── Board C  (parentBoardId: null)
```

Navigating into Board A shows Note 1 and Board B. Navigating into Board B
shows Note 2. "Back" returns to Board A.

## State Management

**Zustand + Immer middleware** provides:

- Normalised store shape for O(1) lookups.
- Immer draft mutations that produce immutable updates.
- Selector-based re-renders so the canvas only updates when visible elements change.

## Drag & Drop

Built on `@dnd-kit/core`:

1. **Toolbar items** are `useDraggable` sources tagged with `{ source: "toolbar", type }`.
2. **Canvas elements** are also `useDraggable` with `{ source: "canvas", elementId }`.
3. The **canvas itself** is a `useDroppable` zone.
4. On `DragEnd`, the handler checks the source:
   - `toolbar` → `createElement()` at snapped drop coordinates.
   - `canvas` → `moveElement()` by delta, snapped to grid.

## Grid & Snapping

All positions are snapped to a 10 px grid via `Math.round(v / 10) * 10`.
The dot-grid background uses a CSS radial-gradient repeating at 10 px intervals.

## Canvas Panning

Alt+click-drag or middle-mouse-drag translates the elements layer via CSS
`transform: translate()`. The dot-grid background position shifts in sync.
