import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";

const DEFAULT_TITLE = "ServiceRapide NPS";

export function useClinic(clinicId: string | undefined) {
  const [name, setName] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(clinicId));
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!clinicId) {
      setName(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const supabase = getSupabaseClient();
        const { data, error: qErr } = await supabase
          .from("clinics")
          .select("name")
          .eq("id", clinicId)
          .maybeSingle();

        if (qErr) throw qErr;
        if (!cancelled) setName(data?.name ?? null);
      } catch (e) {
        if (!cancelled) {
          setName(null);
          setError(e instanceof Error ? e : new Error(String(e)));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clinicId]);

  return { name, loading, error };
}

/** Atualiza document.title quando a clínica carrega; restaura ao desmontar. */
export function useClinicDocumentTitle(clinicId: string | undefined, clinicName: string | null, loading: boolean) {
  useEffect(() => {
    const previous = document.title;

    if (!clinicId) {
      document.title = DEFAULT_TITLE;
      return () => {
        document.title = previous;
      };
    }

    if (loading) {
      document.title = DEFAULT_TITLE;
      return () => {
        document.title = previous;
      };
    }

    if (clinicName) {
      document.title = `${clinicName} · ${DEFAULT_TITLE}`;
    } else {
      document.title = DEFAULT_TITLE;
    }

    return () => {
      document.title = previous;
    };
  }, [clinicId, clinicName, loading]);
}
