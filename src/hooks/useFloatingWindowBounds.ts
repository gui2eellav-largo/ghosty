import { useLayoutEffect, useRef, type MutableRefObject } from "react";
import { invoke } from "@tauri-apps/api/core";
import { designTokens } from "@/lib/design-tokens";

const fw = designTokens.floatingWidget;

export type FloatingLayoutMode = "pill" | "menu";

/** Dernières bounds envoyées : on n'invoque que si ça a changé (évite double appel + sliding pill puis menu). */
function useLastBoundsRef() {
  const ref = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  return ref;
}

/** Bounds en useLayoutEffect pour être appliqués avant le paint (évite 1 frame de flash). */
export function useFloatingWindowBounds(
  layoutMode: FloatingLayoutMode,
  positionReady: boolean,
  centerXRef: MutableRefObject<number>,
  windowYRef: MutableRefObject<number>
): void {
  const lastBoundsRef = useLastBoundsRef();

  useLayoutEffect(() => {
    if (!positionReady) return;

    const centerX = centerXRef.current;
    const y = windowYRef.current;

    if (layoutMode === "menu") {
      const w = fw.menuWidth;
      const h = fw.menuHeight;
      // Même position qu'en pill : la fenêtre native ne suit pas toujours le x envoyé ; le menu est recentré par mesure (FloatingBar).
      const pillW = fw.expandedWidth + 2 * fw.bouncePadding;
      const x = Math.round(centerX - pillW / 2);
      const same = lastBoundsRef.current?.x === x && lastBoundsRef.current?.y === y && lastBoundsRef.current?.w === w && lastBoundsRef.current?.h === h;
      if (same) return;
      const prev = lastBoundsRef.current;
      lastBoundsRef.current = { x, y, w, h };
      const deltaX = prev ? x - prev.x : 0;
      invoke("menu_bounds_log", {
        line: `FRONT useLayoutEffect layoutMode=menu centerX=${centerX} x=${x} w=${w} prevX=${prev?.x ?? "null"} deltaX=${deltaX} -> set_floating_window_bounds`,
      }).catch(() => {});
      invoke("set_floating_window_bounds", { x, y, width: w, height: h }).catch(console.error);
      return;
    }

    const w = fw.expandedWidth + 2 * fw.bouncePadding;
    const h = fw.pillSize + 2 * fw.bouncePadding;
    const x = Math.round(centerX - w / 2);
    const same = lastBoundsRef.current?.x === x && lastBoundsRef.current?.y === y && lastBoundsRef.current?.w === w && lastBoundsRef.current?.h === h;
    if (same) return;
    const prev = lastBoundsRef.current;
    lastBoundsRef.current = { x, y, w, h };
    const deltaX = prev ? x - prev.x : 0;
    invoke("menu_bounds_log", {
      line: `FRONT useLayoutEffect layoutMode=pill centerX=${centerX} x=${x} w=${w} prevX=${prev?.x ?? "null"} deltaX=${deltaX} -> set_floating_window_bounds`,
    }).catch(() => {});
    invoke("set_floating_window_bounds", { x, y, width: w, height: h }).catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lastBoundsRef is a ref, stable
  }, [positionReady, layoutMode, centerXRef, windowYRef]);
}
