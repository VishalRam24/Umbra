const isTauri = typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__;

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri) {
    throw new Error("Not running in Tauri");
  }
  const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
  return tauriInvoke<T>(cmd, args);
}

export async function saveStateTauri(json: string): Promise<void> {
  if (!isTauri) return;
  await invoke("save_state", { json });
}

export async function loadStateTauri(): Promise<string> {
  if (!isTauri) return "";
  return invoke<string>("load_state");
}

export interface ImportedAsset {
  asset_id: string;
  path: string;
}

export async function importAsset(
  sourcePath: string,
  fileName: string,
): Promise<ImportedAsset> {
  return invoke<ImportedAsset>("import_asset", {
    sourcePath,
    fileName,
  });
}

export async function getAssetPath(assetId: string): Promise<string> {
  return invoke<string>("get_asset_path", { assetId });
}

export async function openFileExternal(path: string): Promise<void> {
  await invoke("open_file_external", { path });
}

export async function copyAssetToPath(
  assetId: string,
  destPath: string,
): Promise<void> {
  await invoke("copy_asset_to_path", { assetId, destPath });
}

export interface LinkMeta {
  title: string;
  description: string;
  image: string;
  favicon: string;
}

export async function fetchLinkMeta(url: string): Promise<LinkMeta | null> {
  if (!isTauri) return null;
  try {
    return await invoke<LinkMeta>("fetch_link_meta", { url });
  } catch {
    return null;
  }
}

/** Open a "Save As" dialog and copy an asset file to the user-chosen path. */
export async function saveAssetAs(assetLocalPath: string, defaultFileName: string): Promise<boolean> {
  if (!isTauri) return false;
  try {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { copyFile } = await import("@tauri-apps/plugin-fs");
    const destPath = await save({
      defaultPath: defaultFileName,
      title: "Save file as",
    });
    if (!destPath) return false;
    await copyFile(assetLocalPath, destPath);
    return true;
  } catch (err) {
    console.error("Failed to save asset:", err);
    return false;
  }
}

/** Check if Touch ID / biometric auth is available on this device. */
export async function biometricAvailable(): Promise<boolean> {
  if (!isTauri) return false;
  try {
    return await invoke<boolean>("biometric_available");
  } catch {
    return false;
  }
}

/** Prompt the user for Touch ID authentication. Returns true if succeeded. */
export async function biometricAuthenticate(reason: string): Promise<boolean> {
  if (!isTauri) return false;
  try {
    return await invoke<boolean>("biometric_authenticate", { reason });
  } catch {
    return false;
  }
}

export { isTauri };
