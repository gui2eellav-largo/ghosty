import { useEffect } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { strings } from "@/lib/strings";
import { IconButton } from "./ui/icon-button";
import type { CorrectionNotification } from "@/types";

export interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  correctionNotifications: CorrectionNotification[];
  onAcceptCorrection: (n: CorrectionNotification) => void;
  onDismissCorrection: (id: string) => void;
}

export function NotificationsPanel({
  isOpen,
  onClose,
  correctionNotifications,
  onAcceptCorrection,
  onDismissCorrection,
}: NotificationsPanelProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isEmpty = correctionNotifications.length === 0;

  return (
    <div
      className={cn(
        "absolute right-0 top-full mt-1 z-50 w-80 rounded-lg border border-border bg-popover shadow-lg flex flex-col max-h-[400px]",
        "animate-in fade-in slide-in-from-top-1 duration-150"
      )}
      role="dialog"
      aria-label={strings.notifications.title}
    >
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">{strings.notifications.title}</h2>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div
              className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-3 text-muted-foreground"
              aria-hidden
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground mb-1">{strings.notifications.noNotifications}</p>
            <p className="text-xs text-muted-foreground max-w-[220px]">
              {strings.notifications.notificationsHint}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {correctionNotifications.map((n) => (
              <li
                key={n.id}
                className={cn(
                  "flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg",
                  "border border-black/[0.06] dark:border-white/[0.06]",
                  "bg-black/[0.02] dark:bg-white/[0.02]"
                )}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div
                    className="shrink-0 rounded-full"
                    style={{ width: 6, height: 6, minWidth: 6, backgroundColor: "#10b981" }}
                    aria-hidden
                  />
                  <div className="flex items-center gap-1.5 text-xs min-w-0">
                    <span className="text-muted-foreground line-through truncate">{n.candidate.misspelling}</span>
                    <span className="text-muted-foreground/40">→</span>
                    <span className="font-medium text-foreground truncate">{n.candidate.correction}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onAcceptCorrection(n)}
                    aria-label={strings.notifications.addToDictionary(n.candidate.correction)}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium",
                      "text-foreground bg-black/5 dark:bg-white/5",
                      "hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                    )}
                  >
                    <Plus size={11} />
                    {strings.notifications.add}
                  </button>
                  <IconButton
                    icon={<X size={12} />}
                    aria-label={strings.notifications.dismiss}
                    variant="ghost"
                    size="sm"
                    onClick={() => onDismissCorrection(n.id)}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
