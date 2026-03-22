# Milanote → Umbra: Comprehensive Audit & Implementation Plan

## Status: Phase 2 Complete — Ready for Implementation

---

## MILANOTE REFERENCE DESIGN (Dark Mode)

### Overall Layout
- **Left sidebar toolbar**: ~60px wide, dark (#1a1a1e), vertical icon strip
- **Top bar**: Full width, ~44px tall, contains: back arrow, board title (editable), share button, export button, overflow menu. Background blends with canvas or is slightly darker.
- **Canvas**: Main area fills remaining space. Background is dark charcoal (#202024) with subtle dot grid pattern (dots are very faint, ~20px spacing)
- **Right panel ("Unsorted notes")**: Collapsible side panel for quick-captured notes, ~260px wide

### Toolbar (Left Sidebar)
- Narrow vertical strip (~56-60px)
- Background: very dark (#17181c or similar)
- Icons centered, ~24px, stroke-based (not filled), thin (1.5px stroke)
- Tool order top-to-bottom: **Note, To-do list, Board, Link, Line/Arrow, Sketch/Drawing, Upload/Image, Column, Comment, Color swatch**
- Tooltips appear to the RIGHT of each icon on hover (dark bg, white text, small pill shape)
- Draggable: each icon can be dragged directly onto the canvas
- NO text labels in sidebar — icons only
- Separator lines between tool groups
- Home/logo button at very top

### Note Cards
- **Background**: White (#ffffff) in light mode, dark (#2a2c30) in dark mode
- **Border radius**: 6-8px (slightly rounded, NOT very round)
- **Shadow**: Subtle — `0 1px 3px rgba(0,0,0,0.08)` at rest, stronger on hover/drag
- **Color tag**: Thin colored strip at TOP of card (~3-4px height). Colors: none/white, gray, brown, orange, yellow, green, teal, blue, purple, pink, red
- **Text**: Clean sans-serif, 14px body, supports bold/italic/underline, bullet lists, numbered lists, headings, quote blocks, code blocks
- **Selection**: Blue outline border (2px, #2196F3 or similar), no glow — just a clean border
- **Resize**: Drag right edge or bottom-right corner. Min width ~160px
- **Padding**: ~16px internal padding
- **No visible header/drag strip** — the entire card is the drag handle (except when editing text)

### Board Cards
- **Distinct visual**: Looks like a mini-board/folder, NOT like a note
- **Background**: Slightly different shade from notes — has a subtle "stacked papers" look or a board icon
- **Title**: Bold, 14-15px
- **Subtitle**: Shows count of items inside ("3 cards")
- **Double-click**: Drills into the board
- **Size**: ~180x100px default, compact

### To-Do / Checklist Cards
- **Background**: Same as note card
- **Title area**: Optional title at top
- **Items**: Each has a circular checkbox (not square), ~16px diameter
- **Checked state**: Circle fills with accent color, text gets strikethrough + opacity reduction
- **Add item**: "Add to-do" link at bottom, subtle
- **Item text**: 13-14px, clean sans-serif

### Link Cards
- **Shows preview**: Favicon + page title + URL domain + thumbnail image if available
- **Thumbnail**: Takes top portion of card (image preview of the linked page)
- **URL text**: Small, muted, shows just domain
- **Title**: Bold, 14px, below thumbnail
- **Click**: Opens link in new tab
- **No manual URL input visible** — user pastes URL and it auto-resolves

### Image Cards
- **Full-bleed**: Image fills the entire card, no padding
- **Border radius**: Same as other cards (6-8px), image clips to card shape
- **No border by default** — the image IS the card
- **Resize**: Proportional by default, drag corner
- **Caption**: Optional small text below image

### Column Cards
- **Vertical container**: Groups other cards vertically
- **Has a subtle title** at top
- **Background**: Slightly different — very subtle border or shade to indicate it's a container
- **Cards inside columns** snap into vertical stack
- **Width**: ~240-280px typical

### Lines / Arrows
- **Drawn between elements**: Click connection point on card edge → drag to another card
- **Connection points**: Small dots appear on card edges on hover (top, right, bottom, left)
- **Line styles**: Straight, curved
- **Arrow heads**: Optional
- **Line color**: Defaults to muted gray, customizable
- **Labels**: Can add text labels on lines

### Canvas Interactions
- **Pan**: Scroll/trackpad to pan (default), or space+drag
- **Zoom**: Pinch or Ctrl+scroll
- **Select**: Click element. Click empty space to deselect.
- **Multi-select**: Click+drag rectangle on empty canvas, or Shift+click individual elements
- **Right-click context menu**: Copy, paste, delete, duplicate, change color, lock, move to board, etc.
- **Keyboard shortcuts**: Delete/Backspace to delete, Cmd+C/V copy/paste, Cmd+Z undo, arrow keys to nudge
- **Snap**: Elements snap to alignment guides when dragging near other elements (smart guides)
- **Double-click empty canvas**: Creates new note at that position

### Context Menu (Right-Click)
- Dark background (#2a2c30), rounded corners (8px)
- Items: Edit, Cut, Copy, Paste, Duplicate, Delete
- Separator lines between groups
- Sub-menus: Color → shows color palette, Move to → shows boards
- Clean, minimal, ~180px wide

### Zoom Controls
- Bottom-right corner
- Small pill/bar showing: zoom out (−), percentage (e.g., "100%"), zoom in (+)
- Fit to screen button
- Subtle, semi-transparent background

---

## CURRENT UMBRA vs MILANOTE — KEY DIFFERENCES

### 1. CARD DESIGN (HIGH PRIORITY)
| Aspect | Milanote | Umbra (Current) |
|--------|----------|-----------------|
| Border radius | 6-8px | 12px (too round) |
| Shadow | Very subtle, minimal | Heavy (0 2px 8px) |
| Note color bar | 3-4px thin strip, 11 colors | 6px, 9 colors |
| Card background (dark) | #2a2c30 solid | rgba with alpha (translucent) |
| Selection | Clean blue border, no glow | Blue border + heavy glow shadow |
| Drag handle | Entire card (invisible strip) | Visible gradient strip at top |
| Card padding | 16px | 12px (p-3) |
| Text size | 14px body | 13px |
| Resize handle | Invisible until hover | Always visible when selected |

### 2. TOOLBAR (MEDIUM PRIORITY)
| Aspect | Milanote | Umbra (Current) |
|--------|----------|-----------------|
| Width | ~56-60px | 52px (close) |
| Background | #17181c | #16181c (close) |
| Tool order | Note first, then To-do, Board... | Note, Board, To-do... |
| Icon style | Thin stroke (1.5px) | 1.5px stroke (good) |
| Tooltips | Right-side pill | Right-side pill (good) |
| Separator | Subtle lines | Subtle lines (good) |

### 3. CANVAS (MEDIUM PRIORITY)
| Aspect | Milanote | Umbra (Current) |
|--------|----------|-----------------|
| Background | #202024 charcoal | #111214 (too dark) |
| Grid dots | Very faint, 20px gap | Brighter, 20px gap |
| Multi-select | Drag rectangle + Shift+click | Not implemented |
| Smart guides | Alignment snap lines | Not implemented |
| Right-click menu | Full context menu | Not implemented |

### 4. TOP BAR / BREADCRUMB (LOW-MEDIUM)
| Aspect | Milanote | Umbra (Current) |
|--------|----------|-----------------|
| Style | Integrated into canvas, minimal | Floating glass panels |
| Board title | Editable inline, large | In breadcrumb, small |
| Back button | Simple arrow | Arrow + "Home/Back" text |

### 5. CHECKLIST (MEDIUM)
| Aspect | Milanote | Umbra (Current) |
|--------|----------|-----------------|
| Checkbox shape | Circle | Square with rounded corners |
| Checked fill | Accent color circle | Accent color square |
| Title | Optional, separate from items | "TO-DO" label |

### 6. MISSING FEATURES (FUTURE)
- Multi-select (drag rectangle)
- Right-click context menu
- Smart alignment guides
- Undo/Redo (wired up but empty)
- Keyboard shortcuts (Delete, Cmd+Z, etc.)
- Connection points on cards for lines
- Link URL preview/unfurling
- Unsorted notes panel
- Duplicate element
- Lock element
- Rich text formatting (bold, italic, lists)

---

## IMPLEMENTATION BLOCKS

### Block 1: Card Design Overhaul
**Priority: HIGH | Files: CanvasElementCard.tsx, elements.ts, index.css**
- Reduce border-radius to 6px
- Reduce shadow to minimal (1px 2px only)
- Make card backgrounds solid (no alpha transparency)
- Reduce color bar to 3px
- Add 11 Milanote colors (add teal, brown)
- Selection = clean 2px blue border, NO glow shadow
- Remove visible drag handle gradient strip
- Increase padding to 16px
- Increase text to 14px
- Make resize handle invisible until hover (not just selected)
- Status: PENDING

### Block 2: Canvas Background & Grid
**Priority: MEDIUM | Files: index.css, InfiniteCanvas.tsx**
- Change canvas background to #202024
- Make grid dots fainter (0.025 opacity)
- Status: PENDING

### Block 3: Note Card Polish
**Priority: HIGH | Files: CanvasElementCard.tsx**
- Remove "Write something..." placeholder or make it match Milanote
- Make entire card draggable (remove separate drag strip)
- Clean up note editing — click to select, double-click to edit
- Status: PENDING

### Block 4: Checklist Restyle
**Priority: MEDIUM | Files: CanvasElementCard.tsx**
- Change checkbox to circle shape
- Checked = filled circle with checkmark
- Remove "TO-DO" header label, make it optional title
- Match Milanote checklist spacing
- Status: PENDING

### Block 5: Board Card Restyle
**Priority: MEDIUM | Files: CanvasElementCard.tsx**
- Make board card look more like a mini-folder/board
- Show item count inside
- Compact styling
- Status: PENDING

### Block 6: Context Menu (Right-Click)
**Priority: MEDIUM | Files: NEW ContextMenu.tsx, InfiniteCanvas.tsx**
- Right-click on element → context menu
- Options: Edit, Copy, Duplicate, Delete, Color submenu
- Right-click on canvas → Paste, New Note
- Dark styled menu, 8px radius
- Status: PENDING

### Block 7: Multi-Select
**Priority: MEDIUM | Files: InfiniteCanvas.tsx, useBoardStore.ts**
- Drag rectangle on empty canvas to select multiple
- Shift+click to add/remove from selection
- Move all selected elements together
- Delete all selected
- Status: PENDING

### Block 8: Keyboard Shortcuts
**Priority: MEDIUM | Files: NEW useKeyboardShortcuts.ts, useBoardStore.ts**
- Delete/Backspace → delete selected
- Cmd+Z → undo, Cmd+Shift+Z → redo
- Cmd+C/V → copy/paste elements
- Cmd+D → duplicate
- Arrow keys → nudge selected element by 10px
- Cmd+A → select all
- Escape → deselect
- Status: PENDING

### Block 9: Top Bar / Breadcrumb Restyle
**Priority: LOW | Files: BreadcrumbNav.tsx**
- Make board title larger and editable
- Simplify back button to just an arrow
- Remove glass effect, make it blend with canvas
- Status: PENDING

### Block 10: Smart Alignment Guides
**Priority: LOW | Files: InfiniteCanvas.tsx, NEW alignmentGuides.ts**
- Show red/blue lines when element edges align with other elements
- Snap to guides when within 5px
- Status: PENDING

### Block 11: Link Card Preview
**Priority: LOW | Files: CanvasElementCard.tsx, useBoardStore.ts**
- Auto-unfurl URL to show title + favicon + thumbnail
- Status: PENDING

### Block 12: Rich Text in Notes
**Priority: LOW | Files: NEW RichTextEditor.tsx, CanvasElementCard.tsx**
- Bold, italic, underline
- Bullet lists, numbered lists
- Headings
- Code blocks, quote blocks
- Status: PENDING

---

## PROGRESS LOG

| Block | Status | Date | Notes |
|-------|--------|------|-------|
| 1 | DONE | 2026-03-20 | Card radius 6px, subtle shadows, solid bg, 2px blue border selection, 11 colors |
| 2 | DONE | 2026-03-20 | Canvas #202024, dots 0.025 opacity |
| 3 | DONE | 2026-03-20 | Removed drag strip, full-card drag, 14px text, 16px padding |
| 4 | DONE | 2026-03-20 | Circle checkboxes, accent fill, removed TO-DO label, "+ Add to-do" |
| 5 | DONE | 2026-03-20 | Board card with mini-folder icon, compact, "Open" hint |
| 6 | DONE | 2026-03-20 | ContextMenu.tsx: Duplicate, Color inline, Delete. Canvas + element right-click |
| 7 | DONE | 2026-03-20 | Marquee drag-rectangle + Shift+click multi-select, selectedElementIds[] in store |
| 8 | DONE | 2026-03-20 | Cmd+C/V/A/D, Delete, Escape, Arrow nudge — all work with multi-select |
| 9 | DONE | 2026-03-20 | Gradient top bar, minimal back arrow, clean breadcrumb path |
| 10 | PENDING | | Smart alignment guides |
| 11 | PENDING | | Link URL preview/unfurling |
| 12 | PENDING | | Rich text formatting in notes |
| 13 | DONE | 2026-03-20 | Sidebar transforms to element settings panel on selection (color, style, delete) |
| 14 | DONE | 2026-03-20 | Removed × delete buttons, click-to-select vs double-click-to-edit, ghost drag fix |
| 15 | DONE | 2026-03-20 | Toolbar icons now have text labels underneath (Milanote-style) |
