import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { uiClasses } from "@/lib/design-tokens";
import { SettingsSection, SettingsRow, ToggleSwitch } from "@/components/SettingsModal";
import { strings } from "@/lib/strings";
import { api } from "@/api/tauri";
import type { Preferences, DeepPartial } from "@/types";
import packageJson from "../../../../package.json";

export interface GeneralSectionProps {
  preferences: Preferences | null;
  updatePreferences: (partial: DeepPartial<Preferences>) => Promise<void>;
  updateInfo: { available: boolean; version?: string; body?: string } | null;
  setUpdateInfo: (info: { available: boolean; version?: string; body?: string } | null) => void;
  updateStatus: "idle" | "checking" | "installing" | "done" | "error";
  setUpdateStatus: (status: "idle" | "checking" | "installing" | "done" | "error") => void;
  updateError: string | null;
  setUpdateError: (error: string | null) => void;
  accountDisplayNameDraft: string;
  setAccountDisplayNameDraft: (v: string) => void;
}

export function GeneralSection({
  preferences,
  updatePreferences,
  updateInfo,
  setUpdateInfo,
  updateStatus,
  setUpdateStatus,
  updateError,
  setUpdateError,
  accountDisplayNameDraft,
  setAccountDisplayNameDraft,
}: GeneralSectionProps) {
  const handleLaunchAtLoginChange = useCallback(
    async (checked: boolean) => {
      await updatePreferences({
        general: { ...preferences?.general, launchAtLogin: checked },
      });
    },
    [updatePreferences, preferences?.general]
  );

  const handleAutoUpdateChange = useCallback(
    async (checked: boolean) => {
      await updatePreferences({
        general: { ...preferences?.general, autoUpdate: checked },
      });
    },
    [updatePreferences, preferences?.general]
  );

  const handleInstallUpdate = useCallback(async () => {
    setUpdateStatus("installing");
    setUpdateError(null);
    try {
      await api.updater.install();
      setUpdateStatus("done");
    } catch (e) {
      setUpdateStatus("error");
      setUpdateError(String(e));
    }
  }, [setUpdateStatus, setUpdateError]);

  const handleCheckUpdate = useCallback(async () => {
    setUpdateStatus("checking");
    setUpdateError(null);
    try {
      const info = await api.updater.check();
      setUpdateInfo(info.available ? info : null);
      setUpdateStatus("idle");
    } catch (e) {
      setUpdateStatus("error");
      setUpdateError(String(e));
    }
  }, [setUpdateStatus, setUpdateError, setUpdateInfo]);

  const handleSaveDisplayName = useCallback(async () => {
    await updatePreferences({
      general: {
        ...preferences?.general,
        displayName: accountDisplayNameDraft.trim() || undefined,
      },
    });
  }, [updatePreferences, preferences?.general, accountDisplayNameDraft]);

  const isDisplayNameSaveDisabled =
    (accountDisplayNameDraft.trim() || "") ===
    (preferences?.general?.displayName ?? "");

  return (
    <SettingsSection title={strings.settings.general.title} description={strings.settings.general.description}>
      <div className="space-y-0">
        {/* Profile */}
        <p className={cn(uiClasses.sectionLabel, "mb-3")}>
          {strings.settings.general.profile}
        </p>
        <div className="mb-6">
          <SettingsRow
            label={strings.settings.general.displayName}
            htmlFor="general-display-name"
          >
            <div className="flex items-center gap-2">
              <input
                id="general-display-name"
                type="text"
                value={accountDisplayNameDraft}
                onChange={(e) => setAccountDisplayNameDraft(e.target.value)}
                placeholder={strings.settings.general.displayNamePlaceholder}
                className={cn(uiClasses.input, "w-48")}
              />
              <button
                type="button"
                onClick={handleSaveDisplayName}
                disabled={isDisplayNameSaveDisabled}
                className={cn(uiClasses.buttonPrimary, "text-xs px-3 py-2 disabled:opacity-50")}
              >
                {strings.settings.general.save}
              </button>
            </div>
          </SettingsRow>
        </div>

        {/* App */}
        <SettingsRow
          label={strings.settings.general.launchAtLogin}
          description={strings.settings.general.launchAtLoginDesc}
        >
          <ToggleSwitch
            checked={preferences?.general.launchAtLogin ?? false}
            onChange={handleLaunchAtLoginChange}
            aria-label={strings.settings.general.launchAtLogin}
          />
        </SettingsRow>

        <SettingsRow
          label={strings.settings.general.autoUpdate}
          description={strings.settings.general.autoUpdateDesc}
        >
          <ToggleSwitch
            checked={preferences?.general.autoUpdate ?? true}
            onChange={handleAutoUpdateChange}
            aria-label={strings.settings.general.autoUpdate}
          />
        </SettingsRow>
        <SettingsRow label={strings.settings.general.version} description={strings.settings.general.versionDesc}>
          <span className="text-sm text-muted-foreground tabular-nums">
            {(packageJson as { version?: string }).version ?? "0.1.0"}
          </span>
        </SettingsRow>
        <SettingsRow
          label={strings.settings.general.updates}
          description={
            updateInfo?.available
              ? strings.settings.general.versionAvailable(updateInfo.version ?? "")
              : strings.settings.general.appUpToDate
          }
        >
          {updateInfo?.available ? (
            <button
              type="button"
              disabled={updateStatus === "installing" || updateStatus === "done"}
              onClick={handleInstallUpdate}
              className={cn(uiClasses.buttonPrimary, "text-xs px-3 py-1.5 disabled:opacity-50")}
            >
              {updateStatus === "installing"
                ? strings.settings.general.installing
                : updateStatus === "done"
                  ? strings.settings.general.restartToApply
                  : strings.settings.general.installUpdate}
            </button>
          ) : (
            <button
              type="button"
              disabled={updateStatus === "checking"}
              onClick={handleCheckUpdate}
              className={cn(uiClasses.buttonSecondary, "text-xs px-3 py-1.5 disabled:opacity-50")}
            >
              {updateStatus === "checking"
                ? strings.settings.general.checking
                : strings.settings.general.checkForUpdates}
            </button>
          )}
        </SettingsRow>
        <p className="text-xs text-red-600 dark:text-red-400 px-0 py-1" aria-live="polite">
          {updateError ?? ""}
        </p>
      </div>
    </SettingsSection>
  );
}
