import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts";
import { ChartContainer } from "@/components/ui/chart";

/** NPS de -100 a 100 mapeado para preenchimento do semicírculo (0–100%). */
export function NpsGaugeWithLabel({ nps, footer }: { nps: number; footer?: string }) {
  const fillPct = Math.max(0, Math.min(100, (nps + 100) / 2));
  const data = [{ name: "nps", value: fillPct }];

  return (
    <div className="relative w-full max-w-[260px] mx-auto">
      <ChartContainer
        config={{ nps: { label: "NPS", color: "hsl(var(--primary))" } }}
        className="aspect-square max-h-[220px] w-full [&_.recharts-responsive-container]:aspect-square"
      >
        <RadialBarChart
          data={data}
          startAngle={180}
          endAngle={0}
          innerRadius="68%"
          outerRadius="100%"
          margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar
            background={{ fill: "hsl(var(--muted))" }}
            dataKey="value"
            cornerRadius={8}
            fill="hsl(var(--primary))"
            className="stroke-transparent"
          />
        </RadialBarChart>
      </ChartContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-[22%] pointer-events-none">
        <p className="text-3xl sm:text-4xl font-extrabold tabular-nums text-foreground leading-none">{nps}</p>
        <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 font-medium uppercase tracking-wide">
          NPS
        </p>
      </div>
      {footer ? (
        <p className="text-center text-xs text-muted-foreground mt-1 px-1">{footer}</p>
      ) : null}
    </div>
  );
}
