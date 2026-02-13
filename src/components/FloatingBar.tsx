import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow, Window, primaryMonitor } from "@tauri-apps/api/window";
import { listen, emit } from "@tauri-apps/api/event";
import { cn } from "@/lib/utils";
import { designTokens } from "@/lib/design-tokens";
import { useFloatingWindowBounds, type FloatingLayoutMode } from "@/hooks/useFloatingWindowBounds";
import { api } from "@/api/tauri";
import type { Mode, ModeConfig } from "@/types";
import { VoiceButton } from "./ui/voice-button";

const fw = designTokens.floatingWidget;

export default function FloatingBar() {
  const windowRef = useRef(getCurrentWindow());
  const containerRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const centerXRef = useRef<number>(960);
  const windowYRef = useRef<number>(24);
  const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [positionReady, setPositionReady] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMenuClosing, setIsMenuClosing] = useState(false);
  const menuCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuCloseCooldownRef = useRef<number>(0);
  const [selectedMode, setSelectedMode] = useState<Mode>("light");
  const [voiceState, setVoiceState] = useState<"idle" | "recording" | "processing" | "success">("idle");
  const [modes, setModes] = useState<ModeConfig[]>([]);
  const [selectedModeConfig, setSelectedModeConfig] = useState<ModeConfig | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean>(true);
  const [showApiKeyPrompt, setShowApiKeyPrompt] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const loadHasApiKey = async () => {
    try {
      const ok = await api.apiKeys.hasKey();
      setHasApiKey(ok);
    } catch {
      setHasApiKey(false);
    }
  };

  const loadModes = async () => {
    try {
      const allModes = await api.modes.getAll();
      const enabledModes = allModes.filter(m => m.enabled).sort((a, b) => a.order - b.order);
      setModes(enabledModes);

      setSelectedModeConfig((current) => {
        if (current && enabledModes.some(m => m.id === current.id)) return current;
        return enabledModes[0] ?? null;
      });
      setSelectedMode((current) => {
        if (enabledModes.some(m => m.id === current)) return current;
        return (enabledModes[0]?.id as Mode) ?? current;
      });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadModes();
    loadHasApiKey();
  }, []);

  useEffect(() => {
    const unlisten = listen("modes-updated", () => loadModes());
    return () => {
      unlisten.then((u) => { try { u(); } catch { /* listener already removed */ } }).catch(() => {});
    };
  }, []);

  // Sync active mode from Dashboard (or any other window)
  useEffect(() => {
    const unlisten = listen<string>("active-mode-changed", (event) => {
      const modeId = event.payload;
      if (!modeId) return;
      setSelectedMode(modeId as Mode);
      const found = modes.find(m => m.id === modeId);
      if (found) {
        setSelectedModeConfig(found);
      }
    });
    return () => {
      unlisten.then((u) => { try { u(); } catch { /* listener already removed */ } }).catch(() => {});
    };
  }, [modes]);

  useEffect(() => {
    const initFloatingWindow = async () => {
      const monitor = await primaryMonitor();
      if (monitor) {
        const scale = monitor.scaleFactor;
        const workArea = monitor.workArea;
        const logicalWidth = workArea.size.width / scale;
        centerXRef.current = workArea.position.x / scale + logicalWidth / 2;
        windowYRef.current = workArea.position.y / scale;
      }
      setPositionReady(true);
      // Bounds gérées uniquement par useFloatingWindowBounds (useLayoutEffect) pour éviter double appel et sliding
      windowRef.current.setFocus().catch(() => {});
      windowRef.current.show().catch(() => {});
    };
    initFloatingWindow();
  }, []);

  useEffect(() => {
    return () => {
      if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
      if (menuCloseTimeoutRef.current) clearTimeout(menuCloseTimeoutRef.current);
    };
  }, []);

  // Listen to recording events from Tauri
  useEffect(() => {
    const unlistenStarted = listen("recording_started", () => setVoiceState("recording"));
    const unlistenStopped = listen("recording_stopped", () => setVoiceState("processing"));
    const unlistenReady = listen("transcription_ready", () => {
      setVoiceState("success");
      setTimeout(() => setVoiceState("idle"), 1500);
    });
    const unlistenError = listen("transcription_error", () => setVoiceState("idle"));

    return () => {
      const run = (p: Promise<() => void>) => p.then((u) => { try { u(); } catch { /* listener already removed */ } }).catch(() => {});
      run(unlistenStarted);
      run(unlistenStopped);
      run(unlistenReady);
      run(unlistenError);
    };
  }, []);

  const layoutMode: FloatingLayoutMode = isMenuOpen || isMenuClosing ? "menu" : "pill";
  useFloatingWindowBounds(layoutMode, positionReady, centerXRef, windowYRef);

  const keepWindowInteractive = () => {
    invoke('set_window_click_through', { ignore: false }).catch(console.error);
    windowRef.current.setFocus().catch(() => {});
  };
  useEffect(() => {
    keepWindowInteractive();
  }, []);

  // Réaffirmer focus + non click-through après chaque changement de layout (évite flash/transparence 1 frame)
  useLayoutEffect(() => {
    if (!positionReady) return;
    keepWindowInteractive();
  }, [layoutMode, positionReady]);

  // Donner le focus à la fenêtre quand le curseur entre dans ses bounds (macOS n'envoie pas hover sinon)
  useEffect(() => {
    const id = setInterval(() => {
      invoke("focus_floating_if_cursor_inside").catch(() => {});
    }, 120);
    return () => clearInterval(id);
  }, []);

  const _handleModeClick = (mode: Mode) => {
    const modeConfig = modes.find(m => m.id === mode);
    if (modeConfig) {
      handleModeSelect(modeConfig);
    }
  };
  void _handleModeClick;

  // Set initial mode prompt on mount
  useEffect(() => {
    if (selectedModeConfig) {
      api.modes.setActivePrompt(selectedModeConfig.systemPrompt, selectedModeConfig.id).catch(console.error);
    }
  }, [selectedModeConfig]);

  // Attach wheel event to mode dot (only when menu is closed)
  useEffect(() => {
    const dot = dotRef.current;
    if (!dot || isMenuOpen) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (modes.length === 0) return;
      
      const currentIndex = modes.findIndex(m => m.id === selectedMode);
      if (currentIndex === -1) return;
      
      let newIndex = currentIndex;
      if (e.deltaY < 0) {
        newIndex = Math.max(0, currentIndex - 1);
      } else if (e.deltaY > 0) {
        newIndex = Math.min(modes.length - 1, currentIndex + 1);
      }
      const newMode = modes[newIndex];
      if (newMode && newMode.id !== selectedMode) {
        setSelectedMode(newMode.id as Mode);
        setSelectedModeConfig(newMode);
        api.modes.setActivePrompt(newMode.systemPrompt, newMode.id).catch(console.error);
      }
    };

    dot.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      dot.removeEventListener('wheel', handleWheel);
    };
  }, [selectedMode, isMenuOpen, modes]);

  // Close menu when window loses focus (click outside to another window)
  useEffect(() => {
    let unlisten: (() => void) | null = null;
    let cancelled = false;

    const setupListener = async () => {
      const { listen } = await import("@tauri-apps/api/event");
      const u = await listen("tauri://blur", () => {
        if (isMenuOpen) {
          if (leaveTimeoutRef.current) {
            clearTimeout(leaveTimeoutRef.current);
            leaveTimeoutRef.current = null;
          }
          setIsMenuOpen(false);
          setIsHovered(false);
        }
      });
      if (!cancelled) unlisten = u;
      else u();
    };

    setupListener().catch(() => {});

    return () => {
      cancelled = true;
      if (unlisten) {
        try {
          unlisten();
        } catch {
          // ignore if already removed
        }
      }
    };
  }, [isMenuOpen]);

  // Close menu on click outside (inside the window: pill, padding, etc.)
  // Ne pas fermer si le clic est sur la pill/dot : handleDotClick gère le toggle (fermeture fluide).
  useEffect(() => {
    if (!isMenuOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (pillRef.current?.contains(target)) return;
      if (menuRef.current && !menuRef.current.contains(target)) {
        if (leaveTimeoutRef.current) {
          clearTimeout(leaveTimeoutRef.current);
          leaveTimeoutRef.current = null;
        }
        setIsMenuOpen(false);
        setIsHovered(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [isMenuOpen]);

  // Focus first menu item when menu opens; Escape closes and returns focus to dot; focus trap (Tab cycles)
  useEffect(() => {
    if (!isMenuOpen) return;
    const menuEl = menuRef.current;
    if (menuEl) {
      const focusables = menuEl.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      first?.focus();

      const handleMenuKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setIsMenuOpen(false);
          dotRef.current?.focus({ preventScroll: true });
          return;
        }
        if (e.key !== "Tab" || focusables.length === 0) return;
        const target = e.target as HTMLElement;
        if (e.shiftKey) {
          if (target === first) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (target === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      };
      menuEl.addEventListener("keydown", handleMenuKeyDown);
      return () => menuEl.removeEventListener("keydown", handleMenuKeyDown);
    }
  }, [isMenuOpen]);

  const openSettingsToApi = async () => {
    setShowApiKeyPrompt(false);
    try {
      const main = await Window.getByLabel("main");
      if (main) {
        await main.show();
        await main.setFocus();
      }
      await emit("open-settings-section", "api");
    } catch (e) {
      console.error(e);
    }
  };

  const handleVoicePress = () => {
    if (voiceState === "idle") {
      if (!hasApiKey) {
        setShowApiKeyPrompt(true);
        return;
      }
      if (selectedModeConfig) {
        invoke('set_active_prompt', { prompt: selectedModeConfig.systemPrompt, mode: selectedModeConfig.id }).catch(console.error);
      }
      invoke('start_recording').catch(console.error);
    } else if (voiceState === "recording") {
      api.recording.stop().catch(console.error);
    } else if (voiceState === "processing") {
      invoke('cancel_transcription').catch(console.error);
      setVoiceState("idle");
    }
  };

  const handleModeSelect = (mode: ModeConfig) => {
    setSelectedMode(mode.id as Mode);
    setSelectedModeConfig(mode);
    setIsMenuOpen(false);
    api.modes.setActivePrompt(mode.systemPrompt, mode.id).catch(console.error);
  };

  const MENU_CLOSE_COOLDOWN_MS = 320;

  const handleDotClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = Date.now();
    const cooldownElapsed = now - menuCloseCooldownRef.current;
    if (isMenuClosing) return;
    if (isMenuOpen) {
      setIsMenuClosing(true);
      if (menuCloseTimeoutRef.current) clearTimeout(menuCloseTimeoutRef.current);
      menuCloseTimeoutRef.current = setTimeout(() => {
        menuCloseCooldownRef.current = Date.now();
        menuCloseTimeoutRef.current = null;
        setIsMenuOpen(false);
        setIsMenuClosing(false);
      }, 180);
      return;
    }
    if (cooldownElapsed < MENU_CLOSE_COOLDOWN_MS) return;
    keepWindowInteractive();
    loadHasApiKey();
    invoke("menu_bounds_log", { line: "FRONT handleDotClick -> setIsMenuOpen(true)" }).catch(() => {});
    setIsMenuOpen(true);
  };

  // Annuler le leave timeout quand on entre dans le menu ou le pont (évite micro-resize au hover menu)
  const cancelLeaveAndKeepHover = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    setIsHovered(true);
  };

  // Voice visible: hover sur la pill OU menu ouvert/fermeture OU enregistrement en cours
  const isHoverOrActive = isHovered || isMenuOpen || isMenuClosing || voiceState !== "idle";
  const scale = isHoverOrActive ? 1 : 0.5;

  // En mode menu, garder la pill dans un slot fixe (largeur contenu mode pill) pour éviter un saut si le redimensionnement natif est en retard
  const pillSlotWidth = fw.expandedWidth;

  return (
    <div
      className="floating-bar-container"
      style={{ padding: fw.bouncePadding, overflow: "visible", boxSizing: "border-box" }}
    >
      <div 
        ref={containerRef}
        className="relative flex flex-col items-center"
        style={{
          overflow: "visible",
          pointerEvents: "none",
          width: layoutMode === "menu" ? "100%" : undefined,
        }}
      >
        <div
          className="relative z-0 flex"
          style={{
            pointerEvents: "none",
            transformOrigin: "top center",
            justifyContent: layoutMode === "menu" ? "flex-start" : "center",
            width: layoutMode === "menu" ? "100%" : undefined,
            alignSelf: layoutMode === "menu" ? "stretch" : undefined,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              width: layoutMode === "menu" ? pillSlotWidth : undefined,
              minWidth: layoutMode === "menu" ? pillSlotWidth : undefined,
            }}
          >
          <div
            ref={pillRef}
            onMouseEnter={() => {
              if (leaveTimeoutRef.current) {
                clearTimeout(leaveTimeoutRef.current);
                leaveTimeoutRef.current = null;
              }
              setIsHovered(true);
              keepWindowInteractive();
            }}
            onMouseLeave={() => {
              leaveTimeoutRef.current = setTimeout(() => {
                leaveTimeoutRef.current = null;
                setIsHovered(false);
              }, fw.leaveDelayMs);
            }}
            className={cn(
              "floating-pill relative z-[10] flex items-center overflow-visible",
              voiceState === "processing" ? "bg-black/90 border border-white/10" : "bg-black border border-white/5",
              "hover:bg-black",
              voiceState === "success" && "animate-pulse-success"
            )}
            style={{
              width: `${fw.expandedWidth}px`,
              height: `${fw.pillSize}px`,
              borderRadius: `${fw.pillSize / 2}px`,
              paddingLeft: "12px",
              paddingRight: "6px",
              justifyContent: "flex-end",
              transform: `scale(${scale})`,
              transformOrigin: "top center",
              pointerEvents: "auto",
              transition: "transform 200ms ease-out",
            }}
          >
            <div 
              onClick={isHoverOrActive ? handleVoicePress : undefined}
              className={isHoverOrActive ? "cursor-pointer" : ""}
              style={{
                ...(isHoverOrActive ? {} : { position: "absolute", left: 0, top: 0, visibility: "hidden" as const }),
                width: "48px",
                minWidth: 0,
                height: "16px",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                opacity: isHoverOrActive ? 1 : 0,
                pointerEvents: isHoverOrActive ? "auto" : "none",
                marginRight: "10px",
                marginLeft: "auto",
              }}
            >
              <VoiceButton 
                state={voiceState}
                onPress={handleVoicePress}
                size="icon"
                variant="ghost"
                className="h-[16px] w-[48px] border-0 bg-transparent hover:bg-transparent p-0 m-0"
                waveformClassName="!bg-transparent -translate-y-px"
                waveformUpdateRate={16}
              />
            </div>

            <div 
              ref={dotRef}
              tabIndex={0}
              role="button"
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
              onClick={handleDotClick}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (isMenuClosing) return;
                  if (isMenuOpen) {
                    setIsMenuClosing(true);
                    if (menuCloseTimeoutRef.current) clearTimeout(menuCloseTimeoutRef.current);
                    menuCloseTimeoutRef.current = setTimeout(() => {
                      menuCloseTimeoutRef.current = null;
                      setIsMenuOpen(false);
                      setIsMenuClosing(false);
                      menuCloseCooldownRef.current = Date.now();
                    }, 180);
                  } else if (Date.now() - menuCloseCooldownRef.current >= MENU_CLOSE_COOLDOWN_MS) {
                    setIsMenuOpen(true);
                  }
                }
              }}
              className={cn(
                "w-[6px] h-[6px] rounded-full flex-shrink-0",
                isMenuOpen ? "cursor-pointer" : "cursor-ns-resize",
                "hover:scale-[1.4] active:scale-110",
                "transition-[transform,box-shadow] duration-200 ease-out",
                voiceState === "idle" && !isHoverOrActive && "animate-breathe"
              )}
              style={{
                backgroundColor: selectedModeConfig?.color ?? "#10b981",
                boxShadow: `0 0 8px 1px ${selectedModeConfig?.color ?? "#10b981"}40`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = `0 0 6px 1px ${selectedModeConfig?.color ?? "#10b981"}60`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = `0 0 8px 1px ${selectedModeConfig?.color ?? "#10b981"}40`;
              }}
            />
          </div>
          </div>
        </div>

        {(isMenuOpen || isMenuClosing) && (
          <div
            className="absolute left-0 right-0 z-[40]"
            style={{ top: "100%", height: "4px", marginTop: "-2px", pointerEvents: "auto" }}
            onMouseEnter={cancelLeaveAndKeepHover}
            aria-hidden
          />
        )}

        {showApiKeyPrompt && !isMenuOpen && (
          <div
            className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 z-50 pointer-events-auto text-center"
            role="alert"
          >
            <p className="text-[11px] text-white/80">
              <button
                type="button"
                onClick={openSettingsToApi}
                className="underline hover:no-underline text-white"
                aria-label="Configure API key"
              >
                Configurer la clé API
              </button>
            </p>
          </div>
        )}

        {/* Menu : une seule condition (isMenuOpen || isMenuClosing), entrée en fade-in */}
        {(isMenuOpen || isMenuClosing) && (
          <div 
            ref={menuRef}
            role="menu"
            onMouseEnter={cancelLeaveAndKeepHover}
            className={cn(
              "absolute top-full mt-2 flex flex-col gap-1 py-2.5 px-2",
              "bg-black/95 border border-white/[0.06] rounded-lg z-50 backdrop-blur-sm",
              "scrollbar-thin overflow-y-auto overflow-x-hidden",
              "floating-menu-transition",
              isMenuClosing ? "floating-menu-closing" : "floating-menu-open floating-menu-enter",
            )}
            style={{
              width: fw.menuWidth,
              minWidth: 0,
              maxWidth: "100%",
              maxHeight: `min(${fw.menuHeight}px, 60vh)`,
              boxShadow: "0 2px 12px rgba(0, 0, 0, 0.12)",
              left: "50%",
              transform: "translateX(-50%)",
              pointerEvents: isMenuClosing ? "none" : "auto",
              scrollbarGutter: "stable",
            }}
          >
            {modes.length === 0 ? (
              <div className="px-3 py-2 text-xs text-white/50">Chargement…</div>
            ) : (
            modes.map((mode, i) => (
              <button
                key={mode.id}
                role="menuitem"
                onClick={() => handleModeSelect(mode)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-left",
                  "text-xs text-white/90 transition-colors duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                  "hover:bg-white/10",
                  "floating-menu-enter",
                  selectedMode === mode.id && "bg-white/10"
                )}
                style={{
                  transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
                  animationDelay: `${i * 28}ms`,
                  animationDuration: "220ms",
                }}
              >
                <div
                  className="shrink-0 rounded-full"
                  style={{
                    width: 6,
                    height: 6,
                    minWidth: 6,
                    minHeight: 6,
                    backgroundColor: mode.color,
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{mode.name}</div>
                  <div className="text-[10px] text-white/50 truncate">{mode.description}</div>
                </div>
              </button>
            )))
            }
          </div>
        )}
      </div>
    </div>
  );
}
