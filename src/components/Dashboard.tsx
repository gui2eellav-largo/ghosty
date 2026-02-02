import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { LiveWaveform } from "./ui/live-waveform";
import { cn } from "@/lib/utils";
import { 
  Home, 
  BookOpen, 
  Settings, 
  HelpCircle, 
  Mic, 
  ChevronRight,
  ChevronDown,
  Clipboard,
  Trash2,
  Clock,
  Globe,
  Check,
  Eye,
  EyeOff,
  Key,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

interface TranscriptionItem {
  id: string;
  time: string;
  output: string;
  reflection: string | null;
  mode: string | null;
}

type View = "home" | "modes" | "dictionary" | "settings";
type Language = "auto" | "fr" | "en" | "es" | "de";
type Mode = "minimal" | "light" | "medium" | "strong" | "full";

const LANGUAGES: Record<Language, { label: string, flag: string }> = {
  auto: { label: "Auto-detect", flag: "✨" },
  fr: { label: "Français", flag: "🇫🇷" },
  en: { label: "English", flag: "🇺🇸" },
  es: { label: "Español", flag: "🇪🇸" },
  de: { label: "Deutsch", flag: "🇩🇪" },
};

const MODES: Record<Mode, { label: string; color: string; desc: string }> = {
  minimal: { label: "Minimal", color: "#9ca3af", desc: "Clean transcription" },
  light: { label: "Light", color: "#3b82f6", desc: "Polished communication" },
  medium: { label: "Medium", color: "#10b981", desc: "Professional enrichment" },
  strong: { label: "Strong", color: "#f59e0b", desc: "Expert reasoning" },
  full: { label: "Full Plan", color: "#8b5cf6", desc: "Comprehensive scoping" },
};

export default function Dashboard() {
  const [activeView, setActiveView] = useState<View>("home");
  const [selectedLang, setSelectedLanguage] = useState<Language>("auto");
  const [selectedMode, setSelectedMode] = useState<Mode>("medium");
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<"bottom" | "top">("bottom");
  const [dropdownCoords, setDropdownCoords] = useState({ top: 0, left: 0 });
  const [transcriptions, setTranscriptions] = useState<TranscriptionItem[]>([]);
  const [status, setStatus] = useState("Ready.");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedReflections, setExpandedReflections] = useState<Set<string>>(new Set());
  const [apiKey, setApiKey] = useState<string>("");
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [apiKeyVisible, setApiKeyVisible] = useState<boolean>(false);
  const [apiKeySaveStatus, setApiKeySaveStatus] = useState<"idle" | "validating" | "testing" | "saving" | "success" | "error">("idle");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isEditingKey, setIsEditingKey] = useState<boolean>(false);
  const [apiKeys, setApiKeys] = useState<Array<{id: string, name: string, provider: string, isActive: boolean}>>([]);
  const [keyName, setKeyName] = useState<string>("");
  const [keyProvider, setKeyProvider] = useState<string>("openai");
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

  // Calculate dropdown position (flip if not enough space below)
  const updateDropdownPosition = () => {
    if (triggerRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const dropdownHeight = 280; // Approximate height of dropdown menu
      const dropdownWidth = 280;
      const spaceBelow = window.innerHeight - triggerRect.bottom;
      const spaceAbove = triggerRect.top;

      // Determine vertical position
      let top: number;
      if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
        setDropdownPosition("top");
        top = triggerRect.top - dropdownHeight - 8;
      } else {
        setDropdownPosition("bottom");
        top = triggerRect.bottom + 8;
      }

      // Center horizontally relative to trigger
      const left = triggerRect.left + (triggerRect.width / 2) - (dropdownWidth / 2);

      setDropdownCoords({ top, left });
    }
  };

  useEffect(() => {
    if (isModeDropdownOpen) {
      updateDropdownPosition();

      // Update position on resize and scroll
      window.addEventListener("resize", updateDropdownPosition);
      window.addEventListener("scroll", updateDropdownPosition, true);

      return () => {
        window.removeEventListener("resize", updateDropdownPosition);
        window.removeEventListener("scroll", updateDropdownPosition, true);
      };
    }
  }, [isModeDropdownOpen]);

  // Check if API key exists on mount
  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      const keys = await invoke<Array<[string, string, string, boolean]>>('get_all_api_keys');
      setApiKeys(keys.map(([id, name, provider, isActive]) => ({
        id,
        name,
        provider,
        isActive
      })));
      setHasApiKey(keys.length > 0);
    } catch (error) {
      // Fallback : ancienne méthode
      try {
        const hasKey = await invoke<boolean>('has_openai_key');
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
    const unlistenReady = listen<{ output: string; reflection: string | null; mode: string | null } | string>("transcription_ready", (event) => {
      setStatus("Ready.");
      setIsProcessing(false);
      const payload = event.payload;
      const output = typeof payload === "string" ? payload : payload.output;
      const reflection = typeof payload === "string" ? null : payload.reflection;
      const mode = typeof payload === "string" ? null : payload.mode;
      
      const newItem: TranscriptionItem = {
        id: Math.random().toString(36).substring(7),
        time: new Date().toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", hour12: true }),
        output,
        reflection,
        mode
      };
      setTranscriptions(prev => [newItem, ...prev]);
    });
    const unlistenError = listen<string>("transcription_error", (event) => {
      setStatus("Ready.");
      setIsRecording(false);
      setIsProcessing(false);
      setError(event.payload);
    });

    return () => {
      unlistenStarted.then(u => u());
      unlistenStopped.then(u => u());
      unlistenReady.then(u => u());
      unlistenError.then(u => u());
    };
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const toggleReflection = (id: string) => {
    setExpandedReflections(prev => {
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
      return "La clé API ne peut pas être vide";
    }
    
    // Validation par provider
    switch (provider) {
      case "openai":
        if (!key.startsWith("sk-") && !key.startsWith("sk-proj-")) {
          return "Format OpenAI invalide : doit commencer par 'sk-' ou 'sk-proj-'";
        }
        if (key.length < 40) {
          return "Clé OpenAI trop courte : minimum 40 caractères";
        }
        if (!/^[a-zA-Z0-9\-_]+$/.test(key)) {
          return "Caractères invalides détectés";
        }
        break;
        
      case "anthropic":
        if (!key.startsWith("sk-ant-")) {
          return "Format Anthropic invalide : doit commencer par 'sk-ant-'";
        }
        if (key.length < 40) {
          return "Clé Anthropic trop courte : minimum 40 caractères";
        }
        if (!/^[a-zA-Z0-9\-_]+$/.test(key)) {
          return "Caractères invalides détectés";
        }
        break;
        
      case "custom":
        if (key.length < 10) {
          return "Clé trop courte : minimum 10 caractères";
        }
        // Pas d'autres restrictions pour custom
        break;
        
      default:
        return "Provider inconnu";
    }
    
    return null;
  };

  const handleApiKeyChange = (value: string) => {
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

  const handleProviderChange = (provider: string) => {
    setKeyProvider(provider);
    
    // Révalider la clé si elle existe
    if (apiKey.trim().length >= 10) {
      const error = validateApiKeyFormat(apiKey, provider);
      setValidationError(error);
    }
  };

  const handleSaveApiKey = async () => {
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
      await invoke('test_openai_key', { key: apiKey.trim() });
      
      // Étape 3: Enregistrement multi-clés
      setApiKeySaveStatus("saving");
      await invoke('add_api_key_entry', { 
        name: keyName.trim(), 
        provider: keyProvider,
        key: apiKey.trim() 
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
    } catch (error) {
      setApiKeySaveStatus("error");
      setError(error as string);
      setTimeout(() => {
        setApiKeySaveStatus("idle");
        setError(null);
      }, 5000);
    }
  };

  const handleDeleteApiKey = async (keyId: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cette clé API ?")) return;
    
    try {
      await invoke('remove_api_key_entry', { keyId });
      await loadApiKeys();
    } catch (error) {
      setError(error as string);
    }
  };

  const handleModeWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const modes: Mode[] = ["minimal", "light", "medium", "strong", "full"];
    const currentIndex = modes.indexOf(selectedMode);
    
    if (e.deltaY < 0) {
      const newIndex = Math.max(0, currentIndex - 1);
      setSelectedMode(modes[newIndex]);
    } else if (e.deltaY > 0) {
      const newIndex = Math.min(modes.length - 1, currentIndex + 1);
      setSelectedMode(modes[newIndex]);
    }
  };

  const handleSetActiveKey = async (keyId: string) => {
    try {
      await invoke('set_active_api_key', { keyId });
      await loadApiKeys();
    } catch (error) {
      setError(error as string);
    }
  };

  const NavItem = ({ id, label, icon: Icon }: { id: View, label: string, icon: any }) => (
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
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8 select-none">
            <div className="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.4)]" />
            <span className="text-sm font-black tracking-widest uppercase">Ghosty</span>
          </div>
          
          <nav className="space-y-1">
            <NavItem id="home" label="Home" icon={Home} />
            <NavItem id="dictionary" label="Dictionary" icon={BookOpen} />
            <NavItem id="modes" label="Style & Modes" icon={Mic} />
          </nav>
        </div>

        <div className="mt-auto p-6 space-y-1">
          <NavItem id="settings" label="Settings" icon={Settings} />
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-all">
            <HelpCircle size={18} className="opacity-70" />
            Help
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#fafafa] dark:bg-[#0c0c0c] overflow-auto">
        <div className="flex-1 max-w-3xl mx-auto w-full px-8 py-12">
          {activeView === "home" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <header className="mb-10 flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-black/90 dark:text-white/90 mb-2">
                    Welcome back, Guillaume
                  </h1>
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <span className="flex items-center gap-1.5 font-medium text-orange-500/80"><Clock size={14} /> 1 day streak</span>
                    <span>•</span>
                    <span className="flex items-center gap-1.5"><Mic size={14} className="text-blue-500" /> 10.3K words</span>
                  </div>
                </div>

                {/* Language Picker */}
                <div className="bg-white dark:bg-white/[0.03] border border-black/5 dark:border-white/5 rounded-2xl p-1 flex gap-0.5 shadow-sm shrink-0">
                  {(Object.entries(LANGUAGES) as [Language, typeof LANGUAGES['auto']][]).map(([key, { flag, label }]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedLanguage(key)}
                      title={label}
                      className={cn(
                        "px-2.5 py-1.5 rounded-xl text-[10px] font-black tracking-tighter transition-all duration-300 flex items-center gap-1.5",
                        selectedLang === key 
                          ? "bg-black dark:bg-white text-white dark:text-black shadow-md" 
                          : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5"
                      )}
                    >
                      <span className="text-xs">{flag}</span>
                      {selectedLang === key && <span>{key.toUpperCase()}</span>}
                    </button>
                  ))}
                </div>
              </header>

              {/* Primary CTA */}
              <div className="relative overflow-hidden bg-orange-50/50 dark:bg-orange-950/10 border border-orange-100 dark:border-orange-900/20 rounded-3xl p-10 mb-12 group transition-all duration-500 hover:shadow-xl hover:shadow-orange-500/5">
                <div className="relative z-10">
                  <h2 className="text-3xl font-medium tracking-tight text-orange-950 dark:text-orange-100 mb-4 leading-snug">
                    Hold <kbd className="bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 rounded-lg border border-orange-200 dark:border-orange-800/40 font-mono text-xl shadow-sm lowercase">fn</kbd> to dictate and let Ghosty format for you
                  </h2>
                  <p className="text-orange-900/60 dark:text-orange-100/40 text-base max-w-lg mb-6 leading-relaxed font-medium">
                    Ghosty transforms your vague voice input into optimized AI prompts.
                  </p>
                  
                  {/* Mode Selector Dropdown */}
                  <div className="flex justify-center mb-6">
                    <button 
                      ref={triggerRef}
                      onClick={() => setIsModeDropdownOpen(!isModeDropdownOpen)}
                      onWheel={handleModeWheel}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200",
                        "bg-white/60 dark:bg-black/40 border border-orange-200/40 dark:border-orange-800/30",
                        "hover:bg-white/80 dark:hover:bg-black/60",
                        "shadow-sm hover:shadow-md",
                        "cursor-pointer hover:cursor-ns-resize"
                      )}
                    >
                      <div 
                        className="w-2 h-2 rounded-full shadow-lg transition-all duration-300 ease-out" 
                        style={{ backgroundColor: MODES[selectedMode].color }}
                      />
                      <div className="flex flex-col items-start">
                        <span className="font-bold text-sm text-orange-950 dark:text-orange-100">
                          {MODES[selectedMode].label}
                        </span>
                        <span className="text-[10px] text-orange-900/50 dark:text-orange-100/30 font-medium">
                          {MODES[selectedMode].desc}
                        </span>
                      </div>
                      <ChevronDown 
                        size={14} 
                        className={cn(
                          "text-orange-900/40 dark:text-orange-100/40 transition-transform duration-200",
                          isModeDropdownOpen && "rotate-180"
                        )}
                      />
                    </button>

                    {/* Dropdown Menu Portal */}
                    {isModeDropdownOpen && createPortal(
                      <div 
                        ref={dropdownRef}
                        className={cn(
                          "fixed w-[280px] z-[9999]",
                          "bg-white dark:bg-[#0c0c0c] border border-orange-200/40 dark:border-orange-800/30",
                          "rounded-2xl shadow-2xl overflow-hidden",
                          dropdownPosition === "bottom" ? "animate-in fade-in slide-in-from-top-2" : "animate-in fade-in slide-in-from-bottom-2",
                          "duration-200"
                        )}
                        style={{
                          top: `${dropdownCoords.top}px`,
                          left: `${dropdownCoords.left}px`,
                        }}
                      >
                        <div className="p-2">
                          {(Object.entries(MODES) as [Mode, typeof MODES[Mode]][]).map(([key, { label, color, desc }]) => (
                            <button
                              key={key}
                              onClick={() => {
                                setSelectedMode(key);
                                setIsModeDropdownOpen(false);
                              }}
                              className={cn(
                                "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200",
                                "hover:bg-orange-50/50 dark:hover:bg-orange-950/20",
                                selectedMode === key && "bg-orange-50/80 dark:bg-orange-950/30"
                              )}
                            >
                              <div 
                                className="w-2 h-2 rounded-full shadow-lg flex-shrink-0" 
                                style={{ backgroundColor: color }}
                              />
                              <div className="flex-1 text-left min-w-0">
                                <div className="font-bold text-sm text-orange-950 dark:text-orange-100">
                                  {label}
                                </div>
                                <div className="text-[11px] text-orange-900/50 dark:text-orange-100/30 font-medium">
                                  {desc}
                                </div>
                              </div>
                              {selectedMode === key && (
                                <Check size={14} className="text-orange-600 dark:text-orange-400 flex-shrink-0" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>,
                      document.body
                    )}
                  </div>
                  
                  <div className="h-20 bg-white/40 dark:bg-black/20 rounded-2xl flex items-center px-8 border border-orange-200/30 dark:border-orange-800/20">
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
                
                <div className="absolute top-6 right-6 flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    isRecording ? "bg-orange-500 animate-ping" : "bg-orange-200 dark:bg-orange-800"
                  )} />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-orange-900/40 dark:text-orange-100/30">
                    {status}
                  </span>
                </div>
              </div>

              {/* History List */}
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/50">Today</h3>
                  {transcriptions.length > 0 && (
                    <button onClick={() => setTranscriptions([])} className="text-[10px] font-bold text-muted-foreground hover:text-red-500 flex items-center gap-1 transition-colors">
                      <Trash2 size={12} /> Clear history
                    </button>
                  )}
                </div>

                <div className="space-y-0.5">
                  {transcriptions.length === 0 ? (
                    <div className="py-12 border border-dashed border-black/[0.06] dark:border-white/[0.06] rounded-2xl flex flex-col items-center justify-center text-muted-foreground/40 gap-2">
                      <Mic size={24} className="opacity-20" />
                      <p className="text-xs font-medium uppercase tracking-widest">No activity yet</p>
                    </div>
                  ) : (
                    transcriptions.map(item => {
                      const modeColors: Record<string, string> = {
                        minimal: "bg-gray-400",
                        light: "bg-blue-500",
                        medium: "bg-emerald-500",
                        strong: "bg-amber-500",
                        full: "bg-violet-500"
                      };
                      const modeColor = item.mode ? modeColors[item.mode] || "bg-gray-400" : "bg-gray-400";
                      
                      return (
                      <div key={item.id} className="group flex gap-6 py-5 px-2 rounded-xl transition-all duration-300 hover:bg-white dark:hover:bg-white/[0.02] border-b border-black/[0.03] dark:border-white/[0.03] last:border-0 items-start">
                        <div className="flex items-center gap-2 w-16 pt-1 shrink-0">
                          <div className={`w-1 h-1 rounded-full ${modeColor} opacity-40`} />
                          <span className="text-[11px] font-medium text-muted-foreground/50 tabular-nums uppercase">
                            {item.time}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col gap-3">
                          {item.reflection && (
                            <div className="flex flex-col gap-2">
                              <button
                                onClick={() => toggleReflection(item.id)}
                                className="text-[11px] text-muted-foreground/30 hover:text-muted-foreground/50 transition-colors text-left w-fit font-medium"
                              >
                                Reflection
                              </button>
                              {expandedReflections.has(item.id) && (
                                <p className="text-[13px] text-muted-foreground/50 leading-relaxed italic">
                                  {item.reflection}
                                </p>
                              )}
                            </div>
                          )}
                          <p className="text-[15px] leading-relaxed text-black/80 dark:text-white/80 font-medium">
                            {item.output}
                          </p>
                        </div>
                        <button 
                          onClick={() => handleCopy(item.output)}
                          className="opacity-0 group-hover:opacity-100 transition-all p-2 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground shrink-0"
                          title="Copy to clipboard"
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
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <header className="mb-10 flex justify-between items-end">
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-black/90 dark:text-white/90 mb-2">
                    Dictionary
                  </h1>
                  <p className="text-muted-foreground text-sm leading-relaxed max-w-md font-medium">
                    Add acronyms, technical terms, or names to help Ghosty's transcription engine.
                  </p>
                </div>
                <button className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold text-[10px] hover:scale-[1.02] transition-all shadow-lg uppercase tracking-widest">
                  Add Word
                </button>
              </header>
              
              <div className="space-y-4">
                <div className="bg-white dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] rounded-2xl overflow-hidden shadow-sm">
                  {[
                    { word: "Tauri", type: "Framework" },
                    { word: "Rust", type: "Language" },
                    { word: "ElevenLabs", type: "Service" }
                  ].map((item, i) => (
                    <div key={item.word} className="flex items-center justify-between p-4 hover:bg-black/[0.01] dark:hover:bg-white/[0.01] border-b border-black/[0.03] dark:border-white/[0.03] last:border-0 transition-colors">
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-sm">{item.word}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40 px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/5">{item.type}</span>
                      </div>
                      <button className="text-muted-foreground/40 hover:text-red-500 transition-colors p-2">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeView === "modes" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <header className="mb-10">
                <h1 className="text-3xl font-semibold tracking-tight text-black/90 dark:text-white/90 mb-2">
                  Style & Modes
                </h1>
                <p className="text-muted-foreground text-sm font-medium">Configure how Ghosty improves your input.</p>
              </header>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { name: "Minimal", desc: "Clean transcription, minor syntax fixes", color: "#9ca3af" },
                  { name: "Light", desc: "Polished everyday communication", color: "#3b82f6" },
                  { name: "Medium", desc: "Structured, professional enrichment", color: "#10b981" },
                  { name: "Strong", desc: "Deep framing and expert reasoning", color: "#f59e0b" },
                  { name: "Full Plan", desc: "Comprehensive project scoping", color: "#8b5cf6" },
                ].map((m, i) => (
                  <div key={m.name} className="flex items-center justify-between p-5 bg-white dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] rounded-2xl group cursor-pointer hover:border-black/20 dark:hover:border-white/20 transition-all shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center relative">
                        <div className="w-2 h-2 rounded-full shadow-lg" style={{ backgroundColor: m.color }} />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm">{m.name}</h4>
                        <p className="text-[11px] text-muted-foreground font-medium opacity-60">{m.desc}</p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-all" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeView === "settings" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <header className="mb-10 text-black dark:text-white">
                <h1 className="text-3xl font-semibold tracking-tight mb-2">
                  Settings
                </h1>
              </header>
              <div className="space-y-8">
                <section>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/50 mb-4 px-2">General</h3>
                  <div className="bg-white dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] rounded-[2rem] divide-y divide-black/[0.03] dark:divide-white/[0.03] shadow-sm">
                    <div className="p-6 flex items-center justify-between">
                      <span className="text-sm font-bold opacity-80">Launch at login</span>
                      <div className="w-10 h-5 bg-black/10 dark:bg-white/10 rounded-full relative">
                        <div className="w-3.5 h-3.5 bg-white dark:bg-black/40 rounded-full absolute top-0.75 left-1 shadow-sm" />
                      </div>
                    </div>
                    <div className="p-6 flex items-center justify-between">
                      <span className="text-sm font-bold opacity-80">Auto-update app</span>
                      <div className="w-10 h-5 bg-green-500/20 rounded-full relative border border-green-500/20">
                        <div className="w-3.5 h-3.5 bg-green-500 rounded-full absolute top-0.75 right-1 shadow-sm" />
                      </div>
                    </div>
                  </div>
                </section>

                {/* API Configuration */}
                <section>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/50 mb-4 px-2">Configuration API</h3>
                  <div className="bg-white dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] rounded-[2rem] shadow-sm p-6 space-y-6">
                    
                    {/* Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center",
                          hasApiKey ? "bg-green-500/10" : "bg-orange-500/10"
                        )}>
                          <Key size={18} className={hasApiKey ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400"} />
                        </div>
                        <div>
                          <div className="font-bold text-sm">Clé API</div>
                          <div className="text-[11px] text-muted-foreground font-medium">
                            {hasApiKey ? "✓ Configurée et sécurisée" : "Non configurée"}
                          </div>
                        </div>
                      </div>
                      {hasApiKey && (
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setIsEditingKey(true)}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold transition-colors"
                          >
                            + Ajouter une clé
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Liste des clés configurées */}
                    {hasApiKey && !isEditingKey && apiKeys.length > 0 && (
                      <div className="space-y-2">
                        {apiKeys.map((key) => (
                          <div 
                            key={key.id}
                            className={cn(
                              "p-4 rounded-xl border transition-all",
                              key.isActive 
                                ? "bg-green-50/50 dark:bg-green-950/10 border-green-200/50 dark:border-green-800/30"
                                : "bg-gray-50/50 dark:bg-gray-950/10 border-gray-200/50 dark:border-gray-800/30"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                {/* Radio button */}
                                <button
                                  onClick={() => handleSetActiveKey(key.id)}
                                  className={cn(
                                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                    key.isActive
                                      ? "border-green-500 bg-green-500"
                                      : "border-gray-300 dark:border-gray-600 hover:border-green-400"
                                  )}
                                >
                                  {key.isActive && (
                                    <div className="w-2 h-2 rounded-full bg-white"></div>
                                  )}
                                </button>

                                {/* Info clé */}
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-sm">{key.name}</span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-muted-foreground uppercase tracking-wider">
                                      {key.provider}
                                    </span>
                                    {key.isActive && (
                                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-700 dark:text-green-400 uppercase tracking-wider font-bold">
                                        Active
                                      </span>
                                    )}
                                  </div>
                                  <div className="font-mono text-xs text-muted-foreground">
                                    ••••••••••••••••••••••••••••••••
                                  </div>
                                </div>
                              </div>

                              {/* Bouton supprimer */}
                              <button
                                onClick={() => handleDeleteApiKey(key.id)}
                                className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-bold transition-colors ml-3"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Input API Key */}
                    {(!hasApiKey || isEditingKey) && (
                      <div className="space-y-3">
                        {/* Nom de la clé */}
                        <div>
                          <label className="block text-xs font-bold text-muted-foreground mb-2">
                            Nom de la clé
                          </label>
                          <input
                            type="text"
                            value={keyName}
                            onChange={(e) => setKeyName(e.target.value)}
                            placeholder="Ex: Ma clé OpenAI"
                            className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 focus:outline-none text-sm transition-all"
                          />
                        </div>

                        {/* Provider */}
                        <div>
                          <label className="block text-xs font-bold text-muted-foreground mb-2">
                            Service IA
                          </label>
                          <select
                            value={keyProvider}
                            onChange={(e) => handleProviderChange(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 focus:outline-none text-sm transition-all"
                          >
                            <option value="openai">OpenAI</option>
                            <option value="anthropic">Anthropic</option>
                            <option value="custom">Personnalisé</option>
                          </select>
                        </div>

                        {/* Clé API */}
                        <div>
                          <label className="block text-xs font-bold text-muted-foreground mb-2">
                            Clé API
                          </label>
                          <div className="relative">
                            <input
                              type={apiKeyVisible ? "text" : "password"}
                              value={apiKey}
                              onChange={(e) => handleApiKeyChange(e.target.value)}
                              placeholder="sk-proj-..."
                            className={cn(
                              "w-full px-4 py-3 pr-12 rounded-xl",
                              "bg-black/5 dark:bg-white/5",
                              "border transition-all text-sm font-mono",
                              validationError 
                                ? "border-red-500/50 dark:border-red-400/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                                : apiKey.trim().length >= 40 && !validationError
                                  ? "border-green-500/50 dark:border-green-400/50 focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                                  : "border-black/10 dark:border-white/10 focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20",
                              "focus:outline-none"
                            )}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveApiKey();
                            }}
                          />
                          <button
                            onClick={() => setApiKeyVisible(!apiKeyVisible)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors"
                          >
                            {apiKeyVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                          </div>
                        </div>

                        {validationError && (
                          <div className="flex items-start gap-2 p-2.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 rounded-lg animate-in fade-in slide-in-from-top-1 duration-200">
                            <AlertCircle size={14} className="text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                            <p className="text-xs text-red-700 dark:text-red-400 font-medium">
                              {validationError}
                            </p>
                          </div>
                        )}

                        {!validationError && apiKey.trim().length >= 40 && (
                          <div className="flex items-start gap-2 p-2.5 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/30 rounded-lg animate-in fade-in slide-in-from-top-1 duration-200">
                            <CheckCircle2 size={14} className="text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                            <p className="text-xs text-green-700 dark:text-green-400 font-medium">
                              Format valide. Prêt à tester la connexion.
                            </p>
                          </div>
                        )}

                        <div className="flex gap-3">
                          <button
                            onClick={handleSaveApiKey}
                            disabled={!apiKey.trim() || !keyName.trim() || validationError !== null || ["validating", "testing", "saving"].includes(apiKeySaveStatus)}
                            className={cn(
                              "flex-1 px-4 py-3 rounded-xl font-bold text-sm transition-all",
                              "flex items-center justify-center gap-2",
                              apiKeySaveStatus === "success" && "bg-green-500 text-white",
                              apiKeySaveStatus === "error" && "bg-red-500 text-white",
                              apiKeySaveStatus === "idle" && "bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed",
                              ["validating", "testing", "saving"].includes(apiKeySaveStatus) && "bg-orange-500/50 text-white cursor-wait"
                            )}
                          >
                            {apiKeySaveStatus === "validating" && (
                              <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Validation...
                              </>
                            )}
                            {apiKeySaveStatus === "testing" && (
                              <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Test connexion...
                              </>
                            )}
                            {apiKeySaveStatus === "saving" && (
                              <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Enregistrement...
                              </>
                            )}
                            {apiKeySaveStatus === "success" && (
                              <>
                                <CheckCircle2 size={16} />
                                Clé enregistrée !
                              </>
                            )}
                            {apiKeySaveStatus === "error" && (
                              <>
                                <AlertCircle size={16} />
                                Erreur
                              </>
                            )}
                            {apiKeySaveStatus === "idle" && "Tester et enregistrer"}
                          </button>

                          {isEditingKey && (
                            <button
                              onClick={() => {
                                setIsEditingKey(false);
                                setApiKey("");
                                setValidationError(null);
                                setApiKeySaveStatus("idle");
                              }}
                              disabled={["validating", "testing", "saving"].includes(apiKeySaveStatus)}
                              className="px-4 py-3 rounded-xl font-bold text-sm transition-all bg-gray-500 text-white hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Annuler
                            </button>
                          )}
                        </div>

                        {/* Message d'erreur */}
                        {error && apiKeySaveStatus === "error" && (
                          <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 rounded-xl">
                            <p className="text-xs text-red-700 dark:text-red-400 font-medium">
                              {error}
                            </p>
                          </div>
                        )}

                        <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
                          Votre clé est testée puis stockée de manière sécurisée dans le keychain macOS. 
                          Elle n'est jamais envoyée ailleurs qu'au service d'IA configuré.
                        </p>
                      </div>
                    )}

                  </div>
                </section>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
