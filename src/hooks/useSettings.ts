import { useMemo } from "react";
import { useApiKeys } from "./useApiKeys";
import { useShortcuts } from "./useShortcuts";
import { useDictionary } from "./useDictionary";
import { usePreferences } from "./usePreferences";
import { useAppState } from "./useAppState";

export function useSettings() {
  const apiKeysState = useApiKeys();
  const shortcutsState = useShortcuts();
  const dictionaryState = useDictionary();
  const preferencesState = usePreferences();
  const appState = useAppState();

  const handleAcceptCorrectionNotification = useMemo(
    () => appState.makeHandleAcceptCorrectionNotification(dictionaryState.loadDictionaryEntries),
    [appState.makeHandleAcceptCorrectionNotification, dictionaryState.loadDictionaryEntries]
  );

  return {
    // API key state
    apiKey: apiKeysState.apiKey,
    setApiKey: apiKeysState.setApiKey,
    hasApiKey: apiKeysState.hasApiKey,
    apiKeySaveStatus: apiKeysState.apiKeySaveStatus,
    validationError: apiKeysState.validationError,
    setValidationError: apiKeysState.setValidationError,
    apiKeys: apiKeysState.apiKeys,
    keyName: apiKeysState.keyName,
    setKeyName: apiKeysState.setKeyName,
    keyProvider: apiKeysState.keyProvider,
    error: apiKeysState.error,
    setError: apiKeysState.setError,

    // Preferences
    preferences: preferencesState.preferences,
    accountDisplayNameDraft: preferencesState.accountDisplayNameDraft,
    setAccountDisplayNameDraft: preferencesState.setAccountDisplayNameDraft,
    loadPreferences: preferencesState.loadPreferences,
    updatePreferences: preferencesState.updatePreferences,

    // Usage
    usageStats: appState.usageStats,
    loadUsageStats: appState.loadUsageStats,
    handleResetUsage: appState.handleResetUsage,

    // Shortcuts
    shortcuts: shortcutsState.shortcuts,
    setShortcuts: shortcutsState.setShortcuts,
    shortcutListeningId: shortcutsState.shortcutListeningId,
    setShortcutListeningId: shortcutsState.setShortcutListeningId,
    shortcutError: shortcutsState.shortcutError,
    setShortcutError: shortcutsState.setShortcutError,
    loadShortcuts: shortcutsState.loadShortcuts,
    handleShortcutKeyDown: shortcutsState.handleShortcutKeyDown,
    handleDeleteShortcut: shortcutsState.handleDeleteShortcut,
    handleToggleShortcut: shortcutsState.handleToggleShortcut,

    // Dictionary
    dictionaryEntries: dictionaryState.dictionaryEntries,
    misspellingDrafts: dictionaryState.misspellingDrafts,
    editingDictionaryId: dictionaryState.editingDictionaryId,
    setEditingDictionaryId: dictionaryState.setEditingDictionaryId,
    loadDictionaryEntries: dictionaryState.loadDictionaryEntries,
    handleAddWordFromModal: dictionaryState.handleAddWordFromModal,
    handleMisspellingChange: dictionaryState.handleMisspellingChange,
    handleMisspellingSave: dictionaryState.handleMisspellingSave,
    handleDeleteWord: dictionaryState.handleDeleteWord,
    handleEditDictionaryEntry: dictionaryState.handleEditDictionaryEntry,

    // Audio / Services
    audioInputDevices: appState.audioInputDevices,
    setAudioInputDevices: appState.setAudioInputDevices,
    servicesInstalled: appState.servicesInstalled,
    setServicesInstalled: appState.setServicesInstalled,

    // Notifications
    correctionNotifications: appState.correctionNotifications,
    setCorrectionNotifications: appState.setCorrectionNotifications,
    handleAcceptCorrectionNotification,
    handleDismissCorrectionNotification: appState.handleDismissCorrectionNotification,

    // Update
    updateInfo: appState.updateInfo,
    setUpdateInfo: appState.setUpdateInfo,
    updateStatus: appState.updateStatus,
    setUpdateStatus: appState.setUpdateStatus,
    updateError: appState.updateError,
    setUpdateError: appState.setUpdateError,

    // Status
    status: appState.status,
    setStatus: appState.setStatus,

    // Loaders
    loadApiKeys: apiKeysState.loadApiKeys,
    validateApiKeyFormat: apiKeysState.validateApiKeyFormat,

    // Handlers
    handleApiKeyChange: apiKeysState.handleApiKeyChange,
    handleProviderChange: apiKeysState.handleProviderChange,
    handleSaveApiKey: apiKeysState.handleSaveApiKey,
    handleDeleteApiKey: apiKeysState.handleDeleteApiKey,
    handleSetActiveKey: apiKeysState.handleSetActiveKey,
  };
}
