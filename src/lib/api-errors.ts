/**
 * Structured error from the Ghosty backend.
 * Serialized as `{ kind: "VariantName", message: "..." }`.
 */
export interface AppError {
  kind: string;
  message?: string;
}

/**
 * Type guard: check if an error is a structured AppError from the backend.
 */
export function isAppError(err: unknown): err is AppError {
  return (
    typeof err === "object" &&
    err !== null &&
    typeof (err as Record<string, unknown>).kind === "string"
  );
}

/**
 * Extract a human-readable message from a backend error (structured or string).
 *
 * Handles three formats:
 * - String (legacy or Tauri wrapper)
 * - `{ kind, message }` (new AppError)
 * - `{ code, detail }` (legacy ApiKeyError, kept for backward compat)
 */
export function getApiErrorMessage(err: unknown): string {
  if (err === null || err === undefined) return "Unknown error";
  if (typeof err === "string") return err;
  if (typeof err === "object" && err !== null) {
    const o = err as Record<string, unknown>;
    // New structured format
    if (typeof o.message === "string" && o.message.length > 0) return o.message;
    // Legacy structured format
    if (typeof o.detail === "string") return o.detail;
    // Fallback: first string value
    const key = Object.keys(o)[0];
    if (key) {
      const v = (o as Record<string, unknown>)[key];
      if (typeof v === "string") return v;
    }
  }
  return String(err);
}

/**
 * Get the error kind for programmatic matching.
 * Returns undefined for unstructured (string) errors.
 */
export function getApiErrorKind(err: unknown): string | undefined {
  if (isAppError(err)) return err.kind;
  // Legacy format
  if (
    typeof err === "object" &&
    err !== null &&
    typeof (err as Record<string, unknown>).code === "string"
  ) {
    return (err as Record<string, unknown>).code as string;
  }
  return undefined;
}
