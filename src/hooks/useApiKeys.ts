import { useState, useCallback } from "react";
import { api } from "@/api/tauri";
import { strings } from "@/lib/strings";
import { getApiErrorMessage } from "@/lib/api-errors";

export function useApiKeys() {
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
  const [error, setError] = useState<string | null>(null);

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

  return {
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
    loadApiKeys,
    validateApiKeyFormat,
    handleApiKeyChange,
    handleProviderChange,
    handleSaveApiKey,
    handleDeleteApiKey,
    handleSetActiveKey,
  };
}
