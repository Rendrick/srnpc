import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import { calculateNpsScore, getDistribution } from "@/data/mockNps";
import { getSurveys, getUnifiedResponsesFromStore } from "@/data/surveyStore";
import type { UnifiedNpsResponse } from "@/data/surveyStore";
import type { Survey } from "@/types/survey";
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

async function buildUnifiedResponses(clinicId: string): Promise<UnifiedNpsResponse[]> {
  let fromStore: UnifiedNpsResponse[] = [];
  try {
    fromStore = await getUnifiedResponsesFromStore(clinicId);
  } catch {
    fromStore = [];
  }
  return fromStore.sort((a, b) => b.date.localeCompare(a.date));
}

export default function Reports() {
  const { clinicId } = useParams<{ clinicId: string }>();
  const [periodDays, setPeriodDays] = useState("30");
  const [surveyFilter, setSurveyFilter] = useState("all");
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [allResponses, setAllResponses] = useState<UnifiedNpsResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!clinicId) return;
        const res = await buildUnifiedResponses(clinicId);
        let s: Survey[] = [];
        try {
          s = await getSurveys(clinicId);
        } catch {
          s = [];
        }
        if (cancelled) return;
        setAllResponses(res);
        setSurveys(s);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clinicId]);

  const filtered = useMemo(() => {
    const cutoff = subDays(new Date(), parseInt(periodDays));
    return allResponses.filter((r) => {
      const d = parseISO(r.date);
      if (d < cutoff) return false;
      if (surveyFilter !== "all" && r.surveyId !== surveyFilter) return false;
      return true;
    });
  }, [periodDays, surveyFilter, allResponses]);

  const nps = calculateNpsScore(filtered);
  const dist = getDistribution(filtered);

  const surveyChart = useMemo(() => {
    const surveyIds = [...new Set(filtered.map((r) => r.surveyId))];
    return surveyIds.map((surveyId) => {
      const surveyResponses = filtered.filter((r) => r.surveyId === surveyId);
      const name = surveyResponses[0]?.surveyName ?? "Pesquisa";
      return {
        exam: name,
        nps: calculateNpsScore(surveyResponses),
        count: surveyResponses.length,
      };
    }).filter((row) => row.count > 0);
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
          <Select value={surveyFilter} onValueChange={setSurveyFilter}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Pesquisa" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as pesquisas</SelectItem>
              {surveys.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name} {s.sector ? `(${s.sector})` : ""}</SelectItem>
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

          {/* NPS por Pesquisa */}
          <Card>
            <CardHeader><CardTitle className="text-base">NPS por Pesquisa / Setor</CardTitle></CardHeader>
            <CardContent>
              <ChartContainer config={{ nps: { label: "NPS", color: "hsl(var(--primary))" } }} className="h-[280px]">
                <BarChart data={surveyChart} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" domain={[-100, 100]} />
                  <YAxis type="category" dataKey="exam" width={120} />
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
