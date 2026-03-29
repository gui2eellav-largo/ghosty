import { useEffect, useState, useRef, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { cn } from "@/lib/utils";
import { uiClasses } from "@/lib/design-tokens";
import { strings } from "@/lib/strings";
import packageJson from "../../package.json";
import { api } from "@/api/tauri";
import {
  type View,
  type Mode,
  type TranscriptionItem,
  type SettingsSectionId,
  type WordCandidate,
  type CorrectionNotification,
  ENABLE_RIGHT_CLICK_SERVICES,
} from "@/types";
import { useModes } from "@/hooks/useModes";
import { useTranscriptionHistory } from "@/hooks/useTranscriptionHistory";
import { useSettings } from "@/hooks/useSettings";
import { SettingsModal } from "./SettingsModal";
import { ProfilePopover } from "./ProfilePopover";
import { NotificationsPanel } from "./NotificationsPanel";
import { HomeView } from "./dashboard/HomeView";
import { ModesView } from "./dashboard/ModesView";
import { DictionaryView } from "./dashboard/DictionaryView";
import { GeneralSection } from "./dashboard/settings/GeneralSection";
import { SystemSection } from "./dashboard/settings/SystemSection";
import { ShortcutsSection } from "./dashboard/settings/ShortcutsSection";
import { RecordingSection } from "./dashboard/settings/RecordingSection";
import { ModelsSection } from "./dashboard/settings/ModelsSection";
import { ApiKeysSection } from "./dashboard/settings/ApiKeysSection";
import {
  Home,
  Mic,
  BookOpen,
  Settings,
  HelpCircle,
  Bell,
  User,
  Key,
  Keyboard,
  Zap,
  Terminal,
} from "lucide-react";

export default function Dashboard() {
  const modesState = useModes();
  const {
    modes,
    selectedMode,
    setSelectedMode,
    loadModes,
  } = modesState;

  const transcriptionState = useTranscriptionHistory();
  const {
    transcriptions,
    expandedThoughts,
    expandedOutputs,
    overflowedOutputs,
    outputRefs,
    addTranscription,
    clearTranscriptions,
    handleCopy,
    toggleThoughts,
    toggleOutputExpand,
  } = transcriptionState;

  const settingsState = useSettings();
  const {
    hasApiKey,
    preferences,
    usageStats,
    shortcuts,
    setShortcuts,
    shortcutListeningId,
    setShortcutListeningId,
    shortcutError,
    setShortcutError,
    dictionaryEntries,
    misspellingDrafts,
    editingDictionaryId,
    setEditingDictionaryId,
    audioInputDevices,
    setAudioInputDevices,
    servicesInstalled,
    setServicesInstalled,
    accountDisplayNameDraft,
    setAccountDisplayNameDraft,
    correctionNotifications,
    setCorrectionNotifications,
    updateInfo,
    setUpdateInfo,
    updateStatus,
    setUpdateStatus,
    updateError,
    setUpdateError,
    error,
    setError,
    status,
    setStatus,
    apiKey,
    apiKeySaveStatus,
    validationError,
    setValidationError,
    apiKeys,
    keyName,
    setKeyName,
    keyProvider,
    loadPreferences,
    updatePreferences,
    loadShortcuts,
    loadDictionaryEntries,
    loadApiKeys,
    loadUsageStats,
    validateApiKeyFormat,
    handleShortcutKeyDown,
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
  } = settingsState;

  const [activeView, setActiveView] = useState<View>("home");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [activeSettingsSection, setActiveSettingsSection] = useState<SettingsSectionId>("general");
  const [isProfilePopoverOpen, setIsProfilePopoverOpen] = useState(false);
  const [isNotificationsPanelOpen, setIsNotificationsPanelOpen] = useState(false);
  const [promptImproveToast, setPromptImproveToast] = useState<string | null>(null);

  const notificationsUnreadCount = correctionNotifications.length;
  const profilePopoverRef = useRef<HTMLDivElement>(null);
  const notificationsPanelRef = useRef<HTMLDivElement>(null);

  // ---------- Init on mount ----------
  useEffect(() => {
    loadApiKeys();
    loadModes();
    loadShortcuts();
    loadDictionaryEntries();
    // Auto-update check on mount (silent)
    api.preferences.get().then((prefs) => {
      if (prefs.general.autoUpdate) {
        api.updater.check().then((info) => {
          if (info.available) setUpdateInfo(info);
        }).catch(() => {});
      }
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  // ---------- Tauri event listeners ----------
  useEffect(() => {
    let cancelled = false;
    const unlistens: Array<() => void> = [];

    const reg = (p: Promise<() => void>) =>
      p.then((u) => {
        if (cancelled) { try { u(); } catch { /* already removed */ } }
        else unlistens.push(u);
      }).catch(() => {});

    reg(listen("recording_started", () => {
      setStatus(strings.home.statusRecording);
      setIsRecording(true);
      setIsProcessing(false);
      setError(null);
    }));
    reg(listen("recording_stopped", () => {
      setStatus(strings.home.statusTranscribing);
      setIsRecording(false);
      setIsProcessing(true);
    }));
    reg(listen<{ output: string; thoughts: string | null; mode: string | null } | string>(
      "transcription_ready",
      (event) => {
        setStatus(strings.home.statusReady);
        setIsProcessing(false);
        const payload = event.payload;
        const output = typeof payload === "string" ? payload : payload.output;
        const thoughts = typeof payload === "string" ? null : payload.thoughts;
        const mode = typeof payload === "string" ? null : payload.mode;

        const newItem: TranscriptionItem = {
          id: Math.random().toString(36).substring(7),
          time: new Date().toLocaleTimeString("en", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }),
          output,
          thoughts,
          mode,
        };
        addTranscription(newItem);
        void loadUsageStats();
      }
    ));
    reg(listen<string>("transcription_error", (event) => {
      setStatus(strings.home.statusReady);
      setIsRecording(false);
      setIsProcessing(false);
      setError(event.payload);
    }));
    reg(listen<string>("active-mode-changed", (event) => {
      const modeId = event.payload;
      if (modeId) {
        setSelectedMode(modeId as Mode);
      }
    }));

    return () => {
      cancelled = true;
      for (const u of unlistens) { try { u(); } catch { /* already removed */ } }
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
        sendNotification({ title: strings.app.name, body: event.payload });
      }
    });

    const safeUnlisten = (p: Promise<() => void>) =>
      p
        .then((u) => {
          try {
            u();
          } catch {
            /* listener already removed */
          }
        })
        .catch(() => {});
    return () => {
      safeUnlisten(unlistenSound);
      safeUnlisten(unlistenNotif);
    };
  }, []);

  useEffect(() => {
    const unlisten = listen<string>("open-settings-section", (event) => {
      const section = event.payload;
      const valid: SettingsSectionId[] = [
        "shortcuts",
        "recording",
        "models",
        "general",
        "system",
        "behavior",
        "api",
        "account",
      ];
      if (valid.includes(section as SettingsSectionId)) {
        setActiveSettingsSection(section as SettingsSectionId);
        setIsSettingsModalOpen(true);
      }
    });
    return () => {
      unlisten
        .then((u) => {
          try {
            u();
          } catch {
            /* listener already removed */
          }
        })
        .catch(() => {});
    };
  }, []);

  // Correction candidates from FloatingBar
  useEffect(() => {
    const unlisten = listen<WordCandidate[]>("correction-candidates", (event) => {
      const candidates = event.payload;
      if (!candidates || candidates.length === 0) return;
      setCorrectionNotifications((prev) => {
        const newNotifs: CorrectionNotification[] = candidates.map((c) => ({
          id: `${c.misspelling}-${c.correction}-${Date.now()}`,
          candidate: c,
          createdAt: Date.now(),
        }));
        const existing = new Set(
          prev.map((n) => `${n.candidate.misspelling}|${n.candidate.correction}`)
        );
        const deduped = newNotifs.filter(
          (n) =>
            !existing.has(`${n.candidate.misspelling}|${n.candidate.correction}`)
        );
        return [...prev, ...deduped];
      });
    });
    return () => {
      unlisten
        .then((u) => {
          try {
            u();
          } catch {
            /* removed */
          }
        })
        .catch(() => {});
    };
  }, [setCorrectionNotifications]);

  // Refresh dictionary when correction accepted from FloatingBar
  useEffect(() => {
    const unlisten = listen("dictionary-updated", () => {
      loadDictionaryEntries();
    });
    return () => {
      unlisten
        .then((u) => {
          try {
            u();
          } catch {
            /* removed */
          }
        })
        .catch(() => {});
    };
  }, [loadDictionaryEntries]);

  useEffect(() => {
    const unlisten = listen("preferences-updated", () => {
      loadPreferences();
    });
    return () => {
      unlisten
        .then((u) => {
          try {
            u();
          } catch {
            /* listener already removed */
          }
        })
        .catch(() => {});
    };
  }, [loadPreferences]);

  // ---------- Settings modal side-effects ----------
  useEffect(() => {
    if (isSettingsModalOpen) {
      loadUsageStats();
      loadPreferences();
    }
  }, [isSettingsModalOpen, loadUsageStats, loadPreferences]);

  useEffect(() => {
    if (activeSettingsSection === "account") {
      setAccountDisplayNameDraft(preferences?.general?.displayName ?? "");
    }
  }, [activeSettingsSection, preferences?.general?.displayName, setAccountDisplayNameDraft]);

  useEffect(() => {
    if (!isSettingsModalOpen || activeSettingsSection !== "recording") return;
    let cancelled = false;
    api.audio
      .listInputDevices()
      .then((list) => {
        if (!cancelled) setAudioInputDevices(list);
      })
      .catch((err) => console.error(err));
    return () => {
      cancelled = true;
    };
  }, [isSettingsModalOpen, activeSettingsSection, setAudioInputDevices]);

  useEffect(() => {
    if (
      !isSettingsModalOpen ||
      activeSettingsSection !== "system" ||
      !ENABLE_RIGHT_CLICK_SERVICES
    )
      return;
    let cancelled = false;
    api.services
      .listInstalled()
      .then((list) => {
        if (!cancelled) setServicesInstalled(list);
      })
      .catch(() => {
        if (!cancelled) setServicesInstalled([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isSettingsModalOpen, activeSettingsSection, setServicesInstalled]);

  useEffect(() => {
    if (!shortcutError) return;
    const t = setTimeout(() => setShortcutError(null), 8000);
    return () => clearTimeout(t);
  }, [shortcutError, setShortcutError]);

  // ---------- Popover / panel outside-click ----------
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

  // ---------- Toast ----------
  useEffect(() => {
    if (promptImproveToast === null) return;
    const t = setTimeout(() => setPromptImproveToast(null), 5000);
    return () => clearTimeout(t);
  }, [promptImproveToast]);

  // ---------- Callbacks for child components ----------
  const handleOpenSettings = useCallback(
    (section: SettingsSectionId) => {
      setActiveSettingsSection(section);
      setIsSettingsModalOpen(true);
    },
    []
  );

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
            <img src="/ghosty-logo.png" alt="Ghosty" className="w-7 h-7 object-contain" />
            <span className="text-sm font-black tracking-widest uppercase">{strings.app.name}</span>
          </div>

          <nav className="space-y-1">
            <NavItem id="home" label={strings.nav.home} icon={Home} />
            <NavItem id="modes" label={strings.nav.modes} icon={Mic} />
            <NavItem id="dictionary" label={strings.nav.dictionary} icon={BookOpen} />
          </nav>
        </div>

        <div className="mt-auto p-4 space-y-1">
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2 min-h-[44px] rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-black/[0.02] dark:hover:bg-white/[0.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/30 transition-all"
          >
            <Settings size={18} className="opacity-70" />
            {strings.nav.settings}
          </button>
          <button
            onClick={() => window.open("https://github.com/anthropics/ghosty#readme", "_blank")}
            className="w-full flex items-center gap-3 px-3 py-2 min-h-[44px] rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-black/[0.02] dark:hover:bg-white/[0.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/30 transition-all"
          >
            <HelpCircle size={18} className="opacity-70" />
            {strings.nav.help}
          </button>
          <p className="text-[10px] text-muted-foreground/80 pt-2 px-3">
            {strings.app.name} v{(packageJson as { version?: string }).version ?? "0.1.0"}
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
              aria-label={strings.notifications.title}
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
              correctionNotifications={correctionNotifications}
              onAcceptCorrection={handleAcceptCorrectionNotification}
              onDismissCorrection={handleDismissCorrectionNotification}
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
                (preferences.general.displayName
                  .trim()
                  .split(/\s+/)
                  .map((s) => s[0])
                  .join("")
                  .slice(0, 2) || "?").toUpperCase()
              ) : (
                <User size={18} />
              )}
            </button>
            <ProfilePopover
              isOpen={isProfilePopoverOpen}
              onClose={() => setIsProfilePopoverOpen(false)}
              displayName={preferences?.general?.displayName ?? ""}
              wordsGenerated={
                usageStats ? Math.round((usageStats.tokens_output || 0) / 4) : 0
              }
              onManageAccount={() => {
                setIsSettingsModalOpen(true);
                setActiveSettingsSection("account");
                setIsProfilePopoverOpen(false);
              }}
            />
          </div>
        </div>

        <div
          className={cn(
            "flex-1 overflow-auto w-full px-8 py-12",
            activeView !== "settings" && "max-w-3xl mx-auto"
          )}
        >
          {activeView === "home" && (
            <HomeView
              modes={modes}
              selectedMode={selectedMode}
              setSelectedMode={setSelectedMode}
              transcriptions={transcriptions}
              expandedThoughts={expandedThoughts}
              expandedOutputs={expandedOutputs}
              overflowedOutputs={overflowedOutputs}
              outputRefs={outputRefs}
              usageStats={usageStats}
              preferences={preferences}
              hasApiKey={hasApiKey}
              shortcuts={shortcuts}
              isRecording={isRecording}
              isProcessing={isProcessing}
              status={status}
              onCopy={handleCopy}
              onToggleThoughts={toggleThoughts}
              onToggleOutputExpand={toggleOutputExpand}
              onClearHistory={clearTranscriptions}
              onOpenSettings={handleOpenSettings}
            />
          )}

          {activeView === "dictionary" && (
            <DictionaryView
              dictionaryEntries={dictionaryEntries}
              editingDictionaryId={editingDictionaryId}
              setEditingDictionaryId={setEditingDictionaryId}
              misspellingDrafts={misspellingDrafts}
              onMisspellingChange={handleMisspellingChange}
              onMisspellingSave={handleMisspellingSave}
              onDeleteWord={handleDeleteWord}
              onEditDictionaryEntry={handleEditDictionaryEntry}
              onAddWord={handleAddWordFromModal}
            />
          )}

          {activeView === "modes" && (
            <ModesView
              modes={modesState.modes}
              setModes={modesState.setModes}
              selectedModeId={modesState.selectedModeId}
              setSelectedModeId={modesState.setSelectedModeId}
              isEditingMode={modesState.isEditingMode}
              setIsEditingMode={modesState.setIsEditingMode}
              editedMode={modesState.editedMode}
              setEditedMode={modesState.setEditedMode}
              modeDraft={modesState.modeDraft}
              setModeDraft={modesState.setModeDraft}
              modeIdToConfirmDelete={modesState.modeIdToConfirmDelete}
              setModeIdToConfirmDelete={modesState.setModeIdToConfirmDelete}
              modeRowMenuOpen={modesState.modeRowMenuOpen}
              setModeRowMenuOpen={modesState.setModeRowMenuOpen}
              modeRowMenuRef={modesState.modeRowMenuRef}
              showImportModesModal={modesState.showImportModesModal}
              setShowImportModesModal={modesState.setShowImportModesModal}
              importModesJson={modesState.importModesJson}
              setImportModesJson={modesState.setImportModesJson}
              importModesError={modesState.importModesError}
              setImportModesError={modesState.setImportModesError}
              handleSaveMode={modesState.handleSaveMode}
              handleDeleteMode={modesState.handleDeleteMode}
              handleToggleModeEnabled={modesState.handleToggleModeEnabled}
              saveModeDraft={modesState.saveModeDraft}
              handleCreateNewMode={modesState.handleCreateNewMode}
              handleDuplicateMode={modesState.handleDuplicateMode}
              handleExportMode={modesState.handleExportMode}
              handleImportModes={modesState.handleImportModes}
              promptImproveToast={promptImproveToast}
              setPromptImproveToast={setPromptImproveToast}
            />
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
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground mb-2 px-4">
                  {strings.settings.groups.general}
                </div>
                <div className="space-y-0.5">
                  {([
                    { id: "general" as const, label: strings.settings.general.title, icon: Settings },
                    { id: "system" as const, label: strings.settings.system.title, icon: Terminal },
                  ]).map((section) => (
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
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground mb-2 px-4">
                  {strings.settings.groups.setup}
                </div>
                <div className="space-y-0.5">
                  {([
                    { id: "api" as const, label: strings.settings.apiKeys.title, icon: Key },
                    { id: "models" as const, label: strings.settings.models.title, icon: Zap },
                  ]).map((section) => (
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
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground mb-2 px-4">
                  {strings.settings.groups.configuration}
                </div>
                <div className="space-y-0.5">
                  {([
                    { id: "shortcuts" as const, label: strings.settings.shortcuts.title, icon: Keyboard },
                    { id: "recording" as const, label: strings.settings.recording.title, icon: Mic },
                  ]).map((section) => (
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
          <div className="flex-1 min-h-0 overflow-y-auto p-8 text-left">
            {activeSettingsSection === "general" && (
              <GeneralSection
                preferences={preferences}
                updatePreferences={updatePreferences}
                updateInfo={updateInfo}
                setUpdateInfo={setUpdateInfo}
                updateStatus={updateStatus}
                setUpdateStatus={setUpdateStatus}
                updateError={updateError}
                setUpdateError={setUpdateError}
                accountDisplayNameDraft={accountDisplayNameDraft}
                setAccountDisplayNameDraft={setAccountDisplayNameDraft}
              />
            )}
            {activeSettingsSection === "system" && (
              <SystemSection
                preferences={preferences}
                updatePreferences={updatePreferences}
                servicesInstalled={servicesInstalled}
                setServicesInstalled={setServicesInstalled}
                modes={modes}
                setStatus={setStatus}
                setError={setError}
              />
            )}
            {activeSettingsSection === "shortcuts" && (
              <ShortcutsSection
                shortcuts={shortcuts}
                setShortcuts={setShortcuts}
                shortcutListeningId={shortcutListeningId}
                setShortcutListeningId={setShortcutListeningId}
                shortcutError={shortcutError}
                setShortcutError={setShortcutError}
                handleShortcutKeyDown={handleShortcutKeyDown}
              />
            )}
            {activeSettingsSection === "recording" && (
              <RecordingSection
                preferences={preferences}
                updatePreferences={updatePreferences}
                audioInputDevices={audioInputDevices}
              />
            )}
            {activeSettingsSection === "models" && (
              <ModelsSection
                preferences={preferences}
                updatePreferences={updatePreferences}
              />
            )}
            {activeSettingsSection === "api" && (
              <ApiKeysSection
                apiKeys={apiKeys}
                apiKey={apiKey}
                keyName={keyName}
                setKeyName={setKeyName}
                keyProvider={keyProvider}
                apiKeySaveStatus={apiKeySaveStatus}
                validationError={validationError}
                error={error}
                onApiKeyChange={handleApiKeyChange}
                onProviderChange={handleProviderChange}
                onSaveApiKey={handleSaveApiKey}
                onDeleteApiKey={handleDeleteApiKey}
                onSetActiveKey={handleSetActiveKey}
                validateApiKeyFormat={validateApiKeyFormat}
                setValidationError={setValidationError}
              />
            )}
          </div>
        </div>
      </SettingsModal>
    </div>
  );
}
