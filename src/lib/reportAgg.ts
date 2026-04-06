import type { Survey, SurveyResponse } from "@/types/survey";
import { thumbsRowAnswerKey } from "@/types/survey";

export type ThumbDriverRow = {
  label: string;
  up: number;
  down: number;
  upPct: number;
  downPct: number;
};

function thumbVote(raw: unknown): 0 | 1 | null {
  const v = typeof raw === "number" ? raw : raw !== undefined ? Number(raw) : NaN;
  return v === 0 || v === 1 ? v : null;
}

/** Agrega votos de polegar do primeiro `thumbs_group` de cada pesquisa nas respostas filtradas. */
export function aggregateThumbsByLabels(
  responses: SurveyResponse[],
  surveyById: Map<string, Survey>
): ThumbDriverRow[] {
  const labelAgg = new Map<string, { up: number; down: number }>();

  for (const r of responses) {
    const survey = surveyById.get(r.surveyId);
    if (!survey) continue;
    const tg = survey.questions.find((q) => q.type === "thumbs_group");
    if (!tg?.options?.length) continue;

    tg.options.forEach((label, i) => {
      const v = thumbVote(r.answers[thumbsRowAnswerKey(tg.id, i)]);
      if (v === null) return;
      if (!labelAgg.has(label)) labelAgg.set(label, { up: 0, down: 0 });
      const b = labelAgg.get(label)!;
      if (v === 1) b.up++;
      else b.down++;
    });
  }

  const rows: ThumbDriverRow[] = [];
  for (const [label, { up, down }] of labelAgg) {
    const t = up + down;
    rows.push({
      label,
      up,
      down,
      upPct: t ? Math.round((up / t) * 1000) / 10 : 0,
      downPct: t ? Math.round((down / t) * 1000) / 10 : 0,
    });
  }
  rows.sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  return rows;
}
