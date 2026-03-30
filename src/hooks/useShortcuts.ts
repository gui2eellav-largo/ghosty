import { useState, useCallback } from "react";
import { api } from "@/api/tauri";
import { strings } from "@/lib/strings";
import type { ShortcutConfig } from "@/types";

export function useShortcuts() {
  const [shortcuts, setShortcuts] = useState<ShortcutConfig[]>([]);
  const [shortcutListeningId, setShortcutListeningId] = useState<string | null>(null);
  const [shortcutError, setShortcutError] = useState<string | null>(null);

  const loadShortcuts = useCallback(async () => {
    try {
      const allShortcuts = await api.shortcuts.getAll();
      setShortcuts(allShortcuts);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const normalizeKeysForCompare = useCallback((keys: string[]): string => {
    const order = ["Ctrl", "Alt", "Shift", "Cmd"];
    const mods = keys
      .filter((k) => order.includes(k))
      .sort((a, b) => order.indexOf(a) - order.indexOf(b));
    const key = keys.find((k) => !order.includes(k)) ?? "";
    return [...mods, key].join("+");
  }, []);

  const codeToKey = useCallback((code: string): string => {
    if (code === "Space") return "Space";
    if (code.startsWith("Key") && code.length === 4) return code.slice(3).toUpperCase();
    if (code.startsWith("Digit")) return code.slice(5);
    return code;
  }, []);

  const handleShortcutKeyDown = useCallback(
    async (
      e: React.KeyboardEvent,
      shortcutId: string,
      _currentKeys: string[]
    ) => {
      if (!shortcutListeningId || shortcutListeningId !== shortcutId) return;
      e.preventDefault();
      e.stopPropagation();
      if (["Control", "Alt", "Shift", "Meta"].includes(e.key)) return;
      const mods: string[] = [];
      if (e.ctrlKey) mods.push("Ctrl");
      if (e.altKey) mods.push("Alt");
      if (e.shiftKey) mods.push("Shift");
      if (e.metaKey) mods.push("Cmd");
      const key = e.key === "Fn" ? "Fn" : codeToKey(e.code);
      const newKeys = [...mods, key];
      if (newKeys.length === 0) return;
      setShortcutError(null);
      if (newKeys.some((k) => k.toUpperCase() === "FN")) {
        setShortcutError(
          strings.settings.shortcuts.errors.fnKey
        );
        return;
      }
      const sameAsOther = shortcuts.some(
        (s) =>
          s.id !== shortcutId &&
          normalizeKeysForCompare(s.keys) === normalizeKeysForCompare(newKeys)
      );
      if (sameAsOther) {
        setShortcutError(strings.settings.shortcuts.errors.alreadyUsed);
        return;
      }
      try {
        await api.shortcuts.checkAvailable(newKeys);
      } catch {
        setShortcutError(
          strings.settings.shortcuts.errors.reserved
        );
        return;
      }
      const shortcut = shortcuts.find((s) => s.id === shortcutId);
      if (!shortcut) return;
      try {
        const updated = await api.shortcuts.save({ ...shortcut, keys: newKeys });
        setShortcuts(updated);
        setShortcutListeningId(null);
        await api.shortcuts.reregister();
      } catch (err) {
        console.error(err);
        setShortcutError(strings.settings.shortcuts.errors.saveFailed);
      }
    },
    [shortcutListeningId, shortcuts, codeToKey, normalizeKeysForCompare]
  );

  const handleDeleteShortcut = useCallback(async (shortcutId: string) => {
    try {
      const updated = await api.shortcuts.delete(shortcutId);
      setShortcuts(updated);
      await api.shortcuts.reregister();
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleToggleShortcut = useCallback(async (shortcutId: string) => {
    try {
      const updated = await api.shortcuts.toggle(shortcutId);
      setShortcuts(updated);
      await api.shortcuts.reregister();
    } catch (e) {
      console.error(e);
    }
  }, []);

  return {
    shortcuts,
    setShortcuts,
    shortcutListeningId,
    setShortcutListeningId,
    shortcutError,
    setShortcutError,
    loadShortcuts,
    handleShortcutKeyDown,
    handleDeleteShortcut,
    handleToggleShortcut,
  };
}
