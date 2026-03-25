import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity } from "lucide-react";
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Activity className="w-5 h-5 animate-pulse" />
          <span>Carregando...</span>
        </div>
      </div>
    );
  }

  if (clinics.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-md border-border/80 shadow-lg">
          <CardContent className="p-8 space-y-3 text-center">
            <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Activity className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-xl font-semibold tracking-tight">ServiceRapide NPS</h2>
            <p className="text-sm font-medium text-foreground">Nenhuma clínica vinculada</p>
            <p className="text-sm text-muted-foreground">
              Peça para um superadmin vincular seu usuário a uma clínica.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-6 flex flex-col items-center justify-center">
      <div className="w-full max-w-2xl space-y-8">
        <header className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground shadow-sm mx-auto">
            <Activity className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">ServiceRapide NPS</h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Escolha a clínica em que deseja trabalhar.
          </p>
        </header>
        <div className="grid gap-3">
          {clinics.map((c) => (
            <Card key={c.id} className="border-border/80 shadow-sm transition-shadow hover:shadow-md">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground truncate font-mono">{c.id}</p>
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
