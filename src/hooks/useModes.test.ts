import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { mockInvoke } from "@/test/tauri-mock";
import { useModes } from "./useModes";
import type { ModeConfig } from "@/types";

const makeModes = (...overrides: Partial<ModeConfig>[]): ModeConfig[] =>
  overrides.map((o, i) => ({
    id: `mode-${i}`,
    name: `Mode ${i}`,
    description: `Desc ${i}`,
    color: "#3b82f6",
    systemPrompt: "prompt",
    enabled: true,
    isCustom: false,
    isDefault: i === 0,
    order: i,
    ...o,
  }));

const builtinModes = makeModes(
  { id: "light", name: "Direct" },
  { id: "medium", name: "Shape", order: 1 },
  { id: "strong", name: "Reframe", order: 2 },
  { id: "full", name: "Build", order: 3 }
);

describe("useModes", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it("should load modes on mount and select the first enabled mode", async () => {
    mockInvoke.mockResolvedValueOnce([...builtinModes]);

    const { result } = renderHook(() => useModes());

    await waitFor(() => {
      expect(result.current.modes.length).toBe(4);
    });
    expect(result.current.selectedModeId).toBe("light");
    expect(mockInvoke).toHaveBeenCalledWith("get_all_modes");
  });

  it("should add a custom mode via handleCreateNewMode", async () => {
    mockInvoke.mockResolvedValueOnce([...builtinModes]);

    const { result } = renderHook(() => useModes());
    await waitFor(() => expect(result.current.modes.length).toBe(4));

    const withNew = [
      ...builtinModes,
      {
        id: "custom-1",
        name: "New Mode",
        description: "Describe your mode...",
        color: "#3b82f6",
        systemPrompt: "",
        enabled: true,
        isCustom: true,
        isDefault: false,
        order: 4,
      },
    ];
    mockInvoke.mockResolvedValueOnce(withNew);

    await act(async () => {
      await result.current.handleCreateNewMode();
    });

    expect(result.current.modes.length).toBe(5);
    expect(result.current.selectedModeId).toBe("custom-1");
  });

  it("should delete a custom mode via handleDeleteMode", async () => {
    const modes = [
      ...builtinModes,
      {
        id: "custom-1",
        name: "Custom",
        description: "",
        color: "#000",
        systemPrompt: "",
        enabled: true,
        isCustom: true,
        isDefault: false,
        order: 4,
      },
    ];
    mockInvoke.mockResolvedValueOnce(modes);

    const { result } = renderHook(() => useModes());
    await waitFor(() => expect(result.current.modes.length).toBe(5));

    mockInvoke.mockResolvedValueOnce([...builtinModes]);

    await act(async () => {
      await result.current.handleDeleteMode("custom-1");
    });

    expect(result.current.modes.length).toBe(4);
    expect(mockInvoke).toHaveBeenCalledWith("delete_mode", { modeId: "custom-1" });
  });

  it("should not delete a built-in mode", async () => {
    mockInvoke.mockResolvedValueOnce([...builtinModes]);

    const { result } = renderHook(() => useModes());
    await waitFor(() => expect(result.current.modes.length).toBe(4));

    await act(async () => {
      await result.current.handleDeleteMode("medium");
    });

    // invoke should not have been called for delete (only the initial getAll)
    expect(mockInvoke).toHaveBeenCalledTimes(1);
  });

  it("should reorder modes via handleMoveMode", async () => {
    mockInvoke.mockResolvedValueOnce([...builtinModes]);

    const { result } = renderHook(() => useModes());
    await waitFor(() => expect(result.current.modes.length).toBe(4));

    // Select the second mode so we can move it up
    act(() => {
      result.current.setSelectedModeId("medium");
    });

    const reordered = makeModes(
      { id: "medium", name: "Shape", order: 0 },
      { id: "light", name: "Direct", order: 1 },
      { id: "strong", name: "Reframe", order: 2 },
      { id: "full", name: "Build", order: 3 }
    );
    mockInvoke.mockResolvedValueOnce(reordered);

    await act(async () => {
      await result.current.handleMoveMode("up");
    });

    expect(mockInvoke).toHaveBeenCalledWith("reorder_modes", {
      modeIds: ["medium", "light", "strong", "full"],
    });
  });

  it("should duplicate a mode via handleDuplicateMode", async () => {
    mockInvoke.mockResolvedValueOnce([...builtinModes]);

    const { result } = renderHook(() => useModes());
    await waitFor(() => expect(result.current.modes.length).toBe(4));

    const mediumMode = result.current.modes.find((m) => m.id === "medium")!;
    // First call: getAll for system prompt fetch (non-custom mode)
    mockInvoke.mockResolvedValueOnce([...builtinModes]);
    // Second call: save the duplicated mode
    const withDuplicate = [
      ...builtinModes,
      {
        ...mediumMode,
        id: "dup-1",
        name: "Shape (Copy)",
        isCustom: true,
        isDefault: false,
        order: 4,
      },
    ];
    mockInvoke.mockResolvedValueOnce(withDuplicate);

    await act(async () => {
      await result.current.handleDuplicateMode(mediumMode);
    });

    expect(result.current.modes.length).toBe(5);
    expect(result.current.selectedModeId).toBe("dup-1");
  });

  it("should toggle mode enabled/disabled via handleToggleModeEnabled", async () => {
    mockInvoke.mockResolvedValueOnce([...builtinModes]);

    const { result } = renderHook(() => useModes());
    await waitFor(() => expect(result.current.modes.length).toBe(4));

    const medium = result.current.modes.find((m) => m.id === "medium")!;
    const updated = builtinModes.map((m) =>
      m.id === "medium" ? { ...m, enabled: false } : m
    );
    mockInvoke.mockResolvedValueOnce(updated);

    await act(async () => {
      await result.current.handleToggleModeEnabled(medium);
    });

    expect(mockInvoke).toHaveBeenCalledWith("save_mode", {
      mode: expect.objectContaining({ id: "medium", enabled: false }),
    });
    const toggled = result.current.modes.find((m) => m.id === "medium");
    expect(toggled?.enabled).toBe(false);
  });

  it("should export a custom mode as JSON to clipboard", async () => {
    const customMode: ModeConfig = {
      id: "custom-1",
      name: "Custom",
      description: "Custom desc",
      color: "#ff0000",
      systemPrompt: "Do stuff",
      enabled: true,
      isCustom: true,
      isDefault: false,
      order: 4,
    };
    const modes = [...builtinModes, customMode];
    mockInvoke.mockResolvedValueOnce(modes);

    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextSpy },
    });

    const { result } = renderHook(() => useModes());
    await waitFor(() => expect(result.current.modes.length).toBe(5));

    act(() => {
      result.current.handleExportMode(customMode);
    });

    expect(writeTextSpy).toHaveBeenCalledWith(JSON.stringify(customMode, null, 2));
  });

  it("should import modes from JSON via handleImportModes", async () => {
    mockInvoke.mockResolvedValueOnce([...builtinModes]);

    const { result } = renderHook(() => useModes());
    await waitFor(() => expect(result.current.modes.length).toBe(4));

    const importedMode = {
      name: "Imported Mode",
      systemPrompt: "Do things differently",
    };
    act(() => {
      result.current.setShowImportModesModal(true);
      result.current.setImportModesJson(JSON.stringify(importedMode));
    });

    const withImported = [
      ...builtinModes,
      {
        id: "imp-1",
        name: "Imported Mode",
        description: "",
        color: "#3b82f6",
        systemPrompt: "Do things differently",
        enabled: true,
        isCustom: true,
        isDefault: false,
        order: 4,
      },
    ];
    mockInvoke.mockResolvedValueOnce(withImported);

    await act(async () => {
      await result.current.handleImportModes();
    });

    expect(result.current.modes.length).toBe(5);
    expect(result.current.showImportModesModal).toBe(false);
  });

  it("should set importModesError for invalid JSON", async () => {
    mockInvoke.mockResolvedValueOnce([...builtinModes]);

    const { result } = renderHook(() => useModes());
    await waitFor(() => expect(result.current.modes.length).toBe(4));

    act(() => {
      result.current.setImportModesJson("not valid json {{{");
    });

    await act(async () => {
      await result.current.handleImportModes();
    });

    expect(result.current.importModesError).toBe("Invalid JSON");
  });
});
