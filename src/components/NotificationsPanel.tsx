import { useEffect, useRef, useState } from "react";
import { Archive, CheckCheck, Filter, Monitor, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { uiClasses } from "@/lib/design-tokens";
import { IconButton } from "./ui/icon-button";

type OpenMenu = null | "filter" | "more";

export interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: unknown[];
}

export function NotificationsPanel({
  isOpen,
  onClose,
  notifications,
}: NotificationsPanelProps) {
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const openMenuRef = useRef(openMenu);
  openMenuRef.current = openMenu;

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (openMenuRef.current) {
        setOpenMenu(null);
      } else {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) setOpenMenu(null);
  }, [isOpen]);

  useEffect(() => {
    if (!openMenu) return;
    const handleClick = (e: MouseEvent) => {
      const el = headerRef.current;
      if (el && !el.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openMenu]);

  if (!isOpen) return null;

  const isEmpty = notifications.length === 0;
  const hasNotifications = !isEmpty;

  return (
    <div
      className={cn(
        "absolute right-0 top-full mt-1 z-50 w-80 rounded-lg border border-border bg-popover shadow-lg flex flex-col max-h-[400px]",
        "animate-in fade-in slide-in-from-top-1 duration-150"
      )}
      role="dialog"
      aria-label="Notifications"
    >
      <div
        ref={headerRef}
        className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border"
      >
        <h2 className="text-sm font-semibold text-foreground">Notifications</h2>
        <div className="flex items-center gap-0.5">
          <div className="relative">
            <IconButton
              icon={<Filter size={14} />}
              aria-label="Filter notifications"
              aria-expanded={openMenu === "filter"}
              variant="ghost"
              size="sm"
              onClick={() => setOpenMenu((m) => (m === "filter" ? null : "filter"))}
            />
            {openMenu === "filter" && (
              <div
                className={cn(
                  "absolute right-0 top-full mt-1 z-[60] min-w-[140px] rounded-lg border border-border bg-popover shadow-lg py-1",
                  "animate-in fade-in slide-in-from-top-1 duration-150"
                )}
                role="menu"
              >
                <button
                  type="button"
                  role="menuitem"
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-left text-sm",
                    uiClasses.buttonGhost
                  )}
                  onClick={() => setOpenMenu(null)}
                >
                  <Monitor size={14} className="shrink-0 text-muted-foreground" />
                  <span>New</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-left text-sm",
                    uiClasses.buttonGhost
                  )}
                  onClick={() => setOpenMenu(null)}
                >
                  <Archive size={14} className="shrink-0 text-muted-foreground" />
                  <span>Archived</span>
                </button>
              </div>
            )}
          </div>
          <div className="relative">
            <IconButton
              icon={<MoreHorizontal size={14} />}
              aria-label="More options"
              aria-expanded={openMenu === "more"}
              variant="ghost"
              size="sm"
              onClick={() => setOpenMenu((m) => (m === "more" ? null : "more"))}
            />
            {openMenu === "more" && (
              <div
                className={cn(
                  "absolute right-0 top-full mt-1 z-[60] min-w-[180px] rounded-lg border border-border bg-popover shadow-lg py-1",
                  "animate-in fade-in slide-in-from-top-1 duration-150"
                )}
                role="menu"
              >
                <button
                  type="button"
                  role="menuitem"
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-left text-sm",
                    hasNotifications
                      ? uiClasses.buttonGhost
                      : "text-muted-foreground opacity-60 cursor-not-allowed pointer-events-none"
                  )}
                  disabled={!hasNotifications}
                  onClick={() => hasNotifications && setOpenMenu(null)}
                >
                  <CheckCheck size={14} className="shrink-0 text-muted-foreground" />
                  <span>Mark all as read</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-left text-sm",
                    hasNotifications
                      ? uiClasses.buttonGhost
                      : "text-muted-foreground opacity-60 cursor-not-allowed pointer-events-none"
                  )}
                  disabled={!hasNotifications}
                  onClick={() => hasNotifications && setOpenMenu(null)}
                >
                  <Archive size={14} className="shrink-0 text-muted-foreground" />
                  <span>Archive all</span>
                </button>
              </div>
            )}
          </div>
        </div>
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
            <p className="text-sm font-medium text-foreground mb-1">No notifications yet</p>
            <p className="text-xs text-muted-foreground max-w-[220px]">
              You&apos;ll see tips, milestones, and new feature announcements here.
            </p>
          </div>
        ) : (
          <ul className="space-y-1">
            {notifications.map((_, i) => (
              <li key={i} className="text-sm text-muted-foreground py-2" />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
