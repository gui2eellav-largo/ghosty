import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("handles conditional classes", () => {
    const hide = false;
    const show = true;
    expect(cn("base", hide && "hidden", show && "visible")).toBe("base visible");
  });

  it("merges tailwind conflicts with last winning", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("returns empty string for no args", () => {
    expect(cn()).toBe("");
  });
});
