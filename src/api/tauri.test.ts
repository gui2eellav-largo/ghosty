import { describe, it, expect, beforeEach } from "vitest";
import { mockInvoke } from "@/test/tauri-mock";
import { tauriApi, api } from "./tauri";

describe("tauriApi", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it("should export api as alias for tauriApi", () => {
    expect(api).toBe(tauriApi);
  });

  describe("preferences", () => {
    it("should call get_app_preferences for get()", async () => {
      mockInvoke.mockResolvedValueOnce({ general: { launchAtLogin: true } });
      const result = await api.preferences.get();
      expect(mockInvoke).toHaveBeenCalledWith("get_app_preferences");
      expect(result.general.launchAtLogin).toBe(true);
    });

    it("should call update_app_preferences for update()", async () => {
      const partial = { general: { launchAtLogin: false } };
      mockInvoke.mockResolvedValueOnce({ general: { launchAtLogin: false } });
      await api.preferences.update(partial);
      expect(mockInvoke).toHaveBeenCalledWith("update_app_preferences", { partial });
    });
  });

  describe("modes", () => {
    it("should call get_all_modes for getAll()", async () => {
      mockInvoke.mockResolvedValueOnce([]);
      await api.modes.getAll();
      expect(mockInvoke).toHaveBeenCalledWith("get_all_modes");
    });

    it("should call save_mode for save()", async () => {
      const mode = { id: "test", name: "Test" };
      mockInvoke.mockResolvedValueOnce([]);
      await api.modes.save(mode as any);
      expect(mockInvoke).toHaveBeenCalledWith("save_mode", { mode });
    });

    it("should call delete_mode for delete()", async () => {
      mockInvoke.mockResolvedValueOnce([]);
      await api.modes.delete("mode-1");
      expect(mockInvoke).toHaveBeenCalledWith("delete_mode", { modeId: "mode-1" });
    });

    it("should call reorder_modes for reorder()", async () => {
      mockInvoke.mockResolvedValueOnce([]);
      await api.modes.reorder(["a", "b", "c"]);
      expect(mockInvoke).toHaveBeenCalledWith("reorder_modes", { modeIds: ["a", "b", "c"] });
    });

    it("should call set_active_prompt for setActivePrompt()", async () => {
      mockInvoke.mockResolvedValueOnce(undefined);
      await api.modes.setActivePrompt("prompt text", "medium");
      expect(mockInvoke).toHaveBeenCalledWith("set_active_prompt", {
        prompt: "prompt text",
        mode: "medium",
      });
    });
  });

  describe("llm", () => {
    it("should call improve_system_prompt", async () => {
      mockInvoke.mockResolvedValueOnce("improved");
      const result = await api.llm.improveSystemPrompt("input prompt");
      expect(mockInvoke).toHaveBeenCalledWith("improve_system_prompt", { prompt: "input prompt" });
      expect(result).toBe("improved");
    });

    it("should call transform_text_direct", async () => {
      mockInvoke.mockResolvedValueOnce("transformed");
      const result = await api.llm.transformText("hello", "be formal");
      expect(mockInvoke).toHaveBeenCalledWith("transform_text_direct", {
        text: "hello",
        prompt: "be formal",
      });
      expect(result).toBe("transformed");
    });
  });

  describe("shortcuts", () => {
    it("should call get_all_shortcuts for getAll()", async () => {
      mockInvoke.mockResolvedValueOnce([]);
      await api.shortcuts.getAll();
      expect(mockInvoke).toHaveBeenCalledWith("get_all_shortcuts");
    });

    it("should call save_shortcut for save()", async () => {
      const shortcut = { id: "s1", name: "test", keys: ["ctrl"], action: { type: "openDashboard" }, enabled: true, description: "" };
      mockInvoke.mockResolvedValueOnce([]);
      await api.shortcuts.save(shortcut as any);
      expect(mockInvoke).toHaveBeenCalledWith("save_shortcut", { shortcut });
    });

    it("should call delete_shortcut for delete()", async () => {
      mockInvoke.mockResolvedValueOnce([]);
      await api.shortcuts.delete("s1");
      expect(mockInvoke).toHaveBeenCalledWith("delete_shortcut", { shortcutId: "s1" });
    });

    it("should call toggle_shortcut for toggle()", async () => {
      mockInvoke.mockResolvedValueOnce([]);
      await api.shortcuts.toggle("s1");
      expect(mockInvoke).toHaveBeenCalledWith("toggle_shortcut", { shortcutId: "s1" });
    });

    it("should call reset_shortcuts for reset()", async () => {
      mockInvoke.mockResolvedValueOnce([]);
      await api.shortcuts.reset();
      expect(mockInvoke).toHaveBeenCalledWith("reset_shortcuts");
    });
  });

  describe("dictionary", () => {
    it("should call get_dictionary_entries for getEntries()", async () => {
      mockInvoke.mockResolvedValueOnce([]);
      await api.dictionary.getEntries();
      expect(mockInvoke).toHaveBeenCalledWith("get_dictionary_entries");
    });

    it("should call add_dictionary_entry with correct params", async () => {
      mockInvoke.mockResolvedValueOnce({ id: "d1", word: "test" });
      await api.dictionary.add({
        word: "test",
        type: "Custom",
        misspellings: ["tets"],
      });
      expect(mockInvoke).toHaveBeenCalledWith("add_dictionary_entry", {
        word: "test",
        entryType: "Custom",
        pronunciation: null,
        misspellings: ["tets"],
      });
    });

    it("should pass null misspellings when array is empty", async () => {
      mockInvoke.mockResolvedValueOnce({ id: "d1", word: "test" });
      await api.dictionary.add({
        word: "test",
        type: "Custom",
        misspellings: [],
      });
      expect(mockInvoke).toHaveBeenCalledWith("add_dictionary_entry", {
        word: "test",
        entryType: "Custom",
        pronunciation: null,
        misspellings: null,
      });
    });

    it("should call delete_dictionary_entry for delete()", async () => {
      mockInvoke.mockResolvedValueOnce(undefined);
      await api.dictionary.delete("d1");
      expect(mockInvoke).toHaveBeenCalledWith("delete_dictionary_entry", { id: "d1" });
    });
  });

  describe("apiKeys", () => {
    it("should call get_all_api_keys for getAll()", async () => {
      mockInvoke.mockResolvedValueOnce([]);
      await api.apiKeys.getAll();
      expect(mockInvoke).toHaveBeenCalledWith("get_all_api_keys");
    });

    it("should call has_openai_key for hasKey()", async () => {
      mockInvoke.mockResolvedValueOnce(true);
      const result = await api.apiKeys.hasKey();
      expect(mockInvoke).toHaveBeenCalledWith("has_openai_key");
      expect(result).toBe(true);
    });

    it("should call test_openai_key for test()", async () => {
      mockInvoke.mockResolvedValueOnce(undefined);
      await api.apiKeys.test("sk-123");
      expect(mockInvoke).toHaveBeenCalledWith("test_openai_key", { key: "sk-123" });
    });

    it("should call add_api_key_entry for add()", async () => {
      mockInvoke.mockResolvedValueOnce(undefined);
      await api.apiKeys.add({ name: "Default", provider: "openai", key: "sk-test" });
      expect(mockInvoke).toHaveBeenCalledWith("add_api_key_entry", {
        name: "Default",
        provider: "openai",
        key: "sk-test",
      });
    });

    it("should call remove_api_key_entry for remove()", async () => {
      mockInvoke.mockResolvedValueOnce(undefined);
      await api.apiKeys.remove("key-1");
      expect(mockInvoke).toHaveBeenCalledWith("remove_api_key_entry", { keyId: "key-1" });
    });

    it("should call set_active_api_key for setActive()", async () => {
      mockInvoke.mockResolvedValueOnce(undefined);
      await api.apiKeys.setActive("key-1");
      expect(mockInvoke).toHaveBeenCalledWith("set_active_api_key", { keyId: "key-1" });
    });
  });

  describe("usage", () => {
    it("should call get_usage_stats", async () => {
      const stats = { transcription_requests: 10, llm_requests: 5, tokens_input: 100, tokens_output: 50 };
      mockInvoke.mockResolvedValueOnce(stats);
      const result = await api.usage.getStats();
      expect(mockInvoke).toHaveBeenCalledWith("get_usage_stats");
      expect(result).toEqual(stats);
    });

    it("should call reset_usage_stats", async () => {
      mockInvoke.mockResolvedValueOnce(undefined);
      await api.usage.reset();
      expect(mockInvoke).toHaveBeenCalledWith("reset_usage_stats");
    });
  });

  describe("audio", () => {
    it("should call list_audio_input_devices", async () => {
      mockInvoke.mockResolvedValueOnce([{ id: "mic-1", name: "Built-in Mic" }]);
      const result = await api.audio.listInputDevices();
      expect(mockInvoke).toHaveBeenCalledWith("list_audio_input_devices");
      expect(result).toHaveLength(1);
    });
  });

  describe("services", () => {
    it("should call list_installed_ghosty_services", async () => {
      mockInvoke.mockResolvedValueOnce(["service1"]);
      await api.services.listInstalled();
      expect(mockInvoke).toHaveBeenCalledWith("list_installed_ghosty_services");
    });

    it("should call install_ghosty_services", async () => {
      mockInvoke.mockResolvedValueOnce(["service1"]);
      await api.services.install();
      expect(mockInvoke).toHaveBeenCalledWith("install_ghosty_services");
    });
  });

  describe("recording", () => {
    it("should call start_recording", async () => {
      mockInvoke.mockResolvedValueOnce(undefined);
      await api.recording.start();
      expect(mockInvoke).toHaveBeenCalledWith("start_recording");
    });

    it("should call stop_recording", async () => {
      mockInvoke.mockResolvedValueOnce(undefined);
      await api.recording.stop();
      expect(mockInvoke).toHaveBeenCalledWith("stop_recording");
    });

    it("should call cancel_transcription", async () => {
      mockInvoke.mockResolvedValueOnce(undefined);
      await api.recording.cancel();
      expect(mockInvoke).toHaveBeenCalledWith("cancel_transcription");
    });
  });

  describe("correction", () => {
    it("should call analyze_clipboard_correction", async () => {
      mockInvoke.mockResolvedValueOnce([{ misspelling: "teh", correction: "the", confidence: 0.9 }]);
      const result = await api.correction.analyze();
      expect(mockInvoke).toHaveBeenCalledWith("analyze_clipboard_correction");
      expect(result).toHaveLength(1);
    });
  });

  describe("updater", () => {
    it("should call check_update", async () => {
      mockInvoke.mockResolvedValueOnce({ available: true, version: "1.0.1" });
      const result = await api.updater.check();
      expect(mockInvoke).toHaveBeenCalledWith("check_update");
      expect(result.available).toBe(true);
    });

    it("should call install_update", async () => {
      mockInvoke.mockResolvedValueOnce(undefined);
      await api.updater.install();
      expect(mockInvoke).toHaveBeenCalledWith("install_update");
    });
  });

  describe("onboarding", () => {
    it("should call get_first_run_done for isDone()", async () => {
      mockInvoke.mockResolvedValueOnce(false);
      const result = await api.onboarding.isDone();
      expect(mockInvoke).toHaveBeenCalledWith("get_first_run_done");
      expect(result).toBe(false);
    });

    it("should call set_first_run_done for markDone()", async () => {
      mockInvoke.mockResolvedValueOnce(undefined);
      await api.onboarding.markDone();
      expect(mockInvoke).toHaveBeenCalledWith("set_first_run_done");
    });
  });

  describe("window", () => {
    it("should call set_window_click_through", async () => {
      mockInvoke.mockResolvedValueOnce(undefined);
      await api.window.setClickThrough(true);
      expect(mockInvoke).toHaveBeenCalledWith("set_window_click_through", { ignore: true });
    });

    it("should call set_floating_window_bounds", async () => {
      mockInvoke.mockResolvedValueOnce(undefined);
      await api.window.setFloatingBounds({ x: 0, y: 0, width: 100, height: 50 });
      expect(mockInvoke).toHaveBeenCalledWith("set_floating_window_bounds", {
        x: 0,
        y: 0,
        width: 100,
        height: 50,
      });
    });
  });

  describe("error handling", () => {
    it("should propagate invoke rejection", async () => {
      mockInvoke.mockRejectedValueOnce(new Error("Backend error"));
      await expect(api.preferences.get()).rejects.toThrow("Backend error");
    });

    it("should propagate string errors from invoke", async () => {
      mockInvoke.mockRejectedValueOnce("Something went wrong");
      await expect(api.modes.getAll()).rejects.toBe("Something went wrong");
    });
  });

  describe("all API namespaces exist", () => {
    it("should have all expected namespaces", () => {
      expect(api.preferences).toBeDefined();
      expect(api.modes).toBeDefined();
      expect(api.llm).toBeDefined();
      expect(api.shortcuts).toBeDefined();
      expect(api.dictionary).toBeDefined();
      expect(api.apiKeys).toBeDefined();
      expect(api.usage).toBeDefined();
      expect(api.audio).toBeDefined();
      expect(api.services).toBeDefined();
      expect(api.recording).toBeDefined();
      expect(api.correction).toBeDefined();
      expect(api.updater).toBeDefined();
      expect(api.onboarding).toBeDefined();
      expect(api.window).toBeDefined();
    });
  });
});
