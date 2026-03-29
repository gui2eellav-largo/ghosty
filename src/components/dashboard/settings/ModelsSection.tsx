import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { uiClasses } from "@/lib/design-tokens";
import { strings } from "@/lib/strings";
import { SettingsSection } from "@/components/SettingsModal";
import type { Preferences, DeepPartial, Language } from "@/types";
import { LANGUAGES } from "@/types";

export interface ModelsSectionProps {
  preferences: Preferences | null;
  updatePreferences: (partial: DeepPartial<Preferences>) => Promise<void>;
}

export function ModelsSection({
  preferences,
  updatePreferences,
}: ModelsSectionProps) {
  const provider = preferences?.transcription.provider ?? "openai";
  const llmProvider = preferences?.llm.provider ?? "openai";

  const handleProviderChange = useCallback(
    async (e: React.ChangeEvent<HTMLSelectElement>) => {
      const v = e.target.value;
      const model =
        v === "groq" ? "whisper-large-v3-turbo" : "whisper-1";
      await updatePreferences({
        transcription: {
          ...preferences?.transcription,
          provider: v,
          model,
        },
      });
    },
    [updatePreferences, preferences?.transcription]
  );

  const handleLanguageChange = useCallback(
    async (e: React.ChangeEvent<HTMLSelectElement>) => {
      const v = e.target.value;
      await updatePreferences({
        transcription: {
          ...preferences?.transcription,
          language: v === "" ? null : v,
        },
      });
    },
    [updatePreferences, preferences?.transcription]
  );

  const handleTranscriptionModelChange = useCallback(
    async (e: React.ChangeEvent<HTMLSelectElement>) => {
      await updatePreferences({
        transcription: {
          ...preferences?.transcription,
          model: e.target.value,
        },
      });
    },
    [updatePreferences, preferences?.transcription]
  );

  const handleLlmProviderChange = useCallback(
    async (e: React.ChangeEvent<HTMLSelectElement>) => {
      const v = e.target.value;
      const model = v === "groq" ? "llama-3.1-8b-instant" : "gpt-4o-mini";
      await updatePreferences({
        llm: { ...preferences?.llm, provider: v, model },
      });
    },
    [updatePreferences, preferences?.llm]
  );

  const handleLlmModelChange = useCallback(
    async (e: React.ChangeEvent<HTMLSelectElement>) => {
      await updatePreferences({
        llm: { ...preferences?.llm, model: e.target.value },
      });
    },
    [updatePreferences, preferences?.llm]
  );

  return (
    <SettingsSection
      title={strings.settings.models.title}
      description={strings.settings.models.description}
    >
      <div className="space-y-6">
        {/* Voice to text */}
        <div className="space-y-3">
          <p className={cn(uiClasses.sectionLabel)}>
            {strings.settings.models.transcription}
          </p>
          <div className="flex gap-3">
            <div className="flex-1">
              <label
                htmlFor="settings-transcription-provider"
                className="block text-xs text-muted-foreground mb-1"
              >
                {strings.settings.models.provider}
              </label>
              <select
                id="settings-transcription-provider"
                value={provider}
                onChange={handleProviderChange}
                className={cn(uiClasses.select, "py-2")}
              >
                <option value="openai">{strings.settings.models.providerOpenAI}</option>
                <option value="groq">{strings.settings.models.providerGroq}</option>
              </select>
            </div>
            <div className="flex-1">
              <label
                htmlFor="settings-transcription-model"
                className="block text-xs text-muted-foreground mb-1"
              >
                {strings.settings.models.model}
              </label>
              <select
                id="settings-transcription-model"
                value={preferences?.transcription.model ?? "whisper-1"}
                onChange={handleTranscriptionModelChange}
                className={cn(uiClasses.select, "py-2")}
              >
                {provider === "groq" ? (
                  <>
                    <option value="whisper-large-v3-turbo">Whisper Large v3 Turbo (fastest)</option>
                    <option value="whisper-large-v3">Whisper Large v3 (most accurate)</option>
                  </>
                ) : (
                  <option value="whisper-1">Whisper 1</option>
                )}
              </select>
            </div>
          </div>
          <div>
            <label
              htmlFor="settings-transcription-language"
              className="block text-xs text-muted-foreground mb-1"
            >
              {strings.settings.models.defaultLanguage}
            </label>
            <select
              id="settings-transcription-language"
              value={preferences?.transcription.language ?? ""}
              onChange={handleLanguageChange}
              className={cn(uiClasses.select, "py-2")}
            >
              {(
                Object.entries(LANGUAGES) as [
                  Language,
                  { label: string; flag: string },
                ][]
              ).map(([key, { flag, label }]) => (
                <option key={key} value={key === "auto" ? "" : key}>
                  {flag ? `${flag} ` : ""}
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Separator */}
        <div className="border-t border-black/[0.06] dark:border-white/[0.06]" />

        {/* Text transformation */}
        <div className="space-y-3">
          <p className={cn(uiClasses.sectionLabel)}>
            {strings.settings.models.textGeneration}
          </p>
          <div className="flex gap-3">
            <div className="flex-1">
              <label
                htmlFor="settings-llm-provider"
                className="block text-xs text-muted-foreground mb-1"
              >
                {strings.settings.models.provider}
              </label>
              <select
                id="settings-llm-provider"
                value={llmProvider}
                onChange={handleLlmProviderChange}
                className={cn(uiClasses.select, "py-2")}
              >
                <option value="openai">{strings.settings.models.llmProviderOpenAI}</option>
                <option value="groq">{strings.settings.models.llmProviderGroq}</option>
              </select>
            </div>
            <div className="flex-1">
              <label
                htmlFor="settings-llm-model"
                className="block text-xs text-muted-foreground mb-1"
              >
                {strings.settings.models.model}
              </label>
              <select
                id="settings-llm-model"
                value={preferences?.llm.model ?? "gpt-4o-mini"}
                onChange={handleLlmModelChange}
                className={cn(uiClasses.select, "py-2")}
              >
                {llmProvider === "groq" ? (
                  <>
                    <option value="llama-3.1-8b-instant">Llama 3.1 8B (fastest)</option>
                    <option value="llama-3.3-70b-versatile">Llama 3.3 70B (best quality)</option>
                    <option value="mixtral-8x7b-32768">Mixtral 8x7B</option>
                  </>
                ) : (
                  <>
                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  </>
                )}
              </select>
            </div>
          </div>
        </div>
      </div>
    </SettingsSection>
  );
}
