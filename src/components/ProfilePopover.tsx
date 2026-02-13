import { useEffect } from "react";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";
import { uiClasses } from "@/lib/design-tokens";

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

  const wordsLabel =
    wordsGenerated >= 1000
      ? `${(wordsGenerated / 1000).toFixed(1)}K words generated`
      : `${wordsGenerated} words generated`;

  return (
    <div
      className={cn(
        "absolute right-0 top-full mt-1 z-50 w-72 rounded-lg border border-border bg-popover shadow-lg py-3 px-4",
        "animate-in fade-in slide-in-from-top-1 duration-150"
      )}
      role="dialog"
      aria-label="Profile"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-black/10 dark:bg-white/10 text-muted-foreground font-medium text-sm">
          {displayName.trim() ? (
            (displayName
              .trim()
              .split(/\s+/)
              .map((s) => s[0])
              .join("")
              .slice(0, 2) || "?")
              .toUpperCase()
          ) : (
            <User size={20} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">
            {displayName.trim() || "Guest"}
          </p>
          <p className="text-xs text-muted-foreground">Connect your account</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-3">{wordsLabel}</p>
      <button
        type="button"
        onClick={() => {
          onManageAccount();
          onClose();
        }}
        className={cn(uiClasses.buttonGhost, "w-full justify-center text-sm py-2")}
      >
        Manage account
      </button>
    </div>
  );
}
