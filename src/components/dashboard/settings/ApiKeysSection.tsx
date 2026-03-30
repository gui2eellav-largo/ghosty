import { useState } from "react";
import { cn } from "@/lib/utils";
import { uiClasses } from "@/lib/design-tokens";
import { strings } from "@/lib/strings";
import { SettingsSection } from "@/components/SettingsModal";
import { Check, Plus, Trash2, Key } from "lucide-react";

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  groq: "Groq",
  custom: "Custom",
};

export interface ApiKeysSectionProps {
  apiKeys: Array<{ id: string; name: string; provider: string; isActive: boolean }>;
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
  onSetActiveKey,
  validateApiKeyFormat,
  setValidationError,
}: ApiKeysSectionProps) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const isSaving =
    apiKeySaveStatus === "validating" ||
    apiKeySaveStatus === "testing" ||
    apiKeySaveStatus === "saving";

  const displayError = validationError ?? error ?? null;

  return (
    <SettingsSection
      title={strings.settings.apiKeys.title}
      description={strings.settings.apiKeys.description}
    >
      <div className="space-y-3">
        {/* Empty state */}
        {apiKeys.length === 0 && !showForm && (
          <div className="py-10 flex flex-col items-center gap-3">
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
                  {k.isActive && (
                    <span className="size-1.5 rounded-full bg-green-500 shrink-0" />
                  )}
                  <span className="text-sm font-medium text-black dark:text-white truncate">
                    {k.name}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {PROVIDER_LABELS[k.provider] ?? k.provider}
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
                    <>
                      {!k.isActive && (
                        <button
                          type="button"
                          onClick={() => onSetActiveKey(k.id)}
                          className="text-xs px-2 py-1 rounded-lg text-muted-foreground hover:text-black dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors"
                          aria-label={`Set ${k.name} as active key`}
                        >
                          Activate
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setPendingDeleteId(k.id)}
                        className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        aria-label={`Remove ${k.name} key`}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add key button (when list exists and form is hidden) */}
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

        {/* Footer */}
        <p className="text-xs text-muted-foreground/60 text-center pt-1">
          {strings.settings.apiKeys.storedLocally}
        </p>
      </div>
    </SettingsSection>
  );
}
