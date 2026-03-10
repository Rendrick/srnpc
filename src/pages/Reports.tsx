import { useState, useMemo } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { mockResponses, calculateNpsScore, getDistribution, type ExamType } from "@/data/mockNps";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from "recharts";
import { subDays, parseISO } from "date-fns";
import { ThumbsUp, Minus, ThumbsDown, TrendingUp } from "lucide-react";

const periods = [
  { label: "Últimos 7 dias", days: 7 },
  { label: "Últimos 30 dias", days: 30 },
  { label: "Últimos 90 dias", days: 90 },
];

const examTypes: ExamType[] = ["Raio-X", "Tomografia", "Ressonância", "Ultrassom", "Mamografia"];

export default function Reports() {
  const [periodDays, setPeriodDays] = useState("30");
  const [examFilter, setExamFilter] = useState("all");

  const filtered = useMemo(() => {
    const cutoff = subDays(new Date(), parseInt(periodDays));
    return mockResponses.filter((r) => {
      const d = parseISO(r.date);
      if (d < cutoff) return false;
      if (examFilter !== "all" && r.examType !== examFilter) return false;
      return true;
    });
  }, [periodDays, examFilter]);

  const nps = calculateNpsScore(filtered);
  const dist = getDistribution(filtered);

  const examChart = useMemo(() => {
    return examTypes.map((exam) => {
      const examResponses = filtered.filter((r) => r.examType === exam);
      return {
        exam,
        nps: calculateNpsScore(examResponses),
        count: examResponses.length,
      };
    });
  }, [filtered]);

  const scoreDistribution = useMemo(() => {
    const counts = Array(11).fill(0);
    filtered.forEach((r) => counts[r.score]++);
    return counts.map((count, score) => ({
      score: score.toString(),
      count,
      fill: score >= 9 ? "hsl(var(--nps-promoter))" : score >= 7 ? "hsl(var(--nps-neutral))" : "hsl(var(--nps-detractor))",
    }));
  }, [filtered]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Relatórios</h2>
          <p className="text-muted-foreground">Análise detalhada por período e setor</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={periodDays} onValueChange={setPeriodDays}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {periods.map((p) => (
                <SelectItem key={p.days} value={p.days.toString()}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={examFilter} onValueChange={setExamFilter}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Tipo de exame" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os exames</SelectItem>
              {examTypes.map((e) => (
                <SelectItem key={e} value={e}>{e}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <TrendingUp className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">NPS do período</p>
                <p className="text-3xl font-extrabold text-foreground">{nps}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <ThumbsUp className="w-8 h-8 text-nps-promoter" />
              <div>
                <p className="text-sm text-muted-foreground">Promotores</p>
                <p className="text-3xl font-extrabold text-nps-promoter">{dist.promoters.pct}%</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <Minus className="w-8 h-8 text-nps-neutral" />
              <div>
                <p className="text-sm text-muted-foreground">Neutros</p>
                <p className="text-3xl font-extrabold text-nps-neutral">{dist.neutrals.pct}%</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <ThumbsDown className="w-8 h-8 text-nps-detractor" />
              <div>
                <p className="text-sm text-muted-foreground">Detratores</p>
                <p className="text-3xl font-extrabold text-nps-detractor">{dist.detractors.pct}%</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Score Distribution */}
          <Card>
            <CardHeader><CardTitle className="text-base">Distribuição por Nota</CardTitle></CardHeader>
            <CardContent>
              <ChartContainer config={{ count: { label: "Respostas", color: "hsl(var(--primary))" } }} className="h-[280px]">
                <BarChart data={scoreDistribution}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="score" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {scoreDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* NPS by Exam */}
          <Card>
            <CardHeader><CardTitle className="text-base">NPS por Tipo de Exame</CardTitle></CardHeader>
            <CardContent>
              <ChartContainer config={{ nps: { label: "NPS", color: "hsl(var(--primary))" } }} className="h-[280px]">
                <BarChart data={examChart} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" domain={[-100, 100]} />
                  <YAxis type="category" dataKey="exam" width={100} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="nps" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Relatório gerado com {filtered.length} respostas no período selecionado.
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
