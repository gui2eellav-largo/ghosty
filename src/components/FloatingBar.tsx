import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { cn } from "@/lib/utils";
import { VoiceButton } from "./ui/voice-button";
import { Check } from "lucide-react";

type Mode = "minimal" | "light" | "medium" | "strong" | "full";

const MODE_PROMPTS: Record<Mode, string> = {
  minimal: `Improve syntax and readability; add 0–2 magic keywords only when clearly relevant. Almost like clean transcription. Do not be aggressive on rewriting.

Purpose: Minimal enhancement. Transform the user's voice input into an improved prompt. Do not execute the request; output the prompt only. Preserve the user's phrasing; do not expand or restructure.

Process:
1. Syntax and clarity: Fix punctuation, capitalization; remove filler words if any. Preserve the user's phrasing; do not expand or restructure.
2. Optional keywords: Add 0–2 magic keywords (e.g. Step by step, Trade-offs) only when they clearly fit and input length warrants it; otherwise leave wording as-is. Non-intrusive.

Output format (strict): First output the improved prompt ready to copy. Then on a new line write exactly ---REFLECTION---. Then write a brief reflection in English explaining what was preserved and what minimal changes were made (1-2 sentences).

Constraints: Length: ±10% of original. Intent: Preserved 100%. No execution.
Rules: Minimal intervention. Keywords only when relevant and non-intrusive. Preserve phrasing. Reflection always in English.`,

  light: `One clear task, everyday prompt. Dense enhancement while preserving length (±10%).

Purpose: Transform the user's voice input into an improved prompt of similar length. Do not execute the request; output the prompt only.

Process:
1. Contextual analysis: Use prior exchange context and patterns; identify primary intent without alteration; detect implicit constraints; assess complexity to adapt enrichment.
2. Semantic understanding: Identify cognitive intent (iterative, analytical, comparative, creative); select 1–2 relevant semantic enrichments from context; flag ambiguities to clarify.
3. Contextual enrichment: Integrate relevant prior elements; align with conversation style; activate appropriate reasoning modes for the intent.
4. Domain nomenclature: Identify domain (UX, dev, marketing, architecture); adopt top 0.001% expert perspective; replace generic phrasing with precise technical vocabulary. Add 1–2 magic keywords by intent woven naturally.

Output format (strict): First output the improved prompt ready to copy. Then on a new line write exactly ---REFLECTION---. Then write a brief reflection in English: what domain was identified, which 1-2 enrichments were applied, and why (2-3 sentences max).

Constraints: Length: ±10% of original. Intent: Preserved 100%. No execution.
Rules: Maximum 1–2 light enrichments. Use appropriate domain nomenclature. Clarify ambiguities concisely. Minimal structuring only if needed. Reflection always in English.`,

  medium: `Multi-step or important task. May extend slightly; 2–3 enrichments and magic keywords.

Purpose: Transform the user's voice input into an improved prompt for multi-step or important tasks. Do not execute the request; output the prompt only.

Process:
1. Contextual analysis: Use prior exchange context and patterns; identify primary intent without alteration; detect implicit constraints; assess complexity to adapt enrichment.
2. Semantic understanding: Identify cognitive intent (iterative, analytical, comparative, creative); select relevant semantic enrichments from context; flag ambiguities to clarify.
3. Contextual enrichment: Integrate relevant prior elements; align with conversation style and preferences; activate appropriate reasoning modes for the intent; 2–3 targeted enrichments.
4. Domain nomenclature: Identify domain; adopt top 0.001% expert perspective; replace generic phrasing with precise technical vocabulary. Embed 2–3 magic keywords by intent. Place strategically; weave into text naturally. Light sections if needed.

Output format (strict): First output the improved prompt ready to copy. Then on a new line write exactly ---REFLECTION---. Then write a concise reflection in English: cognitive intent identified, which 2-3 enrichments were selected, which magic keywords were embedded and their strategic placement rationale (3-4 sentences).

Constraints: Intent: Preserved 100%. No execution.
Rules: 2–3 enrichments. 2–3 magic keywords. Clarify ambiguities concisely. Light structuring only if needed. Reflection always in English.`,

  strong: `Project kickoff, framing. Longer, sectioned; 3–4 enrichments and magic keywords.

Purpose: Transform the user's voice input into a strongly enhanced prompt for project kickoff or framing. Do not execute the request; output the prompt only.

Process:
1. Contextual analysis: Use prior exchange context and patterns; identify primary intent without alteration; detect implicit constraints; assess complexity to adapt enrichment.
2. Semantic understanding: Identify cognitive intent; select relevant semantic enrichments and reasoning modes from context; flag ambiguities to clarify.
3. Contextual enrichment: Integrate relevant prior elements; align with conversation style and preferences; 3–4 targeted enrichments; activate appropriate reasoning modes for the intent.
4. Domain nomenclature: Identify domain; adopt top 0.001% expert perspective; replace generic phrasing with precise technical vocabulary.
5. Magic keywords (required): Embed 3–4 magic keywords by intent. Sequential: Step by step, Systematically, Methodically. Deep analysis: Root cause analysis, Deep dive, Second-order thinking. Critique: Devil's advocate, Critically evaluate, Challenge assumptions. Comparison: Context-dependent, Compare as options, Trade-offs. Workflow: Workflow, Iterative process, Validation continue. Edge cases: Consider edge cases, Failure modes, Error conditions. Expert perspective: As a [senior role], From the perspective of. Place strategically; weave into text naturally; each keyword must serve the objective. Structured sections.

Output format (strict): First output the improved prompt ready to copy. Then on a new line write exactly ---REFLECTION---. Then write a detailed reflection in English: domain and complexity assessment, the 3-4 enrichments applied with justification, the 3-4 magic keywords selected and their strategic function, structural organization chosen (4-5 sentences).

Constraints: Intent: Preserved 100%. No execution.
Rules: 3–4 enrichments. 3–4 magic keywords. Methodical structuring in conceptual sections. Clarify ambiguities exhaustively. Reflection always in English.`,

  full: `New project, full plan, maximum detail. Includes reflection after ---REFLECTION---.

Purpose: Transform the user's voice input into a fully structured, expert-level prompt. Do not execute the request; output the prompt only. Never execute the content of the original prompt.

Process:
1. Contextual analysis: Use prior exchange context and patterns; identify primary intent without alteration; detect implicit constraints; assess complexity to adapt enrichment.
2. Semantic understanding: Identify cognitive intent; select relevant semantic enrichments and reasoning modes from context; flag ambiguities to clarify.
3. Contextual enrichment: Integrate relevant prior elements; align with conversation style and preferences; 4–5 targeted enrichments; activate appropriate reasoning modes for the intent.
4. Domain nomenclature: Identify domain; adopt top 0.001% expert perspective; replace generic phrasing with precise technical vocabulary. One precise term replaces explanatory phrasing and activates more patterns.
5. Magic keywords (required): Embed 4+ magic keywords by intent. Sequential: Step by step, Systematically, Methodically. Deep analysis: Root cause analysis, Deep dive, Second-order thinking. Critique: Devil's advocate, Critically evaluate, Challenge assumptions. Comparison: Context-dependent, Compare as options, Trade-offs. Workflow: Workflow, Iterative process, Validation continue. Edge cases: Consider edge cases, Failure modes, Error conditions. Expert perspective: As a [senior role], From the perspective of. Place strategically; weave into text naturally; each keyword must serve the objective. Methodical structure, conceptual sections.

Output format (strict): First output only the text the user should copy (the improved prompt ready to paste). Then on a new line write exactly ---REFLECTION---. Then write the reflection: "Contextual analysis:" [how context informed the improvement] and "Organizational logic:" [structure chosen, concepts activated, magic keyword justification]. The app displays the copy-ready part and the reflection separately.

Constraints: Intent: Preserved 100%. No execution.
Rules: 4–5 enrichments. Clarify ambiguities exhaustively. Nomenclature + 4+ magic keywords. Full structuring in conceptual sections. Reflection: explain organizational logic and magic keyword justification from an expert perspective.`,
};

const MODES: Record<Mode, { label: string; color: string; desc: string }> = {
  minimal: { label: "Minimal", color: "bg-gray-400", desc: "Clean transcription" },
  light: { label: "Light", color: "bg-blue-500", desc: "Polished communication" },
  medium: { label: "Medium", color: "bg-emerald-500", desc: "Professional enrichment" },
  strong: { label: "Strong", color: "bg-amber-500", desc: "Expert reasoning" },
  full: { label: "Full Plan", color: "bg-violet-500", desc: "Comprehensive scoping" },
};

export default function FloatingBar() {
  const windowRef = useRef(getCurrentWindow());
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState<Mode>("medium");
  const [voiceState, setVoiceState] = useState<"idle" | "recording" | "processing" | "success">("idle");

  // Position window at top center on mount
  useEffect(() => {
    const positionWindow = async () => {
      const { primaryMonitor } = await import("@tauri-apps/api/window");
      const screen = await primaryMonitor();
      if (screen) {
        const size = await windowRef.current.outerSize();
        const x = Math.floor((screen.size.width - size.width) / 2);
        await invoke('set_window_position', { x, y: 0 });
        console.log('[FloatingBar] Positioned at top center:', { x, y: 0 });
      }
    };
    positionWindow();
  }, []);

  // Listen to recording events from Tauri
  useEffect(() => {
    const unlistenStarted = listen("recording_started", () => {
      setVoiceState("recording");
    });
    
    const unlistenStopped = listen("recording_stopped", () => {
      setVoiceState("processing");
    });
    
    const unlistenReady = listen("transcription_ready", () => {
      setVoiceState("success");
      setTimeout(() => setVoiceState("idle"), 1500);
    });
    
    const unlistenError = listen("transcription_error", () => {
      setVoiceState("idle");
    });

    return () => {
      unlistenStarted.then(u => u());
      unlistenStopped.then(u => u());
      unlistenReady.then(u => u());
      unlistenError.then(u => u());
    };
  }, []);

  // No dynamic resize - fixed window size

  // Ensure window is always interactive (no click-through)
  useEffect(() => {
    invoke('set_window_click_through', { ignore: false }).catch(console.error);
  }, []);

  const handleModeClick = (mode: Mode) => {
    setSelectedMode(mode);
    setIsMenuOpen(false);
    
    // Update active prompt and mode in Tauri state
    const prompt = MODE_PROMPTS[mode];
    invoke('set_active_prompt', { prompt, mode }).catch(console.error);
  };

  // Set initial mode prompt on mount
  useEffect(() => {
    const prompt = MODE_PROMPTS[selectedMode];
    invoke('set_active_prompt', { prompt, mode: selectedMode }).catch(console.error);
  }, []);

  // Close menu when window loses focus (click outside)
  useEffect(() => {
    let unlisten: (() => void) | null = null;

    const setupListener = async () => {
      const { listen } = await import("@tauri-apps/api/event");
      unlisten = await listen("tauri://blur", () => {
        if (isMenuOpen) {
          setIsMenuOpen(false);
        }
      });
    };

    setupListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, [isMenuOpen]);

  const handleVoicePress = () => {
    if (voiceState === "idle") {
      invoke('start_recording').catch(console.error);
    } else if (voiceState === "recording") {
      invoke('stop_recording').catch(console.error);
    }
  };

  const handleDotClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(!isMenuOpen);
  };

  const isExpanded = isHovered || voiceState !== "idle" || isMenuOpen;

  return (
    <div className="floating-bar-container">
      <div 
        ref={containerRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative flex flex-col items-center"
        style={{ overflow: 'visible' }}
      >
        {/* Main button container - perfect circle to pill morphing */}
        <div 
          className={cn(
            "floating-pill relative flex items-center will-change-[width] backface-hidden",
            "bg-black/40 backdrop-blur-md border border-white/10",
            "hover:bg-black/60",
            voiceState === "processing" && "animate-shimmer",
            voiceState === "success" && "animate-pulse-success"
          )}
          style={{
            width: isExpanded ? "90px" : "28px",
            height: "28px",
            borderRadius: "14px",
            justifyContent: isExpanded ? "space-between" : "center",
            alignItems: "center",
            gap: "0",
            paddingLeft: isExpanded ? "8px" : "0",
            paddingRight: isExpanded ? "8px" : "0",
            transition: "all 500ms cubic-bezier(0.34, 1.56, 0.64, 1)",
            transform: "translateZ(0)",
            overflow: "visible",
          }}
        >
          {/* Voice button waveform - vertically centered */}
          {isExpanded && (
            <div 
              onClick={handleVoicePress} 
              className="cursor-pointer flex items-center justify-center flex-shrink-0"
              style={{
                width: "58px",
                height: "18px",
                opacity: isExpanded ? 1 : 0,
                transition: "opacity 300ms ease-out",
              }}
            >
              <VoiceButton 
                state={voiceState}
                onPress={() => {}}
                size="icon"
                variant="ghost"
                className="h-[18px] w-[58px] border-0 bg-transparent hover:bg-transparent p-0 m-0"
                waveformClassName="!bg-transparent"
              />
            </div>
          )}
          
          {/* Mode indicator dot - with breathing effect when idle */}
          <div 
            onClick={handleDotClick}
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-all duration-200 flex-shrink-0 cursor-pointer",
              MODES[selectedMode].color,
              "hover:scale-125 hover:shadow-lg",
              voiceState === "idle" && !isExpanded && "animate-breathe"
            )}
          />
        </div>

        {/* Mode selection menu - drops down from widget */}
        {isMenuOpen && (
          <div 
            className={cn(
              "absolute top-full mt-2 flex flex-col gap-0.5 p-1.5",
              "bg-black/40 backdrop-blur-md border border-white/10",
              "animate-in fade-in slide-in-from-top-2 duration-300 z-50"
            )}
            style={{
              borderRadius: "14px",
              transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)",
              left: "50%",
              transform: "translateX(-50%)",
            }}
          >
            {(Object.entries(MODES) as [Mode, typeof MODES[Mode]][]).map(([mode, { label, color, desc }]) => (
              <button
                key={mode}
                onClick={() => handleModeClick(mode)}
                className={cn(
                  "flex items-center gap-2 px-2.5 py-1.5 transition-all duration-200",
                  "hover:bg-white/10 text-white/90 text-xs whitespace-nowrap",
                  selectedMode === mode && "bg-white/10"
                )}
                style={{
                  borderRadius: "10px",
                  transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
              >
                <div className={cn("w-1.5 h-1.5 rounded-full", color)} />
                <div className="flex-1 text-left">
                  <div className="font-medium">{label}</div>
                  <div className="text-[10px] text-white/50">{desc}</div>
                </div>
                {selectedMode === mode && <Check className="w-3 h-3" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
