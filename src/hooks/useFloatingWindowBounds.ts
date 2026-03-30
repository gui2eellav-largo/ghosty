import { useLayoutEffect, useRef, type MutableRefObject } from "react";
import { invoke } from "@tauri-apps/api/core";
import { designTokens } from "@/lib/design-tokens";

const fw = designTokens.floatingWidget;

export type FloatingLayoutMode = "pill" | "menu";

function useLastBoundsRef() {
  const ref = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  return ref;
}

export function useFloatingWindowBounds(
  layoutMode: FloatingLayoutMode,
  positionReady: boolean,
  centerXRef: MutableRefObject<number>,
  windowYRef: MutableRefObject<number>,
  showToast?: boolean,
  isExpanded?: boolean,
): void {
  const lastBoundsRef = useLastBoundsRef();

  useLayoutEffect(() => {
    if (!positionReady) return;

    const centerX = centerXRef.current;
    const y = windowYRef.current;

    if (layoutMode === "menu") {
      const w = fw.menuWidth;
      const h = fw.menuHeight;
      const pillW = fw.expandedWidth + 2 * fw.bouncePadding;
      const x = Math.round(centerX - pillW / 2);
      const same = lastBoundsRef.current?.x === x && lastBoundsRef.current?.y === y && lastBoundsRef.current?.w === w && lastBoundsRef.current?.h === h;
      if (same) return;
      lastBoundsRef.current = { x, y, w, h };
      invoke("set_floating_window_bounds", { x, y, width: w, height: h }).catch(console.error);
      return;
    }

    // When pill is idle (not hovered/active), use a smaller window to minimize
    // the invisible click-blocking area. The pill at scale 0.5 is ~43px wide,
    // so 50px is enough. When expanded (hover/recording), use full width.
    const fullW = fw.expandedWidth + 2 * fw.bouncePadding;
    const idleW = Math.round(fw.expandedWidth * 0.5) + 2 * fw.bouncePadding + 4; // ~55px
    const w = isExpanded ? fullW : idleW;
    const toastExtra = showToast ? 28 : 0;
    const h = fw.pillSize + 2 * fw.bouncePadding + toastExtra;
    const x = Math.round(centerX - w / 2);
    const same = lastBoundsRef.current?.x === x && lastBoundsRef.current?.y === y && lastBoundsRef.current?.w === w && lastBoundsRef.current?.h === h;
    if (same) return;
    lastBoundsRef.current = { x, y, w, h };
    invoke("set_floating_window_bounds", { x, y, width: w, height: h }).catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lastBoundsRef is a ref, stable
  }, [positionReady, layoutMode, centerXRef, windowYRef, showToast, isExpanded]);
}
