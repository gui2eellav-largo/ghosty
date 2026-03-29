import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
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
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground/60 flex items-center gap-1.5">
          {strings.settings.shortcuts.uniqueNote}
          <span
            title={strings.settings.shortcuts.validationTooltip}
            className="inline-flex cursor-help text-muted-foreground/40 hover:text-muted-foreground"
            aria-label={strings.settings.shortcuts.validationRules}
          >
            <HelpCircle size={12} />
          </span>
        </p>

        {shortcutError && (
          <div className="flex items-center justify-between gap-2 text-xs text-red-600 dark:text-red-400 px-3 py-2 rounded-lg bg-red-500/5" role="alert">
            <span>{shortcutError}</span>
            <button
              type="button"
              onClick={() => setShortcutError(null)}
              className="shrink-0 p-1 rounded-lg text-red-600/50 dark:text-red-400/50 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              aria-label="Dismiss"
            >
              <X size={12} />
            </button>
          </div>
        )}

        <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
          {shortcuts.map((s) => (
            <div
              key={s.id}
              className={cn("py-3 first:pt-0", !s.enabled && "opacity-50")}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-black dark:text-white">
                    {s.name}
                  </div>
                  <div className="text-xs text-muted-foreground/60 mt-0.5">
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
                      "min-h-[32px] min-w-[100px] px-2.5 py-1.5 rounded-lg border flex flex-wrap items-center justify-end gap-1 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-black/40 dark:focus-visible:ring-white/40 transition-colors",
                      shortcutListeningId === s.id
                        ? "border-black/20 dark:border-white/20 bg-black/[0.02] dark:bg-white/[0.03]"
                        : "border-black/[0.06] dark:border-white/[0.06] hover:border-black/10 dark:hover:border-white/10"
                    )}
                  >
                    {shortcutListeningId === s.id ? (
                      <span className="text-muted-foreground text-xs">
                        {s.keys.length > 0
                          ? strings.settings.shortcuts.listening
                          : strings.settings.shortcuts.pressKeys}
                      </span>
                    ) : s.keys.length === 0 ? (
                      <span className="text-muted-foreground/50 text-xs">
                        {strings.settings.shortcuts.pressKeys}
                      </span>
                    ) : (
                      s.keys.map((k) => (
                        <span
                          key={k}
                          className="px-1.5 py-0.5 rounded bg-black/[0.04] dark:bg-white/[0.06] text-[11px] font-medium font-mono text-muted-foreground"
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

        <div className="flex justify-center pt-1 gap-2">
          {showResetConfirm ? (
            <>
              <span className="text-xs text-muted-foreground/60 self-center">
                {strings.settings.shortcuts.resetConfirm}
              </span>
              <button
                type="button"
                onClick={handleReset}
                className="text-xs px-2 py-1 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-500/10 font-medium transition-colors"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="text-xs px-2 py-1 rounded-lg text-muted-foreground hover:text-black dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="text-xs px-2.5 py-1.5 rounded-lg text-muted-foreground/60 hover:text-muted-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors"
            >
              {strings.settings.shortcuts.resetToDefault}
            </button>
          )}
        </div>
      </div>
    </SettingsSection>
  );
}
