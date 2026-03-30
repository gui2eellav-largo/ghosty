import { useEffect } from "react";
import { User, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { strings } from "@/lib/strings";

export interface ProfilePopoverProps {
  isOpen: boolean;
  onClose: () => void;
  displayName: string;
  wordsGenerated: number;
  onManageAccount: () => void;
}

export function ProfilePopover({
  isOpen,
  onClose,
  displayName,
  wordsGenerated,
  onManageAccount,
}: ProfilePopoverProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const wordsLabel = strings.profile.wordsGenerated(wordsGenerated);

  return (
    <div
      className={cn(
        "absolute right-0 top-full mt-1 z-50 w-64 rounded-lg border border-border bg-popover shadow-lg py-3 px-4",
        "animate-in fade-in slide-in-from-top-1 duration-150"
      )}
      role="dialog"
      aria-label="Profile"
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-black/10 dark:bg-white/10 text-muted-foreground font-medium text-sm shrink-0">
          {displayName.trim() ? (
            (displayName
              .trim()
              .split(/\s+/)
              .map((s) => s[0])
              .join("")
              .slice(0, 2) || "?")
              .toUpperCase()
          ) : (
            <User size={18} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">
            {displayName.trim() || strings.profile.guest}
          </p>
          <p className="text-[11px] text-muted-foreground/60">{wordsLabel}</p>
        </div>
      </div>
      <div className="mt-3 pt-2 border-t border-border">
        <button
          type="button"
          onClick={() => {
            onManageAccount();
            onClose();
          }}
          className="flex items-center gap-2 w-full text-left text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
        >
          <Settings size={14} />
          Settings
        </button>
      </div>
    </div>
  );
}
