import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { uiClasses } from "@/lib/design-tokens";
import { strings } from "@/lib/strings";
import { SettingsSection } from "@/components/SettingsModal";
import { Check, Plus, Trash2, Key, AlertCircle } from "lucide-react";
import type { Preferences, DeepPartial, Language } from "@/types";
import { LANGUAGES } from "@/types";

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  groq: "Groq",
  custom: "Custom",
};

export interface ApiKeysSectionProps {
  apiKeys: Array<{ id: string; name: string; provider: string; isActive: boolean; preview: string }>;
  apiKey: string;
  keyName: string;
  setKeyName: (v: string) => void;
  keyProvider: string;
  apiKeySaveStatus:
    | "idle"
    | "validating"
    | "testing"
    | "saving"
    | "success"
    | "error";
  validationError: string | null;
  error: string | null;
  onApiKeyChange: (value: string) => void;
  onProviderChange: (provider: string) => void;
  onSaveApiKey: () => Promise<void>;
  onDeleteApiKey: (keyId: string) => Promise<void>;
  onSetActiveKey: (keyId: string) => Promise<void>;
  validateApiKeyFormat: (key: string, provider: string) => string | null;
  setValidationError: (e: string | null) => void;
  preferences: Preferences | null;
  updatePreferences: (partial: DeepPartial<Preferences>) => Promise<void>;
}

/** Small inline status showing which key is used for a given provider */
function KeyStatus({
  providerName,
  apiKeys,
  onAddKey,
}: {
  providerName: string;
  apiKeys: Array<{ id: string; name: string; provider: string; isActive: boolean; preview: string }>;
  onAddKey: () => void;
}) {
  const keysForProvider = apiKeys.filter((k) => k.provider === providerName);
  if (keysForProvider.length === 0) {
    return (
      <div className="flex items-center gap-1.5 mt-2">
        <AlertCircle size={12} className="text-amber-500 shrink-0" />
        <span className="text-xs text-amber-600 dark:text-amber-400">
          No {PROVIDER_LABELS[providerName] ?? providerName} key configured
        </span>
        <button
          type="button"
          onClick={onAddKey}
          className="text-xs text-foreground underline underline-offset-2 hover:no-underline ml-1"
        >
          Add key
        </button>
      </div>
    );
  }
  const active = keysForProvider.find((k) => k.isActive) ?? keysForProvider[0];
  if (!active) return null;
  return (
    <div className="flex items-center gap-1.5 mt-2">
      <span className="size-1.5 rounded-full bg-green-500 shrink-0" />
      <span className="text-xs text-muted-foreground">
        Using key <span className="font-medium text-foreground">{active.name}</span>
        <span className="text-muted-foreground/50 ml-1 font-mono text-[10px]">({active.preview})</span>
      </span>
    </div>
  );
}

export function ApiKeysSection({
  apiKeys,
  apiKey,
  keyName,
  setKeyName,
  keyProvider,
  apiKeySaveStatus,
  validationError,
  error,
  onApiKeyChange,
  onProviderChange,
  onSaveApiKey,
  onDeleteApiKey,
  onSetActiveKey: _onSetActiveKey,
  validateApiKeyFormat,
  setValidationError,
  preferences,
  updatePreferences,
}: ApiKeysSectionProps) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const isSaving =
    apiKeySaveStatus === "validating" ||
    apiKeySaveStatus === "testing" ||
    apiKeySaveStatus === "saving";

  const displayError = validationError ?? error ?? null;

  // --- Models callbacks ---
  const provider = preferences?.transcription.provider ?? "openai";
  const llmProvider = preferences?.llm.provider ?? "openai";

  const handleTranscriptionProviderChange = useCallback(
    async (e: React.ChangeEvent<HTMLSelectElement>) => {
      const v = e.target.value;
      const model = v === "groq" ? "whisper-large-v3-turbo" : "whisper-1";
      await updatePreferences({
        transcription: { ...preferences?.transcription, provider: v, model },
      });
    },
    [updatePreferences, preferences?.transcription]
  );

  const handleLanguageChange = useCallback(
    async (e: React.ChangeEvent<HTMLSelectElement>) => {
      const v = e.target.value;
      await updatePreferences({
        transcription: { ...preferences?.transcription, language: v === "" ? null : v },
      });
    },
    [updatePreferences, preferences?.transcription]
  );

  const handleTranscriptionModelChange = useCallback(
    async (e: React.ChangeEvent<HTMLSelectElement>) => {
      await updatePreferences({
        transcription: { ...preferences?.transcription, model: e.target.value },
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

  const scrollToKeys = () => {
    setShowForm(true);
    // Small delay so the form renders before scrolling
    setTimeout(() => {
      document.getElementById("api-key-name")?.focus();
    }, 100);
  };

  return (
    <SettingsSection
      title="Services"
      description="Configure your AI providers for transcription and text transformation"
    >
      <div className="space-y-6">
        {/* ─── Voice to text ─── */}
        <div className="space-y-3 rounded-lg border border-black/[0.06] dark:border-white/[0.06] p-4">
          <p className={cn(uiClasses.sectionLabel)}>
            {strings.settings.models.transcription}
          </p>
          <div className="flex gap-3">
            <div className="flex-1">
              <label htmlFor="settings-transcription-provider" className="block text-xs text-muted-foreground mb-1">
                {strings.settings.models.provider}
              </label>
              <select
                id="settings-transcription-provider"
                value={provider}
                onChange={handleTranscriptionProviderChange}
                className={cn(uiClasses.select, "py-2")}
              >
                <option value="openai">{strings.settings.models.providerOpenAI}</option>
                <option value="groq">{strings.settings.models.providerGroq}</option>
              </select>
            </div>
            <div className="flex-1">
              <label htmlFor="settings-transcription-model" className="block text-xs text-muted-foreground mb-1">
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
            <label htmlFor="settings-transcription-language" className="block text-xs text-muted-foreground mb-1">
              {strings.settings.models.defaultLanguage}
            </label>
            <select
              id="settings-transcription-language"
              value={preferences?.transcription.language ?? ""}
              onChange={handleLanguageChange}
              className={cn(uiClasses.select, "py-2")}
            >
              {(
                Object.entries(LANGUAGES) as [Language, { label: string; flag: string }][]
              ).map(([key, { flag, label }]) => (
                <option key={key} value={key === "auto" ? "" : key}>
                  {flag ? `${flag} ` : ""}
                  {label}
                </option>
              ))}
            </select>
          </div>
          <KeyStatus providerName={provider} apiKeys={apiKeys} onAddKey={scrollToKeys} />
        </div>

        {/* ─── Text transformation ─── */}
        <div className="space-y-3 rounded-lg border border-black/[0.06] dark:border-white/[0.06] p-4">
          <p className={cn(uiClasses.sectionLabel)}>
            {strings.settings.models.textGeneration}
          </p>
          <div className="flex gap-3">
            <div className="flex-1">
              <label htmlFor="settings-llm-provider" className="block text-xs text-muted-foreground mb-1">
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
              <label htmlFor="settings-llm-model" className="block text-xs text-muted-foreground mb-1">
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
          <KeyStatus providerName={llmProvider} apiKeys={apiKeys} onAddKey={scrollToKeys} />
        </div>

        {/* ─── Separator ─── */}
        <div className="border-t border-black/[0.06] dark:border-white/[0.06]" />

        {/* ─── API Keys management ─── */}
        <div className="space-y-3">
          <p className={cn(uiClasses.sectionLabel)}>API Keys</p>

          {/* Empty state */}
          {apiKeys.length === 0 && !showForm && (
            <div className="py-8 flex flex-col items-center gap-3">
              <Key className="size-5 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">{strings.settings.apiKeys.noKeysYet}</p>
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className={cn(uiClasses.buttonPrimary, "text-xs px-4 py-2")}
              >
                {strings.settings.apiKeys.addApiKey}
              </button>
            </div>
          )}

          {/* Key list */}
          {apiKeys.length > 0 && (
            <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
              {apiKeys.map((k) => (
                <div
                  key={k.id}
                  className="py-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium text-black dark:text-white truncate">
                      {k.name}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {PROVIDER_LABELS[k.provider] ?? k.provider}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground/40 shrink-0">
                      {k.preview}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {pendingDeleteId === k.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteApiKey(k.id);
                            setPendingDeleteId(null);
                          }}
                          className="text-xs px-2 py-1 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-500/10 font-medium transition-colors"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDeleteId(null)}
                          className="text-xs px-2 py-1 rounded-lg text-muted-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPendingDeleteId(k.id)}
                        className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        aria-label={`Remove ${k.name} key`}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add key button */}
          {apiKeys.length > 0 && !showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="w-full py-2.5 flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-black dark:hover:text-white rounded-lg border border-dashed border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 transition-colors"
            >
              <Plus className="size-3.5" />
              {strings.settings.apiKeys.addApiKey}
            </button>
          )}

          {/* Add key form */}
          {showForm && (
            <div className="space-y-3 pt-2">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label htmlFor="api-key-name" className="block text-xs text-muted-foreground mb-1">
                    Name
                  </label>
                  <input
                    id="api-key-name"
                    type="text"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    placeholder={strings.settings.apiKeys.namePlaceholder}
                    className={cn(uiClasses.input, "py-2")}
                  />
                </div>
                <div className="w-32">
                  <label htmlFor="api-key-provider" className="block text-xs text-muted-foreground mb-1">
                    Provider
                  </label>
                  <select
                    id="api-key-provider"
                    value={keyProvider}
                    onChange={(e) => onProviderChange(e.target.value)}
                    className={cn(uiClasses.select, "py-2")}
                  >
                    <option value="openai">{strings.settings.apiKeys.providerOpenAI}</option>
                    <option value="groq">{strings.settings.apiKeys.providerGroq}</option>
                    <option value="custom">{strings.settings.apiKeys.providerCustom}</option>
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="api-key-value" className="block text-xs text-muted-foreground mb-1">
                  API key
                </label>
                <input
                  id="api-key-value"
                  type="password"
                  value={apiKey}
                  onChange={(e) => onApiKeyChange(e.target.value)}
                  onBlur={() => {
                    if (apiKey.trim().length >= 10) {
                      const err = validateApiKeyFormat(apiKey, keyProvider);
                      setValidationError(err);
                    }
                  }}
                  placeholder={strings.settings.apiKeys.keyPlaceholder}
                  aria-describedby={displayError ? "api-key-error" : undefined}
                  className={cn(uiClasses.input, "py-2")}
                  autoComplete="off"
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <p id="api-key-error" className="text-xs text-red-600 dark:text-red-400 flex-1" aria-live="polite">
                  {displayError ?? ""}
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="text-xs px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-black dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => onSaveApiKey()}
                    disabled={!apiKey.trim() || !keyName.trim() || isSaving}
                    className={cn(uiClasses.buttonPrimary, "text-xs px-4 py-2 disabled:opacity-50 disabled:pointer-events-none")}
                    aria-label={strings.settings.apiKeys.addApiKey}
                  >
                    {isSaving ? (
                      <span className="flex items-center gap-1.5">
                        <span className="size-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Saving
                      </span>
                    ) : apiKeySaveStatus === "success" ? (
                      <span className="flex items-center gap-1.5">
                        <Check className="size-3.5" />
                        Saved
                      </span>
                    ) : (
                      "Add key"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground/60 text-center pt-1">
            {strings.settings.apiKeys.storedLocally}
          </p>
        </div>
      </div>
    </SettingsSection>
  );
}
