import { useState, useCallback } from "react";
import { api } from "@/api/tauri";
import { strings } from "@/lib/strings";
import { getApiErrorMessage } from "@/lib/api-errors";
import type {
  Preferences,
  DeepPartial,
  ShortcutConfig,
  DictionaryEntry,
  UsageStats,
  CorrectionNotification,
} from "@/types";

export function useSettings() {
  const [apiKey, setApiKey] = useState<string>("");
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [, setApiKeyVisible] = useState<boolean>(false);
  const [apiKeySaveStatus, setApiKeySaveStatus] = useState<
    "idle" | "validating" | "testing" | "saving" | "success" | "error"
  >("idle");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [, setIsEditingKey] = useState<boolean>(false);
  const [apiKeys, setApiKeys] = useState<
    Array<{ id: string; name: string; provider: string; isActive: boolean }>
  >([]);
  const [keyName, setKeyName] = useState<string>("");
  const [keyProvider, setKeyProvider] = useState<string>("openai");
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [shortcuts, setShortcuts] = useState<ShortcutConfig[]>([]);
  const [shortcutListeningId, setShortcutListeningId] = useState<string | null>(null);
  const [shortcutError, setShortcutError] = useState<string | null>(null);
  const [dictionaryEntries, setDictionaryEntries] = useState<DictionaryEntry[]>([]);
  const [misspellingDrafts, setMisspellingDrafts] = useState<Record<string, string>>({});
  const [editingDictionaryId, setEditingDictionaryId] = useState<string | null>(null);
  const [audioInputDevices, setAudioInputDevices] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [accountDisplayNameDraft, setAccountDisplayNameDraft] = useState<string>("");
  const [servicesInstalled, setServicesInstalled] = useState<string[] | null>(null);
  const [correctionNotifications, setCorrectionNotifications] = useState<
    CorrectionNotification[]
  >([]);
  const [updateInfo, setUpdateInfo] = useState<{
    available: boolean;
    version?: string;
    body?: string;
  } | null>(null);
  const [updateStatus, setUpdateStatus] = useState<
    "idle" | "checking" | "installing" | "done" | "error"
  >("idle");
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Ready.");

  const loadPreferences = useCallback(async () => {
    try {
      const prefs = await api.preferences.get();
      setPreferences(prefs);
    } catch {
      setPreferences(null);
    }
  }, []);

  const updatePreferences = useCallback(async (partial: DeepPartial<Preferences>) => {
    try {
      const updated = await api.preferences.update(partial);
      setPreferences(updated);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadShortcuts = useCallback(async () => {
    try {
      const allShortcuts = await api.shortcuts.getAll();
      setShortcuts(allShortcuts);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadDictionaryEntries = useCallback(async () => {
    try {
      const entries = await api.dictionary.getEntries();
      const normalizedEntries = entries.map((entry) => ({
        ...entry,
        misspellings: entry.misspellings ?? [],
      }));
      setDictionaryEntries(normalizedEntries);
      setMisspellingDrafts(
        normalizedEntries.reduce<Record<string, string>>((acc, entry) => {
          acc[entry.id] = entry.misspellings.join(", ");
          return acc;
        }, {})
      );
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadApiKeys = useCallback(async () => {
    try {
      const keys = await api.apiKeys.getAll();
      setApiKeys(
        keys.map(([id, name, provider, isActive]) => ({
          id,
          name,
          provider,
          isActive,
        }))
      );
      setHasApiKey(keys.length > 0);
    } catch {
      try {
        const hasKey = await api.apiKeys.hasKey();
        setHasApiKey(hasKey);
      } catch {
        setHasApiKey(false);
      }
    }
  }, []);

  const loadUsageStats = useCallback(async () => {
    try {
      const stats = await api.usage.getStats();
      setUsageStats(stats);
    } catch {
      setUsageStats(null);
    }
  }, []);

  const validateApiKeyFormat = useCallback(
    (key: string, provider: string): string | null => {
      if (!key.trim()) {
        return "API key cannot be empty";
      }

      switch (provider) {
        case "openai":
          if (!key.startsWith("sk-") && !key.startsWith("sk-proj-")) {
            return "OpenAI key must start with 'sk-' or 'sk-proj-'";
          }
          if (key.length < 40) {
            return "OpenAI key too short: minimum 40 characters";
          }
          if (!/^[a-zA-Z0-9\-_]+$/.test(key)) {
            return "Invalid characters detected";
          }
          break;

        case "groq":
          if (!key.startsWith("gsk_")) {
            return "Groq key must start with 'gsk_'";
          }
          if (key.length < 20) {
            return "Groq key too short";
          }
          break;

        case "custom":
          if (key.length < 10) {
            return "Key too short: minimum 10 characters";
          }
          break;

        default:
          return "Unknown provider";
      }

      return null;
    },
    []
  );

  const normalizeKeysForCompare = useCallback((keys: string[]): string => {
    const order = ["Ctrl", "Alt", "Shift", "Cmd"];
    const mods = keys
      .filter((k) => order.includes(k))
      .sort((a, b) => order.indexOf(a) - order.indexOf(b));
    const key = keys.find((k) => !order.includes(k)) ?? "";
    return [...mods, key].join("+");
  }, []);

  const codeToKey = useCallback((code: string): string => {
    if (code === "Space") return "Space";
    if (code.startsWith("Key") && code.length === 4) return code.slice(3).toUpperCase();
    if (code.startsWith("Digit")) return code.slice(5);
    return code;
  }, []);

  const handleShortcutKeyDown = useCallback(
    async (
      e: React.KeyboardEvent,
      shortcutId: string,
      _currentKeys: string[]
    ) => {
      if (!shortcutListeningId || shortcutListeningId !== shortcutId) return;
      e.preventDefault();
      e.stopPropagation();
      if (["Control", "Alt", "Shift", "Meta"].includes(e.key)) return;
      const mods: string[] = [];
      if (e.ctrlKey) mods.push("Ctrl");
      if (e.altKey) mods.push("Alt");
      if (e.shiftKey) mods.push("Shift");
      if (e.metaKey) mods.push("Cmd");
      const key = e.key === "Fn" ? "Fn" : codeToKey(e.code);
      const newKeys = [...mods, key];
      if (newKeys.length === 0) return;
      setShortcutError(null);
      if (newKeys.some((k) => k.toUpperCase() === "FN")) {
        setShortcutError(
          strings.settings.shortcuts.errors.fnKey
        );
        return;
      }
      const sameAsOther = shortcuts.some(
        (s) =>
          s.id !== shortcutId &&
          normalizeKeysForCompare(s.keys) === normalizeKeysForCompare(newKeys)
      );
      if (sameAsOther) {
        setShortcutError(strings.settings.shortcuts.errors.alreadyUsed);
        return;
      }
      try {
        await api.shortcuts.checkAvailable(newKeys);
      } catch {
        setShortcutError(
          strings.settings.shortcuts.errors.reserved
        );
        return;
      }
      const shortcut = shortcuts.find((s) => s.id === shortcutId);
      if (!shortcut) return;
      try {
        const updated = await api.shortcuts.save({ ...shortcut, keys: newKeys });
        setShortcuts(updated);
        setShortcutListeningId(null);
        await api.shortcuts.reregister();
      } catch (err) {
        console.error(err);
        setShortcutError(strings.settings.shortcuts.errors.saveFailed);
      }
    },
    [shortcutListeningId, shortcuts, codeToKey, normalizeKeysForCompare]
  );

  const handleDeleteShortcut = useCallback(async (shortcutId: string) => {
    try {
      const updated = await api.shortcuts.delete(shortcutId);
      setShortcuts(updated);
      await api.shortcuts.reregister();
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleToggleShortcut = useCallback(async (shortcutId: string) => {
    try {
      const updated = await api.shortcuts.toggle(shortcutId);
      setShortcuts(updated);
      await api.shortcuts.reregister();
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleAddWordFromModal = useCallback(
    async (payload: {
      word: string;
      type: string;
      pronunciation?: string;
      misspellings?: string[];
    }) => {
      const entry = await api.dictionary.add({
        word: payload.word,
        type: payload.type,
        pronunciation: payload.pronunciation ?? undefined,
        misspellings: payload.misspellings ?? [],
      });
      const normalizedEntry = {
        ...entry,
        misspellings: entry.misspellings ?? [],
      };
      setDictionaryEntries((prev) => [...prev, normalizedEntry]);
      setMisspellingDrafts((prev) => ({
        ...prev,
        [normalizedEntry.id]: "",
      }));
    },
    []
  );

  const handleMisspellingChange = useCallback((id: string, value: string) => {
    setMisspellingDrafts((prev) => ({ ...prev, [id]: value }));
  }, []);

  const handleMisspellingSave = useCallback(
    async (id: string) => {
      const raw = misspellingDrafts[id] ?? "";
      const items = raw
        .split(",")
        .map((v) => v.trim())
        .filter((v) => v.length > 0);
      try {
        const updated = await api.dictionary.update({ id, misspellings: items });
        const normalizedUpdated = {
          ...updated,
          misspellings: updated.misspellings ?? [],
        };
        setDictionaryEntries((prev) =>
          prev.map((entry) => (entry.id === id ? normalizedUpdated : entry))
        );
        setMisspellingDrafts((prev) => ({
          ...prev,
          [id]: normalizedUpdated.misspellings.join(", "),
        }));
      } catch (e) {
        console.error(e);
      }
    },
    [misspellingDrafts]
  );

  const handleDeleteWord = useCallback(async (id: string) => {
    try {
      await api.dictionary.delete(id);
      setDictionaryEntries((prev) => prev.filter((e) => e.id !== id));
      setMisspellingDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleEditDictionaryEntry = useCallback((id: string) => {
    setEditingDictionaryId(id);
  }, []);

  const handleAcceptCorrectionNotification = useCallback(
    async (n: CorrectionNotification) => {
      try {
        await api.dictionary.add({
          word: n.candidate.correction,
          type: "Custom",
          misspellings: [n.candidate.misspelling],
        });
        await loadDictionaryEntries();
      } catch (e) {
        console.error(e);
      } finally {
        setCorrectionNotifications((prev) => prev.filter((x) => x.id !== n.id));
      }
    },
    [loadDictionaryEntries]
  );

  const handleDismissCorrectionNotification = useCallback((id: string) => {
    setCorrectionNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const handleApiKeyChange = useCallback(
    (value: string) => {
      setApiKey(value);

      if (value.trim().length === 0) {
        setValidationError(null);
        return;
      }

      if (value.trim().length < 10) {
        return;
      }

      const error = validateApiKeyFormat(value, keyProvider);
      setValidationError(error);
    },
    [keyProvider, validateApiKeyFormat]
  );

  const handleProviderChange = useCallback(
    (provider: string) => {
      setKeyProvider(provider);

      if (apiKey.trim().length >= 10) {
        const error = validateApiKeyFormat(apiKey, provider);
        setValidationError(error);
      }
    },
    [apiKey, validateApiKeyFormat]
  );

  const handleSaveApiKey = useCallback(async () => {
    if (!apiKey.trim() || !keyName.trim()) return;

    const formatError = validateApiKeyFormat(apiKey.trim(), keyProvider);
    if (formatError) {
      setValidationError(formatError);
      setApiKeySaveStatus("error");
      setTimeout(() => setApiKeySaveStatus("idle"), 3000);
      return;
    }

    try {
      setValidationError(null);

      setApiKeySaveStatus("validating");
      await new Promise((resolve) => setTimeout(resolve, 300));

      setApiKeySaveStatus("testing");
      await api.apiKeys.test(apiKey.trim(), keyProvider);

      setApiKeySaveStatus("saving");
      await api.apiKeys.add({
        name: keyName.trim(),
        provider: keyProvider,
        key: apiKey.trim(),
      });

      setApiKeySaveStatus("success");
      setApiKey("");
      setKeyName("");
      setKeyProvider("openai");
      setApiKeyVisible(false);
      setError(null);
      setIsEditingKey(false);

      await loadApiKeys();

      setTimeout(() => setApiKeySaveStatus("idle"), 2000);
    } catch (err) {
      setApiKeySaveStatus("error");
      setError(getApiErrorMessage(err));
      setTimeout(() => {
        setApiKeySaveStatus("idle");
        setError(null);
      }, 5000);
    }
  }, [apiKey, keyName, keyProvider, validateApiKeyFormat, loadApiKeys]);

  const handleDeleteApiKey = useCallback(
    async (keyId: string) => {
      if (!confirm(strings.errors.deleteApiKeyConfirm)) return;

      try {
        await api.apiKeys.remove(keyId);
        await loadApiKeys();
      } catch (err) {
        setError(getApiErrorMessage(err));
      }
    },
    [loadApiKeys]
  );

  const handleSetActiveKey = useCallback(
    async (keyId: string) => {
      try {
        await api.apiKeys.setActive(keyId);
        await loadApiKeys();
      } catch (err) {
        setError(getApiErrorMessage(err));
      }
    },
    [loadApiKeys]
  );

  const handleResetUsage = useCallback(async () => {
    if (!confirm(strings.errors.resetUsageConfirm)) return;
    try {
      await api.usage.reset();
      setUsageStats({
        transcription_requests: 0,
        llm_requests: 0,
        tokens_input: 0,
        tokens_output: 0,
      });
    } catch {
      await loadUsageStats();
    }
  }, [loadUsageStats]);

  return {
    // API key state
    apiKey,
    setApiKey,
    hasApiKey,
    apiKeySaveStatus,
    validationError,
    setValidationError,
    apiKeys,
    keyName,
    setKeyName,
    keyProvider,
    error,
    setError,
    status,
    setStatus,

    // Preferences
    preferences,
    usageStats,
    shortcuts,
    setShortcuts,
    shortcutListeningId,
    setShortcutListeningId,
    shortcutError,
    setShortcutError,

    // Dictionary
    dictionaryEntries,
    misspellingDrafts,
    editingDictionaryId,
    setEditingDictionaryId,

    // Audio / Services
    audioInputDevices,
    setAudioInputDevices,
    servicesInstalled,
    setServicesInstalled,

    // Account
    accountDisplayNameDraft,
    setAccountDisplayNameDraft,

    // Notifications
    correctionNotifications,
    setCorrectionNotifications,

    // Update
    updateInfo,
    setUpdateInfo,
    updateStatus,
    setUpdateStatus,
    updateError,
    setUpdateError,

    // Loaders
    loadPreferences,
    updatePreferences,
    loadShortcuts,
    loadDictionaryEntries,
    loadApiKeys,
    loadUsageStats,
    validateApiKeyFormat,

    // Handlers
    handleShortcutKeyDown,
    handleDeleteShortcut,
    handleToggleShortcut,
    handleAddWordFromModal,
    handleMisspellingChange,
    handleMisspellingSave,
    handleDeleteWord,
    handleEditDictionaryEntry,
    handleAcceptCorrectionNotification,
    handleDismissCorrectionNotification,
    handleApiKeyChange,
    handleProviderChange,
    handleSaveApiKey,
    handleDeleteApiKey,
    handleSetActiveKey,
    handleResetUsage,
  };
}
