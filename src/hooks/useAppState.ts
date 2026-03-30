import { useState, useCallback } from "react";
import { api } from "@/api/tauri";
import { strings } from "@/lib/strings";
import type { UsageStats, CorrectionNotification } from "@/types";

export function useAppState() {
  const [audioInputDevices, setAudioInputDevices] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [servicesInstalled, setServicesInstalled] = useState<string[] | null>(null);
  const [correctionNotifications, setCorrectionNotifications] = useState<
    CorrectionNotification[]
  >([]);
  const [updateInfo, setUpdateInfo] = useState<{
    available: boolean;
    version?: string;
    body?: string;
  } | null>(null);
  const [updateStatus, setUpdateStatus] = useState<
    "idle" | "checking" | "installing" | "done" | "error"
  >("idle");
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [status, setStatus] = useState("Ready.");

  const loadUsageStats = useCallback(async () => {
    try {
      const stats = await api.usage.getStats();
      setUsageStats(stats);
    } catch {
      setUsageStats(null);
    }
  }, []);

  const handleResetUsage = useCallback(async () => {
    if (!confirm(strings.errors.resetUsageConfirm)) return;
    try {
      await api.usage.reset();
      setUsageStats({
        transcription_requests: 0,
        llm_requests: 0,
        tokens_input: 0,
        tokens_output: 0,
      });
    } catch {
      await loadUsageStats();
    }
  }, [loadUsageStats]);

  const makeHandleAcceptCorrectionNotification = useCallback(
    (loadDictionaryEntries: () => Promise<void>) =>
      async (n: CorrectionNotification) => {
        try {
          await api.dictionary.add({
            word: n.candidate.correction,
            type: "Custom",
            misspellings: [n.candidate.misspelling],
          });
          await loadDictionaryEntries();
        } catch (e) {
          console.error(e);
        } finally {
          setCorrectionNotifications((prev) => prev.filter((x) => x.id !== n.id));
        }
      },
    []
  );

  const handleDismissCorrectionNotification = useCallback((id: string) => {
    setCorrectionNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return {
    audioInputDevices,
    setAudioInputDevices,
    servicesInstalled,
    setServicesInstalled,
    correctionNotifications,
    setCorrectionNotifications,
    updateInfo,
    setUpdateInfo,
    updateStatus,
    setUpdateStatus,
    updateError,
    setUpdateError,
    usageStats,
    status,
    setStatus,
    loadUsageStats,
    handleResetUsage,
    makeHandleAcceptCorrectionNotification,
    handleDismissCorrectionNotification,
  };
}
