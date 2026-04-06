/**
 * Erros comuns quando a migração `clinics.slug` ainda não foi aplicada no Supabase.
 */
export function isClinicsSlugMissingError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string; details?: string; hint?: string };
  const parts = [e.message, e.details, e.hint, e.code].filter(Boolean).join(" ").toLowerCase();
  if (parts.includes("pgrst204") && parts.includes("slug")) return true;
  if (e.code === "42703" && parts.includes("slug")) return true;
  if (
    parts.includes("slug") &&
    (parts.includes("does not exist") ||
      parts.includes("not found") ||
      parts.includes("could not find") ||
      parts.includes("schema cache"))
  ) {
    return true;
  }
  return false;
}

/** Mensagem legível para toast (evita "[object Object]"). */
export function formatSupabaseClientError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null) {
    const o = err as Record<string, unknown>;
    if (typeof o.message === "string" && o.message.length > 0) return o.message;
    if (typeof o.error_description === "string") return o.error_description;
    if (typeof o.details === "string" && o.details.length > 0) return o.details;
    try {
      return JSON.stringify(err);
    } catch {
      /* ignore */
    }
  }
  return String(err);
}
