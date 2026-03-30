import React, { useState, useEffect, useCallback } from "react";
import { strings } from "@/lib/strings";
import { api } from "@/api/tauri";
import type { ModeConfig } from "@/types";
import { DIRECT_MODE_ID } from "@/types";
import { Copy, Loader2 } from "lucide-react";

export interface ModePlaygroundProps {
  modes: ModeConfig[];
  selectedModeId: string | null;
}

const ModePlayground = React.memo(function ModePlayground({
  modes,
  selectedModeId,
}: ModePlaygroundProps) {
  const [playgroundInput, setPlaygroundInput] = useState("");
  const [playgroundOutput, setPlaygroundOutput] = useState("");
  const [playgroundLoading, setPlaygroundLoading] = useState(false);

  useEffect(() => {
    setPlaygroundInput("");
    setPlaygroundOutput("");
  }, [selectedModeId]);

  const handlePlayground = useCallback(async () => {
    const mode = modes.find((m) => m.id === selectedModeId);
    if (!playgroundInput.trim() || !mode) return;
    setPlaygroundLoading(true);
    setPlaygroundOutput("");
    try {
      const result = await api.llm.transformText(playgroundInput, mode.systemPrompt);
      setPlaygroundOutput(result);
    } catch (e) {
      setPlaygroundOutput(strings.errors.playgroundError(String(e)));
    } finally {
      setPlaygroundLoading(false);
    }
  }, [modes, selectedModeId, playgroundInput]);

  const mode = modes.find((m) => m.id === selectedModeId);
  if (!mode || mode.id === DIRECT_MODE_ID) return null;

  return (
    <div className="border-t border-border pt-4">
      <p className="text-[11px] text-muted-foreground mb-2">
        {strings.modes.playground.title}
      </p>
      <div className="flex flex-col gap-2">
        <textarea
          value={playgroundInput}
          onChange={(e) => setPlaygroundInput(e.target.value)}
          placeholder={strings.modes.playground.placeholder}
          className="w-full min-h-[80px] p-2.5 rounded border border-border bg-muted/30 font-mono text-[11px] leading-relaxed resize-y focus:border-foreground/20 focus:outline-none focus:ring-1"
          spellCheck={false}
        />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handlePlayground}
            disabled={
              !playgroundInput.trim() || playgroundLoading
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium bg-foreground text-background hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {playgroundLoading && (
              <Loader2
                size={11}
                className="animate-spin"
              />
            )}
            {strings.modes.playground.apply}
          </button>
        </div>
        {playgroundOutput && (
          <div className="relative">
            <div className="w-full min-h-[60px] p-2.5 pr-8 rounded border border-border bg-muted/20 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-foreground">
              {playgroundOutput}
            </div>
            <button
              type="button"
              onClick={() =>
                navigator.clipboard.writeText(playgroundOutput)
              }
              className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
              title={strings.modes.playground.copy}
            >
              <Copy size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

export { ModePlayground };
