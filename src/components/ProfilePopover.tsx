import { useEffect, useRef, useState } from "react";
import { User, Pencil, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { strings } from "@/lib/strings";

export interface ProfilePopoverProps {
  isOpen: boolean;
  onClose: () => void;
  displayName: string;
  wordsGenerated: number;
  onSaveDisplayName: (name: string) => void;
}

export function ProfilePopover({
  isOpen,
  onClose,
  displayName,
  wordsGenerated,
  onSaveDisplayName,
}: ProfilePopoverProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(displayName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false);
      return;
    }
    setDraft(displayName);
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isEditing) {
          setIsEditing(false);
          setDraft(displayName);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose, displayName, isEditing]);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  if (!isOpen) return null;

  const wordsLabel = strings.profile.wordsGenerated(wordsGenerated);

  const handleSave = () => {
    const trimmed = draft.trim();
    if (trimmed !== displayName.trim()) {
      onSaveDisplayName(trimmed);
    }
    setIsEditing(false);
  };

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
          {(draft.trim() || displayName.trim()) ? (
            ((draft.trim() || displayName.trim())
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
          {isEditing ? (
            <div className="flex items-center gap-1.5">
              <input
                ref={inputRef}
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                }}
                placeholder={strings.profile.guest}
                className="w-full bg-transparent text-sm font-medium text-foreground border-b border-border focus:border-foreground outline-none py-0.5"
              />
              <button
                type="button"
                onClick={handleSave}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Check size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 group">
              <p className="text-sm font-medium text-foreground truncate">
                {displayName.trim() || strings.profile.guest}
              </p>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="shrink-0 text-muted-foreground/0 group-hover:text-muted-foreground hover:!text-foreground transition-colors"
              >
                <Pencil size={12} />
              </button>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground/60">{wordsLabel}</p>
        </div>
      </div>
    </div>
  );
}
