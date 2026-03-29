import { getCurrentWindow } from "@tauri-apps/api/window";

const TAURI_IN_GLOBAL =
  typeof window !== "undefined" && "__TAURI__" in window;

/**
 * Label de la fenêtre courante, ou "main" si pas dans Tauri / API indisponible.
 */
export function getWindowLabel(): string {
  if (!TAURI_IN_GLOBAL) return "main";
  try {
    return getCurrentWindow().label;
  } catch {
    return "main";
  }
}

export function isTauri(): boolean {
  return TAURI_IN_GLOBAL;
}
