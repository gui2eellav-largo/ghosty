import { useState, useCallback } from "react";
import { api } from "@/api/tauri";
import type { DictionaryEntry } from "@/types";

export function useDictionary() {
  const [dictionaryEntries, setDictionaryEntries] = useState<DictionaryEntry[]>([]);
  const [misspellingDrafts, setMisspellingDrafts] = useState<Record<string, string>>({});
  const [editingDictionaryId, setEditingDictionaryId] = useState<string | null>(null);

  const loadDictionaryEntries = useCallback(async () => {
    try {
      const entries = await api.dictionary.getEntries();
      const normalizedEntries = entries.map((entry) => ({
        ...entry,
        misspellings: entry.misspellings ?? [],
      }));
      setDictionaryEntries(normalizedEntries);
      setMisspellingDrafts(
        normalizedEntries.reduce<Record<string, string>>((acc, entry) => {
          acc[entry.id] = entry.misspellings.join(", ");
          return acc;
        }, {})
      );
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleAddWordFromModal = useCallback(
    async (payload: {
      word: string;
      type: string;
      pronunciation?: string;
      misspellings?: string[];
    }) => {
      const entry = await api.dictionary.add({
        word: payload.word,
        type: payload.type,
        pronunciation: payload.pronunciation ?? undefined,
        misspellings: payload.misspellings ?? [],
      });
      const normalizedEntry = {
        ...entry,
        misspellings: entry.misspellings ?? [],
      };
      setDictionaryEntries((prev) => [...prev, normalizedEntry]);
      setMisspellingDrafts((prev) => ({
        ...prev,
        [normalizedEntry.id]: "",
      }));
    },
    []
  );

  const handleMisspellingChange = useCallback((id: string, value: string) => {
    setMisspellingDrafts((prev) => ({ ...prev, [id]: value }));
  }, []);

  const handleMisspellingSave = useCallback(
    async (id: string) => {
      const raw = misspellingDrafts[id] ?? "";
      const items = raw
        .split(",")
        .map((v) => v.trim())
        .filter((v) => v.length > 0);
      try {
        const updated = await api.dictionary.update({ id, misspellings: items });
        const normalizedUpdated = {
          ...updated,
          misspellings: updated.misspellings ?? [],
        };
        setDictionaryEntries((prev) =>
          prev.map((entry) => (entry.id === id ? normalizedUpdated : entry))
        );
        setMisspellingDrafts((prev) => ({
          ...prev,
          [id]: normalizedUpdated.misspellings.join(", "),
        }));
      } catch (e) {
        console.error(e);
      }
    },
    [misspellingDrafts]
  );

  const handleDeleteWord = useCallback(async (id: string) => {
    try {
      await api.dictionary.delete(id);
      setDictionaryEntries((prev) => prev.filter((e) => e.id !== id));
      setMisspellingDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleEditDictionaryEntry = useCallback((id: string) => {
    setEditingDictionaryId(id);
  }, []);

  return {
    dictionaryEntries,
    misspellingDrafts,
    editingDictionaryId,
    setEditingDictionaryId,
    loadDictionaryEntries,
    handleAddWordFromModal,
    handleMisspellingChange,
    handleMisspellingSave,
    handleDeleteWord,
    handleEditDictionaryEntry,
  };
}
