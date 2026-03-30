import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { uiClasses } from "@/lib/design-tokens";
import { strings } from "@/lib/strings";
import { SettingsSection } from "@/components/SettingsModal";
import type { Preferences, DeepPartial } from "@/types";

export interface RecordingSectionProps {
  preferences: Preferences | null;
  updatePreferences: (partial: DeepPartial<Preferences>) => Promise<void>;
  audioInputDevices: Array<{ id: string; name: string }>;
}

export function RecordingSection({
  preferences,
  updatePreferences,
  audioInputDevices,
}: RecordingSectionProps) {
  const handleInputDeviceChange = useCallback(
    async (e: React.ChangeEvent<HTMLSelectElement>) => {
      const v = e.target.value;
      await updatePreferences({
        recording: {
          ...preferences?.recording,
          inputDeviceId: v === "" ? null : v,
        },
      });
    },
    [updatePreferences, preferences?.recording]
  );

  return (
    <SettingsSection
      title={strings.settings.recording.title}
      description={strings.settings.recording.description}
    >
      <div className="space-y-4">
        <div>
          <label
            htmlFor="settings-input-device"
            className="block text-xs text-muted-foreground mb-1"
          >
            {strings.settings.recording.inputDevice}
          </label>
          <select
            id="settings-input-device"
            value={preferences?.recording?.inputDeviceId ?? ""}
            onChange={handleInputDeviceChange}
            className={cn(uiClasses.select, "py-2")}
          >
            <option value="">{strings.settings.recording.inputDeviceDefault}</option>
            {audioInputDevices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground/60 mt-1.5">
            {strings.settings.recording.inputDeviceHint}
          </p>
        </div>
      </div>
    </SettingsSection>
  );
}
