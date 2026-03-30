import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { uiClasses } from "@/lib/design-tokens";
import { strings } from "@/lib/strings";
import { api } from "@/api/tauri";
import { LiveWaveform } from "@/components/ui/live-waveform";
import { IconButton } from "@/components/ui/icon-button";
import type {
  Mode,
  ModeConfig,
  ShortcutConfig,
  Preferences,
  UsageStats,
  TranscriptionItem,
  SettingsSectionId,
} from "@/types";
import {
  Mic,
  ChevronDown,
  ChevronUp,
  Clipboard,
  Trash2,
} from "lucide-react";

export interface HomeViewProps {
  modes: ModeConfig[];
  selectedMode: Mode;
  setSelectedMode: (mode: Mode) => void;
  transcriptions: TranscriptionItem[];
  expandedThoughts: Set<string>;
  expandedOutputs: Set<string>;
  overflowedOutputs: Set<string>;
  outputRefs: React.MutableRefObject<Record<string, HTMLParagraphElement | null>>;
  usageStats: UsageStats | null;
  preferences: Preferences | null;
  hasApiKey: boolean;
  shortcuts: ShortcutConfig[];
  isRecording: boolean;
  isProcessing: boolean;
  status: string;
  onCopy: (text: string) => void;
  onToggleThoughts: (id: string) => void;
  onToggleOutputExpand: (id: string) => void;
  onClearHistory: () => void;
  onOpenSettings: (section: SettingsSectionId) => void;
  updateInfo: { available: boolean; version?: string; body?: string } | null;
  onInstallUpdate: () => void;
  updateStatus: "idle" | "checking" | "installing" | "done" | "error";
}

export const HomeView = React.memo(function HomeView({
  modes,
  selectedMode,
  setSelectedMode,
  transcriptions,
  expandedThoughts,
  expandedOutputs,
  overflowedOutputs,
  outputRefs,
  usageStats,
  preferences,
  hasApiKey,
  shortcuts,
  isRecording,
  isProcessing,
  status,
  onCopy,
  onToggleThoughts,
  onToggleOutputExpand,
  onClearHistory,
  onOpenSettings,
  updateInfo,
  onInstallUpdate,
  updateStatus,
}: HomeViewProps) {
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<"bottom" | "top">("bottom");
  const [dropdownCoords, setDropdownCoords] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const DROPDOWN_WIDTH = 280;
  const DROPDOWN_HEIGHT = 280;
  const DROPDOWN_GAP = 8;

  const getDropdownPlacement = useCallback(
    (triggerRect: DOMRect): { top: number; left: number; position: "top" | "bottom" } => {
      const spaceBelow = window.innerHeight - triggerRect.bottom;
      const spaceAbove = triggerRect.top;
      const leftCentered =
        triggerRect.left + triggerRect.width / 2 - DROPDOWN_WIDTH / 2;
      const left = Math.max(
        8,
        Math.min(leftCentered, window.innerWidth - DROPDOWN_WIDTH - 8)
      );

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
    },
    []
  );

  const openModeDropdown = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const placement = getDropdownPlacement(rect);
    setDropdownCoords({ top: placement.top, left: placement.left });
    setDropdownPosition(placement.position);
    setIsModeDropdownOpen(true);
  }, [getDropdownPlacement]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedOutsideDropdown =
        dropdownRef.current && !dropdownRef.current.contains(target);
      const clickedOutsideTrigger =
        triggerRef.current && !triggerRef.current.contains(target);

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

  // Attach wheel event to mode selector button
  useEffect(() => {
    const button = triggerRef.current;
    if (!button) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const enabledModes = modes.filter((m) => m.enabled);
      if (enabledModes.length === 0) return;
      const currentIndex = enabledModes.findIndex((m) => m.id === selectedMode);
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

    button.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      button.removeEventListener("wheel", handleWheel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setSelectedMode stable
  }, [selectedMode, modes]);

  // Reposition dropdown on resize/scroll
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
  }, [isModeDropdownOpen, getDropdownPlacement]);

  return (
    <div>
      {!hasApiKey && (
        <div className="mb-6 flex items-center gap-4 rounded-lg border border-orange-500/20 bg-orange-500/5 px-4 py-3">
          <p className="flex-1 text-sm font-medium text-foreground">
            {strings.home.setupApiKey}
          </p>
          <button
            type="button"
            onClick={() => onOpenSettings("api")}
            className="shrink-0 rounded-lg bg-orange-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-orange-600 transition-colors"
          >
            {strings.home.openSettings}
          </button>
        </div>
      )}

      {updateInfo?.available && updateStatus !== "done" && (
        <div className="mb-6 flex items-center gap-4 rounded-lg border border-sky-500/20 bg-sky-500/5 px-4 py-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              Update available — v{updateInfo.version}
            </p>
            {updateInfo.body && (
              <p className="text-xs text-muted-foreground/60 mt-0.5">{updateInfo.body}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onInstallUpdate}
            disabled={updateStatus === "installing"}
            className="shrink-0 rounded-lg bg-sky-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-sky-600 disabled:opacity-50 transition-colors"
          >
            {updateStatus === "installing" ? "Installing…" : "Update now"}
          </button>
        </div>
      )}
      <header
        className={cn(uiClasses.pageHeaderMargin, "flex justify-between items-start")}
      >
        <div>
          <h1 className={cn(uiClasses.pageTitle, "mb-2")}>
            {strings.home.welcomeBack}
            {preferences?.general?.displayName?.trim()
              ? `, ${preferences.general.displayName.trim()}`
              : ""}
          </h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Mic size={14} className="text-blue-500" />{" "}
              {(() => {
                const words = usageStats?.words_generated ?? 0;
                return words >= 1000
                  ? `${(words / 1000).toFixed(1)}K ${strings.home.words}`
                  : `${words} ${strings.home.words}`;
              })()}
            </span>
          </div>
        </div>
      </header>

      {/* Primary CTA */}
      <div className={cn(uiClasses.infoBox, "relative overflow-hidden py-8 px-6 mb-10")}>
        <div className="relative z-10">
          <h2 className={cn(uiClasses.pageTitle, "mb-3 leading-snug")}>
            Hold{" "}
            <kbd className="bg-black/5 dark:bg-white/10 text-foreground px-1.5 py-0.5 rounded font-mono text-lg lowercase">
              {(() => {
                const pushToTalk = shortcuts.find(
                  (s) => s.action.type === "pushToTalk" && s.enabled
                );
                return pushToTalk?.keys?.length
                  ? pushToTalk.keys.join("+")
                  : "shortcut";
              })()}
            </kbd>{" "}
            to dictate and let {strings.app.name} format for you
          </h2>
          <p
            className={cn(
              uiClasses.pageDescription,
              "max-w-lg mb-6 leading-relaxed"
            )}
          >
            {strings.home.heroDescription}
          </p>

          {/* Mode Selector Dropdown */}
          <div className="flex justify-center mb-6">
            <button
              ref={triggerRef}
              onClick={() =>
                isModeDropdownOpen
                  ? setIsModeDropdownOpen(false)
                  : openModeDropdown()
              }
              className={cn(
                "flex items-center gap-2 py-1 rounded transition-colors",
                "hover:bg-black/[0.03] dark:hover:bg-white/[0.04] cursor-pointer text-left"
              )}
            >
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  backgroundColor:
                    modes.find((m) => m.id === selectedMode)?.color || "#10b981",
                }}
              />
              <div className="flex flex-col items-start min-w-0">
                <span className="font-medium text-sm text-black dark:text-white">
                  {modes.find((m) => m.id === selectedMode)?.name || "Direct"}
                </span>
              </div>
              {isModeDropdownOpen ? (
                <ChevronUp size={14} className="shrink-0 text-muted-foreground" />
              ) : (
                <ChevronDown size={14} className="shrink-0 text-muted-foreground" />
              )}
            </button>

            {/* Dropdown Menu Portal */}
            {isModeDropdownOpen &&
              createPortal(
                <div
                  ref={dropdownRef}
                  className={cn(
                    "fixed w-[280px] z-[9999]",
                    "bg-white dark:bg-[#0c0c0c] border border-black/[0.06] dark:border-white/[0.06]",
                    "rounded-lg shadow-md overflow-hidden",
                    dropdownPosition === "bottom"
                      ? "animate-in fade-in slide-in-from-top-2"
                      : "animate-in fade-in slide-in-from-bottom-2",
                    "duration-200"
                  )}
                  style={{
                    top: `${dropdownCoords.top}px`,
                    left: `${dropdownCoords.left}px`,
                  }}
                >
                  <div className="p-2">
                    {modes
                      .filter((m) => m.enabled)
                      .map((mode) => (
                        <button
                          key={mode.id}
                          onClick={() => {
                            setSelectedMode(mode.id as Mode);
                            setIsModeDropdownOpen(false);
                            api.modes
                              .setActivePrompt(mode.systemPrompt, mode.id)
                              .catch(console.error);
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-3 rounded-md transition-all duration-200",
                            "hover:bg-black/[0.04] dark:hover:bg-white/[0.04]",
                            selectedMode === mode.id &&
                              "bg-black/[0.04] dark:bg-white/[0.08]"
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
          <div
            className={cn(
              "w-2 h-2 rounded-full shrink-0",
              isRecording
                ? "bg-orange-500 animate-ping"
                : "bg-emerald-500 dark:bg-emerald-400"
            )}
          />
          <span className={cn(uiClasses.sectionLabel, "normal-case font-medium")}>
            {status}
          </span>
        </div>
      </div>

      {/* History List */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h3 className={uiClasses.sectionLabel}>{strings.home.today}</h3>
          {transcriptions.length > 0 && (
            <IconButton
              icon={<Trash2 size={12} />}
              aria-label={strings.home.clearHistory}
              variant="danger"
              size="sm"
              onClick={onClearHistory}
            />
          )}
        </div>

        <div className="space-y-0.5">
          {transcriptions.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2">
              <Mic size={24} className={uiClasses.emptyStateIcon} />
              <p className={uiClasses.emptyStateTitle}>{strings.home.noActivity}</p>
            </div>
          ) : (
            transcriptions.map((item) => {
              const matchedMode = item.mode
                ? modes.find((m) => m.id === item.mode)
                : undefined;
              const modeColorHex = matchedMode?.color;
              const modeLabel = item.mode
                ? (modes.find((m) => m.id === item.mode)?.name ?? item.mode)
                : "\u2014";

              return (
                <div
                  key={item.id}
                  className="group flex gap-6 py-4 px-0 border-b border-black/[0.06] dark:border-white/[0.06] last:border-0 items-start"
                >
                  <div className="flex items-center gap-2 w-16 pt-1 shrink-0">
                    <span
                      className="block w-2.5 h-2.5 rounded-full opacity-70 shrink-0"
                      style={{ backgroundColor: modeColorHex ?? "#9ca3af" }}
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
                          onClick={() => onToggleThoughts(item.id)}
                          className="text-[11px] text-muted-foreground/30 hover:text-muted-foreground/50 transition-colors text-left w-fit font-medium"
                          aria-label={
                            expandedThoughts.has(item.id)
                              ? strings.home.hideThoughts
                              : strings.home.showThoughts
                          }
                        >
                          {strings.home.thoughts}
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
                        ref={(el) => {
                          outputRefs.current[item.id] = el;
                        }}
                        className={cn(
                          "text-[15px] leading-relaxed text-black/80 dark:text-white/80 font-medium break-words",
                          !expandedOutputs.has(item.id) && "history-output-clamp"
                        )}
                      >
                        {item.output}
                      </p>
                      {(expandedOutputs.has(item.id) ||
                        overflowedOutputs.has(item.id)) && (
                        <button
                          type="button"
                          onClick={() => onToggleOutputExpand(item.id)}
                          className="text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors text-left w-fit font-medium"
                          aria-label={
                            expandedOutputs.has(item.id) ? strings.home.showLess : strings.home.showMore
                          }
                        >
                          {expandedOutputs.has(item.id) ? strings.home.showLess : strings.home.showMore}
                        </button>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onCopy(item.output)}
                    className="opacity-0 group-hover:opacity-100 transition-all p-2 rounded-lg bg-black/5 dark:bg-white/5 text-muted-foreground shrink-0"
                    title={strings.home.copyToClipboard}
                    aria-label={strings.home.copyToClipboard}
                  >
                    <Clipboard size={14} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
});
