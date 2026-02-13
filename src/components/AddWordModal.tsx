import { useState } from "react";
import { X, Check, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { ToggleSwitch } from "./SettingsModal";

export type AddWordPayload = {
  word: string;
  type: string;
  pronunciation?: string;
  misspellings?: string[];
};

interface AddWordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (payload: AddWordPayload) => Promise<void>;
}

const DEFAULT_TYPE = "Custom";

export function AddWordModal({ isOpen, onClose, onAdd }: AddWordModalProps) {
  const [word, setWord] = useState("");
  const [correctMisspelling, setCorrectMisspelling] = useState(false);
  const [misspelling, setMisspelling] = useState("");
  const [correctSpelling, setCorrectSpelling] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (correctMisspelling) {
      if (!misspelling.trim() || !correctSpelling.trim()) {
        setError("Misspelling and correct spelling are required");
        return;
      }
    } else {
      if (!word.trim()) {
        setError("Word cannot be empty");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (correctMisspelling) {
        await onAdd({
          word: correctSpelling.trim(),
          type: DEFAULT_TYPE,
          misspellings: [misspelling.trim()],
        });
      } else {
        await onAdd({ word: word.trim(), type: DEFAULT_TYPE });
      }
      resetAndClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setWord("");
    setCorrectMisspelling(false);
    setMisspelling("");
    setCorrectSpelling("");
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0c0c0c] border border-black/[0.06] dark:border-white/[0.06] rounded-lg shadow-md w-full max-w-md mx-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.06]">
          <h2 className="text-xl font-bold text-black dark:text-white">
            Add to vocabulary
          </h2>
          <button
            onClick={resetAndClose}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/30 transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 text-red-700 dark:text-red-400 text-sm">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-1.5 text-sm font-medium text-black dark:text-white">
              Correct a misspelling
              <span className="text-muted-foreground" title="When on, define a form that is often misrecognized and the correct form to use.">
                <Info size={14} />
              </span>
            </label>
            <ToggleSwitch
              checked={correctMisspelling}
              onChange={setCorrectMisspelling}
            />
          </div>

          {correctMisspelling ? (
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Misspelling
                </label>
                <input
                  type="text"
                  value={misspelling}
                  onChange={(e) => setMisspelling(e.target.value)}
                  placeholder="e.g. Whispr"
                  className="w-full px-4 py-2.5 rounded-lg bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.08] dark:border-white/[0.08] focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-sm"
                />
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-lg">→</span>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Correct spelling
                </label>
                <input
                  type="text"
                  value={correctSpelling}
                  onChange={(e) => setCorrectSpelling(e.target.value)}
                  placeholder="e.g. Wispr"
                  className="w-full px-4 py-2.5 rounded-lg bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.08] dark:border-white/[0.08] focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-sm"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Word *
              </label>
              <input
                type="text"
                value={word}
                onChange={(e) => setWord(e.target.value)}
                placeholder="Add a new word"
                autoFocus
                className="w-full px-4 py-2.5 rounded-lg bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.08] dark:border-white/[0.08] focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-sm font-semibold"
              />
              <p className="text-[11px] text-muted-foreground/60 mt-1.5">
                The word to add to the transcription dictionary
              </p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm transition-all",
                isSubmitting
                  ? "bg-black/10 dark:bg-white/10 text-muted-foreground cursor-not-allowed"
                  : "bg-black dark:bg-white text-white dark:text-black hover:opacity-90 transition-opacity"
              )}
            >
              {isSubmitting ? (
                "Adding..."
              ) : (
                <>
                  <Check size={16} />
                  Add word
                </>
              )}
            </button>
            <button
              type="button"
              onClick={resetAndClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-lg font-bold text-sm bg-black/5 dark:bg-white/5 text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
