import { useState } from "react";
import { Navigate } from "react-router-dom";
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Acessar Admin</h2>
            <p className="text-sm text-muted-foreground">Use seu email e senha.</p>
          </div>

          <label className="text-sm font-medium text-foreground">Email</label>
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@exemplo.com"
            disabled={loading}
          />

          <label className="text-sm font-medium text-foreground">Senha</label>
          <Input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Sua senha"
            type="password"
            disabled={loading}
          />

          <Button onClick={handleSignInWithPassword} className="w-full" size="lg" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

