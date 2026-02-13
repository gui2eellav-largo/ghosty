import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/api/tauri";
import { IconButton } from "./ui/icon-button";

const HISTORY_MAX = 5;

const TEXTAREA_CLASS =
  "w-full min-h-[240px] p-2.5 pb-9 rounded border border-border bg-muted/30 font-mono text-[11px] leading-relaxed whitespace-pre-wrap resize-y focus:border-foreground/20 focus:outline-none focus:ring-1 focus:ring-foreground/10 text-foreground placeholder:text-muted-foreground";

export interface SystemPromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  onBlur?: (currentValue: string) => void;
  onImproveError?: (message: string) => void;
}

export const SystemPromptEditor = ({
  value,
  onChange,
  placeholder,
  disabled = false,
  onBlur,
  onImproveError,
}: SystemPromptEditorProps) => {
  const [promptHistory, setPromptHistory] = useState<string[]>([]);
  const [lastImprovedResult, setLastImprovedResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const canImprove =
    !disabled &&
    !isLoading &&
    value.trim() !== "" &&
    value !== lastImprovedResult;

  const canUndo = !disabled && !isLoading && promptHistory.length > 0;

  const handleImprove = useCallback(async () => {
    if (!canImprove) return;
    const current = value;
    setPromptHistory((prev) => [...prev.slice(-(HISTORY_MAX - 1)), current]);
    setIsLoading(true);
    setLastImprovedResult(null);
    try {
      const improved = await api.llm.improveSystemPrompt(current);
      onChange(improved);
      setLastImprovedResult(improved);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      onImproveError?.(message);
    } finally {
      setIsLoading(false);
    }
  }, [canImprove, value, onChange, onImproveError]);

  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    const prev = promptHistory[promptHistory.length - 1];
    if (prev === undefined) return;
    setPromptHistory((h) => h.slice(0, -1));
    onChange(prev);
    setLastImprovedResult(null);
  }, [canUndo, promptHistory, onChange]);

  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => onBlur?.(value)}
        placeholder={placeholder}
        disabled={disabled}
        spellCheck={false}
        className={TEXTAREA_CLASS}
      />
      <div
        className={cn(
          "absolute bottom-2 right-2 flex items-center gap-0.5",
          disabled && "pointer-events-none opacity-50"
        )}
      >
        <IconButton
          icon={<Sparkles size={12} />}
          aria-label="Improve prompt"
          title="Improve prompt"
          size="sm"
          disabled={!canImprove}
          onClick={handleImprove}
          className="opacity-70 hover:opacity-100 disabled:opacity-40"
        />
        <IconButton
          icon={<Undo2 size={12} />}
          aria-label="Undo"
          title="Undo"
          size="sm"
          disabled={!canUndo}
          onClick={handleUndo}
          className="opacity-70 hover:opacity-100 disabled:opacity-40"
        />
      </div>
      <AnimatePresence>
        {isLoading && (
          <motion.div
            className="absolute inset-0 rounded border border-border bg-muted/50 backdrop-blur-[2px] flex items-center justify-center cursor-wait"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="w-8 h-8 rounded-full border-2 border-foreground/20 border-t-foreground/60"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
