import { useState, useRef, useLayoutEffect, useCallback } from "react";
import type { TranscriptionItem } from "@/types";

export function useTranscriptionHistory() {
  const [transcriptions, setTranscriptions] = useState<TranscriptionItem[]>([]);
  const [expandedThoughts, setExpandedThoughts] = useState<Set<string>>(new Set());
  const [expandedOutputs, setExpandedOutputs] = useState<Set<string>>(new Set());
  const [overflowedOutputs, setOverflowedOutputs] = useState<Set<string>>(new Set());
  const outputRefs = useRef<Record<string, HTMLParagraphElement | null>>({});

  useLayoutEffect(() => {
    const next = new Set<string>();
    transcriptions.forEach((item) => {
      if (expandedOutputs.has(item.id)) return;
      const el = outputRefs.current[item.id];
      if (el && el.scrollHeight > el.clientHeight) next.add(item.id);
    });
    setOverflowedOutputs(next);
  }, [transcriptions, expandedOutputs]);

  const addTranscription = useCallback((item: TranscriptionItem) => {
    setTranscriptions((prev) => [item, ...prev]);
  }, []);

  const clearTranscriptions = useCallback(() => {
    setTranscriptions([]);
  }, []);

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  const toggleThoughts = useCallback((id: string) => {
    setExpandedThoughts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleOutputExpand = useCallback((id: string) => {
    setExpandedOutputs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  return {
    transcriptions,
    setTranscriptions,
    expandedThoughts,
    expandedOutputs,
    overflowedOutputs,
    outputRefs,
    addTranscription,
    clearTranscriptions,
    handleCopy,
    toggleThoughts,
    toggleOutputExpand,
  };
}
