import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import type { BoardElement, ElementType } from "@/types/elements";
import {
  generateId,
  getDefaultContent,
  getDefaultSize,
  snapToGrid,
} from "@/types/elements";
import type { Workspace, UserSettings, TrashEntry } from "@/types/workspace";
import { generateWorkspaceId } from "@/types/workspace";

import { saveStateTauri, loadStateTauri, isTauri } from "@/lib/desktopApi";
import { DEFAULT_STATE } from "@/store/defaultState";

const STORAGE_KEY = "umbra_app_state";

interface BoardState {
  userSettings: UserSettings;
  workspaces: Record<string, Workspace>;
  activeWorkspaceId: string | null;

  /** Flat element map (all boards / notes / …). */
  elements: Record<string, BoardElement>;
  /** At workspace root this equals `activeWorkspaceId`; nested = board element id. */
  currentBoardId: string | null;
  /** Parent board ids when drilling (workspace id or board ids). */
  boardStack: string[];

  selectedElementId: string | null;
  selectedElementIds: string[];
  clipboard: BoardElement[];
  viewport: { x: number; y: number; scale: number };

  trash: TrashEntry[];

  /** Undo/redo history — snapshots of elements map */
  undoStack: Record<string, BoardElement>[];
  redoStack: Record<string, BoardElement>[];

  /** Drawing mode state */
  drawingMode: boolean;
  drawingColor: string;
  drawingThickness: number;

  /** Connect mode state */
  connectMode: boolean;
  connectorStyle: "straight" | "orthogonal" | "curve";
  connectorColor: string;
  connectorThickness: number;
  connectorShowArrowhead: boolean;
  selectedConnectorId: string | null;

  /** Pending element type — set by keyboard shortcut, consumed on next canvas click */
  pendingElementType: ElementType | null;

  /** Currently selected table cell (shared so settings panel can target it) */
  selectedTableCell: { r: number; c: number } | null;
  setSelectedTableCell: (cell: { r: number; c: number } | null) => void;

  view: "home" | "canvas";

  setView: (view: "home" | "canvas") => void;
  updateUserSettings: (settings: Partial<UserSettings>) => void;

  createWorkspace: (name: string) => string;
  renameWorkspace: (id: string, name: string) => void;
  deleteWorkspace: (id: string) => void;
  openWorkspace: (id: string) => void;
  lockWorkspace: (id: string, hash: string) => void;
  unlockWorkspace: (id: string) => void;

  enterBoard: (boardElementId: string) => void;
  goBack: () => void;
  goHome: () => void;

  getCurrentBoardName: () => string;
  getVisibleElements: () => BoardElement[];

  createElement: (type: ElementType, at?: { x: number; y: number }) => string | null;
  updateElement: (id: string, patch: Partial<BoardElement>) => void;
  deleteElement: (id: string) => void;
  setSelectedElement: (id: string | null) => void;
  setSelectedElements: (ids: string[]) => void;
  addToSelection: (id: string) => void;
  removeFromSelection: (id: string) => void;
  selectAll: () => void;
  copySelected: () => void;
  pasteClipboard: () => void;
  deleteSelected: () => void;
  setViewport: (v: Partial<BoardState["viewport"]>) => void;
  fitToFrame: (canvasWidth: number, canvasHeight: number) => void;

  setDrawingMode: (on: boolean) => void;
  setDrawingColor: (color: string) => void;
  setDrawingThickness: (thickness: number) => void;

  setConnectMode: (on: boolean) => void;
  setConnectorStyle: (style: "straight" | "orthogonal" | "curve") => void;
  setConnectorColor: (color: string) => void;
  setConnectorThickness: (thickness: number) => void;
  setConnectorShowArrowhead: (show: boolean) => void;
  setSelectedConnector: (id: string | null) => void;
  createConnector: (fromId: string, fromSide: string, toId: string, toSide: string, fromAnchorId?: string | null, toAnchorId?: string | null) => string | null;

  setPendingElementType: (type: ElementType | null) => void;
  sendBackward: (id: string) => void;
  bringForward: (id: string) => void;
  groupIntoBoard: () => void;

  restoreFromTrash: (index: number) => void;
  clearTrash: () => void;

  persist: () => void;
  hydrate: () => void;

  pushUndo: () => void;
  undo: () => void;
  redo: () => void;
}

function collectWorkspaceElementIds(
  elements: Record<string, BoardElement>,
  wsId: string,
): Set<string> {
  const toRemove = new Set<string>();
  for (const [id, e] of Object.entries(elements)) {
    if (e.parentBoardId === wsId) toRemove.add(id);
  }
  let added = true;
  while (added) {
    added = false;
    for (const [id, e] of Object.entries(elements)) {
      if (toRemove.has(id)) continue;
      if (e.parentBoardId && toRemove.has(e.parentBoardId)) {
        toRemove.add(id);
        added = true;
      }
    }
  }
  return toRemove;
}

function saveState(state: BoardState) {
  try {
    const data = {
      userSettings: state.userSettings,
      workspaces: state.workspaces,
      activeWorkspaceId: state.activeWorkspaceId,
      trash: state.trash,
      elements: state.elements,
      viewport: state.viewport,
    };
    const json = JSON.stringify(data);
    localStorage.setItem(STORAGE_KEY, json);
    if (isTauri) {
      saveStateTauri(json).catch(() => {});
    }
  } catch {
    /* storage full */
  }
}

export const useBoardStore = create<BoardState>()(
  immer((set, get) => ({
    userSettings: { displayName: "" },
    workspaces: {},
    activeWorkspaceId: null,
    elements: {},
    currentBoardId: null,
    boardStack: [],
    selectedElementId: null,
    selectedElementIds: [],
    clipboard: [],
    viewport: { x: 0, y: 0, scale: 1 },
    trash: [],
    pendingElementType: null,
    drawingMode: false,
    drawingColor: "#ffffff",
    drawingThickness: 2,
    undoStack: [],
    redoStack: [],
    connectMode: false,
    connectorStyle: "straight" as const,
    connectorColor: "",
    connectorThickness: 2.5,
    connectorShowArrowhead: true,
    selectedConnectorId: null,
    selectedTableCell: null,
    view: "home",

    setSelectedTableCell: (cell) => {
      set((s) => {
        s.selectedTableCell = cell;
      });
    },

    setView: (view) => {
      set((s) => {
        s.view = view;
      });
    },

    updateUserSettings: (settings) => {
      set((s) => {
        Object.assign(s.userSettings, settings);
      });
      setTimeout(() => saveState(get()), 0);
    },

    createWorkspace: (name) => {
      const id = generateWorkspaceId();
      set((s) => {
        s.workspaces[id] = {
          id,
          name,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
      });
      setTimeout(() => saveState(get()), 0);
      return id;
    },

    renameWorkspace: (id, name) => {
      set((s) => {
        const ws = s.workspaces[id];
        if (ws) {
          ws.name = name;
          ws.updatedAt = Date.now();
        }
      });
      setTimeout(() => saveState(get()), 0);
    },

    deleteWorkspace: (id) => {
      set((s) => {
        const rm = collectWorkspaceElementIds(s.elements, id);
        for (const eid of rm) {
          delete s.elements[eid];
        }
        delete s.workspaces[id];
        if (s.activeWorkspaceId === id) {
          s.activeWorkspaceId = null;
          s.currentBoardId = null;
          s.boardStack = [];
          s.selectedElementId = null;
          s.view = "home";
        }
      });
      setTimeout(() => saveState(get()), 0);
    },

    lockWorkspace: (id, hash) => {
      set((s) => {
        const ws = s.workspaces[id];
        if (ws) {
          ws.locked = true;
          ws.lockHash = hash;
        }
      });
      setTimeout(() => saveState(get()), 0);
    },

    unlockWorkspace: (id) => {
      set((s) => {
        const ws = s.workspaces[id];
        if (ws) {
          ws.locked = false;
          ws.lockHash = undefined;
        }
      });
      setTimeout(() => saveState(get()), 0);
    },

    openWorkspace: (id) => {
      set((s) => {
        s.activeWorkspaceId = id;
        s.currentBoardId = id;
        s.boardStack = [];
        s.selectedElementId = null;
        s.view = "canvas";
        const ws = s.workspaces[id];
        if (ws) ws.updatedAt = Date.now();
      });
      setTimeout(() => saveState(get()), 0);
    },

    enterBoard: (boardElementId) => {
      const el = get().elements[boardElementId];
      if (!el || el.type !== "board") return;
      set((s) => {
        if (s.currentBoardId !== null) s.boardStack.push(s.currentBoardId);
        s.currentBoardId = boardElementId;
        s.selectedElementId = null;
      });
      setTimeout(() => saveState(get()), 0);
    },

    goBack: () => {
      set((s) => {
        const prev = s.boardStack.pop();
        const ws = s.activeWorkspaceId;
        if (prev !== undefined) {
          s.currentBoardId = prev;
        } else if (ws) {
          s.currentBoardId = ws;
        }
        s.selectedElementId = null;
      });
      setTimeout(() => saveState(get()), 0);
    },

    goHome: () => {
      set((s) => {
        s.view = "home";
        s.activeWorkspaceId = null;
        s.currentBoardId = null;
        s.boardStack = [];
        s.selectedElementId = null;
      });
      setTimeout(() => saveState(get()), 0);
    },

    getCurrentBoardName: () => {
      const s = get();
      const wsId = s.activeWorkspaceId;
      if (!wsId) return "Home";
      if (s.currentBoardId === wsId) {
        return s.workspaces[wsId]?.name ?? "Canvas";
      }
      const b = s.elements[s.currentBoardId ?? ""];
      return b?.content?.trim() || "Board";
    },

    getVisibleElements: () => {
      const s = get();
      const pid = s.currentBoardId;
      if (pid === null) return [];
      return Object.values(s.elements).filter((e) => e.parentBoardId === pid);
    },

    createElement: (type, at) => {
      const s = get();
      const ws = s.activeWorkspaceId;
      const parent = s.currentBoardId;
      if (!ws || parent === null) return null;
      get().pushUndo();

      const { scale, x: vx, y: vy } = s.viewport;
      // When added from toolbar (no position), place in visible center with random offset
      const randOff = !at ? { dx: (Math.random() - 0.5) * 200, dy: (Math.random() - 0.5) * 200 } : { dx: 0, dy: 0 };
      const cx = (at?.x ?? 400) + randOff.dx;
      const cy = (at?.y ?? 300) + randOff.dy;
      const worldX = snapToGrid((cx - vx) / scale);
      const worldY = snapToGrid((cy - vy) / scale);
      const size = getDefaultSize(type);
      const id = generateId();
      const now = Date.now();

      set((st) => {
        st.elements[id] = {
          id,
          type,
          parentBoardId: parent,
          position: { x: worldX, y: worldY },
          content: getDefaultContent(type),
          width: size.width,
          height: size.height,
          createdAt: now,
        };
        st.selectedElementId = id;
        const w = st.workspaces[ws];
        if (w) w.updatedAt = now;
      });
      setTimeout(() => saveState(get()), 0);
      return id;
    },

    updateElement: (id, patch) => {
      set((s) => {
        const e = s.elements[id];
        if (!e) return;
        Object.assign(e, patch);
        const ws = s.activeWorkspaceId;
        if (ws && s.workspaces[ws]) s.workspaces[ws]!.updatedAt = Date.now();
      });
      setTimeout(() => saveState(get()), 0);
    },

    deleteElement: (id) => {
      const s = get();
      const el = s.elements[id];
      if (!el || !s.activeWorkspaceId) return;
      get().pushUndo();
      set((st) => {
        delete st.elements[id];
        if (st.selectedElementId === id) st.selectedElementId = null;
        const w = st.workspaces[st.activeWorkspaceId!];
        if (w) w.updatedAt = Date.now();
      });
      setTimeout(() => saveState(get()), 0);
    },

    setSelectedElement: (id) => {
      set((s) => {
        s.selectedElementId = id;
        s.selectedElementIds = id ? [id] : [];
        s.selectedConnectorId = null;
        // Clear table cell selection when switching elements
        if (!id || (id !== s.selectedElementId)) {
          s.selectedTableCell = null;
        }
        // Exit drawing mode when selecting a non-drawing element
        if (id && s.drawingMode) {
          const el = s.elements[id];
          if (el && el.type !== "drawing") {
            s.drawingMode = false;
            s.drawingColor = "#ffffff";
            s.drawingThickness = 2;
          }
        }
      });
    },

    setSelectedElements: (ids) => {
      set((s) => {
        s.selectedElementIds = ids;
        s.selectedElementId = ids.length > 0 ? ids[ids.length - 1] : null;
      });
    },

    addToSelection: (id) => {
      set((s) => {
        if (!s.selectedElementIds.includes(id)) {
          s.selectedElementIds.push(id);
        }
        s.selectedElementId = id;
      });
    },

    removeFromSelection: (id) => {
      set((s) => {
        s.selectedElementIds = s.selectedElementIds.filter((x) => x !== id);
        if (s.selectedElementId === id) {
          s.selectedElementId = s.selectedElementIds[s.selectedElementIds.length - 1] ?? null;
        }
      });
    },

    selectAll: () => {
      const s = get();
      if (!s.currentBoardId) return;
      const ids = Object.values(s.elements)
        .filter((e) => e.parentBoardId === s.currentBoardId && e.type !== "arrow")
        .map((e) => e.id);
      set((st) => {
        st.selectedElementIds = ids;
        st.selectedElementId = ids[ids.length - 1] ?? null;
      });
    },

    copySelected: () => {
      const s = get();
      const ids = s.selectedElementIds;
      if (ids.length === 0) return;
      const copies = ids.map((id) => ({ ...s.elements[id]! })).filter(Boolean);
      set((st) => {
        st.clipboard = copies;
      });
    },

    pasteClipboard: () => {
      const s = get();
      if (s.clipboard.length === 0 || !s.currentBoardId || !s.activeWorkspaceId) return;
      get().pushUndo();
      const now = Date.now();
      const newIds: string[] = [];
      set((st) => {
        for (const orig of st.clipboard) {
          const id = generateId();
          st.elements[id] = {
            ...orig,
            id,
            parentBoardId: st.currentBoardId!,
            position: { x: orig.position.x + 30, y: orig.position.y + 30 },
            createdAt: now,
          };
          newIds.push(id);
        }
        st.selectedElementIds = newIds;
        st.selectedElementId = newIds[newIds.length - 1] ?? null;
        const w = st.workspaces[st.activeWorkspaceId!];
        if (w) w.updatedAt = now;
      });
      setTimeout(() => saveState(get()), 0);
    },

    deleteSelected: () => {
      const s = get();
      const ids = s.selectedElementIds;
      if (ids.length === 0) return;
      get().pushUndo();
      set((st) => {
        for (const id of ids) {
          delete st.elements[id];
        }
        st.selectedElementIds = [];
        st.selectedElementId = null;
        const w = st.workspaces[st.activeWorkspaceId!];
        if (w) w.updatedAt = Date.now();
      });
      setTimeout(() => saveState(get()), 0);
    },

    setViewport: (v) => {
      set((s) => {
        if (v.x !== undefined) s.viewport.x = v.x;
        if (v.y !== undefined) s.viewport.y = v.y;
        if (v.scale !== undefined)
          s.viewport.scale = Math.min(2.5, Math.max(0.15, v.scale));
      });
      setTimeout(() => saveState(get()), 0);
    },

    fitToFrame: (canvasWidth, canvasHeight) => {
      const s = get();
      const boardId = s.currentBoardId;
      if (!boardId) return;

      // Get all visible elements in the current board (exclude arrows)
      const els = Object.values(s.elements).filter(
        (e) => e.parentBoardId === boardId && e.type !== "arrow",
      );
      if (els.length === 0) {
        // No elements — reset to default view
        set((st) => {
          st.viewport = { x: 0, y: 0, scale: 1 };
        });
        return;
      }

      // Calculate bounding box of all elements
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const el of els) {
        const x = el.position.x;
        const y = el.position.y;
        const w = el.width ?? 220;
        const h = el.height ?? 160;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x + w > maxX) maxX = x + w;
        if (y + h > maxY) maxY = y + h;
      }

      const contentW = maxX - minX;
      const contentH = maxY - minY;
      const padding = 80; // px padding around content

      // Calculate scale to fit content in the canvas
      const scaleX = (canvasWidth - padding * 2) / contentW;
      const scaleY = (canvasHeight - padding * 2) / contentH;
      const scale = Math.min(2.5, Math.max(0.15, Math.min(scaleX, scaleY)));

      // Center content in the canvas
      const cx = minX + contentW / 2;
      const cy = minY + contentH / 2;
      const x = canvasWidth / 2 - cx * scale;
      const y = canvasHeight / 2 - cy * scale;

      set((st) => {
        st.viewport = { x, y, scale };
      });
      setTimeout(() => saveState(get()), 0);
    },

    setDrawingMode: (on) => {
      set((s) => {
        s.drawingMode = on;
        if (on) {
          s.connectMode = false;
          s.selectedElementId = null;
          s.selectedElementIds = [];
        } else {
          // Reset color to default when exiting drawing mode
          s.drawingColor = "#ffffff";
          s.drawingThickness = 2;
        }
      });
    },

    setDrawingColor: (color) => {
      set((s) => { s.drawingColor = color; });
    },

    setDrawingThickness: (thickness) => {
      set((s) => { s.drawingThickness = thickness; });
    },

    setConnectMode: (on) => {
      set((s) => {
        s.connectMode = on;
        if (on) {
          s.drawingMode = false;
          s.selectedElementId = null;
          s.selectedElementIds = [];
        }
      });
    },

    setConnectorStyle: (style) => {
      set((s) => {
        s.connectorStyle = style;
        // Update any selected connectors to the new style
        if (s.selectedConnectorId) {
          const el = s.elements[s.selectedConnectorId];
          if (el && el.type === "arrow") el.connectorMode = style;
        }
        // Also update any selected connector IDs in multi-select
        for (const id of s.selectedElementIds) {
          const el = s.elements[id];
          if (el && el.type === "arrow") el.connectorMode = style;
        }
      });
      setTimeout(() => saveState(get()), 0);
    },

    setConnectorColor: (color) => {
      set((s) => {
        s.connectorColor = color;
        if (s.selectedConnectorId) {
          const el = s.elements[s.selectedConnectorId];
          if (el && el.type === "arrow") el.connectorColor = color;
        }
        for (const id of s.selectedElementIds) {
          const el = s.elements[id];
          if (el && el.type === "arrow") el.connectorColor = color;
        }
      });
      setTimeout(() => saveState(get()), 0);
    },

    setConnectorThickness: (thickness) => {
      set((s) => {
        s.connectorThickness = thickness;
        if (s.selectedConnectorId) {
          const el = s.elements[s.selectedConnectorId];
          if (el && el.type === "arrow") el.connectorThickness = thickness;
        }
        for (const id of s.selectedElementIds) {
          const el = s.elements[id];
          if (el && el.type === "arrow") el.connectorThickness = thickness;
        }
      });
      setTimeout(() => saveState(get()), 0);
    },

    setConnectorShowArrowhead: (show) => {
      set((s) => {
        s.connectorShowArrowhead = show;
        if (s.selectedConnectorId) {
          const el = s.elements[s.selectedConnectorId];
          if (el && el.type === "arrow") el.showArrowhead = show;
        }
        for (const id of s.selectedElementIds) {
          const el = s.elements[id];
          if (el && el.type === "arrow") el.showArrowhead = show;
        }
      });
      setTimeout(() => saveState(get()), 0);
    },

    setSelectedConnector: (id) => {
      set((s) => {
        s.selectedConnectorId = id;
        if (id) {
          // Auto-enter connect mode and match the connector's style/color/thickness
          const el = s.elements[id];
          if (el) {
            if (el.connectorMode) s.connectorStyle = el.connectorMode;
            if (el.connectorColor) s.connectorColor = el.connectorColor;
            if (el.connectorThickness) s.connectorThickness = el.connectorThickness;
            s.connectorShowArrowhead = el.showArrowhead !== false;
          }
          s.connectMode = true;
          s.drawingMode = false;
          s.selectedElementId = null;
          s.selectedElementIds = [];
        }
      });
    },

    createConnector: (fromId, fromSide, toId, toSide, fromAnchorId, toAnchorId) => {
      const s = get();
      if (!s.activeWorkspaceId || !s.currentBoardId) return null;
      if (fromId === toId) return null;
      get().pushUndo();
      // Prevent duplicate connectors between same elements on same sides
      const exists = Object.values(s.elements).find(
        (e) => e.type === "arrow" && e.linkFromId === fromId && e.linkToId === toId
          && e.linkFromSide === fromSide && e.linkToSide === toSide,
      );
      if (exists) return null;

      const id = generateId();
      const now = Date.now();
      set((st) => {
        st.elements[id] = {
          id,
          type: "arrow",
          parentBoardId: st.currentBoardId!,
          position: { x: 0, y: 0 },
          content: "",
          width: 0,
          height: 0,
          linkFromId: fromId,
          linkToId: toId,
          linkFromSide: fromSide as any,
          linkToSide: toSide as any,
          linkFromAnchorId: fromAnchorId || null,
          linkToAnchorId: toAnchorId || null,
          connectorMode: st.connectorStyle,
          connectorColor: st.connectorColor,
          connectorThickness: st.connectorThickness,
          showArrowhead: st.connectorShowArrowhead,
          createdAt: now,
        };
        const w = st.workspaces[st.activeWorkspaceId!];
        if (w) w.updatedAt = now;
      });
      setTimeout(() => saveState(get()), 0);
      return id;
    },

    setPendingElementType: (type) => {
      set((s) => {
        s.pendingElementType = type;
        if (type) {
          s.drawingMode = false;
          s.connectMode = false;
        }
      });
    },

    sendBackward: (id) => {
      const s = get();
      const el = s.elements[id];
      if (!el) return;
      get().pushUndo();
      const siblings = Object.values(s.elements)
        .filter((e) => e.parentBoardId === el.parentBoardId && e.type !== "arrow")
        .sort((a, b) => (a.zIndex ?? a.createdAt) - (b.zIndex ?? b.createdAt));
      const idx = siblings.findIndex((e) => e.id === id);
      if (idx <= 0) return;
      set((st) => {
        // Swap zIndex with the element below
        const belowId = siblings[idx - 1].id;
        const belowZ = st.elements[belowId].zIndex ?? st.elements[belowId].createdAt;
        const curZ = st.elements[id].zIndex ?? st.elements[id].createdAt;
        st.elements[id].zIndex = belowZ;
        st.elements[belowId].zIndex = curZ;
      });
      setTimeout(() => saveState(get()), 0);
    },

    bringForward: (id) => {
      const s = get();
      const el = s.elements[id];
      if (!el) return;
      get().pushUndo();
      const siblings = Object.values(s.elements)
        .filter((e) => e.parentBoardId === el.parentBoardId && e.type !== "arrow")
        .sort((a, b) => (a.zIndex ?? a.createdAt) - (b.zIndex ?? b.createdAt));
      const idx = siblings.findIndex((e) => e.id === id);
      if (idx < 0 || idx >= siblings.length - 1) return;
      set((st) => {
        const aboveId = siblings[idx + 1].id;
        const aboveZ = st.elements[aboveId].zIndex ?? st.elements[aboveId].createdAt;
        const curZ = st.elements[id].zIndex ?? st.elements[id].createdAt;
        st.elements[id].zIndex = aboveZ;
        st.elements[aboveId].zIndex = curZ;
      });
      setTimeout(() => saveState(get()), 0);
    },

    groupIntoBoard: () => {
      const s = get();
      if (s.selectedElementIds.length === 0 || !s.currentBoardId) return;
      get().pushUndo();
      const selected = s.selectedElementIds
        .map((id) => s.elements[id])
        .filter((e) => e && e.type !== "arrow");
      if (selected.length === 0) return;
      // Compute bounding box of selected elements
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const el of selected) {
        minX = Math.min(minX, el.position.x);
        minY = Math.min(minY, el.position.y);
        maxX = Math.max(maxX, el.position.x + el.width);
        maxY = Math.max(maxY, el.position.y + el.height);
      }
      const boardId = generateId();
      const now = Date.now();
      set((st) => {
        // Create a new board element at the bounding box position
        st.elements[boardId] = {
          id: boardId,
          type: "board",
          parentBoardId: st.currentBoardId!,
          position: { x: minX - 20, y: minY - 40 },
          content: "Group",
          width: maxX - minX + 40,
          height: maxY - minY + 60,
          createdAt: now,
        };
        // Move selected elements into the new board, adjust positions to be relative
        for (const el of selected) {
          st.elements[el.id].parentBoardId = boardId;
          st.elements[el.id].position = {
            x: el.position.x - minX + 20,
            y: el.position.y - minY + 20,
          };
        }
        st.selectedElementId = boardId;
        st.selectedElementIds = [boardId];
      });
      setTimeout(() => saveState(get()), 0);
    },

    restoreFromTrash: (index) => {
      set((s) => {
        const entry = s.trash[index];
        if (!entry) return;
        s.elements[entry.element.id] = { ...entry.element };
        s.trash.splice(index, 1);
      });
      setTimeout(() => saveState(get()), 0);
    },

    clearTrash: () => {
      set((s) => {
        s.trash = [];
      });
      setTimeout(() => saveState(get()), 0);
    },

    persist: () => saveState(get()),

    hydrate: () => {
      const applyData = (raw: string) => {
        if (!raw) return;
        try {
          const data = JSON.parse(raw) as Record<string, unknown>;
          const hadBlocksuiteOnly =
            typeof data.blocksuiteYdoc === "string" &&
            (!data.elements ||
              typeof data.elements !== "object" ||
              Object.keys(data.elements as object).length === 0);
          if (hadBlocksuiteOnly) {
            console.warn(
              "[Umbra] This save only had BlockSuite data. Extract the BlockSuite version from ~/Desktop/Umbra-backups/ if you need it.",
            );
          }
          set((s) => {
            if (data.userSettings) s.userSettings = data.userSettings as UserSettings;
            if (data.workspaces) s.workspaces = data.workspaces as Record<string, Workspace>;
            if (data.trash) s.trash = data.trash as TrashEntry[];
            if (data.elements && typeof data.elements === "object") {
              s.elements = data.elements as Record<string, BoardElement>;
            }
            if (
              data.viewport &&
              typeof data.viewport === "object" &&
              data.viewport !== null
            ) {
              const v = data.viewport as BoardState["viewport"];
              s.viewport = {
                x: typeof v.x === "number" ? v.x : 0,
                y: typeof v.y === "number" ? v.y : 0,
                scale:
                  typeof v.scale === "number"
                    ? Math.min(2.5, Math.max(0.15, v.scale))
                    : 1,
              };
            }
            s.activeWorkspaceId = null;
            s.currentBoardId = null;
            s.boardStack = [];
            s.selectedElementId = null;
            s.view = "home";
          });
        } catch {
          /* corrupt */
        }
      };

      if (isTauri) {
        loadStateTauri()
          .then((raw) => {
            applyData(raw || localStorage.getItem(STORAGE_KEY) || DEFAULT_STATE);
          })
          .catch(() => applyData(localStorage.getItem(STORAGE_KEY) || DEFAULT_STATE));
      } else {
        applyData(localStorage.getItem(STORAGE_KEY) || DEFAULT_STATE);
      }
    },

    pushUndo: () => {
      const s = get();
      const snapshot = JSON.parse(JSON.stringify(s.elements)) as Record<string, BoardElement>;
      set((st) => {
        st.undoStack.push(snapshot);
        if (st.undoStack.length > 50) st.undoStack.shift();
        st.redoStack = [];
      });
    },

    undo: () => {
      const s = get();
      if (s.undoStack.length === 0) return;
      const current = JSON.parse(JSON.stringify(s.elements)) as Record<string, BoardElement>;
      const prev = s.undoStack[s.undoStack.length - 1];
      set((st) => {
        st.redoStack.push(current);
        st.undoStack.pop();
        st.elements = prev;
        st.selectedElementId = null;
        st.selectedElementIds = [];
        st.selectedConnectorId = null;
      });
      setTimeout(() => saveState(get()), 0);
    },

    redo: () => {
      const s = get();
      if (s.redoStack.length === 0) return;
      const current = JSON.parse(JSON.stringify(s.elements)) as Record<string, BoardElement>;
      const next = s.redoStack[s.redoStack.length - 1];
      set((st) => {
        st.undoStack.push(current);
        st.redoStack.pop();
        st.elements = next;
        st.selectedElementId = null;
        st.selectedElementIds = [];
        st.selectedConnectorId = null;
      });
      setTimeout(() => saveState(get()), 0);
    },
  })),
);
