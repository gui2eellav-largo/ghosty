import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { strings } from "@/lib/strings";
import { SettingsSection, SettingsRow, ToggleSwitch } from "@/components/SettingsModal";
import { api } from "@/api/tauri";
import type { Preferences, DeepPartial, ModeConfig } from "@/types";
import { ENABLE_RIGHT_CLICK_SERVICES } from "@/types";

export interface SystemSectionProps {
  preferences: Preferences | null;
  updatePreferences: (partial: DeepPartial<Preferences>) => Promise<void>;
  servicesInstalled: string[] | null;
  setServicesInstalled: (list: string[]) => void;
  modes: ModeConfig[];
  setStatus: (s: string) => void;
  setError: (e: string | null) => void;
}

export function SystemSection({
  preferences,
  updatePreferences,
  servicesInstalled,
  setServicesInstalled,
  modes,
  setStatus,
  setError,
}: SystemSectionProps) {
  const handleAutoCopy = useCallback(
    async (checked: boolean) => {
      await updatePreferences({
        behavior: { ...preferences?.behavior, autoCopy: checked },
      });
    },
    [updatePreferences, preferences?.behavior]
  );

  const handleSoundOnComplete = useCallback(
    async (checked: boolean) => {
      await updatePreferences({
        behavior: { ...preferences?.behavior, soundOnComplete: checked },
      });
    },
    [updatePreferences, preferences?.behavior]
  );

  const handleSystemNotification = useCallback(
    async (checked: boolean) => {
      await updatePreferences({
        behavior: { ...preferences?.behavior, systemNotification: checked },
      });
    },
    [updatePreferences, preferences?.behavior]
  );

  const handleAutoPaste = useCallback(
    async (checked: boolean) => {
      await updatePreferences({
        behavior: { ...preferences?.behavior, autoPasteAfterTransform: checked },
      });
    },
    [updatePreferences, preferences?.behavior]
  );

  const handlePasteInputAndOutput = useCallback(
    async (checked: boolean) => {
      await updatePreferences({
        behavior: { ...preferences?.behavior, pasteInputAndOutput: checked },
      });
    },
    [updatePreferences, preferences?.behavior]
  );

  const handleInstallServices = useCallback(async () => {
    try {
      const list = await api.services.install();
      setServicesInstalled(list);
      const msg = list?.length
        ? `Shortcuts installed (${list.length}). Enable them in System Settings > Keyboard > Shortcuts > Services.`
        : "Shortcuts installed.";
      setStatus(msg);
      setTimeout(() => setStatus("Ready."), 8000);
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      setStatus(err);
      setError(err);
      setTimeout(() => {
        setStatus("Ready.");
        setError(null);
      }, 5000);
    }
  }, [setServicesInstalled, setStatus, setError]);

  const expectedNames = modes
    .filter((m) => m.enabled)
    .map(
      (m) =>
        "Ghosty \u2013 " + m.name.replace(/\//g, "-").replace(/:/g, " ")
    )
    .sort();
  const installed = servicesInstalled ?? [];
  const installedSorted = [...installed].sort();
  const isUpToDate =
    installed.length > 0 &&
    expectedNames.length > 0 &&
    JSON.stringify(installedSorted) === JSON.stringify(expectedNames);
  const needsUpdate = installed.length > 0 && !isUpToDate;
  const serviceStatus =
    installed.length === 0
      ? strings.settings.system.services.noServices
      : isUpToDate
        ? strings.settings.system.services.upToDate(installed.length)
        : strings.settings.system.services.updateAvailable;
  const installButtonLabel =
    installed.length === 0
      ? strings.settings.system.services.installServices
      : needsUpdate
        ? strings.settings.system.services.updateServices
        : strings.settings.system.services.reinstall;
  const canInstall = expectedNames.length > 0;

  return (
    <SettingsSection
      title={strings.settings.system.title}
      description={strings.settings.system.description}
    >
      <div className="space-y-0">
        <SettingsRow
          label={strings.settings.system.autoCopy}
          description={strings.settings.system.autoCopyDesc}
        >
          <ToggleSwitch
            checked={preferences?.behavior.autoCopy ?? true}
            onChange={handleAutoCopy}
            aria-label={strings.settings.system.autoCopy}
          />
        </SettingsRow>

        <SettingsRow
          label={strings.settings.system.soundOnComplete}
          description={strings.settings.system.soundOnCompleteDesc}
        >
          <ToggleSwitch
            checked={preferences?.behavior.soundOnComplete ?? true}
            onChange={handleSoundOnComplete}
            aria-label={strings.settings.system.soundOnComplete}
          />
        </SettingsRow>

        <SettingsRow
          label={strings.settings.system.systemNotifications}
          description={strings.settings.system.systemNotificationsDesc}
        >
          <ToggleSwitch
            checked={preferences?.behavior.systemNotification ?? true}
            onChange={handleSystemNotification}
            aria-label={strings.settings.system.systemNotifications}
          />
        </SettingsRow>

        {ENABLE_RIGHT_CLICK_SERVICES && (
          <SettingsRow
            label={strings.settings.system.autoPaste}
            description={strings.settings.system.autoPasteDesc}
          >
            <ToggleSwitch
              checked={preferences?.behavior.autoPasteAfterTransform ?? true}
              onChange={handleAutoPaste}
              aria-label={strings.settings.system.autoPaste}
            />
          </SettingsRow>
        )}

        <SettingsRow
          label={strings.settings.system.pasteInputAndOutput}
          description={strings.settings.system.pasteInputAndOutputDesc}
        >
          <ToggleSwitch
            checked={preferences?.behavior.pasteInputAndOutput ?? false}
            onChange={handlePasteInputAndOutput}
            aria-label={strings.settings.system.pasteInputAndOutput}
          />
        </SettingsRow>

        {ENABLE_RIGHT_CLICK_SERVICES && (
          <div className="pt-6">
            <div className="border-t border-black/[0.06] dark:border-white/[0.06] pt-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-black dark:text-white">
                    {strings.settings.system.services.title}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">
                    {strings.settings.system.services.description}
                  </p>
                  {servicesInstalled !== null && (
                    <p
                      className={cn(
                        "text-xs mt-1.5",
                        needsUpdate
                          ? "text-amber-600 dark:text-amber-500"
                          : "text-muted-foreground/60"
                      )}
                    >
                      {serviceStatus}
                    </p>
                  )}
                  {import.meta.env.DEV && (
                    <p className="text-xs text-amber-600/80 dark:text-amber-500/80 mt-1.5">
                      {strings.settings.system.services.devWarning}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={!canInstall}
                    title={
                      !canInstall
                        ? strings.settings.system.services.enableModesFirst
                        : undefined
                    }
                    onClick={handleInstallServices}
                    className="text-xs px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-black dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.04] disabled:opacity-50 disabled:pointer-events-none transition-colors"
                  >
                    {installButtonLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => api.services.openFolder().catch(console.error)}
                    className="text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                  >
                    {strings.settings.system.services.openServicesFolder}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </SettingsSection>
  );
}
