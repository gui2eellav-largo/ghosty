import { useLayoutEffect, useRef, type MutableRefObject } from "react";
import { invoke } from "@tauri-apps/api/core";
import { designTokens } from "@/lib/design-tokens";

const fw = designTokens.floatingWidget;
// Must match the CSS transition duration on the pill's transform
const PILL_ANIMATION_MS = 220;

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
  const shrinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLayoutEffect(() => {
    if (!positionReady) return;

    const centerX = centerXRef.current;
    const y = windowYRef.current;

    // Clear any pending shrink when state changes
    if (shrinkTimerRef.current) {
      clearTimeout(shrinkTimerRef.current);
      shrinkTimerRef.current = null;
    }

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

    const fullW = fw.expandedWidth + 2 * fw.bouncePadding;
    const idleW = Math.round(fw.expandedWidth * 0.5) + 2 * fw.bouncePadding + 4; // ~55px
    const w = isExpanded ? fullW : idleW;
    const toastExtra = showToast ? 28 : 0;
    const h = fw.pillSize + 2 * fw.bouncePadding + toastExtra;
    const x = Math.round(centerX - w / 2);
    const same = lastBoundsRef.current?.x === x && lastBoundsRef.current?.y === y && lastBoundsRef.current?.w === w && lastBoundsRef.current?.h === h;
    if (same) return;

    const applyBounds = () => {
      lastBoundsRef.current = { x, y, w, h };
      invoke("set_floating_window_bounds", { x, y, width: w, height: h }).catch(console.error);
    };

    if (!isExpanded && lastBoundsRef.current && lastBoundsRef.current.w > w) {
      // Shrinking: delay so the CSS scale animation finishes first (avoids clipping)
      shrinkTimerRef.current = setTimeout(applyBounds, PILL_ANIMATION_MS);
    } else {
      // Expanding or same size: apply immediately
      applyBounds();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps -- lastBoundsRef is a ref, stable
  }, [positionReady, layoutMode, centerXRef, windowYRef, showToast, isExpanded]);
}
