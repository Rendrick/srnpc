import { useState, useMemo } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { mockResponses, getCategory, getCategoryLabel, type NpsCategory, type ExamType } from "@/data/mockNps";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const badgeClass: Record<NpsCategory, string> = {
  promoter: "bg-nps-promoter/15 text-nps-promoter border-nps-promoter/30",
  neutral: "bg-nps-neutral/15 text-nps-neutral border-nps-neutral/30",
  detractor: "bg-nps-detractor/15 text-nps-detractor border-nps-detractor/30",
};

export default function Responses() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [examFilter, setExamFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return mockResponses.filter((r) => {
      if (categoryFilter !== "all" && getCategory(r.score) !== categoryFilter) return false;
      if (examFilter !== "all" && r.examType !== examFilter) return false;
      if (search && !r.comment.toLowerCase().includes(search.toLowerCase()) && !r.patientName.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [search, categoryFilter, examFilter]);

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
            <Input placeholder="Buscar por nome ou comentário..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
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
          <Select value={examFilter} onValueChange={setExamFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Exame" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos exames</SelectItem>
              {(["Raio-X", "Tomografia", "Ressonância", "Ultrassom", "Mamografia"] as ExamType[]).map((e) => (
                <SelectItem key={e} value={e}>{e}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-lg overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Nota</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead className="hidden md:table-cell">Exame</TableHead>
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
                    <TableCell className="font-medium">{r.patientName}</TableCell>
                    <TableCell className="hidden md:table-cell">{r.examType}</TableCell>
                    <TableCell className="hidden lg:table-cell max-w-xs truncate text-muted-foreground">{r.comment}</TableCell>
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
