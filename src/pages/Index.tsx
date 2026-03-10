import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockResponses, calculateNpsScore, getDistribution } from "@/data/mockNps";
import { Users, TrendingUp, ThumbsUp, ThumbsDown, Minus } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { format, subDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo } from "react";

const npsScore = calculateNpsScore(mockResponses);
const dist = getDistribution(mockResponses);

function getNpsColor(score: number) {
  if (score >= 50) return "text-nps-promoter";
  if (score >= 0) return "text-nps-neutral";
  return "text-nps-detractor";
}

export default function Dashboard() {
  const trendData = useMemo(() => {
    const weeks: { label: string; nps: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const end = subDays(new Date(), i * 7);
      const start = subDays(end, 7);
      const weekResponses = mockResponses.filter((r) => {
        const d = parseISO(r.date);
        return d >= start && d <= end;
      });
      weeks.push({
        label: format(end, "dd/MM", { locale: ptBR }),
        nps: calculateNpsScore(weekResponses),
      });
    }
    return weeks;
  }, []);

  const pieData = [
    { name: "Promotores", value: dist.promoters.count, color: "hsl(var(--nps-promoter))" },
    { name: "Neutros", value: dist.neutrals.count, color: "hsl(var(--nps-neutral))" },
    { name: "Detratores", value: dist.detractors.count, color: "hsl(var(--nps-detractor))" },
  ];

  const avgScore = mockResponses.length
    ? (mockResponses.reduce((s, r) => s + r.score, 0) / mockResponses.length).toFixed(1)
    : "0";

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Dashboard NPS</h2>
          <p className="text-muted-foreground">Visão geral da satisfação dos pacientes</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Score NPS</p>
                  <p className={`text-4xl font-extrabold ${getNpsColor(npsScore)}`}>{npsScore}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Respostas</p>
                  <p className="text-4xl font-extrabold text-foreground">{mockResponses.length}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Média de Notas</p>
                  <p className="text-4xl font-extrabold text-foreground">{avgScore}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <ThumbsUp className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Promotores</p>
                  <p className="text-4xl font-extrabold text-nps-promoter">{dist.promoters.pct}%</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-nps-promoter/10 flex items-center justify-center">
                  <ThumbsUp className="w-6 h-6 text-nps-promoter" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Evolução do NPS (últimas 12 semanas)</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ nps: { label: "NPS", color: "hsl(var(--primary))" } }} className="h-[280px]">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" className="text-xs" />
                  <YAxis domain={[-100, 100]} className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="nps" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Distribuição</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-2">
                {[
                  { label: "Promotores", pct: dist.promoters.pct, icon: ThumbsUp, cls: "text-nps-promoter" },
                  { label: "Neutros", pct: dist.neutrals.pct, icon: Minus, cls: "text-nps-neutral" },
                  { label: "Detratores", pct: dist.detractors.pct, icon: ThumbsDown, cls: "text-nps-detractor" },
                ].map((item) => (
                  <div key={item.label} className="text-center">
                    <item.icon className={`w-4 h-4 mx-auto ${item.cls}`} />
                    <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
                    <p className={`text-sm font-bold ${item.cls}`}>{item.pct}%</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
