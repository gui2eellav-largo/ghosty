import { describe, it, expect } from "vitest";
import { getApiErrorMessage } from "./api-errors";

describe("getApiErrorMessage", () => {
  it("returns default for null/undefined", () => {
    expect(getApiErrorMessage(null)).toBe("Unknown error");
    expect(getApiErrorMessage(undefined)).toBe("Unknown error");
  });

  it("returns string as-is", () => {
    expect(getApiErrorMessage("Custom error")).toBe("Custom error");
  });

  it("uses detail when present", () => {
    expect(getApiErrorMessage({ detail: "Backend error" })).toBe("Backend error");
  });

  it("uses first key string value when no detail", () => {
    expect(getApiErrorMessage({ error: "First key" })).toBe("First key");
  });

  it("uses message when present and no detail", () => {
    expect(getApiErrorMessage({ message: "Standard message" })).toBe("Standard message");
  });

  it("prefers detail over message", () => {
    expect(
      getApiErrorMessage({ detail: "Detail", message: "Message" })
    ).toBe("Detail");
  });

  it("stringifies other values", () => {
    expect(getApiErrorMessage(42)).toBe("42");
    expect(getApiErrorMessage(new Error("err"))).toContain("err");
  });
});
