import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import { useResolvedClinic } from "@/hooks/useResolvedClinic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { listSectors, createSector, updateSector, deleteSector } from "@/data/surveyStore";
import type { ClinicSector } from "@/types/survey";
import { Pencil, Trash2, Plus, Building2 } from "lucide-react";
import { toast } from "sonner";

export default function ClinicSectors() {
  const { clinicId, clinicSlug, loading: clinicResolving, isError } = useResolvedClinic();
  const urlSegment = clinicSlug ?? "";
  const [sectors, setSectors] = useState<ClinicSector[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!clinicId) return;
      setLoading(true);
      try {
        const data = await listSectors(clinicId);
        if (!cancelled) setSectors(data);
      } catch {
        if (!cancelled) toast.error("Não foi possível carregar os setores.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clinicId]);

  const handleAdd = async () => {
    if (!clinicId || !newName.trim()) {
      toast.error("Informe o nome do setor.");
      return;
    }
    try {
      await createSector(clinicId, newName.trim());
      setNewName("");
      setSectors(await listSectors(clinicId));
      toast.success("Setor criado.");
    } catch {
      toast.error("Não foi possível criar o setor (nome duplicado?).");
    }
  };

  const startEdit = (s: ClinicSector) => {
    setEditingId(s.id);
    setEditName(s.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const saveEdit = async () => {
    if (!clinicId || !editingId || !editName.trim()) return;
    try {
      await updateSector(editingId, clinicId, { name: editName.trim() });
      cancelEdit();
      setSectors(await listSectors(clinicId));
      toast.success("Setor atualizado.");
    } catch {
      toast.error("Não foi possível salvar.");
    }
  };

  const confirmDelete = async () => {
    if (!clinicId || !deleteId) return;
    try {
      await deleteSector(deleteId, clinicId);
      setDeleteId(null);
      setSectors(await listSectors(clinicId));
      toast.success("Setor removido. Pesquisas vinculadas ficaram sem setor.");
    } catch {
      toast.error("Não foi possível remover o setor.");
    }
  };

  if (clinicResolving) {
    return (
      <AdminLayout>
        <p className="text-muted-foreground">Carregando...</p>
      </AdminLayout>
    );
  }

  if (isError || !clinicId) {
    return (
      <AdminLayout>
        <p className="text-muted-foreground">Clínica não encontrada.</p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Building2 className="w-7 h-7 text-primary" />
              Setores
            </h2>
            <p className="text-muted-foreground">
              Cadastre unidades ou setores para filtrar relatórios e vincular pesquisas.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link to={`/clinicas/${urlSegment}/pesquisa`}>Voltar</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <p className="text-sm font-medium text-foreground">Novo setor</p>
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Radiologia, Laboratório"
                className="flex-1"
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
              <Button type="button" onClick={handleAdd}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <p className="p-6 text-muted-foreground text-sm">Carregando...</p>
            ) : sectors.length === 0 ? (
              <p className="p-6 text-muted-foreground text-sm">Nenhum setor cadastrado.</p>
            ) : (
              <ul className="divide-y divide-border">
                {sectors.map((s) => (
                  <li key={s.id} className="flex items-center gap-2 px-4 py-3">
                    {editingId === s.id ? (
                      <>
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit();
                            if (e.key === "Escape") cancelEdit();
                          }}
                        />
                        <Button size="sm" variant="secondary" onClick={saveEdit}>
                          Salvar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit}>
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 font-medium text-foreground">{s.name}</span>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label="Editar"
                          onClick={() => startEdit(s)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          aria-label="Excluir"
                          onClick={() => setDeleteId(s.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover setor?</AlertDialogTitle>
            <AlertDialogDescription>
              Pesquisas que usam este setor ficarão sem vínculo. Você poderá escolher outro setor ao editar
              cada pesquisa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
