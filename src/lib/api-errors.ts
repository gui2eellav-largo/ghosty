/**
 * Extrait un message d'erreur lisible depuis une erreur backend (structurée ou string).
 */
export function getApiErrorMessage(err: unknown): string {
  if (err === null || err === undefined) return "Unknown error";
  if (typeof err === "string") return err;
  if (typeof err === "object" && err !== null) {
    const o = err as Record<string, unknown>;
    if (typeof o.detail === "string") return o.detail;
    const key = Object.keys(o)[0];
    if (key) {
      const v = (o as Record<string, unknown>)[key];
      if (typeof v === "string") return v;
    }
    if (typeof o.message === "string") return o.message;
  }
  return String(err);
}
