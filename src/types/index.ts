/**
 * Types partagés entre Dashboard, FloatingBar et couche API.
 * Source unique de vérité pour les contrats avec le backend Tauri.
 */

export interface TranscriptionItem {
  id: string;
  time: string;
  output: string;
  thoughts: string | null;
  mode: string | null;
}

export interface DictionaryEntry {
  id: string;
  word: string;
  type: string;
  pronunciation?: string;
  misspellings: string[];
  created_at: number;
}

export type View = "home" | "modes" | "dictionary" | "settings";
export type Language = "auto" | "fr" | "en" | "es" | "de";
/** Stable backend mode ids (display names: Direct, Shape, Reframe, Build). */
export type Mode = "light" | "medium" | "strong" | "full";

export const DIRECT_MODE_ID = "light";
/** Fonctionnalité « Mode texte / clic droit / Services macOS ». */
export const ENABLE_RIGHT_CLICK_SERVICES = true;

/** Id of the active settings tab/section in the Dashboard. */
export type SettingsSectionId =
  | "general"
  | "system"
  | "shortcuts"
  | "recording"
  | "models"
  | "behavior"
  | "advanced"
  | "usage"
  | "api"
  | "account";

export const LANGUAGES: Record<Language, { label: string; flag: string }> = {
  auto: { label: "Auto-detect", flag: "" },
  fr: { label: "Français", flag: "🇫🇷" },
  en: { label: "English", flag: "🇺🇸" },
  es: { label: "Español", flag: "🇪🇸" },
  de: { label: "Deutsch", flag: "🇩🇪" },
};

export interface UsageStats {
  transcription_requests: number;
  llm_requests: number;
  tokens_input: number;
  tokens_output: number;
}

export interface Preferences {
  general: {
    launchAtLogin: boolean;
    autoUpdate: boolean;
    displayName?: string;
    avatarPath?: string | null;
  };
  shortcut: { modifiers: string[]; key: string };
  recording: { maxDurationMinutes: number; inputDeviceId?: string | null };
  transcription: { model: string; timeoutSecs: number; language?: string | null };
  llm: { model: string; temperature: number; maxTokens: number; timeoutSecs: number };
  behavior: {
    autoCopy: boolean;
    soundOnComplete: boolean;
    systemNotification: boolean;
    autoPasteAfterTransform?: boolean;
    pasteInputAndOutput?: boolean;
  };
  appearance: { theme: string; barPosition: string; fontSize: string; showLockInWidget?: boolean };
  advanced: { transcriptionBaseUrl?: string | null; llmBaseUrl?: string | null };
}

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

export interface ModeConfig {
  id: string;
  name: string;
  description: string;
  color: string;
  systemPrompt: string;
  enabled: boolean;
  isCustom: boolean;
  isDefault: boolean;
  order: number;
  locked?: boolean;
}

export interface ShortcutConfig {
  id: string;
  name: string;
  description: string;
  keys: string[];
  action: {
    type:
      | "activateMode"
      | "startRecording"
      | "stopRecording"
      | "pushToTalk"
      | "toggleRecording"
      | "openDashboard"
      | "toggleFloatingBar"
      | "pasteLastOutput";
    modeId?: string;
  };
  enabled: boolean;
}
