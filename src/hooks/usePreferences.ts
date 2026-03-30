import { useState, useCallback } from "react";
import { api } from "@/api/tauri";
import type { Preferences, DeepPartial } from "@/types";

export function usePreferences() {
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [accountDisplayNameDraft, setAccountDisplayNameDraft] = useState<string>("");

  const loadPreferences = useCallback(async () => {
    try {
      const prefs = await api.preferences.get();
      setPreferences(prefs);
    } catch {
      setPreferences(null);
    }
  }, []);

  const updatePreferences = useCallback(async (partial: DeepPartial<Preferences>) => {
    try {
      const updated = await api.preferences.update(partial);
      setPreferences(updated);
    } catch (e) {
      console.error(e);
    }
  }, []);

  return {
    preferences,
    accountDisplayNameDraft,
    setAccountDisplayNameDraft,
    loadPreferences,
    updatePreferences,
  };
}
