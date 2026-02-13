/**
 * Couche API Tauri : wrappers typés autour de invoke.
 * Centralise les appels backend pour testabilité (mocking) et typage des réponses.
 */

import { invoke } from "@tauri-apps/api/core";
import type {
  Preferences,
  DeepPartial,
  ModeConfig,
  ShortcutConfig,
  DictionaryEntry,
  UsageStats,
} from "@/types";

export const tauriApi = {
  preferences: {
    get: (): Promise<Preferences> => invoke("get_app_preferences"),
    update: (partial: DeepPartial<Preferences>): Promise<Preferences> =>
      invoke("update_app_preferences", { partial }),
  },

  modes: {
    getAll: (): Promise<ModeConfig[]> => invoke("get_all_modes"),
    save: (mode: Partial<ModeConfig> & Pick<ModeConfig, "id">): Promise<ModeConfig[]> =>
      invoke("save_mode", { mode }),
    delete: (modeId: string): Promise<ModeConfig[]> => invoke("delete_mode", { modeId }),
    reorder: (modeIds: string[]): Promise<ModeConfig[]> => invoke("reorder_modes", { modeIds }),
    setActivePrompt: (prompt: string, mode: string): Promise<unknown> =>
      invoke("set_active_prompt", { prompt, mode }),
  },

  llm: {
    improveSystemPrompt: (prompt: string): Promise<string> =>
      invoke("improve_system_prompt", { prompt }),
  },

  shortcuts: {
    getAll: (): Promise<ShortcutConfig[]> => invoke("get_all_shortcuts"),
    save: (shortcut: ShortcutConfig): Promise<ShortcutConfig[]> =>
      invoke("save_shortcut", { shortcut }),
    delete: (shortcutId: string): Promise<ShortcutConfig[]> =>
      invoke("delete_shortcut", { shortcutId }),
    toggle: (shortcutId: string): Promise<ShortcutConfig[]> =>
      invoke("toggle_shortcut", { shortcutId }),
    reset: (): Promise<ShortcutConfig[]> => invoke("reset_shortcuts"),
    checkAvailable: (keys: string[]): Promise<unknown> =>
      invoke("check_shortcut_available", { keys }),
    reregister: (): Promise<unknown> => invoke("reregister_shortcuts"),
  },

  dictionary: {
    getEntries: (): Promise<DictionaryEntry[]> => invoke("get_dictionary_entries"),
    add: (entry: {
      word: string;
      type: string;
      pronunciation?: string;
      misspellings: string[];
    }): Promise<DictionaryEntry> =>
      invoke("add_dictionary_entry", {
        word: entry.word,
        entry_type: entry.type,
        pronunciation: entry.pronunciation ?? null,
        misspellings: entry.misspellings.length ? entry.misspellings : null,
      }),
    update: (entry: {
      id: string;
      word?: string;
      type?: string;
      pronunciation?: string;
      misspellings?: string[];
    }): Promise<DictionaryEntry> =>
      invoke("update_dictionary_entry", {
        id: entry.id,
        word: entry.word ?? null,
        entry_type: entry.type ?? null,
        pronunciation: entry.pronunciation ?? null,
        misspellings: entry.misspellings ?? null,
      }),
    delete: (id: string): Promise<unknown> => invoke("delete_dictionary_entry", { id }),
  },

  apiKeys: {
    getAll: (): Promise<Array<[string, string, string, boolean]>> =>
      invoke("get_all_api_keys"),
    hasKey: (): Promise<boolean> => invoke("has_openai_key"),
    test: (key: string): Promise<unknown> => invoke("test_openai_key", { key }),
    add: (params: { name: string; provider: string; key: string }): Promise<unknown> =>
      invoke("add_api_key_entry", params),
    remove: (keyId: string): Promise<unknown> => invoke("remove_api_key_entry", { keyId }),
    setActive: (keyId: string): Promise<unknown> => invoke("set_active_api_key", { keyId }),
  },

  usage: {
    getStats: (): Promise<UsageStats> => invoke("get_usage_stats"),
    reset: (): Promise<unknown> => invoke("reset_usage_stats"),
  },

  audio: {
    listInputDevices: (): Promise<Array<{ id: string; name: string }>> =>
      invoke("list_audio_input_devices"),
  },

  services: {
    listInstalled: (): Promise<string[]> => invoke("list_installed_ghosty_services"),
    install: (): Promise<string[]> => invoke("install_ghosty_services"),
    openFolder: (): Promise<unknown> => invoke("open_services_folder"),
  },

  recording: {
    start: (): Promise<unknown> => invoke("start_recording"),
    stop: (): Promise<unknown> => invoke("stop_recording"),
    cancel: (): Promise<unknown> => invoke("cancel_transcription"),
  },

  window: {
    setClickThrough: (ignore: boolean): Promise<unknown> =>
      invoke("set_window_click_through", { ignore }),
    focusFloatingIfCursorInside: (): Promise<unknown> =>
      invoke("focus_floating_if_cursor_inside"),
    setFloatingBounds: (params: {
      x: number;
      y: number;
      width: number;
      height: number;
    }): Promise<unknown> => invoke("set_floating_window_bounds", params),
  },
} as const;

export const api = tauriApi;
