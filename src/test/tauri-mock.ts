// Mock @tauri-apps/api/core invoke
export const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: mockInvoke,
}));

// Mock @tauri-apps/api/event listen/emit
export const mockListen = vi.fn(() => Promise.resolve(() => {}));
export const mockEmit = vi.fn();
vi.mock("@tauri-apps/api/event", () => ({
  listen: mockListen,
  emit: mockEmit,
}));

// Mock window
export const mockSetFocus = vi.fn();
export const mockSetSize = vi.fn();
export const mockSetPosition = vi.fn();
vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    label: "main",
    setFocus: mockSetFocus,
    setSize: mockSetSize,
    setPosition: mockSetPosition,
  }),
  currentMonitor: vi.fn(() =>
    Promise.resolve({ size: { width: 1920, height: 1080 }, scaleFactor: 1 })
  ),
}));

// Mock tauri-window helper
vi.mock("@/lib/tauri-window", () => ({
  getWindowLabel: () => "main",
  isTauri: () => false,
}));
