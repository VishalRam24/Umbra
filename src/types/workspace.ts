export interface Workspace {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  locked?: boolean;
  /** SHA-256 hash of the lock password */
  lockHash?: string;
}

export interface UserSettings {
  displayName: string;
  theme?: "dark" | "light";
}

export interface TrashEntry {
  element: import("./elements").BoardElement;
  deletedAt: number;
  fromWorkspaceId: string;
}

export function generateWorkspaceId(): string {
  return `ws_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
