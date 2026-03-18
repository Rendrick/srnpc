import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { getCategory, getCategoryLabel, type NpsCategory } from "@/data/mockNps";
import { getSurveys, getUnifiedResponsesFromStore } from "@/data/surveyStore";
import type { UnifiedNpsResponse } from "@/data/surveyStore";
import type { Survey } from "@/types/survey";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

async function buildUnifiedResponses(): Promise<UnifiedNpsResponse[]> {
  let fromStore: UnifiedNpsResponse[] = [];
  try {
    fromStore = await getUnifiedResponsesFromStore();
  } catch {
    fromStore = [];
  }
  return fromStore.sort((a, b) => b.date.localeCompare(a.date));
}

const badgeClass: Record<NpsCategory, string> = {
  promoter: "bg-nps-promoter/15 text-nps-promoter border-nps-promoter/30",
  neutral: "bg-nps-neutral/15 text-nps-neutral border-nps-neutral/30",
  detractor: "bg-nps-detractor/15 text-nps-detractor border-nps-detractor/30",
};

export default function Responses() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [surveyFilter, setSurveyFilter] = useState<string>("all");
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [allResponses, setAllResponses] = useState<UnifiedNpsResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await buildUnifiedResponses();
        const s = await getSurveys();
        if (cancelled) return;
        setAllResponses(res);
        setSurveys(s);
      } catch {
        if (cancelled) return;
        setAllResponses(await buildUnifiedResponses());
        setSurveys([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    return allResponses.filter((r) => {
      if (categoryFilter !== "all" && getCategory(r.score) !== categoryFilter) return false;
      if (surveyFilter !== "all" && r.surveyId !== surveyFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const comment = (r.comment ?? "").toLowerCase();
        const name = r.surveyName.toLowerCase();
        if (!comment.includes(q) && !name.includes(q)) return false;
      }
      return true;
    });
  }, [allResponses, search, categoryFilter, surveyFilter]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Respostas</h2>
          <p className="text-muted-foreground">Todas as avaliações dos pacientes</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por pesquisa ou comentário..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              <SelectItem value="promoter">Promotores</SelectItem>
              <SelectItem value="neutral">Neutros</SelectItem>
              <SelectItem value="detractor">Detratores</SelectItem>
            </SelectContent>
          </Select>
          <Select value={surveyFilter} onValueChange={setSurveyFilter}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Pesquisa" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as pesquisas</SelectItem>
              {surveys.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-lg overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Nota</TableHead>
                <TableHead>Pesquisa / Setor</TableHead>
                <TableHead className="hidden lg:table-cell">Comentário</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 50).map((r) => {
                const cat = getCategory(r.score);
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold text-white ${cat === "promoter" ? "bg-nps-promoter" : cat === "neutral" ? "bg-nps-neutral" : "bg-nps-detractor"}`}>
                        {r.score}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">
                      {r.surveyName}
                      {r.sector ? ` · ${r.sector}` : ""}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell max-w-xs truncate text-muted-foreground">{r.comment ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={badgeClass[cat]}>{getCategoryLabel(cat)}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {format(parseISO(r.date), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {filtered.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">Nenhuma resposta encontrada.</div>
          )}
          {filtered.length > 50 && (
            <div className="text-center py-4 text-sm text-muted-foreground">Mostrando 50 de {filtered.length} respostas</div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
