import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";

type Clinic = {
  id: string;
  name: string;
  created_at?: string;
};

export default function Clinics() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const supabase = getSupabaseClient();

        const { data: members, error: membersErr } = await supabase
          .from("clinic_members")
          .select("clinic_id")
          .eq("user_id", user.id);
        if (membersErr) throw membersErr;

        const clinicIds = Array.from(new Set((members ?? []).map((m) => m.clinic_id)));
        if (clinicIds.length === 0) {
          if (!cancelled) setClinics([]);
          return;
        }

        const { data: clinicsData, error: clinicsErr } = await supabase
          .from("clinics")
          .select("id, name, created_at")
          .in("id", clinicIds);
        if (clinicsErr) throw clinicsErr;

        const list = (clinicsData ?? []) as Clinic[];

        if (!cancelled) setClinics(list);

        if (!cancelled && list.length === 1) {
          navigate(`/clinicas/${list[0].id}`, { replace: true });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (!cancelled) toast.error(`Falha ao carregar clínicas: ${message}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (clinics.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 space-y-2">
            <h2 className="text-xl font-bold">Nenhuma clínica vinculada</h2>
            <p className="text-sm text-muted-foreground">
              Peça para um superadmin vincular seu usuário a uma clínica.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 flex items-center justify-center">
      <div className="w-full max-w-2xl space-y-4">
        <h2 className="text-2xl font-bold">Escolha sua clínica</h2>
        <div className="grid gap-3">
          {clinics.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.id}</p>
                </div>
                <Button onClick={() => navigate(`/clinicas/${c.id}`)} variant="default">
                  Entrar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

