import { describe, it, expect } from "vitest";
import { getApiErrorMessage, isAppError, getApiErrorKind } from "./api-errors";

describe("getApiErrorMessage", () => {
  it("returns default for null/undefined", () => {
    expect(getApiErrorMessage(null)).toBe("Unknown error");
    expect(getApiErrorMessage(undefined)).toBe("Unknown error");
  });

  it("returns string as-is", () => {
    expect(getApiErrorMessage("Custom error")).toBe("Custom error");
  });

  it("uses message when present (new AppError format)", () => {
    expect(getApiErrorMessage({ kind: "StorageError", message: "File not found" })).toBe("File not found");
  });

  it("uses detail when present (legacy format)", () => {
    expect(getApiErrorMessage({ detail: "Backend error" })).toBe("Backend error");
  });

  it("uses first key string value as fallback", () => {
    expect(getApiErrorMessage({ error: "First key" })).toBe("First key");
  });

  it("prefers message over detail", () => {
    expect(
      getApiErrorMessage({ message: "Message", detail: "Detail" })
    ).toBe("Message");
  });

  it("stringifies other values", () => {
    expect(getApiErrorMessage(42)).toBe("42");
    expect(getApiErrorMessage(new Error("err"))).toContain("err");
  });
});

describe("isAppError", () => {
  it("returns true for structured AppError", () => {
    expect(isAppError({ kind: "StorageError", message: "test" })).toBe(true);
  });

  it("returns false for strings", () => {
    expect(isAppError("error")).toBe(false);
  });

  it("returns false for objects without kind", () => {
    expect(isAppError({ detail: "test" })).toBe(false);
  });

  it("returns false for null/undefined", () => {
    expect(isAppError(null)).toBe(false);
    expect(isAppError(undefined)).toBe(false);
  });
});

describe("getApiErrorKind", () => {
  it("returns kind for structured AppError", () => {
    expect(getApiErrorKind({ kind: "RecordingFailed", message: "no mic" })).toBe("RecordingFailed");
  });

  it("returns code for legacy format", () => {
    expect(getApiErrorKind({ code: "UNAUTHORIZED" })).toBe("UNAUTHORIZED");
  });

  it("returns undefined for strings", () => {
    expect(getApiErrorKind("error")).toBeUndefined();
  });

  it("returns undefined for null", () => {
    expect(getApiErrorKind(null)).toBeUndefined();
  });
});
