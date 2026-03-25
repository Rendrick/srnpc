import { useEffect, useMemo, useState } from "react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { useAuth } from "@/lib/AuthContext";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

type Clinic = { id: string; name: string; created_at?: string };
type Member = { clinic_id: string; user_id: string; role: string; created_at?: string };

/** Apenas operações que exigem Admin API (service role na Edge Function). */
async function invokeAuthAdmin(action: string, payload?: Record<string, unknown>) {
  const supabase = getSupabaseClient();
  const invokeWithToken = async (accessToken: string) => {
    const { data: responseData, error } = await supabase.functions.invoke("superadmin", {
      body: { action, ...(payload ?? {}) },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return { responseData, error };
  };

  const getErrorMessage = async (error: unknown) => {
    if (error instanceof FunctionsHttpError) {
      const body = await error.context.json().catch(() => ({} as { error?: string; message?: string }));
      return body?.error || body?.message || error.message;
    }
    if (error instanceof Error) return error.message;
    return "Falha na operação";
  };

  let {
    data: { session },
  } = await supabase.auth.getSession();
  let accessToken = session?.access_token;
  if (!accessToken) {
    const refreshed = await supabase.auth.refreshSession();
    accessToken = refreshed.data.session?.access_token ?? null;
  }
  if (!accessToken) throw new Error("Sessão inválida. Faça login novamente.");

  let { responseData, error } = await invokeWithToken(accessToken);
  if (error) {
    const firstError = await getErrorMessage(error);
    if (firstError.toLowerCase().includes("invalid jwt")) {
      const refreshed = await supabase.auth.refreshSession();
      const renewedToken = refreshed.data.session?.access_token;
      if (!renewedToken) throw new Error("Sessão expirada. Faça login novamente.");
      const retry = await invokeWithToken(renewedToken);
      responseData = retry.responseData;
      error = retry.error;
    }
  }

  if (error) throw new Error(await getErrorMessage(error));

  return (responseData ?? {}) as Record<string, unknown>;
}

export default function Superadmin() {
  const navigate = useNavigate();
  const { loading } = useAuth();

  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [clinicId, setClinicId] = useState<string>("");

  const [clinicName, setClinicName] = useState("");
  const [clinicNameToUpdate, setClinicNameToUpdate] = useState("");

  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");

  const [userId, setUserId] = useState("");
  const [memberRole, setMemberRole] = useState("member");

  const [createdUserId, setCreatedUserId] = useState<string>("");
  const [status, setStatus] = useState<string>("");

  const canUse = useMemo(() => !loading, [loading]);

  const refreshClinics = async () => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("clinics")
      .select("id, name, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const next = (data ?? []) as Clinic[];
    setClinics(next);
    if (next[0]?.id) setClinicId(next[0].id);
  };

  const refreshMembers = async (id: string) => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("clinic_members")
      .select("clinic_id, user_id, role, created_at")
      .eq("clinic_id", id);
    if (error) throw new Error(error.message);
    setMembers((data ?? []) as Member[]);
  };

  useEffect(() => {
    if (!canUse) return;

    let cancelled = false;
    (async () => {
      try {
        await refreshClinics();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (!cancelled) toast.error(message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [canUse]);

  useEffect(() => {
    if (!canUse) return;
    if (!clinicId) return;

    let cancelled = false;
    (async () => {
      try {
        await refreshMembers(clinicId);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (!cancelled) toast.error(message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [canUse, clinicId]);

  const handleCreateClinic = async () => {
    const name = clinicName.trim();
    if (!name) {
      toast.error("Informe o nome da clínica.");
      return;
    }

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from("clinics").insert({ name }).select("id, name, created_at").single();
      if (error) throw new Error(error.message);
      setClinicName("");
      setStatus("Clínica criada.");
      await refreshClinics();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message);
    }
  };

  const handleUpdateClinic = async () => {
    try {
      const supabase = getSupabaseClient();
      const name = clinicNameToUpdate.trim();
      if (!clinicId || !name) {
        toast.error("Selecione a clínica e informe o novo nome.");
        return;
      }
      const { error } = await supabase.from("clinics").update({ name }).eq("id", clinicId);
      if (error) throw new Error(error.message);
      setClinicNameToUpdate("");
      setStatus("Clínica atualizada.");
      await refreshClinics();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message);
    }
  };

  const handleDeleteClinic = async (id: string) => {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from("clinics").delete().eq("id", id);
      if (error) throw new Error(error.message);
      setStatus("Clínica removida.");
      await refreshClinics();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message);
    }
  };

  const handleCreateUser = async () => {
    try {
      const json = await invokeAuthAdmin("create_user", { email: userEmail, password: userPassword });
      const created = json.user as { id?: string } | undefined;
      const id = created?.id ?? "";
      setCreatedUserId(id);
      setUserId(id);
      setUserPassword("");
      setStatus("Usuário criado.");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message);
    }
  };

  const handleDeleteUser = async () => {
    if (!userId) return toast.error("Informe o userId para deletar.");
    try {
      await invokeAuthAdmin("delete_user", { userId });
      setStatus("Usuário removido.");
      setUserId("");
      setCreatedUserId("");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message);
    }
  };

  const handleSetSuperadmin = async (isSuper: boolean) => {
    if (!userId) return toast.error("Informe o userId para definir superadmin.");
    try {
      const supabase = getSupabaseClient();
      if (isSuper) {
        const { error } = await supabase.from("superadmins").upsert({ user_id: userId }, { onConflict: "user_id" });
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("superadmins").delete().eq("user_id", userId);
        if (error) throw new Error(error.message);
      }
      setStatus(isSuper ? "Promovido a superadmin." : "Removido de superadmin.");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message);
    }
  };

  const handleAddMember = async () => {
    if (!clinicId) return toast.error("Selecione a clínica.");
    if (!userId) return toast.error("Informe o userId para associar.");
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from("clinic_members").insert({
        clinic_id: clinicId,
        user_id: userId,
        role: memberRole.trim() || "member",
      });
      if (error) throw new Error(error.message);
      setStatus("Membro associado.");
      await refreshMembers(clinicId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message);
    }
  };

  const handleRemoveMember = async () => {
    if (!clinicId) return toast.error("Selecione a clínica.");
    if (!userId) return toast.error("Informe o userId para remover.");
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from("clinic_members").delete().eq("clinic_id", clinicId).eq("user_id", userId);
      if (error) throw new Error(error.message);
      setStatus("Membro removido.");
      await refreshMembers(clinicId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="flex flex-col gap-6 max-w-4xl mx-auto">
        <div>
          <h2 className="text-2xl font-bold">Superadmin</h2>
          <p className="text-muted-foreground">
            Gerencie clínicas, associações e contas de usuários.
          </p>
          {status ? <p className="mt-2 text-sm text-foreground/80">{status}</p> : null}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-1">
                <h3 className="font-semibold">Clínicas</h3>
                <p className="text-sm text-muted-foreground">Criar/editar/apagar</p>
              </div>

              <div className="space-y-2">
                <Input value={clinicName} onChange={(e) => setClinicName(e.target.value)} placeholder="Nome da clínica" />
                <Button onClick={handleCreateClinic}>Criar clínica</Button>
              </div>

              <div className="space-y-2">
                <Select value={clinicId} onValueChange={setClinicId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a clínica" />
                  </SelectTrigger>
                  <SelectContent>
                    {clinics.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  value={clinicNameToUpdate}
                  onChange={(e) => setClinicNameToUpdate(e.target.value)}
                  placeholder="Novo nome (atualizar a clínica selecionada)"
                  disabled={!clinicId}
                />
                <Button onClick={handleUpdateClinic} disabled={!clinicId || !clinicNameToUpdate}>
                  Atualizar
                </Button>
              </div>

              <div className="space-y-2">
                {clinics.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma clínica encontrada.</p>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-auto pr-1">
                    {clinics.map((c) => (
                      <div key={c.id} className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{c.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{c.id}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteClinic(c.id)}>
                          Apagar
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-1">
                <h3 className="font-semibold">Usuários</h3>
                <p className="text-sm text-muted-foreground">Criar e controlar superadmin</p>
              </div>

              <div className="space-y-2">
                <Input value={userEmail} onChange={(e) => setUserEmail(e.target.value)} placeholder="email@exemplo.com" />
                <Input
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  placeholder="Senha (necessária para criar usuário via admin auth)"
                  type="password"
                />
                <Button onClick={handleCreateUser} disabled={!userEmail || !userPassword}>
                  Criar usuário
                </Button>
              </div>

              <div className="space-y-2">
                <Input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="userId (UUID do Auth)" />
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" onClick={() => handleSetSuperadmin(true)} disabled={!userId}>
                    Marcar superadmin
                  </Button>
                  <Button variant="outline" onClick={() => handleSetSuperadmin(false)} disabled={!userId}>
                    Remover superadmin
                  </Button>
                  <Button variant="destructive" onClick={handleDeleteUser} disabled={!userId}>
                    Apagar usuário
                  </Button>
                </div>

                {createdUserId ? <p className="text-sm text-muted-foreground">Criado: {createdUserId}</p> : null}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-1">
              <h3 className="font-semibold">Associações (membros por clínica)</h3>
              <p className="text-sm text-muted-foreground">Adicionar/remover membros</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="userId do membro" />
              <Input value={memberRole} onChange={(e) => setMemberRole(e.target.value)} placeholder="role (ex.: member)" />
              <div className="flex gap-2 flex-wrap">
                <Button onClick={handleAddMember} disabled={!clinicId || !userId}>
                  Adicionar
                </Button>
                <Button variant="outline" onClick={handleRemoveMember} disabled={!clinicId || !userId}>
                  Remover
                </Button>
              </div>
            </div>

            <div className="max-h-64 overflow-auto border rounded-lg">
              <div className="p-3 text-sm font-medium border-b bg-card/50">Membros</div>
              <div className="p-3 space-y-2">
                {members.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem membros nesta clínica.</p>
                ) : (
                  members.map((m) => (
                    <div key={`${m.clinic_id}-${m.user_id}`} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{m.user_id}</p>
                        <p className="text-xs text-muted-foreground truncate">{m.role}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <Button variant="outline" onClick={() => navigate("/clinicas")} className="w-full">
              Voltar para seleção
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
