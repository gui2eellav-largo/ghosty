import { useState, useEffect, useRef, type SetStateAction } from "react";
import { api } from "@/api/tauri";
import type { ModeConfig, Mode } from "@/types";
import { DIRECT_MODE_ID } from "@/types";

export const DEFAULT_SYSTEM_PROMPT_PLACEHOLDER =
  "Transform the user's voice input into an improved request. Do not execute the request; output the improved request only. Use precise vocabulary (semantic levers) and light structure when it helps clarity. Then on a new line write exactly ---REFLECTION--- and briefly: what you inferred, what you changed, which semantic levers you used and why.";

export function useModes() {
  const [modes, setModes] = useState<ModeConfig[]>([]);
  const [selectedModeId, setSelectedModeId] = useState<string | null>(null);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [editedMode, setEditedMode] = useState<ModeConfig | null>(null);
  const [showImportModesModal, setShowImportModesModal] = useState(false);
  const [importModesJson, setImportModesJson] = useState("");
  const [importModesError, setImportModesError] = useState<string | null>(null);
  const [modeDraft, setModeDraft] = useState<Partial<ModeConfig> | null>(null);
  const [modeIdToConfirmDelete, setModeIdToConfirmDelete] = useState<string | null>(null);
  const [modeRowMenuOpen, setModeRowMenuOpen] = useState<string | null>(null);
  const [directDeleteBlockedMessage, setDirectDeleteBlockedMessage] = useState<string | null>(null);
  const modeRowMenuRef = useRef<HTMLDivElement>(null);

  const loadModes = async () => {
    try {
      const allModes = await api.modes.getAll();
      const sorted = allModes.sort((a, b) => a.order - b.order);
      setModes(sorted);
      const defaultMode = sorted.filter((m) => m.enabled)[0] ?? sorted[0];
      if (defaultMode) {
        setSelectedModeId((prev) => (prev ? prev : defaultMode.id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadModes();
  }, []);

  useEffect(() => {
    setModeDraft(null);
    setModeIdToConfirmDelete(null);
    setModeRowMenuOpen(null);
  }, [selectedModeId]);

  useEffect(() => {
    if (directDeleteBlockedMessage === null) return;
    const t = setTimeout(() => setDirectDeleteBlockedMessage(null), 4000);
    return () => clearTimeout(t);
  }, [directDeleteBlockedMessage]);

  const sortedModeIds = [...modes].sort((a, b) => a.order - b.order).map((m) => m.id);
  const selectedModeIndex = selectedModeId ? sortedModeIds.indexOf(selectedModeId) : -1;
  const selectedModeConfig = modes.find((m) => m.id === selectedModeId) ?? null;
  const selectedLocked = selectedModeConfig?.locked ?? false;
  const canMoveUp = selectedModeIndex > 0 && !selectedLocked;
  const canMoveDown =
    selectedModeIndex >= 0 && selectedModeIndex < sortedModeIds.length - 1 && !selectedLocked;

  const handleSaveMode = async () => {
    if (!editedMode) return;
    try {
      const updated = await api.modes.save(editedMode);
      const sortedModes = updated.sort((a, b) => a.order - b.order);
      setModes(sortedModes);
      const wasNewMode = !editedMode.id;
      const savedMode = wasNewMode
        ? sortedModes.find((m) => m.isCustom && !modes.some((old) => old.id === m.id))
        : sortedModes.find((m) => m.id === editedMode.id);
      if (savedMode) setSelectedModeId(savedMode.id);
      setIsEditingMode(false);
      setEditedMode(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteMode = async (modeId: string) => {
    setModeIdToConfirmDelete(null);
    const mode = modes.find((m) => m.id === modeId);
    if (mode && !mode.isCustom) {
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(50);
      setDirectDeleteBlockedMessage(
        "Built-in modes cannot be deleted. You can only hide them from the widget."
      );
      return;
    }
    try {
      const updated = await api.modes.delete(modeId);
      setModes(updated.sort((a, b) => a.order - b.order));
      const first = updated[0];
      if (selectedModeId === modeId && first) setSelectedModeId(first.id);
    } catch (e) {
      const msg = String(e);
      if (msg.includes("Built-in") && msg.includes("cannot be deleted")) {
        if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(50);
        setDirectDeleteBlockedMessage(
          "Built-in modes cannot be deleted. You can only hide them from the widget."
        );
      } else if (msg.includes("locked")) {
        setDirectDeleteBlockedMessage("Mode is locked. Unlock it to delete.");
      } else {
        console.error(e);
      }
    }
  };

  const handleToggleModeEnabled = async (mode: ModeConfig) => {
    try {
      const newEnabled = !mode.enabled;
      const updated = await api.modes.save({ ...mode, enabled: newEnabled });
      const sortedUpdated = updated.sort((a, b) => a.order - b.order);
      setModes(sortedUpdated);
      if (selectedModeId === mode.id && !newEnabled) {
        const firstEnabled = sortedUpdated.filter((m) => m.enabled)[0];
        if (firstEnabled) setSelectedModeId(firstEnabled.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleLocked = async (mode: ModeConfig) => {
    if (!mode.isCustom) return;
    try {
      const updated = await api.modes.save({ ...mode, locked: !mode.locked });
      setModes(updated.sort((a, b) => a.order - b.order));
      setModeRowMenuOpen(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleMoveMode = async (direction: "up" | "down") => {
    if (selectedModeIndex < 0) return;
    const newOrder = [...sortedModeIds];
    const swapIndex = direction === "up" ? selectedModeIndex - 1 : selectedModeIndex + 1;
    if (swapIndex < 0 || swapIndex >= newOrder.length) return;
    const a = newOrder[selectedModeIndex];
    const b = newOrder[swapIndex];
    if (a !== undefined && b !== undefined) {
      newOrder[selectedModeIndex] = b;
      newOrder[swapIndex] = a;
    }
    try {
      const updated = await api.modes.reorder(newOrder);
      setModes(updated.sort((a, b) => a.order - b.order));
    } catch (e) {
      console.error(e);
    }
  };

  const saveModeDraft = async (mode: ModeConfig, draft: Partial<ModeConfig>) => {
    const merged = { ...mode, ...draft };
    try {
      const updated = await api.modes.save(merged);
      setModes(updated.sort((a, b) => a.order - b.order));
      setModeDraft(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateNewMode = async () => {
    const newMode: ModeConfig = {
      id: "",
      name: "New Mode",
      description: "Describe your mode...",
      color: "#3b82f6",
      systemPrompt: "",
      enabled: true,
      isCustom: true,
      isDefault: false,
      order: modes.length,
      locked: false,
    };
    try {
      const updated = await api.modes.save(newMode);
      const sorted = updated.sort((a, b) => a.order - b.order);
      setModes(sorted);
      const created = sorted.find((m) => m.isCustom && !modes.some((old) => old.id === m.id));
      if (created) setSelectedModeId(created.id);
      setIsEditingMode(false);
      setEditedMode(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDuplicateMode = (mode: ModeConfig) => {
    if (mode.id === DIRECT_MODE_ID) return;
    const duplicated: ModeConfig = {
      ...mode,
      id: "",
      name: `${mode.name} (Copy)`,
      isCustom: true,
      isDefault: false,
      order: modes.length,
      locked: false,
    };
    setEditedMode(duplicated);
    setIsEditingMode(true);
    setSelectedModeId(null);
  };

  const handleExportMode = (mode: ModeConfig) => {
    if (!mode.isCustom) return;
    const json = JSON.stringify(mode, null, 2);
    navigator.clipboard.writeText(json);
  };

  const handleImportModes = async () => {
    setImportModesError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(importModesJson.trim());
    } catch {
      setImportModesError("Invalid JSON");
      return;
    }
    const items = Array.isArray(parsed) ? parsed : [parsed];
    const existingNames = new Set(modes.map((m) => m.name.toLowerCase()));
    let lastUpdated = modes;
    let imported = 0;
    for (let i = 0; i < items.length; i++) {
      const item = items[i] as Record<string, unknown>;
      const name = typeof item.name === "string" ? item.name.trim() : "";
      const systemPrompt = typeof item.systemPrompt === "string" ? item.systemPrompt : "";
      if (!name || !systemPrompt) {
        setImportModesError(`Entry ${i + 1}: name and systemPrompt are required`);
        return;
      }
      let finalName = name;
      if (existingNames.has(name.toLowerCase())) finalName = `${name} (Import)`;
      existingNames.add(finalName.toLowerCase());
      const modeToSave: ModeConfig = {
        id: "",
        name: finalName,
        description: typeof item.description === "string" ? item.description : "",
        color: typeof item.color === "string" ? item.color : "#3b82f6",
        systemPrompt,
        enabled: typeof item.enabled === "boolean" ? item.enabled : true,
        isCustom: true,
        isDefault: false,
        order: modes.length + i,
      };
      try {
        lastUpdated = await api.modes.save(modeToSave);
        imported++;
      } catch (e) {
        setImportModesError(`Failed to import "${finalName}": ${String(e)}`);
        return;
      }
    }
    setModes(lastUpdated.sort((a, b) => a.order - b.order));
    setShowImportModesModal(false);
    setImportModesJson("");
    if (imported > 0) setSelectedModeId(lastUpdated[lastUpdated.length - 1]?.id ?? null);
  };

  const setSelectedMode = (action: SetStateAction<Mode>) => {
    if (typeof action === "function") {
      setSelectedModeId((prev) => {
        const current = (prev ?? modes[0]?.id ?? "light") as Mode;
        return action(current);
      });
    } else if (action != null) {
      setSelectedModeId(action);
    }
  };
  const selectedMode = (selectedModeId ?? modes[0]?.id ?? "light") as Mode;

  return {
    modes,
    setModes,
    selectedModeId,
    setSelectedModeId,
    selectedMode,
    setSelectedMode,
    selectedModeConfig,
    selectedModeIndex,
    sortedModeIds,
    selectedLocked,
    canMoveUp,
    canMoveDown,
    isEditingMode,
    setIsEditingMode,
    editedMode,
    setEditedMode,
    modeDraft,
    setModeDraft,
    modeIdToConfirmDelete,
    setModeIdToConfirmDelete,
    modeRowMenuOpen,
    setModeRowMenuOpen,
    modeRowMenuRef,
    showImportModesModal,
    setShowImportModesModal,
    importModesJson,
    setImportModesJson,
    importModesError,
    setImportModesError,
    directDeleteBlockedMessage,
    setDirectDeleteBlockedMessage,
    loadModes,
    handleSaveMode,
    handleDeleteMode,
    handleToggleModeEnabled,
    handleToggleLocked,
    handleMoveMode,
    saveModeDraft,
    handleCreateNewMode,
    handleDuplicateMode,
    handleExportMode,
    handleImportModes,
  };
}
