import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import { useResolvedClinic } from "@/hooks/useResolvedClinic";
import { calculateNpsScore, getDistribution } from "@/data/mockNps";
import {
  getSurveys,
  getUnifiedResponsesFromStore,
  getResponses,
  listSectors,
} from "@/data/surveyStore";
import type { UnifiedNpsResponse } from "@/data/surveyStore";
import type { Survey } from "@/types/survey";
import type { SurveyResponse } from "@/types/survey";
import type { ClinicSector } from "@/types/survey";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from "recharts";
import { subDays, parseISO } from "date-fns";
import { ThumbsUp, Minus, ThumbsDown, ExternalLink } from "lucide-react";
import { NpsGaugeWithLabel } from "@/components/reports/NpsGauge";
import { aggregateThumbsByLabels } from "@/lib/reportAgg";

const periods = [
  { label: "Últimos 7 dias", days: 7 },
  { label: "Últimos 30 dias", days: 30 },
  { label: "Últimos 90 dias", days: 90 },
];

function matchesSectorFilter(
  r: UnifiedNpsResponse,
  sectorFilter: string,
  sectors: ClinicSector[]
): boolean {
  if (sectorFilter === "all") return true;
  if (sectorFilter === "__none__") {
    const hasId = r.sectorId != null && r.sectorId !== "";
    const hasLegacyName = (r.sector?.trim() ?? "") !== "";
    return !hasId && !hasLegacyName;
  }
  const sel = sectors.find((s) => s.id === sectorFilter);
  const name = sel?.name?.trim() ?? "";
  if (r.sectorId === sectorFilter) return true;
  if ((r.sectorId == null || r.sectorId === "") && name !== "" && r.sector?.trim() === name) {
    return true;
  }
  return false;
}

function sectorGroupKey(r: UnifiedNpsResponse): string {
  if (r.sectorId) return r.sectorId;
  const t = r.sector?.trim();
  if (t) return `legacy:${t}`;
  return "__none__";
}

function sectorGroupLabel(
  key: string,
  list: UnifiedNpsResponse[],
  sectors: ClinicSector[]
): string {
  if (key === "__none__") return "Sem setor";
  if (key.startsWith("legacy:")) return key.slice(9);
  return sectors.find((s) => s.id === key)?.name || list[0]?.sector || "Setor";
}

export default function Reports() {
  const { clinicId, clinicSlug, loading: clinicResolving, isError } = useResolvedClinic();
  const urlSegment = clinicSlug ?? "";
  const [periodDays, setPeriodDays] = useState("30");
  const [surveyFilter, setSurveyFilter] = useState("all");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [sectors, setSectors] = useState<ClinicSector[]>([]);
  const [allResponses, setAllResponses] = useState<UnifiedNpsResponse[]>([]);
  const [allRaw, setAllRaw] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!clinicId) return;
        const [res, raw, s, sec] = await Promise.all([
          getUnifiedResponsesFromStore(clinicId).catch(() => [] as UnifiedNpsResponse[]),
          getResponses(undefined, clinicId).catch(() => [] as SurveyResponse[]),
          getSurveys(clinicId).catch(() => [] as Survey[]),
          listSectors(clinicId).catch(() => [] as ClinicSector[]),
        ]);
        if (cancelled) return;
        setAllResponses(res.sort((a, b) => b.date.localeCompare(a.date)));
        setAllRaw(raw);
        setSurveys(s);
        setSectors(sec);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clinicId]);

  const surveyById = useMemo(() => new Map(surveys.map((s) => [s.id, s])), [surveys]);

  const filtered = useMemo(() => {
    const cutoff = subDays(new Date(), parseInt(periodDays, 10));
    return allResponses.filter((r) => {
      const d = parseISO(r.date);
      if (d < cutoff) return false;
      if (surveyFilter !== "all" && r.surveyId !== surveyFilter) return false;
      if (!matchesSectorFilter(r, sectorFilter, sectors)) return false;
      return true;
    });
  }, [periodDays, surveyFilter, sectorFilter, allResponses, sectors]);

  const filteredRaw = useMemo(() => {
    const ids = new Set(filtered.map((r) => r.id));
    return allRaw.filter((r) => ids.has(r.id));
  }, [filtered, allRaw]);

  const nps = calculateNpsScore(filtered);
  const dist = getDistribution(filtered);

  const thumbDrivers = useMemo(
    () => aggregateThumbsByLabels(filteredRaw, surveyById),
    [filteredRaw, surveyById]
  );

  const sectorRanking = useMemo(() => {
    const groups = new Map<string, UnifiedNpsResponse[]>();
    for (const r of filtered) {
      const k = sectorGroupKey(r);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(r);
    }
    const rows = [...groups.entries()].map(([key, list]) => {
      const d = getDistribution(list);
      return {
        key,
        label: sectorGroupLabel(key, list, sectors),
        nps: calculateNpsScore(list),
        count: list.length,
        dist: d,
      };
    });
    rows.sort((a, b) => b.count - a.count);
    return rows;
  }, [filtered, sectors]);

  const scoreDistribution = useMemo(() => {
    const counts = Array(11).fill(0);
    filtered.forEach((r) => {
      counts[r.score]++;
    });
    return counts.map((count, score) => ({
      score: score.toString(),
      count,
      fill:
        score >= 9 ? "hsl(var(--nps-promoter))" : score >= 7 ? "hsl(var(--nps-neutral))" : "hsl(var(--nps-detractor))",
    }));
  }, [filtered]);

  if (clinicResolving || loading) {
    return (
      <AdminLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
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
      <div className="space-y-6 max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Relatórios</h2>
            <p className="text-muted-foreground">NPS, motivadores (polegares) e desempenho por setor</p>
          </div>
          {urlSegment ? (
            <ButtonLink to={`/clinicas/${urlSegment}/respostas`}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Ver no extrato
            </ButtonLink>
          ) : null}
        </div>

        <div className="flex flex-col flex-wrap gap-3 sm:flex-row">
          <Select value={periodDays} onValueChange={setPeriodDays}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periods.map((p) => (
                <SelectItem key={p.days} value={p.days.toString()}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={surveyFilter} onValueChange={setSurveyFilter}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Pesquisa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as pesquisas</SelectItem>
              {surveys.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} {s.sector ? `(${s.sector})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sectorFilter} onValueChange={setSectorFilter}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Setor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os setores</SelectItem>
              <SelectItem value="__none__">Sem setor</SelectItem>
              {sectors.map((sec) => (
                <SelectItem key={sec.id} value={sec.id}>
                  {sec.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Resumo NPS</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <NpsGaugeWithLabel
                nps={nps}
                footer={`Total de avaliações: ${filtered.length}`}
              />
              <p className="text-center text-xs text-muted-foreground">Erro amostral: —</p>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border border-border bg-card p-3">
                  <ThumbsUp className="w-5 h-5 text-nps-promoter mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Promotor</p>
                  <p className="text-lg font-bold text-nps-promoter">{dist.promoters.pct}%</p>
                  <p className="text-[10px] text-muted-foreground">{dist.promoters.count}</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                  <Minus className="w-5 h-5 text-nps-neutral mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Neutro</p>
                  <p className="text-lg font-bold text-nps-neutral">{dist.neutrals.pct}%</p>
                  <p className="text-[10px] text-muted-foreground">{dist.neutrals.count}</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                  <ThumbsDown className="w-5 h-5 text-nps-detractor mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Detrator</p>
                  <p className="text-lg font-bold text-nps-detractor">{dist.detractors.pct}%</p>
                  <p className="text-[10px] text-muted-foreground">{dist.detractors.count}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Motivadores (Like e dislike)</CardTitle>
              <p className="text-xs text-muted-foreground font-normal">
                Agregado das categorias com polegares nas pesquisas do filtro.
              </p>
            </CardHeader>
            <CardContent>
              {thumbDrivers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  Nenhum dado de polegares no período ou pesquisas sem bloco de categorias.
                </p>
              ) : (
                <ul className="space-y-4">
                  {thumbDrivers.map((row) => (
                    <li key={row.label}>
                      <div className="flex justify-between text-sm gap-4 mb-1">
                        <span className="font-medium text-foreground truncate">{row.label}</span>
                        <span className="text-muted-foreground shrink-0">
                          <span className="text-nps-promoter font-medium">{row.upPct}%</span>
                          {" · "}
                          <span className="text-nps-detractor font-medium">{row.downPct}%</span>
                        </span>
                      </div>
                      <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-muted">
                        <div
                          className="h-full bg-nps-promoter transition-all"
                          style={{ width: `${row.upPct}%` }}
                        />
                        <div
                          className="h-full bg-nps-detractor transition-all"
                          style={{ width: `${row.downPct}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {row.up} positivo · {row.down} negativo
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Ranking por setor / unidade</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {sectorRanking.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground text-center">
                Nenhuma resposta no filtro atual.
              </p>
            ) : (
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left p-3 font-medium">Grupo / Unidade</th>
                    <th className="text-left p-3 font-medium w-[140px]">NPS</th>
                    <th className="text-left p-3 font-medium min-w-[200px]">Sentimento</th>
                    <th className="text-right p-3 font-medium w-[100px]">Transações</th>
                  </tr>
                </thead>
                <tbody>
                  {sectorRanking.map((row) => {
                    const t = row.dist.promoters.count + row.dist.neutrals.count + row.dist.detractors.count || 1;
                    const pw = (row.dist.promoters.count / t) * 100;
                    const nw = (row.dist.neutrals.count / t) * 100;
                    const dw = (row.dist.detractors.count / t) * 100;
                    const npsBar = ((row.nps + 100) / 200) * 100;
                    return (
                      <tr key={row.key} className="border-b border-border">
                        <td className="p-3 font-semibold text-primary">{row.label}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden min-w-[72px]">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${Math.min(100, Math.max(0, npsBar))}%` }}
                              />
                            </div>
                            <span className="tabular-nums font-semibold w-10 text-right">{row.nps}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="h-2.5 rounded-full overflow-hidden flex">
                            <div className="h-full bg-nps-promoter" style={{ width: `${pw}%` }} />
                            <div className="h-full bg-nps-neutral" style={{ width: `${nw}%` }} />
                            <div className="h-full bg-nps-detractor" style={{ width: `${dw}%` }} />
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            P {row.dist.promoters.pct}% · N {row.dist.neutrals.pct}% · D{" "}
                            {row.dist.detractors.pct}%
                          </p>
                        </td>
                        <td className="p-3 text-right tabular-nums">{row.count}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição por nota (0–10)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ count: { label: "Respostas", color: "hsl(var(--primary))" } }}
              className="h-[260px] w-full min-w-0"
            >
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
      </div>
    </AdminLayout>
  );
}

function ButtonLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center justify-center rounded-md text-sm font-medium text-primary underline-offset-4 hover:underline"
    >
      {children}
    </Link>
  );
}
