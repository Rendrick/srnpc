import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";

export default function Login() {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleSignInWithPassword = async () => {
    const e = email.trim();
    const p = password.trim();
    if (!e || !p) {
      toast.error("Informe seu email e sua senha.");
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: e,
        password: p,
      });
      if (error) throw error;
      toast.success("Login realizado.");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`Falha ao entrar: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md border-border/80 shadow-lg">
        <CardContent className="p-8 space-y-6">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-sm">
              <Activity className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">ServiceRapide NPS</h1>
              <p className="text-sm text-muted-foreground mt-1">Acesse a área administrativa com seu email e senha.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email</label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
                disabled={loading}
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Senha</label>
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha"
                type="password"
                disabled={loading}
                autoComplete="current-password"
              />
            </div>

            <Button onClick={handleSignInWithPassword} className="w-full" size="lg" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
