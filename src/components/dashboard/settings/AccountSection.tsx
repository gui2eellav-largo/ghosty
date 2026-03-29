import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { uiClasses } from "@/lib/design-tokens";
import { SettingsSection } from "@/components/SettingsModal";
import type { Preferences, DeepPartial } from "@/types";

export interface AccountSectionProps {
  preferences: Preferences | null;
  updatePreferences: (partial: DeepPartial<Preferences>) => Promise<void>;
  accountDisplayNameDraft: string;
  setAccountDisplayNameDraft: (v: string) => void;
}

export function AccountSection({
  preferences,
  updatePreferences,
  accountDisplayNameDraft,
  setAccountDisplayNameDraft,
}: AccountSectionProps) {
  const handleSave = useCallback(async () => {
    await updatePreferences({
      general: {
        ...preferences?.general,
        displayName: accountDisplayNameDraft.trim() || undefined,
      },
    });
  }, [updatePreferences, preferences?.general, accountDisplayNameDraft]);

  const isSaveDisabled =
    (accountDisplayNameDraft.trim() || "") ===
    (preferences?.general?.displayName ?? "");

  return (
    <SettingsSection title="Account" description="Profile and account settings">
      <div className="space-y-6">
        <div>
          <label
            htmlFor="account-display-name"
            className="block text-sm font-medium text-black dark:text-white mb-1.5"
          >
            Display name
          </label>
          <input
            id="account-display-name"
            type="text"
            value={accountDisplayNameDraft}
            onChange={(e) => setAccountDisplayNameDraft(e.target.value)}
            placeholder="Your name"
            className={uiClasses.input}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Used in the welcome message and profile.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaveDisabled}
            className={cn(uiClasses.buttonPrimary, "ml-auto px-4 py-2 text-sm")}
          >
            Save
          </button>
        </div>
      </div>
    </SettingsSection>
  );
}
