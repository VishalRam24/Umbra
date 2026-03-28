/** Matches AFFiNE / BlockSuite connector routing modes (straight / elbow / curve). */
export type ConnectorMode = "straight" | "orthogonal" | "curve";

export type ElementType =
  | "board"
  | "note"
  | "link"
  | "image"
  | "checklist"
  | "table"
  | "drawing"
  | "comment"
  | "arrow"
  | "document"
  | "file"
  | "text";

export interface Position {
  x: number;
  y: number;
}

export interface ElementSize {
  width: number;
  height: number;
}

export interface BoardElement {
  id: string;
  type: ElementType;
  parentBoardId: string | null;
  containerId?: string | null;
  position: Position;
  content: string;
  width: number;
  height: number;
  linkFromId?: string | null;
  linkToId?: string | null;
  linkFromSide?: "top" | "right" | "bottom" | "left" | null;
  linkToSide?: "top" | "right" | "bottom" | "left" | null;
  /** Anchor ID for checklist per-item connectors (e.g. "item-0") */
  linkFromAnchorId?: string | null;
  linkToAnchorId?: string | null;
  connectorMode?: ConnectorMode | null;
  /** Connector line color */
  connectorColor?: string;
  /** Connector line thickness */
  connectorThickness?: number;
  /** Whether to show arrowhead at destination (default: true) */
  showArrowhead?: boolean;
  assetPath?: string;
  assetLocalPath?: string;
  mimeType?: string;
  fileName?: string;
  locked?: boolean;
  passwordHash?: string;
  color?: string;
  noteTextAlign?: "left" | "center";
  noteAutoSize?: boolean;
  aspectRatio?: number;
  /** Text block styling */
  textBold?: boolean;
  textItalic?: boolean;
  textStrikethrough?: boolean;
  textFontSize?: number;
  textColor?: string;
  /** Drawing-specific: SVG path data for freehand strokes */
  drawingPath?: string;
  /** Drawing stroke color */
  drawingColor?: string;
  /** Drawing stroke thickness */
  drawingThickness?: number;
  /** Table-specific settings */
  tableCellHeight?: number;
  tableShadeFirstRow?: boolean;
  tableShadeFirstCol?: boolean;
  tableShowTitle?: boolean;
  tableTitle?: string;
  /** Link preview metadata */
  linkTitle?: string;
  linkDescription?: string;
  linkImage?: string;
  linkFavicon?: string;
  /** Z-order index — higher renders on top */
  zIndex?: number;
  createdAt: number;
}

/** Note color palette (5 colors, dark mode) */
export const NOTE_COLORS: Record<string, { bg: string; bar: string; text: string }> = {
  default: { bg: "#2a2c30", bar: "rgba(255,255,255,0.08)", text: "rgba(255,255,255,0.82)" },
  yellow:  { bg: "#353020", bar: "#d4a72c", text: "rgba(255,250,200,0.85)" },
  pink:    { bg: "#352530", bar: "#d65a9a", text: "rgba(255,210,235,0.85)" },
  blue:    { bg: "#222835", bar: "#4a8fe7", text: "rgba(200,220,255,0.85)" },
  green:   { bg: "#223028", bar: "#3fba6a", text: "rgba(210,255,220,0.85)" },
};

/** Note color palette (light mode) */
export const NOTE_COLORS_LIGHT: Record<string, { bg: string; bar: string; text: string }> = {
  default: { bg: "#ffffff", bar: "rgba(44,44,46,0.14)", text: "#3a3a3c" },
  yellow:  { bg: "#fdf6dc", bar: "#c8961e", text: "#4a3800" },
  pink:    { bg: "#fce8f0", bar: "#d14a8e", text: "#5a0f32" },
  blue:    { bg: "#e6eefa", bar: "#3a7fd6", text: "#0f235a" },
  green:   { bg: "#e4f7ea", bar: "#2ea55a", text: "#083219" },
};

/** Get the right note color palette based on theme */
export function getNoteColors(theme: "dark" | "light"): Record<string, { bg: string; bar: string; text: string }> {
  return theme === "light" ? NOTE_COLORS_LIGHT : NOTE_COLORS;
}

export const GRID_SIZE = 10;

export function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

let counter = 0;
export function generateId(): string {
  return `el_${Date.now()}_${++counter}`;
}

export function getDefaultContent(type: ElementType): string {
  switch (type) {
    case "board":
      return "Untitled Board";
    case "note":
      return "";
    case "link":
      return "https://";
    case "image":
      return "";
    case "checklist":
      return JSON.stringify([
        { id: "item_1", text: "First task", done: false },
        { id: "item_2", text: "Second task", done: false },
      ]);
    case "table":
      return JSON.stringify({
        cells: [
          ["", "", ""],
          ["", "", ""],
          ["", "", ""],
        ],
        cellStyles: {},
      });
    case "drawing":
      return "";
    case "comment":
      return "";
    case "arrow":
      return "";
    case "document":
      return "";
    case "file":
      return "";
    case "text":
      return "Text";
    default:
      return "";
  }
}

const DEFAULT_SIZES: Record<ElementType, ElementSize> = {
  board: { width: 180, height: 100 },
  note: { width: 240, height: 80 },
  link: { width: 260, height: 180 },
  image: { width: 260, height: 200 },

  checklist: { width: 220, height: 180 },
  table: { width: 360, height: 180 },
  drawing: { width: 320, height: 250 },
  comment: { width: 220, height: 120 },
  arrow: { width: 240, height: 130 },
  document: { width: 280, height: 200 },
  file: { width: 220, height: 90 },
  text: { width: 240, height: 60 },
};

export function getDefaultSize(type: ElementType): ElementSize {
  return DEFAULT_SIZES[type] ?? { width: 240, height: 160 };
}

export function getElementSize(type: ElementType): ElementSize {
  return getDefaultSize(type);
}
