import { useCallback } from "react";
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
      <div className="space-y-8">
        <div>
          <h3 className="text-sm font-semibold text-black dark:text-white mb-1">
            {strings.settings.models.transcription}
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            {strings.settings.models.transcriptionDesc}
          </p>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="settings-transcription-provider"
                className="block text-sm font-medium text-black dark:text-white mb-2"
              >
                {strings.settings.models.provider}
              </label>
              <select
                id="settings-transcription-provider"
                value={provider}
                onChange={handleProviderChange}
                className={uiClasses.select}
              >
                <option value="openai">{strings.settings.models.providerOpenAI}</option>
                <option value="groq">{strings.settings.models.providerGroq}</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1.5">
                {provider === "groq"
                  ? strings.settings.models.providerGroqDesc
                  : strings.settings.models.providerOpenAIDesc}
              </p>
            </div>
            <div>
              <label
                htmlFor="settings-transcription-language"
                className="block text-sm font-medium text-black dark:text-white mb-2"
              >
                {strings.settings.models.defaultLanguage}
              </label>
              <select
                id="settings-transcription-language"
                value={preferences?.transcription.language ?? ""}
                onChange={handleLanguageChange}
                className={uiClasses.select}
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
              <p className="text-xs text-muted-foreground mt-1.5">
                {strings.settings.models.languageHint}
              </p>
            </div>
            <div>
              <label
                htmlFor="settings-transcription-model"
                className="block text-sm font-medium text-black dark:text-white mb-2"
              >
                {strings.settings.models.model}
              </label>
              <select
                id="settings-transcription-model"
                value={preferences?.transcription.model ?? "whisper-1"}
                onChange={handleTranscriptionModelChange}
                className={uiClasses.select}
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
        </div>
        <div>
          <h3 className="text-sm font-semibold text-black dark:text-white mb-1">
            {strings.settings.models.textGeneration}
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            {strings.settings.models.textGenerationDesc}
          </p>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="settings-llm-provider"
                className="block text-sm font-medium text-black dark:text-white mb-2"
              >
                {strings.settings.models.provider}
              </label>
              <select
                id="settings-llm-provider"
                value={llmProvider}
                onChange={handleLlmProviderChange}
                className={uiClasses.select}
              >
                <option value="openai">{strings.settings.models.llmProviderOpenAI}</option>
                <option value="groq">{strings.settings.models.llmProviderGroq}</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1.5">
                {llmProvider === "groq"
                  ? strings.settings.models.llmProviderGroqDesc
                  : strings.settings.models.llmProviderOpenAIDesc}
              </p>
            </div>
            <div>
              <label
                htmlFor="settings-llm-model"
                className="block text-sm font-medium text-black dark:text-white mb-2"
              >
                {strings.settings.models.model}
              </label>
              <select
                id="settings-llm-model"
                value={preferences?.llm.model ?? "gpt-4o-mini"}
                onChange={handleLlmModelChange}
                className={uiClasses.select}
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
