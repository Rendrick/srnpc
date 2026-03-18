import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardPlus, Pencil, Link2, Trash2 } from "lucide-react";
import { getSurveys, deleteSurvey } from "@/data/surveyStore";
import type { Survey } from "@/types/survey";
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
import { toast } from "sonner";

export default function SurveyList() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getSurveys();
        if (!cancelled) setSurveys(data);
      } catch (e) {
        toast.error("Falha ao carregar as pesquisas.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await deleteSurvey(id);
      const data = await getSurveys();
      setSurveys(data);
      toast.success("Pesquisa removida.");
    } catch {
      toast.error("Não foi possível remover a pesquisa.");
    } finally {
      setDeleteId(null);
    }
  };

  const copyPublicUrl = (slug: string) => {
    const url = `${window.location.origin}/p/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Pesquisas</h2>
            <p className="text-muted-foreground">Crie e gerencie pesquisas NPS por setor</p>
          </div>
          <Button asChild>
            <Link to="/pesquisa/nova">
              <ClipboardPlus className="w-4 h-4 mr-2" />
              Nova pesquisa
            </Link>
          </Button>
        </div>

        {loading ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-muted-foreground">Carregando...</p>
            </CardContent>
          </Card>
        ) : surveys.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-muted-foreground mb-4">Nenhuma pesquisa criada ainda.</p>
              <Button asChild>
                <Link to="/pesquisa/nova">
                  <ClipboardPlus className="w-4 h-4 mr-2" />
                  Criar primeira pesquisa
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {surveys.map((survey) => (
              <Card key={survey.id}>
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{survey.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Setor: {survey.sector || "—"} · {survey.questions.length} pergunta(s)
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={survey.status === "published" ? "default" : "secondary"}>
                      {survey.status === "published" ? "Publicada" : "Rascunho"}
                    </Badge>
                    <Button variant="outline" size="icon" asChild>
                      <Link to={`/pesquisa/${survey.id}/editar`} title="Editar">
                        <Pencil className="w-4 h-4" />
                      </Link>
                    </Button>
                    {survey.status === "published" && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyPublicUrl(survey.slug)}
                        title="Copiar link"
                      >
                        <Link2 className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(survey.id)}
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pesquisa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. As respostas desta pesquisa também serão removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
