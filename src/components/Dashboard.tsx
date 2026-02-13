import { useEffect, useLayoutEffect, useState, useRef } from "react";
import React from "react";
import { createPortal } from "react-dom";
import { listen } from "@tauri-apps/api/event";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { LiveWaveform } from "./ui/live-waveform";
import { cn } from "@/lib/utils";
import { uiClasses } from "@/lib/design-tokens";
import { getApiErrorMessage } from "@/lib/api-errors";
import packageJson from "../../package.json";
import { api } from "@/api/tauri";
import {
  type View,
  type Language,
  type Mode,
  type Preferences,
  type ModeConfig,
  type ShortcutConfig,
  type DictionaryEntry,
  type UsageStats,
  type TranscriptionItem,
  type SettingsSectionId,
  type DeepPartial,
  DIRECT_MODE_ID,
  ENABLE_RIGHT_CLICK_SERVICES,
  LANGUAGES,
} from "@/types";
import { useModes, DEFAULT_SYSTEM_PROMPT_PLACEHOLDER } from "@/hooks/useModes";
import { SettingsModal, SettingsSection, SettingsRow, ToggleSwitch } from "./SettingsModal";
import { AddWordModal } from "./AddWordModal";
import { ProfilePopover } from "./ProfilePopover";
import { NotificationsPanel } from "./NotificationsPanel";
import { IconButton } from "./ui/icon-button";
import { MaskedPromptBox } from "./ui/masked-prompt-box";
import { SystemPromptEditor } from "./SystemPromptEditor";
import {
  Home,
  BookOpen,
  Settings,
  HelpCircle,
  Mic,
  ChevronDown,
  ChevronUp,
  Clipboard,
  Trash2,
  Clock,
  Check,
  Eye,
  EyeOff,
  Key,
  Plus,
  Copy,
  Save,
  X,
  Keyboard,
  Zap,
  Lock,
  MoreHorizontal,
  User,
  Bell,
  Terminal
} from "lucide-react";

export default function Dashboard() {
  const modesState = useModes();
  const {
    modes,
    selectedModeId,
    setSelectedModeId,
    selectedMode,
    setSelectedMode,
    canMoveUp,
    canMoveDown,
    isEditingMode,
    setIsEditingMode,
    editedMode,
    setEditedMode,
    modeDraft,
    setModeDraft,
    modeIdToConfirmDelete,
    setModeIdToConfirmDelete,
    modeRowMenuOpen,
    setModeRowMenuOpen,
    modeRowMenuRef,
    showImportModesModal,
    setShowImportModesModal,
    importModesJson,
    setImportModesJson,
    importModesError,
    setImportModesError,
    directDeleteBlockedMessage,
    setDirectDeleteBlockedMessage,
    loadModes,
    handleSaveMode,
    handleDeleteMode,
    handleToggleModeEnabled,
    handleToggleLocked,
    handleMoveMode,
    saveModeDraft,
    handleCreateNewMode,
    handleDuplicateMode,
    handleExportMode,
    handleImportModes,
  } = modesState;

  const [activeView, setActiveView] = useState<View>("home");
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<"bottom" | "top">("bottom");
  const [dropdownCoords, setDropdownCoords] = useState({ top: 0, left: 0 });
  const [transcriptions, setTranscriptions] = useState<TranscriptionItem[]>([]);
  const [status, setStatus] = useState("Ready.");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedThoughts, setExpandedThoughts] = useState<Set<string>>(new Set());
  const [expandedOutputs, setExpandedOutputs] = useState<Set<string>>(new Set());
  const [overflowedOutputs, setOverflowedOutputs] = useState<Set<string>>(new Set());
  const outputRefs = useRef<Record<string, HTMLParagraphElement | null>>({});
  const [apiKey, setApiKey] = useState<string>("");
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [, setApiKeyVisible] = useState<boolean>(false);
  const [apiKeySaveStatus, setApiKeySaveStatus] = useState<"idle" | "validating" | "testing" | "saving" | "success" | "error">("idle");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [, setIsEditingKey] = useState<boolean>(false);
  const [apiKeys, setApiKeys] = useState<Array<{ id: string; name: string; provider: string; isActive: boolean }>>([]);
  const [keyName, setKeyName] = useState<string>("");
  const [keyProvider, setKeyProvider] = useState<string>("openai");
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [activeSettingsSection, setActiveSettingsSection] = useState<SettingsSectionId>("general");
  const [shortcuts, setShortcuts] = useState<ShortcutConfig[]>([]);
  const [promptImproveToast, setPromptImproveToast] = useState<string | null>(null);
  const [shortcutListeningId, setShortcutListeningId] = useState<string | null>(null);
  const [shortcutError, setShortcutError] = useState<string | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [dictionaryEntries, setDictionaryEntries] = useState<DictionaryEntry[]>([]);
  const [misspellingDrafts, setMisspellingDrafts] = useState<Record<string, string>>({});
  const [editingDictionaryId, setEditingDictionaryId] = useState<string | null>(null);
  const [isAddWordModalOpen, setIsAddWordModalOpen] = useState(false);
  const [audioInputDevices, setAudioInputDevices] = useState<Array<{ id: string; name: string }>>([]);
  const [accountDisplayNameDraft, setAccountDisplayNameDraft] = useState<string>("");
  const [isProfilePopoverOpen, setIsProfilePopoverOpen] = useState(false);
  const [servicesInstalled, setServicesInstalled] = useState<string[] | null>(null);
  const [isNotificationsPanelOpen, setIsNotificationsPanelOpen] = useState(false);
  const notificationsUnreadCount = 0;
  const profilePopoverRef = useRef<HTMLDivElement>(null);
  const notificationsPanelRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(target);
      const clickedOutsideTrigger = triggerRef.current && !triggerRef.current.contains(target);
      
      if (clickedOutsideDropdown && clickedOutsideTrigger) {
        setIsModeDropdownOpen(false);
      }
    };

    if (isModeDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isModeDropdownOpen]);

  useEffect(() => {
    if (modeRowMenuOpen === null) return;
    const handleClickOutside = (e: MouseEvent) => {
      const el = modeRowMenuRef.current;
      if (el && !el.contains(e.target as Node)) {
        setModeRowMenuOpen(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- modeRowMenuRef/setModeRowMenuOpen stable, avoid re-run on ref
  }, [modeRowMenuOpen]);

  // Attach wheel event to mode selector button
  useEffect(() => {
    const button = triggerRef.current;
    if (!button) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const enabledModes = modes.filter(m => m.enabled);
      if (enabledModes.length === 0) return;
      const currentIndex = enabledModes.findIndex(m => m.id === selectedMode);
      if (currentIndex === -1) return;
      
      let newIndex = currentIndex;
      if (e.deltaY < 0) {
        newIndex = Math.max(0, currentIndex - 1);
      } else if (e.deltaY > 0) {
        newIndex = Math.min(enabledModes.length - 1, currentIndex + 1);
      }
      const target = enabledModes[newIndex];
      if (target && target.id !== selectedMode) {
        setSelectedMode(target.id as Mode);
        api.modes.setActivePrompt(target.systemPrompt, target.id).catch(console.error);
      }
    };

    button.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      button.removeEventListener('wheel', handleWheel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setSelectedMode stable from useModes
  }, [selectedMode, modes]);

  const DROPDOWN_WIDTH = 280;
  const DROPDOWN_HEIGHT = 280;
  const DROPDOWN_GAP = 8;

  /** Calcule top/left et position (top/bottom) à partir du rect du trigger. Utilisé au clic (avant ouverture) et sur resize/scroll. */
  const getDropdownPlacement = (triggerRect: DOMRect): { top: number; left: number; position: "top" | "bottom" } => {
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;
    const leftCentered = triggerRect.left + (triggerRect.width / 2) - (DROPDOWN_WIDTH / 2);
    const left = Math.max(8, Math.min(leftCentered, window.innerWidth - DROPDOWN_WIDTH - 8));

    if (spaceBelow < DROPDOWN_HEIGHT && spaceAbove > spaceBelow) {
      return {
        position: "top",
        top: triggerRect.top - DROPDOWN_HEIGHT - DROPDOWN_GAP,
        left,
      };
    }
    return {
      position: "bottom",
      top: triggerRect.bottom + DROPDOWN_GAP,
      left,
    };
  };

  /** Ouvre le dropdown uniquement après avoir calculé la position (évite le flash/saut). */
  const openModeDropdown = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const placement = getDropdownPlacement(rect);
    setDropdownCoords({ top: placement.top, left: placement.left });
    setDropdownPosition(placement.position);
    setIsModeDropdownOpen(true);
  };

  useEffect(() => {
    if (!isModeDropdownOpen) return;
    const trigger = triggerRef.current;
    if (!trigger) return;
    const updatePosition = () => {
      const rect = trigger.getBoundingClientRect();
      const placement = getDropdownPlacement(rect);
      setDropdownCoords({ top: placement.top, left: placement.left });
      setDropdownPosition(placement.position);
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isModeDropdownOpen]);

  // Check if API key exists on mount
  useEffect(() => {
    loadApiKeys();
    loadModes();
    loadShortcuts();
    loadDictionaryEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  useEffect(() => {
    if (promptImproveToast === null) return;
    const t = setTimeout(() => setPromptImproveToast(null), 5000);
    return () => clearTimeout(t);
  }, [promptImproveToast]);

  useEffect(() => {
    if (isSettingsModalOpen) {
      loadUsageStats();
      loadPreferences();
    }
  }, [isSettingsModalOpen]);

  useEffect(() => {
    if (activeSettingsSection === "account") {
      setAccountDisplayNameDraft(preferences?.general?.displayName ?? "");
    }
  }, [activeSettingsSection, preferences?.general?.displayName]);

  useEffect(() => {
    if (!isProfilePopoverOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const el = profilePopoverRef.current;
      if (el && !el.contains(e.target as Node)) setIsProfilePopoverOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isProfilePopoverOpen]);

  useEffect(() => {
    if (!isNotificationsPanelOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const el = notificationsPanelRef.current;
      if (el && !el.contains(e.target as Node)) setIsNotificationsPanelOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isNotificationsPanelOpen]);

  useEffect(() => {
    const unlisten = listen("preferences-updated", () => {
      loadPreferences();
    });
    return () => {
      unlisten.then((u) => { try { u(); } catch { /* listener already removed */ } }).catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (!shortcutError) return;
    const t = setTimeout(() => setShortcutError(null), 8000);
    return () => clearTimeout(t);
  }, [shortcutError]);

  const loadPreferences = async () => {
    try {
      const prefs = await api.preferences.get();
      setPreferences(prefs);
    } catch {
      setPreferences(null);
    }
  };

  const updatePreferences = async (partial: DeepPartial<Preferences>) => {
    try {
      const updated = await api.preferences.update(partial);
      setPreferences(updated);
    } catch (e) {
      console.error(e);
    }
  };

  const loadShortcuts = async () => {
    try {
      const allShortcuts = await api.shortcuts.getAll();
      setShortcuts(allShortcuts);
    } catch (e) {
      console.error(e);
    }
  };

  const normalizeKeysForCompare = (keys: string[]): string => {
    const order = ["Ctrl", "Alt", "Shift", "Cmd"];
    const mods = keys.filter((k) => order.includes(k)).sort((a, b) => order.indexOf(a) - order.indexOf(b));
    const key = keys.find((k) => !order.includes(k)) ?? "";
    return [...mods, key].join("+");
  };

  const codeToKey = (code: string): string => {
    if (code === "Space") return "Space";
    if (code.startsWith("Key") && code.length === 4) return code.slice(3).toUpperCase();
    if (code.startsWith("Digit")) return code.slice(5);
    return code;
  };

  const handleShortcutKeyDown = async (
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
      setShortcutError("The Fn key cannot be used for global shortcuts on this system.");
      return;
    }
    const sameAsOther = shortcuts.some(
      (s) => s.id !== shortcutId && normalizeKeysForCompare(s.keys) === normalizeKeysForCompare(newKeys)
    );
    if (sameAsOther) {
      setShortcutError("This shortcut is already used by another action.");
      return;
    }
    try {
      await api.shortcuts.checkAvailable(newKeys);
    } catch {
      setShortcutError(
        "Shortcut reserved by macOS or another app. Try Ctrl+Shift+Space or another combination."
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
      setShortcutError("Failed to save.");
    }
  };

  const _handleDeleteShortcut = async (shortcutId: string) => {
    try {
      const updated = await api.shortcuts.delete(shortcutId);
      setShortcuts(updated);
      await api.shortcuts.reregister();
    } catch (e) {
      console.error(e);
    }
  };

  const _handleToggleShortcut = async (shortcutId: string) => {
    try {
      const updated = await api.shortcuts.toggle(shortcutId);
      setShortcuts(updated);
      await api.shortcuts.reregister();
    } catch (e) {
      console.error(e);
    }
  };

  const loadDictionaryEntries = async () => {
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
  };

  const handleAddWordFromModal = async (payload: {
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
    setMisspellingDrafts((prev) => ({ ...prev, [normalizedEntry.id]: "" }));
  };

  const handleMisspellingChange = (id: string, value: string) => {
    setMisspellingDrafts((prev) => ({ ...prev, [id]: value }));
  };

  const handleMisspellingSave = async (id: string) => {
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
  };

  const handleDeleteWord = async (id: string) => {
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
  };

  const handleEditDictionaryEntry = (id: string) => {
    setEditingDictionaryId(id);
  };

  const loadApiKeys = async () => {
    try {
      const keys = await api.apiKeys.getAll();
      setApiKeys(keys.map(([id, name, provider, isActive]) => ({
        id,
        name,
        provider,
        isActive
      })));
      setHasApiKey(keys.length > 0);
    } catch {
      // Fallback : ancienne méthode
      try {
        const hasKey = await api.apiKeys.hasKey();
        setHasApiKey(hasKey);
      } catch {
        setHasApiKey(false);
      }
    }
  };

  useEffect(() => {
    const unlistenStarted = listen("recording_started", () => {
      setStatus("Recording...");
      setIsRecording(true);
      setIsProcessing(false);
      setError(null);
    });
    const unlistenStopped = listen("recording_stopped", () => {
      setStatus("Transcribing...");
      setIsRecording(false);
      setIsProcessing(true);
    });
    const unlistenReady = listen<{ output: string; thoughts: string | null; mode: string | null } | string>("transcription_ready", (event) => {
      setStatus("Ready.");
      setIsProcessing(false);
      const payload = event.payload;
      const output = typeof payload === "string" ? payload : payload.output;
      const thoughts = typeof payload === "string" ? null : payload.thoughts;
      const mode = typeof payload === "string" ? null : payload.mode;
      
      const newItem: TranscriptionItem = {
        id: Math.random().toString(36).substring(7),
        time: new Date().toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", hour12: true }),
        output,
        thoughts,
        mode
      };
      setTranscriptions(prev => [newItem, ...prev]);
      void loadUsageStats();
    });
    const unlistenError = listen<string>("transcription_error", (event) => {
      setStatus("Ready.");
      setIsRecording(false);
      setIsProcessing(false);
      setError(event.payload);
    });
    const unlistenActivateMode = listen<string>("active-mode-changed", (event) => {
      const modeId = event.payload;
      if (modeId) {
        setSelectedMode(modeId as Mode);
      }
    });

    const safeUnlisten = (p: Promise<() => void>) => p.then((u) => { try { u(); } catch { /* listener already removed */ } }).catch(() => {});
    return () => {
      safeUnlisten(unlistenStarted);
      safeUnlisten(unlistenStopped);
      safeUnlisten(unlistenReady);
      safeUnlisten(unlistenError);
      safeUnlisten(unlistenActivateMode);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setSelectedMode stable, run once
  }, []);

  useEffect(() => {
    const playCompletionBeep = () => {
      try {
        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
      } catch {
        // ignore if AudioContext unavailable
      }
    };

    const unlistenSound = listen("play_completion_sound", () => playCompletionBeep());
    const unlistenNotif = listen<string>("show_completion_notification", async (event) => {
      let granted = await isPermissionGranted();
      if (!granted) {
        const permission = await requestPermission();
        granted = permission === "granted";
      }
      if (granted) {
        sendNotification({ title: "Ghosty", body: event.payload });
      }
    });

    const safeUnlisten = (p: Promise<() => void>) => p.then((u) => { try { u(); } catch { /* listener already removed */ } }).catch(() => {});
    return () => {
      safeUnlisten(unlistenSound);
      safeUnlisten(unlistenNotif);
    };
  }, []);

  useEffect(() => {
    const unlisten = listen<string>("open-settings-section", (event) => {
      const section = event.payload;
      const valid: SettingsSectionId[] = ["shortcuts", "recording", "models", "general", "system", "behavior", "advanced", "usage", "api", "account"];
      if (valid.includes(section as SettingsSectionId)) {
        setActiveSettingsSection(section as SettingsSectionId);
        setIsSettingsModalOpen(true);
      }
    });
    return () => {
      unlisten.then((u) => { try { u(); } catch { /* listener already removed */ } }).catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (!isSettingsModalOpen || activeSettingsSection !== "recording") return;
    let cancelled = false;
    api.audio.listInputDevices()
      .then((list) => {
        if (!cancelled) setAudioInputDevices(list);
      })
      .catch((err) => console.error(err));
    return () => {
      cancelled = true;
    };
  }, [isSettingsModalOpen, activeSettingsSection]);

  useEffect(() => {
    if (!isSettingsModalOpen || activeSettingsSection !== "system" || !ENABLE_RIGHT_CLICK_SERVICES) return;
    let cancelled = false;
    api.services.listInstalled()
      .then((list) => {
        if (!cancelled) setServicesInstalled(list);
      })
      .catch(() => {
        if (!cancelled) setServicesInstalled([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isSettingsModalOpen, activeSettingsSection]);

  useLayoutEffect(() => {
    const next = new Set<string>();
    transcriptions.forEach((item) => {
      if (expandedOutputs.has(item.id)) return;
      const el = outputRefs.current[item.id];
      if (el && el.scrollHeight > el.clientHeight) next.add(item.id);
    });
    setOverflowedOutputs(next);
  }, [transcriptions, expandedOutputs]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const toggleThoughts = (id: string) => {
    setExpandedThoughts(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleOutputExpand = (id: string) => {
    setExpandedOutputs(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const validateApiKeyFormat = (key: string, provider: string): string | null => {
    if (!key.trim()) {
      return "API key cannot be empty";
    }

    switch (provider) {
      case "openai":
        if (!key.startsWith("sk-") && !key.startsWith("sk-proj-")) { // example format check
          return "OpenAI key must start with 'sk-' or 'sk-proj-'"; // example message
        }
        if (key.length < 40) {
          return "OpenAI key too short: minimum 40 characters";
        }
        if (!/^[a-zA-Z0-9\-_]+$/.test(key)) {
          return "Invalid characters detected";
        }
        break;

      case "anthropic":
        if (!key.startsWith("sk-ant-")) {
          return "Anthropic key must start with 'sk-ant-'";
        }
        if (key.length < 40) {
          return "Anthropic key too short: minimum 40 characters";
        }
        if (!/^[a-zA-Z0-9\-_]+$/.test(key)) {
          return "Invalid characters detected";
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
  };

  const _handleApiKeyChange = (value: string) => {
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
  };

  const _handleProviderChange = (provider: string) => {
    setKeyProvider(provider);
    
    // Révalider la clé si elle existe
    if (apiKey.trim().length >= 10) {
      const error = validateApiKeyFormat(apiKey, provider);
      setValidationError(error);
    }
  };

  const _handleSaveApiKey = async () => {
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
      
      // Étape 1: Validation format (instantané)
      setApiKeySaveStatus("validating");
      await new Promise(resolve => setTimeout(resolve, 300)); // Feedback visuel
      
      // Étape 2: Test connexion API
      setApiKeySaveStatus("testing");
      await api.apiKeys.test(apiKey.trim());
      
      // Étape 3: Enregistrement multi-clés
      setApiKeySaveStatus("saving");
      await api.apiKeys.add({
        name: keyName.trim(),
        provider: keyProvider,
        key: apiKey.trim(),
      });
      
      // Succès
      setApiKeySaveStatus("success");
      setApiKey("");
      setKeyName("");
      setKeyProvider("openai");
      setApiKeyVisible(false);
      setError(null);
      setIsEditingKey(false);
      
      // Recharger liste
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
  };

  const _handleDeleteApiKey = async (keyId: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cette clé API ?")) return;
    
    try {
      await api.apiKeys.remove(keyId);
      await loadApiKeys();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const _handleSetActiveKey = async (keyId: string) => {
    try {
      await api.apiKeys.setActive(keyId);
      await loadApiKeys();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const loadUsageStats = async () => {
    try {
      const stats = await api.usage.getStats();
      setUsageStats(stats);
    } catch {
      setUsageStats(null);
    }
  };

  const _handleResetUsage = async () => {
    if (!confirm("Reset usage statistics?")) return;
    try {
      await api.usage.reset();
      setUsageStats({ transcription_requests: 0, llm_requests: 0, tokens_input: 0, tokens_output: 0 });
    } catch {
      await loadUsageStats();
    }
  };

  useEffect(() => {
    void _handleDeleteShortcut; void _handleToggleShortcut; void _handleApiKeyChange; void _handleProviderChange;
    void _handleSaveApiKey; void _handleDeleteApiKey; void _handleSetActiveKey; void _handleResetUsage;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional empty deps, handlers refs
  }, []);

  const NavItem = ({ id, label, icon: Icon }: { id: View; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }) => (
    <button 
      onClick={() => setActiveView(id)}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
        activeView === id 
          ? "bg-black/5 dark:bg-white/10 text-black dark:text-white" 
          : "text-muted-foreground hover:text-foreground hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
      )}
    >
      <Icon size={18} className={cn(activeView === id ? "text-black dark:text-white" : "opacity-70")} />
      {label}
    </button>
  );

  return (
    <div className="flex h-screen bg-white dark:bg-[#0c0c0c] text-foreground font-sans selection:bg-black/10 dark:selection:bg-white/10 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-black/[0.06] dark:border-white/[0.06] flex flex-col bg-white dark:bg-[#0c0c0c] shrink-0">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-6 select-none">
            <div className="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.4)]" />
            <span className="text-sm font-black tracking-widest uppercase">Ghosty</span>
          </div>
          
          <nav className="space-y-1">
            <NavItem id="home" label="Home" icon={Home} />
            <NavItem id="modes" label="Style & Modes" icon={Mic} />
            <NavItem id="dictionary" label="Dictionary" icon={BookOpen} />
          </nav>
        </div>

        <div className="mt-auto p-4 space-y-1">
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2 min-h-[44px] rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-black/[0.02] dark:hover:bg-white/[0.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/30 transition-all"
          >
            <Settings size={18} className="opacity-70" />
            Settings
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 min-h-[44px] rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-black/[0.02] dark:hover:bg-white/[0.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/30 transition-all">
            <HelpCircle size={18} className="opacity-70" />
            Help
          </button>
          <p className="text-[10px] text-muted-foreground/80 pt-2 px-3">
            Ghosty v{(packageJson as { version?: string }).version ?? "0.1.0"}
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 min-w-0 bg-[#fafafa] dark:bg-[#0c0c0c] overflow-hidden">
        {/* Top bar */}
        <div className="shrink-0 flex justify-end items-center gap-2 px-6 py-3 border-b border-black/[0.06] dark:border-white/[0.06] bg-white dark:bg-[#0c0c0c]">
          <div className="relative" ref={notificationsPanelRef}>
            <button
              type="button"
              onClick={() => {
                setIsNotificationsPanelOpen((v) => !v);
                setIsProfilePopoverOpen(false);
              }}
              className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors"
              aria-label="Notifications"
              aria-expanded={isNotificationsPanelOpen}
            >
              <Bell size={20} />
              {notificationsUnreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                  {notificationsUnreadCount > 99 ? "99+" : notificationsUnreadCount}
                </span>
              )}
            </button>
            <NotificationsPanel
              isOpen={isNotificationsPanelOpen}
              onClose={() => setIsNotificationsPanelOpen(false)}
              notifications={[]}
            />
          </div>
          <div className="relative" ref={profilePopoverRef}>
            <button
              type="button"
              onClick={() => {
                setIsProfilePopoverOpen((v) => !v);
                setIsNotificationsPanelOpen(false);
              }}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-black/10 dark:bg-white/10 text-muted-foreground hover:bg-black/15 dark:hover:bg-white/15 transition-colors font-medium text-sm"
              aria-label="Profile"
              aria-expanded={isProfilePopoverOpen}
            >
              {preferences?.general?.displayName?.trim() ? (
                (preferences.general.displayName.trim().split(/\s+/).map((s) => s[0]).join("").slice(0, 2) || "?").toUpperCase()
              ) : (
                <User size={18} />
              )}
            </button>
            <ProfilePopover
              isOpen={isProfilePopoverOpen}
              onClose={() => setIsProfilePopoverOpen(false)}
              displayName={preferences?.general?.displayName ?? ""}
              wordsGenerated={usageStats ? Math.round((usageStats.tokens_output || 0) / 4) : 0}
              onManageAccount={() => {
                setIsSettingsModalOpen(true);
                setActiveSettingsSection("account");
                setIsProfilePopoverOpen(false);
              }}
            />
          </div>
        </div>
        <div className={cn("flex-1 overflow-auto w-full px-8 py-12", activeView !== "settings" && "max-w-3xl mx-auto")}>
          {activeView === "home" && (
            <div>
              {!hasApiKey && (
                <p className="mb-6 text-sm text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveView("settings");
                      setActiveSettingsSection("api");
                      setIsSettingsModalOpen(true);
                    }}
                    className="underline hover:no-underline font-medium text-black dark:text-white"
                  >
                    Set up an API key
                  </button>
                  {" "}to enable transcription.
                </p>
              )}
              <header className={cn(uiClasses.pageHeaderMargin, "flex justify-between items-start")}>
                <div>
                  <h1 className={cn(uiClasses.pageTitle, "mb-2")}>
                    Welcome back{preferences?.general?.displayName?.trim() ? `, ${preferences.general.displayName.trim()}` : ""}
                  </h1>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {(() => {
                      const dayStreak = 0; // TODO: brancher sur l’API quand disponible
                      if (dayStreak >= 2) {
                        return (
                          <>
                            <span className="flex items-center gap-1.5 font-medium text-orange-500/80"><Clock size={14} /> {dayStreak} day streak</span>
                            <span>•</span>
                          </>
                        );
                      }
                      return null;
                    })()}
                    <span className="flex items-center gap-1.5"><Mic size={14} className="text-blue-500" /> {(() => {
                      const words = usageStats ? Math.round((usageStats.tokens_output || 0) / 4) : 0;
                      return words >= 1000 ? `${(words / 1000).toFixed(1)}K words` : `${words} words`;
                    })()}</span>
                  </div>
                </div>
              </header>

              {/* Primary CTA */}
              <div className={cn(uiClasses.infoBox, "relative overflow-hidden py-8 px-6 mb-10")}>
                <div className="relative z-10">
                  <h2 className={cn(uiClasses.pageTitle, "mb-3 leading-snug")}>
                    Hold <kbd className="bg-black/5 dark:bg-white/10 text-foreground px-1.5 py-0.5 rounded font-mono text-lg lowercase">{(() => {
                      const pushToTalk = shortcuts.find((s) => s.action.type === "pushToTalk" && s.enabled);
                      return pushToTalk?.keys?.length ? pushToTalk.keys.join("+") : "shortcut";
                    })()}</kbd> to dictate and let Ghosty format for you
                  </h2>
                  <p className={cn(uiClasses.pageDescription, "max-w-lg mb-6 leading-relaxed")}>
                    Ghosty transforms your vague voice input into optimized AI requests.
                  </p>
                  
                  {/* Mode Selector Dropdown */}
                  <div className="flex justify-center mb-6">
                    <button 
                      ref={triggerRef}
                      onClick={() => (isModeDropdownOpen ? setIsModeDropdownOpen(false) : openModeDropdown())}
                      className={cn(
                        "flex items-center gap-2 py-1 rounded transition-colors",
                        "hover:bg-black/[0.03] dark:hover:bg-white/[0.04] cursor-pointer text-left"
                      )}
                    >
                      <div 
                        className="w-2 h-2 rounded-full shrink-0" 
                        style={{ backgroundColor: modes.find(m => m.id === selectedMode)?.color || "#10b981" }}
                      />
                      <div className="flex flex-col items-start min-w-0">
                        <span className="font-medium text-sm text-black dark:text-white">
                          {modes.find(m => m.id === selectedMode)?.name || "Direct"}
                        </span>
                      </div>
                      {isModeDropdownOpen ? (
                        <ChevronUp size={14} className="shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronDown size={14} className="shrink-0 text-muted-foreground" />
                      )}
                    </button>

                    {/* Dropdown Menu Portal */}
                    {isModeDropdownOpen && createPortal(
                      <div 
                        ref={dropdownRef}
                        className={cn(
                          "fixed w-[280px] z-[9999]",
                          "bg-white dark:bg-[#0c0c0c] border border-black/[0.06] dark:border-white/[0.06]",
                          "rounded-lg shadow-md overflow-hidden",
                          dropdownPosition === "bottom" ? "animate-in fade-in slide-in-from-top-2" : "animate-in fade-in slide-in-from-bottom-2",
                          "duration-200"
                        )}
                        style={{
                          top: `${dropdownCoords.top}px`,
                          left: `${dropdownCoords.left}px`,
                        }}
                      >
                        <div className="p-2">
                          {modes.filter(m => m.enabled).map((mode) => (
                            <button
                              key={mode.id}
                              onClick={() => {
                                setSelectedMode(mode.id as Mode);
                                setIsModeDropdownOpen(false);
                                api.modes.setActivePrompt(mode.systemPrompt, mode.id).catch(console.error);
                              }}
                              className={cn(
                                "w-full flex items-center gap-3 px-3 py-3 rounded-md transition-all duration-200",
                                "hover:bg-black/[0.04] dark:hover:bg-white/[0.04]",
                                selectedMode === mode.id && "bg-black/[0.04] dark:bg-white/[0.08]"
                              )}
                            >
                              <div
                                className="shrink-0 rounded-full shadow-lg"
                                style={{
                                  width: 8,
                                  height: 8,
                                  minWidth: 8,
                                  minHeight: 8,
                                  backgroundColor: mode.color,
                                }}
                              />
                              <div className="flex-1 text-left min-w-0">
                                <div className="font-medium text-sm text-black dark:text-white">
                                  {mode.name}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>,
                      document.body
                    )}
                  </div>
                  
                  <div className="h-20 bg-black/[0.02] dark:bg-white/[0.02] rounded-lg flex items-center px-6">
                    <LiveWaveform 
                      active={isRecording} 
                      processing={isProcessing} 
                      barColor={isRecording ? "#ea580c" : "#9ca3af"}
                      mode="static"
                      className="w-full h-12"
                      sensitivity={1.5}
                    />
                  </div>
                </div>
                
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full shrink-0",
                    isRecording ? "bg-orange-500 animate-ping" : "bg-emerald-500 dark:bg-emerald-400"
                  )} />
                  <span className={cn(uiClasses.sectionLabel, "normal-case font-medium")}>
                    {status}
                  </span>
                </div>
              </div>

              {/* History List */}
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h3 className={uiClasses.sectionLabel}>Today</h3>
                  {transcriptions.length > 0 && (
                    <IconButton
                      icon={<Trash2 size={12} />}
                      aria-label="Clear history"
                      variant="danger"
                      size="sm"
                      onClick={() => setTranscriptions([])}
                    />
                  )}
                </div>

                <div className="space-y-0.5">
                  {transcriptions.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-2">
                      <Mic size={24} className={uiClasses.emptyStateIcon} />
                      <p className={uiClasses.emptyStateTitle}>No activity yet</p>
                    </div>
                  ) : (
                    transcriptions.map(item => {
                      const modeColors: Record<string, string> = {
                        light: "bg-blue-500",
                        medium: "bg-emerald-500",
                        strong: "bg-amber-500",
                        full: "bg-violet-500"
                      };
                      const modeColor = item.mode ? modeColors[item.mode] || "bg-gray-400" : "bg-gray-400";
                      const modeLabel = item.mode ? (modes.find(m => m.id === item.mode)?.name ?? item.mode) : "—";

                      return (
                      <div key={item.id} className="group flex gap-6 py-4 px-0 border-b border-black/[0.06] dark:border-white/[0.06] last:border-0 items-start">
                        <div className="flex items-center gap-2 w-16 pt-1 shrink-0">
                          <span
                            className={`block w-2.5 h-2.5 rounded-full ${modeColor} opacity-70 shrink-0`}
                            title={modeLabel}
                            aria-label={modeLabel}
                          />
                          <span className="text-[11px] font-medium text-muted-foreground/50 tabular-nums uppercase">
                            {item.time}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col gap-3">
                          {item.thoughts && (
                            <div className="flex flex-col gap-2 min-w-0">
                              <button
                                type="button"
                                onClick={() => toggleThoughts(item.id)}
                                className="text-[11px] text-muted-foreground/30 hover:text-muted-foreground/50 transition-colors text-left w-fit font-medium"
                                aria-label={expandedThoughts.has(item.id) ? "Hide thoughts" : "Show thoughts"}
                              >
                                Thoughts
                              </button>
                              {expandedThoughts.has(item.id) && (
                                <p className="text-[13px] text-muted-foreground/50 leading-relaxed italic max-h-[14rem] overflow-y-auto scrollbar-thin pr-1 break-words">
                                  {item.thoughts}
                                </p>
                              )}
                            </div>
                          )}
                          <div className="min-w-0 flex flex-col gap-1">
                            <p
                              ref={(el) => { outputRefs.current[item.id] = el; }}
                              className={cn(
                                "text-[15px] leading-relaxed text-black/80 dark:text-white/80 font-medium break-words",
                                !expandedOutputs.has(item.id) && "history-output-clamp"
                              )}
                            >
                              {item.output}
                            </p>
                            {(expandedOutputs.has(item.id) || overflowedOutputs.has(item.id)) && (
                              <button
                                type="button"
                                onClick={() => toggleOutputExpand(item.id)}
                                className="text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors text-left w-fit font-medium"
                                aria-label={expandedOutputs.has(item.id) ? "Show less" : "Show more"}
                              >
                                {expandedOutputs.has(item.id) ? "Show less" : "Show more"}
                              </button>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(item.output)}
                          className="opacity-0 group-hover:opacity-100 transition-all p-2 rounded-lg bg-black/5 dark:bg-white/5 text-muted-foreground shrink-0"
                          title="Copy to clipboard"
                          aria-label="Copy to clipboard"
                        >
                          <Clipboard size={14} />
                        </button>
                      </div>
                    )})
                  )}
                </div>
              </section>
            </div>
          )}

          {activeView === "dictionary" && (
            <div>
              <header className={uiClasses.pageHeaderMargin}>
                <h1 className={uiClasses.pageTitle}>Dictionary</h1>
                <p className={cn(uiClasses.pageDescription, "leading-relaxed")}>
                  Add acronyms, technical terms, or names to help Ghosty{"'"}s transcription engine.
                </p>
              </header>

              {/* Guide */}
              <div className={cn(uiClasses.infoBox, "mb-6 py-4 px-4")}>
                <h3 className={cn(uiClasses.sectionLabel, "mb-2")}>How to add words or terms</h3>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside mb-3">
                  <li>Click <strong className="text-foreground">Add word</strong> to add a word or a correction (recognized form → preferred form).</li>
                  <li>Optional: on an entry, click <strong className="text-foreground">Add variants</strong> for other spellings.</li>
                  <li>Dictate a sentence containing that word (using your shortcut) and check the result in the Home history.</li>
                </ol>
                <p className={cn(uiClasses.bodyText, "opacity-90")}>
                  Entries are sent to Whisper as context to guide recognition. If a word is still not recognized well, add variants or a phonetic pronunciation if supported.
                </p>
              </div>

              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => setIsAddWordModalOpen(true)}
                  className={cn(uiClasses.buttonPrimary, "flex items-center gap-2")}
                >
                  <Plus size={16} />
                  Add word
                </button>
              </div>
              <AddWordModal
                isOpen={isAddWordModalOpen}
                onClose={() => setIsAddWordModalOpen(false)}
                onAdd={handleAddWordFromModal}
              />

              {/* Entries List */}
              <div className="space-y-4">
                {dictionaryEntries.length === 0 ? (
                  <div className="py-16 flex flex-col items-center justify-center gap-3">
                    <BookOpen size={32} className={uiClasses.emptyStateIcon} />
                    <p className={uiClasses.emptyStateTitle}>No dictionary entries yet</p>
                    <button
                      onClick={() => setIsAddWordModalOpen(true)}
                      className={cn(uiClasses.buttonPrimary, "mt-2 flex items-center gap-2")}
                    >
                      <Plus size={14} />
                      Add your first word
                    </button>
                  </div>
                ) : (
                  <div className={cn(uiClasses.pageCard, "overflow-hidden")}>
                    {dictionaryEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-4 border-b border-black/[0.06] dark:border-white/[0.06] last:border-0 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02] group"
                      >
                        <div className="flex flex-col gap-2 flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="font-bold text-sm">{entry.word}</span>
                          </div>
                          {editingDictionaryId === entry.id ? (
                            <input
                              type="text"
                              value={misspellingDrafts[entry.id] ?? ""}
                              onChange={(e) => handleMisspellingChange(entry.id, e.target.value)}
                              onBlur={() => {
                                handleMisspellingSave(entry.id);
                                setEditingDictionaryId(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  (e.target as HTMLInputElement).blur();
                                }
                              }}
                              placeholder="Variants (a, b, c)"
                              className={cn(uiClasses.input, "text-xs py-2")}
                            />
                          ) : (
                            <button
                              onClick={() => handleEditDictionaryEntry(entry.id)}
                              className="w-full text-left text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                            >
                              {entry.misspellings.length > 0
                                ? entry.misspellings.join(", ")
                                : "Add variants"}
                            </button>
                          )}
                        </div>
                        <IconButton
                          icon={<Trash2 size={14} />}
                          aria-label="Remove this entry"
                          variant="danger"
                          size="md"
                          onClick={() => handleDeleteWord(entry.id)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeView === "modes" && (
            <div className="h-full">
              <header className={cn(uiClasses.pageHeaderMargin, "flex items-center justify-between")}>
                <div>
                  <h1 className={uiClasses.pageTitle}>Style & Modes</h1>
                  <p className={uiClasses.pageDescription}>Configure how Ghosty improves your input.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowImportModesModal(true);
                      setImportModesError(null);
                      setImportModesJson("");
                    }}
                    className={cn(uiClasses.buttonGhost, "flex items-center gap-1.5 px-2.5 py-1.5 text-xs")}
                  >
                    <Clipboard size={13} />
                    Import
                  </button>
                  <button
                    onClick={handleCreateNewMode}
                    className={cn(uiClasses.buttonPrimary, "flex items-center gap-1.5")}
                  >
                    <Plus size={13} />
                    New Mode
                  </button>
                </div>
              </header>

              {directDeleteBlockedMessage && (
                <div
                  className="mb-3 px-3 py-2 rounded border border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/20 text-xs flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-1 duration-200"
                  role="status"
                >
                  <span>{directDeleteBlockedMessage}</span>
                  <button
                    type="button"
                    className="p-1 rounded hover:bg-amber-500/20 text-current"
                    onClick={() => setDirectDeleteBlockedMessage(null)}
                    aria-label="Close"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
              <div className="flex gap-6 flex-1 min-h-0">
                {/* Sidebar - Modes List */}
                <nav className="w-48 flex-shrink-0">
                  <div className="space-y-0.5 pr-1">
                    {(() => {
                      const builtIn = modes.filter((m) => !m.isCustom).sort((a, b) => a.order - b.order);
                      const custom = modes.filter((m) => m.isCustom).sort((a, b) => a.order - b.order);
                      const renderModeRow = (mode: ModeConfig) => (
                        <div
                          key={mode.id}
                          className={cn(
                            "w-full flex items-center px-2 py-1.5 rounded text-xs group overflow-visible relative pr-8",
                            selectedModeId === mode.id && !isEditingMode
                              ? "bg-black/[0.06] dark:bg-white/[0.06] text-foreground font-medium"
                              : "text-muted-foreground hover:text-foreground hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors"
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedModeId(mode.id);
                              setIsEditingMode(false);
                            }}
                            className="flex-1 min-w-0 flex items-center gap-2.5 text-left overflow-hidden"
                          >
                            <div
                              className={cn(
                                "shrink-0 rounded-full",
                                !mode.enabled && "opacity-40"
                              )}
                              style={{
                                width: 6,
                                height: 6,
                                minWidth: 6,
                                minHeight: 6,
                                backgroundColor: mode.enabled ? mode.color : "#9ca3af",
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate text-xs">{mode.name}</span>
                                {mode.id === DIRECT_MODE_ID && (
                                  <span title="Your words, light formatting only."><Zap size={10} className="text-amber-500 dark:text-amber-400 flex-shrink-0" /></span>
                                )}
                                {(!mode.isCustom || mode.locked) && (
                                  <span title={!mode.isCustom ? "Built-in (cannot be edited or deleted)" : "Locked"}><Lock size={10} className="text-muted-foreground flex-shrink-0" /></span>
                                )}
                                <span
                                  role="button"
                                  tabIndex={0}
                                  className="p-0.5 rounded hover:bg-black/[0.06] dark:hover:bg-white/[0.06] flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                  title={mode.enabled ? "Visible in widget (click to hide)" : "Hidden from widget (click to show)"}
                                  aria-label={mode.enabled ? "Hide from widget" : "Show in widget"}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleModeEnabled(mode);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleToggleModeEnabled(mode);
                                    }
                                  }}
                                >
                                  {mode.enabled ? (
                                    <Eye size={10} className="text-muted-foreground" />
                                  ) : (
                                    <EyeOff size={10} className="text-muted-foreground opacity-60" />
                                  )}
                                </span>
                              </div>
                            </div>
                          </button>
                          {mode.id === DIRECT_MODE_ID ? null : modeIdToConfirmDelete !== mode.id && (
                          !mode.isCustom ? (
                            <div className="absolute right-1 top-1/2 -translate-y-1/2 z-20 flex flex-col items-end opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                className="p-1 rounded-sm hover:bg-black/[0.06] dark:hover:bg-white/[0.06] text-muted-foreground hover:text-foreground flex items-center justify-center"
                                title="Duplicate"
                                aria-label="Duplicate mode"
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDuplicateMode(mode);
                                }}
                              >
                                <Copy size={14} />
                              </button>
                            </div>
                          ) : (
                          <div
                            className="absolute right-1 top-1/2 -translate-y-1/2 z-20 flex flex-col items-end opacity-0 group-hover:opacity-100 transition-opacity"
                            ref={modeRowMenuOpen === mode.id ? modeRowMenuRef : undefined}
                          >
                            <button
                              type="button"
                              className="p-1 rounded-sm hover:bg-black/[0.06] dark:hover:bg-white/[0.06] text-muted-foreground hover:text-foreground flex items-center justify-center"
                              title="Actions"
                              aria-label="Mode actions"
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setModeRowMenuOpen(modeRowMenuOpen === mode.id ? null : mode.id);
                              }}
                            >
                              <MoreHorizontal size={14} />
                            </button>
                            {modeRowMenuOpen === mode.id && (
                              <div className="absolute right-0 top-full mt-0.5 py-0.5 min-w-[180px] rounded border border-border bg-popover shadow-sm z-30 flex flex-col">
                                <button
                                  type="button"
                                  className="flex items-center gap-2 px-2.5 py-1.5 text-left text-xs hover:bg-black/[0.04] dark:hover:bg-white/[0.04] w-full text-foreground"
                                  onClick={() => handleToggleLocked(mode)}
                                >
                                  <Lock size={12} className="flex-shrink-0 text-muted-foreground" />
                                  {mode.locked ? "Unlock" : "Lock"}
                                </button>
                                <button
                                  type="button"
                                  className="flex items-center gap-2 px-2.5 py-1.5 text-left text-xs hover:bg-black/[0.04] dark:hover:bg-white/[0.04] w-full text-foreground"
                                  onClick={() => {
                                    handleDuplicateMode(mode);
                                    setModeRowMenuOpen(null);
                                  }}
                                >
                                  <Copy size={12} className="flex-shrink-0 text-muted-foreground" />
                                  Duplicate
                                </button>
                                <button
                                  type="button"
                                  className="flex items-center gap-2 px-2.5 py-1.5 text-left text-xs hover:bg-black/[0.04] dark:hover:bg-white/[0.04] w-full text-foreground"
                                  onClick={() => {
                                    handleExportMode(mode);
                                    setModeRowMenuOpen(null);
                                  }}
                                >
                                  <Clipboard size={12} className="flex-shrink-0 text-muted-foreground" />
                                  Export
                                </button>
                                {!mode.locked && (
                                  <button
                                    type="button"
                                    className="flex items-center gap-2 px-2.5 py-1.5 text-left text-xs hover:bg-red-500/10 text-red-600 w-full"
                                    onClick={() => {
                                      setModeIdToConfirmDelete(mode.id);
                                      setModeRowMenuOpen(null);
                                    }}
                                  >
                                    <Trash2 size={12} className="flex-shrink-0" />
                                    Delete
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                          )
                          )}
                          {modeIdToConfirmDelete === mode.id && (
                            <div className="absolute right-1 top-1/2 -translate-y-1/2 z-20 flex items-center gap-0.5 opacity-100">
                              <button
                                type="button"
                                className="p-1 rounded-sm text-red-500 hover:bg-red-500/10 flex items-center justify-center"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteMode(mode.id);
                                }}
                                title="Delete"
                                aria-label="Confirm delete"
                              >
                                <Check size={11} strokeWidth={2.5} />
                              </button>
                              <button
                                type="button"
                                className="p-1 rounded-sm text-muted-foreground hover:bg-black/[0.06] dark:hover:bg-white/[0.06] flex items-center justify-center"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setModeIdToConfirmDelete(null);
                                }}
                                title="Cancel"
                                aria-label="Cancel"
                              >
                                <X size={11} strokeWidth={2.5} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                      return (
                        <>
                          {builtIn.length > 0 && (
                            <div className="space-y-0.5">
                              <div className={cn(uiClasses.sectionLabel, "px-2 py-1")}>Built-in</div>
                              {builtIn.map(renderModeRow)}
                            </div>
                          )}
                          {custom.length > 0 && (
                            <div className="space-y-0.5 mt-2">
                              <div className={cn(uiClasses.sectionLabel, "px-2 py-1")}>Custom</div>
                              {custom.map(renderModeRow)}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </nav>

                {/* Content Area - Mode Detail */}
                <div className="flex-1 min-w-0 overflow-y-auto pr-2 scrollbar-thin">
                  <div className="max-w-4xl">
                    {isEditingMode && editedMode ? (
                      // New/Duplicate: same layout as View Mode Detail
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5 min-w-0 flex-1">
                            <div
                              className="relative shrink-0 rounded-full"
                              style={{
                                width: 24,
                                height: 24,
                                minWidth: 24,
                                minHeight: 24,
                                backgroundColor: editedMode.color,
                              }}
                            >
                              <input
                                type="color"
                                value={editedMode.color}
                                onChange={(e) => setEditedMode({ ...editedMode, color: e.target.value })}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer rounded-full"
                                title="Color"
                                aria-label="Color"
                              />
                            </div>
                            <div className="min-w-0 flex-1 flex flex-col gap-1">
                              <input
                                value={editedMode.name}
                                onChange={(e) => setEditedMode({ ...editedMode, name: e.target.value })}
                                className="text-sm font-medium bg-transparent border-0 border-b border-transparent hover:border-border focus:border-foreground/30 focus:outline-none focus:ring-0 py-0 w-full max-w-md text-foreground leading-tight"
                                placeholder="Mode name"
                              />
                              <input
                                value={editedMode.description}
                                onChange={(e) => setEditedMode({ ...editedMode, description: e.target.value })}
                                className={cn(uiClasses.bodyText, "bg-transparent border-0 border-b border-transparent hover:border-border focus:outline-none focus:ring-0 w-full py-0 leading-tight")}
                                placeholder="Short description"
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <button
                              onClick={handleSaveMode}
                              className="flex items-center gap-2 text-xs py-2 text-foreground hover:opacity-80 focus:outline-none focus-visible:ring-0"
                            >
                              <Save size={14} />
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setIsEditingMode(false);
                                setEditedMode(null);
                              }}
                              className="flex items-center gap-2 text-xs py-2 text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-0"
                            >
                              <X size={14} />
                              Cancel
                            </button>
                          </div>
                        </div>
                        <div>
                          <SystemPromptEditor
                            value={editedMode.systemPrompt}
                            onChange={(v) => setEditedMode({ ...editedMode, systemPrompt: v })}
                            placeholder={DEFAULT_SYSTEM_PROMPT_PLACEHOLDER}
                            onImproveError={setPromptImproveToast}
                          />
                        </div>
                      </div>
                    ) : selectedModeId && modes.find((m) => m.id === selectedModeId) ? (
                      // View Mode Detail (inline editable for custom)
                      (() => {
                        const mode = modes.find((m) => m.id === selectedModeId)!;
                        const d = modeDraft ?? {};
                        const display = { ...mode, ...d };
                        const canEdit = mode.isCustom && !mode.locked;
                        return (
                          <div className="space-y-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                <div
                                  className="relative shrink-0 rounded-full"
                                  style={{
                                    width: 24,
                                    height: 24,
                                    minWidth: 24,
                                    minHeight: 24,
                                    backgroundColor: display.color,
                                  }}
                                >
                                  {canEdit && (
                                    <input
                                      type="color"
                                      value={display.color}
                                      onChange={(e) => setModeDraft((prev) => ({ ...prev, color: e.target.value }))}
                                      onBlur={() => modeDraft && saveModeDraft(mode, { ...modeDraft, color: display.color })}
                                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer rounded-full"
                                      title="Color"
                                      aria-label="Color"
                                    />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1 flex flex-col gap-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {canEdit ? (
                                      <input
                                        value={display.name}
                                        onChange={(e) => setModeDraft((prev) => ({ ...prev, name: e.target.value }))}
                                        onBlur={() => modeDraft && saveModeDraft(mode, { ...modeDraft, name: display.name })}
                                        className="text-sm font-medium bg-transparent border-0 border-b border-transparent hover:border-border focus:border-foreground/30 focus:outline-none focus:ring-0 py-0 w-full max-w-md text-foreground leading-tight"
                                        placeholder="Mode name"
                                      />
                                    ) : (
                                      <h2 className="text-sm font-medium text-foreground leading-tight">{mode.name}</h2>
                                    )}
                                    {mode.id === DIRECT_MODE_ID && (
                                      <span title="Your words, light formatting only."><Zap size={11} className="text-amber-500 dark:text-amber-400 flex-shrink-0" /></span>
                                    )}
                                    {(!mode.isCustom || mode.locked) && (
                                      <span title={!mode.isCustom ? "Built-in (cannot be edited or deleted)" : "Locked"}><Lock size={11} className="text-muted-foreground flex-shrink-0" /></span>
                                    )}
                                  </div>
                                  {canEdit ? (
                                    <input
                                      value={display.description}
                                      onChange={(e) => setModeDraft((prev) => ({ ...prev, description: e.target.value }))}
                                      onBlur={() => modeDraft && saveModeDraft(mode, { ...modeDraft, description: display.description })}
                                      className={cn(uiClasses.bodyText, "bg-transparent border-0 border-b border-transparent hover:border-border focus:outline-none focus:ring-0 w-full py-0 leading-tight")}
                                      placeholder="Short description"
                                    />
                                  ) : (
                                    <p className={cn(uiClasses.bodyText, "leading-tight")}>{mode.description}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-0.5 flex-shrink-0">
                                {mode.isCustom && (
                                  <>
                                    <div className="flex items-center rounded overflow-hidden border border-border">
                                      <button
                                        type="button"
                                        onClick={() => handleMoveMode("up")}
                                        disabled={!canMoveUp}
                                        className="p-1.5 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:pointer-events-none"
                                        title="Move up"
                                        aria-label="Move up"
                                      >
                                        <ChevronUp size={14} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleMoveMode("down")}
                                        disabled={!canMoveDown}
                                        className="p-1.5 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:pointer-events-none border-l border-border"
                                        title="Move down"
                                        aria-label="Move down"
                                      >
                                        <ChevronDown size={14} />
                                      </button>
                                    </div>
                                    <IconButton
                                      icon={<Copy size={14} />}
                                      aria-label="Duplicate"
                                      variant="ghost"
                                      size="md"
                                      onClick={() => handleDuplicateMode(mode)}
                                    />
                                    <IconButton
                                      icon={<Clipboard size={14} />}
                                      aria-label="Export"
                                      variant="ghost"
                                      size="md"
                                      onClick={() => handleExportMode(mode)}
                                    />
                                  </>
                                )}
                                {mode.isCustom && !mode.locked && (
                                  modeIdToConfirmDelete === mode.id ? (
                                    <>
                                      <IconButton
                                        icon={<Check size={12} strokeWidth={2.5} />}
                                        aria-label="Confirm deletion"
                                        variant="danger"
                                        size="md"
                                        onClick={() => handleDeleteMode(mode.id)}
                                      />
                                      <IconButton
                                        icon={<X size={12} strokeWidth={2.5} />}
                                        aria-label="Cancel"
                                        variant="ghost"
                                        size="md"
                                        onClick={() => setModeIdToConfirmDelete(null)}
                                      />
                                    </>
                                  ) : (
                                    <IconButton
                                      icon={<Trash2 size={14} />}
                                      aria-label="Delete"
                                      variant="danger"
                                      size="md"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setModeIdToConfirmDelete(mode.id);
                                      }}
                                    />
                                  )
                                )}
                              </div>
                            </div>

                            {mode.id !== "light" && (
                              <div>
                                {canEdit ? (
                                  <SystemPromptEditor
                                    value={display.systemPrompt}
                                    onChange={(v) => setModeDraft((prev) => ({ ...prev, systemPrompt: v }))}
                                    placeholder={DEFAULT_SYSTEM_PROMPT_PLACEHOLDER}
                                    onBlur={(v) => saveModeDraft(mode, { ...mode, ...modeDraft, systemPrompt: v })}
                                    onImproveError={setPromptImproveToast}
                                  />
                                ) : !mode.isCustom ? (
                                  <MaskedPromptBox modeId={mode.id} />
                                ) : (
                                  <div className="p-2.5 rounded border border-border bg-muted/20 font-mono text-[11px] leading-relaxed whitespace-pre-wrap max-h-[360px] overflow-y-auto text-muted-foreground">
                                    {mode.systemPrompt}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="text-sm mb-1">Select a mode or create a new one.</p>
                        <p className={cn(uiClasses.bodyText, "opacity-80")}>Built-in: Direct, Shape, Reframe, Build.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {showImportModesModal && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 p-4"
                  onClick={() => setShowImportModesModal(false)}
                  onKeyDown={(e) => e.key === "Escape" && setShowImportModesModal(false)}
                  role="button"
                  tabIndex={0}
                  aria-label="Close modal"
                >
                  {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- dialog content, stopPropagation only */}
                  <div
                    className="bg-white dark:bg-[#0c0c0c] border border-black/[0.06] dark:border-white/[0.06] rounded-lg shadow-md w-full max-w-lg max-h-[80vh] flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="import-modes-title"
                  >
                    <div className="px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.06]">
                      <h2 id="import-modes-title" className="text-lg font-bold text-black dark:text-white">Import modes</h2>
                      <p className="text-xs text-muted-foreground mt-1">Paste JSON (array of modes or single mode). Each entry must have <code className="bg-black/5 dark:bg-white/5 px-1 rounded">name</code> and <code className="bg-black/5 dark:bg-white/5 px-1 rounded">systemPrompt</code>.</p>
                    </div>
                    <div className="p-4 flex-1 min-h-0 flex flex-col gap-3">
                      <textarea
                        value={importModesJson}
                        onChange={(e) => {
                          setImportModesJson(e.target.value);
                          setImportModesError(null);
                        }}
                        placeholder='[{"name": "My Mode", "systemPrompt": "..."}]'
                        className="w-full flex-1 min-h-[200px] px-3 py-2.5 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-xs font-mono resize-none"
                        spellCheck={false}
                      />
                      {importModesError && (
                        <p className="text-xs text-red-600 dark:text-red-400">{importModesError}</p>
                      )}
                    </div>
                    <div className="p-4 border-t border-black/5 dark:border-white/5 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowImportModesModal(false);
                          setImportModesJson("");
                          setImportModesError(null);
                        }}
                        className="px-4 py-2 rounded-lg font-medium text-sm bg-black/5 dark:bg-white/5 text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleImportModes}
                        className="px-4 py-2 rounded-lg font-medium text-sm bg-orange-500 text-white hover:bg-orange-600"
                      >
                        Import
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {promptImproveToast && (
          <div
            role="status"
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-foreground text-background text-xs shadow-lg max-w-md animate-in fade-in slide-in-from-bottom-2 duration-200"
          >
            {promptImproveToast}
          </div>
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      >
        <div className="flex flex-1 min-h-0">
          {/* Sidebar Navigation */}
          <nav className="w-60 shrink-0 border-r border-black/[0.06] dark:border-white/[0.06] p-4 flex flex-col overflow-y-auto">
            <div className="space-y-6">
              {/* General Group */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground mb-2 px-4">
                  GENERAL
                </div>
                <div className="space-y-0.5">
                  {[
                    { id: "general" as const, label: "General", icon: Settings },
                    { id: "system" as const, label: "System", icon: Terminal },
                  ].map((section) => (
                    <button
                      key={section.id}
                      onClick={() => setActiveSettingsSection(section.id)}
                      className={cn(
                        uiClasses.navItem,
                        activeSettingsSection === section.id
                          ? uiClasses.navItemActive
                          : uiClasses.navItemInactive
                      )}
                    >
                      <section.icon size={16} />
                      <span>{section.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Configuration Group */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground mb-2 px-4">
                  CONFIGURATION
                </div>
                <div className="space-y-0.5">
                  {[
                    { id: "shortcuts" as const, label: "Shortcuts", icon: Keyboard },
                    { id: "recording" as const, label: "Recording", icon: Mic },
                    { id: "models" as const, label: "Models", icon: Zap },
                  ].map((section) => (
                    <button
                      key={section.id}
                      onClick={() => setActiveSettingsSection(section.id)}
                      className={cn(
                        uiClasses.navItem,
                        activeSettingsSection === section.id
                          ? uiClasses.navItemActive
                          : uiClasses.navItemInactive
                      )}
                    >
                      <section.icon size={16} />
                      <span>{section.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Account Group */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground mb-2 px-4">
                  ACCOUNT
                </div>
                <div className="space-y-0.5">
                  {[
                    { id: "account" as const, label: "Account", icon: User },
                  ].map((section) => (
                    <button
                      key={section.id}
                      onClick={() => setActiveSettingsSection(section.id)}
                      className={cn(
                        uiClasses.navItem,
                        activeSettingsSection === section.id
                          ? uiClasses.navItemActive
                          : uiClasses.navItemInactive
                      )}
                    >
                      <section.icon size={16} />
                      <span>{section.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced Group */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground mb-2 px-4">
                  ADVANCED
                </div>
                <div className="space-y-0.5">
                  {[
                    { id: "api" as const, label: "API Keys", icon: Key },
                    { id: "usage" as const, label: "Usage", icon: Clock },
                    { id: "advanced" as const, label: "Advanced", icon: Settings },
                  ].map((section) => (
                    <button
                      key={section.id}
                      onClick={() => setActiveSettingsSection(section.id)}
                      className={cn(
                        uiClasses.navItem,
                        activeSettingsSection === section.id
                          ? uiClasses.navItemActive
                          : uiClasses.navItemInactive
                      )}
                    >
                      <section.icon size={16} />
                      <span>{section.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </nav>

          {/* Content Area */}
          <div className="flex-1 min-h-0 overflow-y-auto p-8">
            {/* General Section */}
            {activeSettingsSection === "general" && (
              <SettingsSection 
                title="General" 
                description="Configure general app settings"
              >
                <div className="space-y-0">
                    <SettingsRow 
                      label="Launch at login" 
                      description="Open Ghosty automatically when you log in"
                    >
                      <ToggleSwitch
                        checked={preferences?.general.launchAtLogin ?? false}
                        onChange={async (checked) => {
                          await updatePreferences({ general: { ...preferences?.general, launchAtLogin: checked } });
                        }}
                      />
                    </SettingsRow>
                    
                    <SettingsRow 
                      label="Auto-update" 
                      description="Automatically download and install updates"
                    >
                      <ToggleSwitch
                        checked={preferences?.general.autoUpdate ?? true}
                        onChange={async (checked) => {
                          await updatePreferences({ general: { ...preferences?.general, autoUpdate: checked } });
                        }}
                      />
                    </SettingsRow>
                    <SettingsRow label="Version" description="App version">
                      <span className="text-sm text-muted-foreground tabular-nums">
                        {(packageJson as { version?: string }).version ?? "0.1.0"}
                      </span>
                    </SettingsRow>
                </div>
              </SettingsSection>
            )}

            {/* Account Section */}
            {activeSettingsSection === "account" && (
              <SettingsSection
                title="Account"
                description="Profile and account settings"
              >
                <div className="space-y-6">
                  <div>
                    <label htmlFor="account-display-name" className="block text-sm font-medium text-black dark:text-white mb-1.5">
                      Display name
                    </label>
                    <input
                      id="account-display-name"
                      type="text"
                      value={accountDisplayNameDraft}
                      onChange={(e) => setAccountDisplayNameDraft(e.target.value)}
                      placeholder="Your name"
                      className={uiClasses.input}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Used in the welcome message and profile.</p>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-black dark:text-white mb-1.5">
                      Email
                    </span>
                    <div className="px-3 py-2 rounded-lg bg-muted/30 border border-border text-sm text-muted-foreground">
                      Connect your account to unlock
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      disabled
                      title="Available when signed in"
                      className={cn(uiClasses.buttonGhost, "px-4 py-2 text-sm opacity-60 cursor-not-allowed")}
                    >
                      Sign out
                    </button>
                    <button
                      type="button"
                      disabled
                      title="Available when signed in"
                      className={cn(uiClasses.buttonGhost, "px-4 py-2 text-sm text-red-600 dark:text-red-400 opacity-60 cursor-not-allowed")}
                    >
                      Delete account
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await updatePreferences({
                          general: { ...preferences?.general, displayName: accountDisplayNameDraft.trim() || undefined },
                        });
                      }}
                      disabled={
                        (accountDisplayNameDraft.trim() || "") === (preferences?.general?.displayName ?? "")
                      }
                      className={cn(uiClasses.buttonPrimary, "ml-auto px-4 py-2 text-sm")}
                    >
                      Save
                    </button>
                  </div>
                </div>
              </SettingsSection>
            )}

            {/* System Section (Behavior + macOS Services) */}
            {activeSettingsSection === "system" && (
              <SettingsSection 
                title="System" 
                description="Behavior and macOS integration"
              >
                <div className="space-y-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Behavior</p>
                  <div className="space-y-0 mb-6">
                    <SettingsRow 
                      label="Auto-copy to clipboard" 
                      description="Copy the result to the clipboard when done"
                    >
                      <ToggleSwitch
                        checked={preferences?.behavior.autoCopy ?? true}
                        onChange={async (checked) => {
                          await updatePreferences({ behavior: { ...preferences?.behavior, autoCopy: checked } });
                        }}
                      />
                    </SettingsRow>
                    
                    <SettingsRow 
                      label="Sound on complete" 
                      description="Play a short sound when your dictation is ready"
                    >
                      <ToggleSwitch
                        checked={preferences?.behavior.soundOnComplete ?? true}
                        onChange={async (checked) => {
                          await updatePreferences({ behavior: { ...preferences?.behavior, soundOnComplete: checked } });
                        }}
                      />
                    </SettingsRow>
                    
                    <SettingsRow 
                      label="System notifications" 
                      description="Show a notification when dictation or transformation is ready"
                    >
                      <ToggleSwitch
                        checked={preferences?.behavior.systemNotification ?? true}
                        onChange={async (checked) => {
                          await updatePreferences({ behavior: { ...preferences?.behavior, systemNotification: checked } });
                        }}
                      />
                    </SettingsRow>
                    {ENABLE_RIGHT_CLICK_SERVICES && (
                      <SettingsRow 
                        label="Auto-paste after transform" 
                        description="Automatically paste the result when using right-click Services (macOS)"
                      >
                        <ToggleSwitch
                          checked={preferences?.behavior.autoPasteAfterTransform ?? true}
                          onChange={async (checked) => {
                            await updatePreferences({ behavior: { ...preferences?.behavior, autoPasteAfterTransform: checked } });
                          }}
                        />
                      </SettingsRow>
                    )}
                    <SettingsRow
                      label="Paste original and result"
                      description="When using a mode that transforms text, paste both your input and the result (format: Original / Result)"
                    >
                      <ToggleSwitch
                        checked={preferences?.behavior.pasteInputAndOutput ?? false}
                        onChange={async (checked) => {
                          await updatePreferences({ behavior: { ...preferences?.behavior, pasteInputAndOutput: checked } });
                        }}
                      />
                    </SettingsRow>
                  </div>

                  {ENABLE_RIGHT_CLICK_SERVICES && (() => {
                    const expectedNames = modes
                      .filter((m) => m.enabled)
                      .map((m) => "Ghosty – " + m.name.replace(/\//g, "-").replace(/:/g, " "))
                      .sort();
                    const installed = servicesInstalled ?? [];
                    const installedSorted = [...installed].sort();
                    const isUpToDate = installed.length > 0 && expectedNames.length > 0 &&
                      JSON.stringify(installedSorted) === JSON.stringify(expectedNames);
                    const needsUpdate = installed.length > 0 && !isUpToDate;
                    const serviceStatus =
                      installed.length === 0
                        ? "No services installed."
                        : isUpToDate
                          ? `Up to date (${installed.length} service${installed.length > 1 ? "s" : ""}).`
                          : "Update available (reinstall to sync with current modes).";
                    const installButtonLabel =
                      installed.length === 0 ? "Install Services" : needsUpdate ? "Update Services" : "Reinstall";
                    const canInstall = expectedNames.length > 0;
                    return (
                      <>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Right-click Services (macOS)</p>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-medium text-black dark:text-white">Text mode (clic droit)</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Add Ghosty modes to the context menu (Services submenu). One action installs from your current modes.</p>
                            {servicesInstalled !== null && (
                              <p className={cn(
                                "text-xs mt-1.5",
                                needsUpdate ? "text-amber-600 dark:text-amber-500" : "text-muted-foreground"
                              )}>
                                {serviceStatus}
                              </p>
                            )}
                            <p className="text-xs text-amber-600 dark:text-amber-500 mt-1.5">Important: run Ghosty from the built app (.app), not in dev. Otherwise you may see &quot;No application knows how to open URL ghosty://&quot;.</p>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <button
                              type="button"
                              disabled={!canInstall}
                              title={!canInstall ? "Enable at least one mode first" : undefined}
                              onClick={async () => {
                                try {
                                  const list = await api.services.install();
                                  setServicesInstalled(list);
                                  const msg = list?.length ? `Services installed (${list.length}): ${list.join(", ")}. Enable them in System Settings > Keyboard > Shortcuts > Services (Text).` : "Services installed.";
                                  setStatus(msg);
                                  setTimeout(() => setStatus("Ready."), 8000);
                                } catch (e) {
                                  const err = e instanceof Error ? e.message : String(e);
                                  setStatus(err);
                                  setError(err);
                                  setTimeout(() => { setStatus("Ready."); setError(null); }, 5000);
                                }
                              }}
                              className={cn(uiClasses.buttonGhost, "text-xs px-3 py-1.5")}
                            >
                              {installButtonLabel}
                            </button>
                            <button
                              type="button"
                              onClick={() => api.services.openFolder().catch(console.error)}
                              className="text-xs text-muted-foreground hover:text-black dark:hover:text-white underline"
                            >
                              Open Services folder
                            </button>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </SettingsSection>
            )}

            {activeSettingsSection === "shortcuts" && (
              <SettingsSection 
                title="Keyboard shortcuts" 
                description="Customize how you interact with Ghosty"
              >
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    Shortcuts must be unique and not reserved by macOS.
                    <span
                      title="No duplicate in this app. Shortcut must be free (e.g. Option+Shift+Space is reserved; Fn cannot be used)."
                      className="inline-flex cursor-help text-muted-foreground/80 hover:text-muted-foreground"
                      aria-label="Validation rules"
                    >
                      <HelpCircle size={12} />
                    </span>
                  </p>
                  {shortcutError && (
                    <div className="flex items-center justify-between gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-md border border-red-200 dark:border-red-900/50">
                      <span>{shortcutError}</span>
                      <button
                        type="button"
                        onClick={() => setShortcutError(null)}
                        className="shrink-0 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
                        aria-label="Dismiss"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                    {shortcuts.map((s) => (
                      <div
                        key={s.id}
                        className={cn(
                          "py-4 first:pt-0",
                          !s.enabled && "opacity-60"
                        )}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-black dark:text-white">
                              {s.name}
                            </div>
                            <div className="text-sm text-muted-foreground mt-0.5">
                              {s.description}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div
                              tabIndex={0}
                              role="button"
                              onKeyDown={(e) => handleShortcutKeyDown(e, s.id, s.keys)}
                              onClick={(e) => {
                                setShortcutError(null);
                                setShortcutListeningId(s.id);
                                (e.currentTarget as HTMLElement).focus();
                              }}
                              onBlur={() => setShortcutListeningId(null)}
                              className={cn(
                                "min-h-[36px] min-w-[120px] px-3 py-2 rounded-md border border-border flex flex-wrap items-center justify-end gap-1.5 cursor-text focus:outline-none focus:ring-2 focus:ring-orange-500/30",
                                shortcutListeningId === s.id
                                  ? "bg-orange-50 dark:bg-orange-950/20 border-orange-500/50"
                                  : "bg-muted/30 hover:bg-muted/50"
                              )}
                            >
                              {shortcutListeningId === s.id ? (
                                <>
                                  {s.keys.length > 0 && (
                                    <span className="flex flex-wrap items-center gap-1 opacity-50">
                                      {s.keys.map((k) => (
                                        <span key={k} className="px-2 py-0.5 rounded bg-muted text-xs font-mono">
                                          {k}
                                        </span>
                                      ))}
                                    </span>
                                  )}
                                  <span className="text-muted-foreground text-sm">
                                    {s.keys.length > 0 ? "Listening…" : "Press keys…"}
                                  </span>
                                </>
                              ) : s.keys.length === 0 ? (
                                <span className="text-muted-foreground text-sm">Press keys…</span>
                              ) : (
                                s.keys.map((k) => (
                                  <span
                                    key={k}
                                    className="px-2 py-0.5 rounded bg-muted text-xs font-medium font-mono"
                                  >
                                    {k}
                                  </span>
                                ))
                              )}
                            </div>
                            <label htmlFor={`shortcut-enabled-${s.id}`} className="flex items-center gap-2 cursor-pointer" title="Enable or disable this shortcut">
                              <input
                                id={`shortcut-enabled-${s.id}`}
                                type="checkbox"
                                checked={s.enabled}
                                onChange={async () => {
                                  try {
                                    const updated = await api.shortcuts.toggle(s.id);
                                    setShortcuts(updated);
                                    await api.shortcuts.reregister();
                                  } catch (e) {
                                    console.error(e);
                                  }
                                }}
                                className="rounded border-border"
                                aria-label="Enable shortcut"
                              />
                              <span className="text-xs text-muted-foreground">Enabled</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-center pt-2">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          setShortcutError(null);
                          const updated = await api.shortcuts.reset();
                          setShortcuts(updated);
                          await api.shortcuts.reregister();
                        } catch (e) {
                          console.error(e);
                        }
                      }}
                      className={cn(uiClasses.buttonGhost, "px-4 py-2 text-sm font-medium")}
                    >
                      Reset to default
                    </button>
                  </div>
                </div>
              </SettingsSection>
            )}

            {activeSettingsSection === "recording" && (
              <SettingsSection 
                title="Recording" 
                description="Configure audio recording settings"
              >
                <div className="space-y-4">
                  <div>
                    <label htmlFor="settings-input-device" className="block text-sm font-medium text-black dark:text-white mb-2">
                      Input device
                    </label>
                    <select
                      id="settings-input-device"
                      value={preferences?.recording?.inputDeviceId ?? ""}
                      onChange={async (e) => {
                        const v = e.target.value;
                        await updatePreferences({
                          recording: {
                            ...preferences?.recording,
                            inputDeviceId: v === "" ? null : v,
                          },
                        });
                      }}
                      className={uiClasses.select}
                    >
                      <option value="">Default</option>
                      {audioInputDevices.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Microphone used for recording. Default uses the system default.
                    </p>
                  </div>
                  <div>
                    <label htmlFor="settings-max-duration" className="block text-sm font-medium text-black dark:text-white mb-2">
                      Max duration (minutes)
                    </label>
                    <select
                      id="settings-max-duration"
                      value={preferences?.recording.maxDurationMinutes ?? 5}
                      onChange={async (e) => {
                        const v = parseInt(e.target.value);
                        await updatePreferences({ recording: { ...preferences?.recording, maxDurationMinutes: v } });
                      }}
                      className={uiClasses.select}
                    >
                      {[1, 2, 5, 10].map((m) => (
                        <option key={m} value={m}>{m} min</option>
                      ))}
                    </select>
                  </div>
                </div>
              </SettingsSection>
            )}

            {activeSettingsSection === "models" && (
              <SettingsSection
                title="Models"
                description="Voice-to-text (Whisper) and text generation (LLM)"
              >
                <div className="space-y-8">
                  <div>
                    <h3 className="text-sm font-semibold text-black dark:text-white mb-3">Transcription (voice → text)</h3>
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="settings-transcription-language" className="block text-sm font-medium text-black dark:text-white mb-2">
                          Default language
                        </label>
                        <select
                          id="settings-transcription-language"
                          value={preferences?.transcription.language ?? ""}
                          onChange={async (e) => {
                            const v = e.target.value;
                            await updatePreferences({
                              transcription: {
                                ...preferences?.transcription,
                                language: v === "" ? null : v,
                              },
                            });
                          }}
                          className={uiClasses.select}
                        >
{(Object.entries(LANGUAGES) as [Language, { label: string; flag: string }][]).map(([key, { flag, label }]) => (
                        <option key={key} value={key === "auto" ? "" : key}>
                          {flag ? `${flag} ` : ""}{label}
                        </option>
                      ))}
                        </select>
                        <p className="text-xs text-muted-foreground mt-1.5">
                          Language sent to Whisper. Auto-detect if not set.
                        </p>
                      </div>
                      <div>
                        <label htmlFor="settings-transcription-model" className="block text-sm font-medium text-black dark:text-white mb-2">
                          Model
                        </label>
                        <select
                          id="settings-transcription-model"
                          value={preferences?.transcription.model ?? "whisper-1"}
                          onChange={async (e) => {
                            await updatePreferences({ transcription: { ...preferences?.transcription, model: e.target.value } });
                          }}
                          className={uiClasses.select}
                        >
                          <option value="whisper-1">whisper-1</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-black dark:text-white mb-3">Text generation (LLM)</h3>
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="settings-llm-model" className="block text-sm font-medium text-black dark:text-white mb-2">
                          Model
                        </label>
                        <select
                          id="settings-llm-model"
                          value={preferences?.llm.model ?? "gpt-4o-mini"}
                          onChange={async (e) => {
                            await updatePreferences({ llm: { ...preferences?.llm, model: e.target.value } });
                          }}
                          className={uiClasses.select}
                        >
                          <option value="gpt-4o-mini">gpt-4o-mini</option>
                          <option value="gpt-4o">gpt-4o</option>
                          <option value="gpt-4-turbo">gpt-4-turbo</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </SettingsSection>
            )}

            {activeSettingsSection === "api" && (
              <SettingsSection 
                title="API Keys" 
                description="Manage API keys for transcription and text generation"
              >
                {apiKeys.length === 0 && (
                  <p className="text-sm text-muted-foreground mb-4">
                    No API keys yet.
                  </p>
                )}
                {apiKeys.length > 0 && (
                  <div className="mb-4 divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                    {apiKeys.map((k) => (
                      <div
                        key={k.id}
                        className="py-2.5 flex items-center justify-between gap-3"
                      >
                        <span className="flex items-center gap-2 min-w-0 text-sm">
                          {k.isActive ? (
                            <Check className="shrink-0 size-3.5 text-green-600 dark:text-green-400" aria-hidden />
                          ) : (
                            <span className="shrink-0 size-3.5" aria-hidden />
                          )}
                          <span className="truncate text-black dark:text-white">{k.name}</span>
                          <span className="shrink-0 text-muted-foreground text-xs">{k.provider}</span>
                        </span>
                        <span className="flex items-center gap-0.5 shrink-0">
                          {!k.isActive && (
                            <IconButton
                              icon={<Check className="size-3.5" />}
                              aria-label="Set as active key"
                              variant="ghost"
                              size="md"
                              onClick={() => _handleSetActiveKey(k.id)}
                            />
                          )}
                            <IconButton
                              icon={<Trash2 className="size-3.5" />}
                              aria-label="Remove this key"
                            variant="danger"
                            size="md"
                            onClick={() => _handleDeleteApiKey(k.id)}
                          />
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex flex-wrap items-end gap-2">
                    <label htmlFor="api-key-name" className="sr-only">Name</label>
                    <input
                      id="api-key-name"
                      type="text"
                      value={keyName}
                      onChange={(e) => setKeyName(e.target.value)}
                      placeholder="Name"
                      className={cn(uiClasses.input, "w-32 min-w-0")}
                    />
                    <label htmlFor="api-key-provider" className="sr-only">Provider</label>
                    <select
                      id="api-key-provider"
                      value={keyProvider}
                      onChange={(e) => _handleProviderChange(e.target.value)}
                      className={cn(uiClasses.select, "w-28 min-w-0")}
                    >
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic</option>
                      <option value="custom">Custom</option>
                    </select>
                    <label htmlFor="api-key-value" className="sr-only">API key</label>
                    <input
                      id="api-key-value"
                      type="password"
                      value={apiKey}
                      onChange={(e) => _handleApiKeyChange(e.target.value)}
                      onBlur={() => {
                        if (apiKey.trim().length >= 10) {
                          const err = validateApiKeyFormat(apiKey, keyProvider);
                          setValidationError(err);
                        }
                      }}
                      placeholder="sk-..."
                      className={cn(uiClasses.input, "flex-1 min-w-[140px]")}
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      onClick={() => _handleSaveApiKey()}
                      disabled={
                        !apiKey.trim() ||
                        !keyName.trim() ||
                        apiKeySaveStatus === "validating" ||
                        apiKeySaveStatus === "testing" ||
                        apiKeySaveStatus === "saving"
                      }
                      className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded text-sm text-muted-foreground hover:text-black dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors disabled:opacity-50 disabled:pointer-events-none"
                      aria-label={apiKeySaveStatus === "idle" ? "Add API key" : undefined}
                    >
                      {apiKeySaveStatus === "idle" && <Plus className="size-3.5" />}
                      {apiKeySaveStatus === "idle" && "Add"}
                      {apiKeySaveStatus === "validating" && "..."}
                      {apiKeySaveStatus === "testing" && "..."}
                      {apiKeySaveStatus === "saving" && "..."}
                      {apiKeySaveStatus === "success" && <Check className="size-3.5" />}
                      {apiKeySaveStatus === "success" && "OK"}
                      {apiKeySaveStatus === "error" && "Error"}
                    </button>
                  </div>
                  {(validationError || error) && (
                    <p className="text-xs text-red-600 dark:text-red-400">
                      {validationError ?? error}
                    </p>
                  )}
                </div>
              </SettingsSection>
            )}

            {activeSettingsSection === "usage" && (
              <SettingsSection 
                title="Usage Statistics" 
                description="Track API usage and costs"
              >
                <div className="text-muted-foreground text-sm">
                  More detailed usage and cost tracking coming in a future update.
                </div>
              </SettingsSection>
            )}

            {activeSettingsSection === "advanced" && (
              <SettingsSection 
                title="Advanced" 
                description="Advanced configuration options"
              >
                <div className="text-muted-foreground text-sm">
                  Additional options will appear here in a future update.
                </div>
              </SettingsSection>
            )}
          </div>
        </div>
      </SettingsModal>
    </div>
  );
}
