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
      <div className="space-y-4">
        {/* Key list */}
        {apiKeys.length === 0 && !showForm && (
          <div className="rounded-lg border border-dashed border-black/10 dark:border-white/10 py-8 flex flex-col items-center gap-3">
            <div className="size-10 rounded-full bg-black/[0.03] dark:bg-white/[0.03] flex items-center justify-center">
              <Key className="size-5 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground">{strings.settings.apiKeys.noKeysYet}</p>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className={cn(uiClasses.buttonPrimary, "text-xs px-4 py-2")}
            >
              <span className="flex items-center gap-1.5">
                <Plus className="size-3.5" />
                {strings.settings.apiKeys.addApiKey}
              </span>
            </button>
          </div>
        )}

        {apiKeys.length > 0 && (
          <div className="space-y-2">
            {apiKeys.map((k) => (
              <div
                key={k.id}
                className={cn(
                  "rounded-lg border px-4 py-3 flex items-center justify-between gap-3 transition-colors",
                  k.isActive
                    ? "border-green-500/30 bg-green-500/[0.03] dark:bg-green-500/[0.04]"
                    : "border-black/[0.06] dark:border-white/[0.06]"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-black dark:text-white truncate">
                        {k.name}
                      </span>
                      <span className="shrink-0 text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/[0.04] dark:bg-white/[0.06] text-muted-foreground">
                        {PROVIDER_LABELS[k.provider] ?? k.provider}
                      </span>
                      {k.isActive && (
                        <span className="shrink-0 text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-green-500/10 text-green-600 dark:text-green-400">
                          Active
                        </span>
                      )}
                    </div>
                  </div>
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
                        className={cn(uiClasses.buttonGhost, "text-xs px-2.5 py-1.5 text-red-600 dark:text-red-400 hover:bg-red-500/10 font-medium")}
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDeleteId(null)}
                        className={cn(uiClasses.buttonGhost, "text-xs px-2.5 py-1.5")}
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
                          className={cn(uiClasses.buttonGhost, "text-xs px-2.5 py-1.5")}
                          aria-label={`Set ${k.name} as active key`}
                        >
                          Use this key
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setPendingDeleteId(k.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black/40 dark:focus-visible:ring-white/40"
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

        {/* Add key form */}
        {(showForm || apiKeys.length > 0) && (
          <div className="rounded-lg border border-black/[0.06] dark:border-white/[0.06] p-4 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Add a new key
            </p>
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <div className="space-y-3">
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
                  <div className="w-36">
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
                    className={cn(uiClasses.input, "py-2")}
                    autoComplete="off"
                  />
                </div>
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => onSaveApiKey()}
                  disabled={!apiKey.trim() || !keyName.trim() || isSaving}
                  className={cn(uiClasses.buttonPrimary, "px-4 py-2 text-sm disabled:opacity-50 disabled:pointer-events-none")}
                  aria-label={strings.settings.apiKeys.addApiKey}
                >
                  {isSaving ? (
                    <span className="flex items-center gap-1.5">
                      <span className="size-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Saving
                    </span>
                  ) : apiKeySaveStatus === "success" ? (
                    <span className="flex items-center gap-1.5">
                      <Check className="size-3.5" />
                      Saved
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Plus className="size-3.5" />
                      Add
                    </span>
                  )}
                </button>
              </div>
            </div>
            <p className="text-xs text-red-600 dark:text-red-400 min-h-[1em]" aria-live="polite">
              {displayError ?? ""}
            </p>
          </div>
        )}

        {/* Footer hint */}
        <p className="text-xs text-muted-foreground text-center">
          {strings.settings.apiKeys.storedLocally}
        </p>
      </div>
    </SettingsSection>
  );
}
