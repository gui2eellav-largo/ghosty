import { useEffect, useRef, useState } from "react";
import { X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { strings } from "@/lib/strings";
import type { WordCandidate } from "@/types";

const AUTO_DISMISS_MS = 12_000;

interface CorrectionSuggestionProps {
  candidates: WordCandidate[];
  onAccept: (candidate: WordCandidate) => void;
  onDismiss: (candidate: WordCandidate) => void;
  onDismissAll: () => void;
}

export function CorrectionSuggestion({
  candidates,
  onAccept,
  onDismiss,
  onDismissAll,
}: CorrectionSuggestionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = candidates[currentIndex];

  // Auto-dismiss after AUTO_DISMISS_MS ms
  useEffect(() => {
    if (!current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onDismissAll();
    }, AUTO_DISMISS_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [current, onDismissAll]);

  if (!current) return null;

  const handleAccept = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    onAccept(current);
    const next = currentIndex + 1;
    if (next >= candidates.length) {
      onDismissAll();
    } else {
      setCurrentIndex(next);
    }
  };

  const handleDismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    onDismiss(current);
    const next = currentIndex + 1;
    if (next >= candidates.length) {
      onDismissAll();
    } else {
      setCurrentIndex(next);
    }
  };

  const remaining = candidates.length - currentIndex - 1;

  return (
    <div
      className={cn(
        "absolute top-full mt-2 z-50 pointer-events-auto",
        "flex items-center gap-2 px-2.5 py-2 rounded-xl",
        "[background:var(--floating-menu-bg)] border [border-color:var(--floating-menu-border)]",
        "floating-menu-enter"
      )}
      style={{
        left: "50%",
        transform: "translateX(-50%)",
        whiteSpace: "nowrap",
        animationDuration: "220ms",
      }}
      role="alert"
      aria-live="polite"
    >
      {/* Color dot */}
      <div
        className="shrink-0 rounded-full"
        style={{ width: 6, height: 6, minWidth: 6, backgroundColor: "#10b981" }}
        aria-hidden
      />

      {/* Misspelling → Correction */}
      <span className="text-[11px] text-white/70 line-through">{current.misspelling}</span>
      <span className="text-[11px] text-white/50 mx-0.5">→</span>
      <span className="text-[11px] text-white/90 font-medium">{current.correction}</span>

      {/* Remaining count */}
      {remaining > 0 && (
        <span className="text-[10px] text-white/50 ml-0.5">+{remaining}</span>
      )}

      {/* Accept */}
      <button
        type="button"
        onClick={handleAccept}
        aria-label={strings.correction.addToDictionary(current.correction)}
        className={cn(
          "ml-1 flex items-center justify-center w-5 h-5 rounded-md p-3 -m-1.5",
          "text-white/70 hover:text-white hover:bg-white/10 transition-colors duration-150"
        )}
      >
        <Plus size={12} />
      </button>

      {/* Dismiss */}
      <button
        type="button"
        onClick={handleDismiss}
        aria-label={strings.correction.dismiss}
        className={cn(
          "flex items-center justify-center w-5 h-5 rounded-md p-3 -m-1.5",
          "text-white/50 hover:text-white/70 hover:bg-white/[0.06] transition-colors duration-150"
        )}
      >
        <X size={11} />
      </button>
    </div>
  );
}
