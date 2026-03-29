import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { uiClasses } from "@/lib/design-tokens";
import { strings } from "@/lib/strings";
import { SettingsSection, ToggleSwitch } from "@/components/SettingsModal";
import { api } from "@/api/tauri";
import type { ShortcutConfig } from "@/types";
import { HelpCircle, X } from "lucide-react";

export interface ShortcutsSectionProps {
  shortcuts: ShortcutConfig[];
  setShortcuts: (s: ShortcutConfig[]) => void;
  shortcutListeningId: string | null;
  setShortcutListeningId: (id: string | null) => void;
  shortcutError: string | null;
  setShortcutError: (e: string | null) => void;
  handleShortcutKeyDown: (
    e: React.KeyboardEvent,
    shortcutId: string,
    currentKeys: string[]
  ) => Promise<void>;
}

export function ShortcutsSection({
  shortcuts,
  setShortcuts,
  shortcutListeningId,
  setShortcutListeningId,
  shortcutError,
  setShortcutError,
  handleShortcutKeyDown,
}: ShortcutsSectionProps) {
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleToggleShortcut = useCallback(
    async (shortcutId: string) => {
      try {
        const updated = await api.shortcuts.toggle(shortcutId);
        setShortcuts(updated);
        await api.shortcuts.reregister();
      } catch (e) {
        console.error(e);
      }
    },
    [setShortcuts]
  );

  const handleReset = useCallback(async () => {
    try {
      setShortcutError(null);
      const updated = await api.shortcuts.reset();
      setShortcuts(updated);
      await api.shortcuts.reregister();
      setShowResetConfirm(false);
    } catch (e) {
      console.error(e);
    }
  }, [setShortcuts, setShortcutError]);

  return (
    <SettingsSection
      title={strings.settings.shortcuts.title}
      description={strings.settings.shortcuts.description}
    >
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          {strings.settings.shortcuts.uniqueNote}
          <span
            title={strings.settings.shortcuts.validationTooltip}
            className="inline-flex cursor-help text-muted-foreground/80 hover:text-muted-foreground"
            aria-label={strings.settings.shortcuts.validationRules}
          >
            <HelpCircle size={12} />
          </span>
        </p>
        {shortcutError && (
          <div className="flex items-center justify-between gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-md border border-red-200 dark:border-red-900/50" role="alert">
            <span>{shortcutError}</span>
            <button
              type="button"
              onClick={() => setShortcutError(null)}
              className="shrink-0 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        )}
        <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
          {shortcuts.map((s) => (
            <div
              key={s.id}
              className={cn("py-4 first:pt-0", !s.enabled && "opacity-60")}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-black dark:text-white">
                    {s.name}
                  </div>
                  <div className="text-sm text-muted-foreground mt-0.5">
                    {s.description}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div
                    tabIndex={0}
                    role="button"
                    aria-label={`Change shortcut for ${s.name}`}
                    onKeyDown={(e) =>
                      handleShortcutKeyDown(e, s.id, s.keys)
                    }
                    onClick={(e) => {
                      setShortcutError(null);
                      setShortcutListeningId(s.id);
                      (e.currentTarget as HTMLElement).focus();
                    }}
                    onBlur={() => setShortcutListeningId(null)}
                    className={cn(
                      "min-h-[36px] min-w-[120px] px-3 py-2 rounded-md border border-border flex flex-wrap items-center justify-end gap-1.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-black/40 dark:focus-visible:ring-white/40",
                      shortcutListeningId === s.id
                        ? "bg-orange-50 dark:bg-orange-950/20 border-orange-500/50"
                        : "bg-muted/30 hover:bg-muted/50"
                    )}
                  >
                    {shortcutListeningId === s.id ? (
                      <>
                        {s.keys.length > 0 && (
                          <span className="flex flex-wrap items-center gap-1 opacity-50">
                            {s.keys.map((k) => (
                              <span
                                key={k}
                                className="px-2 py-0.5 rounded bg-muted text-xs font-mono"
                              >
                                {k}
                              </span>
                            ))}
                          </span>
                        )}
                        <span className="text-muted-foreground text-sm">
                          {s.keys.length > 0
                            ? "Listening\u2026"
                            : "Press keys\u2026"}
                        </span>
                      </>
                    ) : s.keys.length === 0 ? (
                      <span className="text-muted-foreground text-sm">
                        Press keys&hellip;
                      </span>
                    ) : (
                      s.keys.map((k) => (
                        <span
                          key={k}
                          className="px-2 py-0.5 rounded bg-muted text-xs font-medium font-mono"
                        >
                          {k}
                        </span>
                      ))
                    )}
                  </div>
                  <ToggleSwitch
                    checked={s.enabled}
                    onChange={() => handleToggleShortcut(s.id)}
                    aria-label={`Enable ${s.name} shortcut`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-center pt-2 gap-2">
          {showResetConfirm ? (
            <>
              <span className="text-xs text-muted-foreground self-center">
                {strings.settings.shortcuts.resetConfirm}
              </span>
              <button
                type="button"
                onClick={handleReset}
                className="text-xs px-3 py-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 font-medium"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className={cn(uiClasses.buttonGhost, "text-xs px-3 py-1.5")}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className={cn(uiClasses.buttonGhost, "px-4 py-2 text-sm font-medium")}
            >
              {strings.settings.shortcuts.resetToDefault}
            </button>
          )}
        </div>
      </div>
    </SettingsSection>
  );
}
