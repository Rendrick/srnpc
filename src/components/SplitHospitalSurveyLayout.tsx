import { ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type Survey, type SurveyQuestion, thumbsRowAnswerKey } from "@/types/survey";

const TEAL = "#0099BC";

/** Fundo do painel NPS: teal padrão; após escolha, tons mais escuros para contraste com texto branco. */
function getLeftPanelBackground(score: number | null): string {
  if (score === null) return TEAL;
  if (score <= 6) return "#b91c1c";
  if (score <= 8) return "#c2410c";
  return "#047857";
}

function getScoreEmoji(score: number): string {
  if (score === 0) return "😡";
  if (score === 1) return "😠";
  if (score === 2) return "😫";
  if (score === 3) return "😞";
  if (score >= 4 && score <= 6) return "🙁";
  if (score === 7) return "😐";
  if (score === 8) return "🙂";
  if (score === 9) return "😊";
  return "😍";
}

function NpsLabelWithName({ text, name }: { text: string; name: string }) {
  const token = "{{nome}}";
  if (!text.includes(token)) {
    return (
      <span className="text-sm sm:text-base text-center text-balance block">{text}</span>
    );
  }
  const parts = text.split(token);
  return (
    <span className="text-sm sm:text-base leading-snug block text-center text-balance">
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 ? (
            <strong className="font-semibold block sm:inline text-lg sm:text-xl mt-1 sm:mt-0">
              {name}
            </strong>
          ) : null}
        </span>
      ))}
    </span>
  );
}

function NeutralFaceOutline({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="50" cy="50" r="38" stroke="currentColor" strokeWidth="3" />
      <circle cx="38" cy="42" r="3" fill="currentColor" stroke="none" />
      <circle cx="62" cy="42" r="3" fill="currentColor" stroke="none" />
      <line
        x1="32"
        y1="60"
        x2="68"
        y2="60"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SplitRightQuestionBlock({
  question,
  answers,
  setAnswer,
}: {
  question: SurveyQuestion;
  answers: Record<string, string | number>;
  setAnswer: (key: string, value: string | number) => void;
}) {
  if (question.type === "thumbs_group") {
    const opts = question.options?.length ? question.options : [];
    return (
      <div className="space-y-0">
        {opts.map((label, i) => {
          const key = thumbsRowAnswerKey(question.id, i);
          const raw = answers[key];
          const v = typeof raw === "number" ? raw : raw !== undefined ? Number(raw) : undefined;
          const selected = v === 0 || v === 1 ? v : null;
          return (
            <div
              key={key}
              className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between py-3 border-b border-slate-200 first:pt-0 last:border-b-0"
            >
              <span className="text-sm text-foreground font-medium min-w-0">{label}</span>
              <div className="flex rounded-xl border border-slate-300 overflow-hidden bg-slate-50 shrink-0 self-end sm:self-auto touch-manipulation shadow-sm">
                <button
                  type="button"
                  aria-label={`${label}: não gostei`}
                  onClick={() => setAnswer(key, 0)}
                  className={`min-h-[44px] min-w-[48px] px-3 py-2 flex items-center justify-center transition-colors active:opacity-90 ${
                    selected === 0 ? "bg-amber-300" : "hover:bg-amber-100/80"
                  }`}
                >
                  <ThumbsDown className="w-6 h-6 text-amber-900" strokeWidth={2.4} />
                </button>
                <div className="w-px bg-slate-300" />
                <button
                  type="button"
                  aria-label={`${label}: gostei`}
                  onClick={() => setAnswer(key, 1)}
                  className={`min-h-[44px] min-w-[48px] px-3 py-2 flex items-center justify-center transition-colors active:opacity-90 ${
                    selected === 1 ? "bg-emerald-600" : "hover:bg-emerald-200/90"
                  }`}
                >
                  <ThumbsUp
                    className={`w-6 h-6 stroke-[2.4] ${selected === 1 ? "text-white" : "text-emerald-900"}`}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (question.type === "text_short") {
    const val = answers[question.id];
    return (
      <div>
        {question.label ? (
          <label className="text-xs text-slate-500 block mb-1.5">
            {question.label}
            {question.required && <span className="text-destructive ml-0.5">*</span>}
          </label>
        ) : null}
        <Input
          value={typeof val === "string" ? val : ""}
          onChange={(e) => setAnswer(question.id, e.target.value)}
          placeholder="Sua resposta..."
        />
      </div>
    );
  }

  if (question.type === "text_long") {
    const val = answers[question.id];
    return (
      <div>
        <label className="text-xs text-slate-500 block mb-1.5">
          {question.label || "Como podemos melhorar?"}
          {question.required && <span className="text-destructive ml-0.5">*</span>}
        </label>
        <Textarea
          value={typeof val === "string" ? val : ""}
          onChange={(e) => setAnswer(question.id, e.target.value)}
          placeholder={question.label || "Como podemos melhorar?"}
          rows={4}
          className="border-slate-200 resize-y min-h-[100px]"
        />
      </div>
    );
  }

  if (question.type === "select" && question.options?.length) {
    const val = answers[question.id];
    return (
      <div>
        <label className="text-xs text-slate-500 block mb-1.5">
          {question.label}
          {question.required && <span className="text-destructive ml-0.5">*</span>}
        </label>
        <Select
          value={typeof val === "string" ? val : ""}
          onValueChange={(v) => setAnswer(question.id, v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            {question.options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return null;
}

export function SplitHospitalSurveyLayout({
  survey,
  splitNps,
  answers,
  setAnswer,
  onSubmit,
}: {
  survey: Survey;
  splitNps: SurveyQuestion;
  answers: Record<string, string | number>;
  setAnswer: (key: string, value: string | number) => void;
  onSubmit: () => void;
}) {
  const rightQuestions = survey.questions.filter((q) => q.id !== splitNps.id);

  const rawNps = answers[splitNps.id];
  const score =
    typeof rawNps === "number" ? rawNps : rawNps !== undefined ? Number(rawNps) : null;
  const safeScore = score !== null && Number.isFinite(score) ? score : null;

  const defaultNpsCopy =
    "De 0 a 10, o quanto você recomendaria {{nome}} para um amigo ou familiar?";

  const panelBg = getLeftPanelBackground(safeScore);

  return (
    <div className="min-h-screen min-h-dvh flex items-stretch sm:items-center justify-center bg-slate-100 py-3 px-2 sm:p-4 overflow-x-hidden">
      <div
        className="w-full max-w-4xl min-w-0 rounded-xl sm:rounded-2xl shadow-lg overflow-hidden flex flex-col md:flex-row bg-white"
        style={{ boxShadow: "0 10px 40px -10px rgba(0,0,0,0.15)" }}
      >
        {/* Coluna esquerda — NPS */}
        <div
          className="flex-1 flex flex-col text-white px-4 py-6 sm:px-8 sm:py-10 min-h-0 min-w-0 transition-colors duration-300 md:min-h-[480px]"
          style={{ backgroundColor: panelBg }}
        >
          <div className="text-center shrink-0">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-3 sm:mb-4">
              Avalie
            </h2>
            <NpsLabelWithName
              text={splitNps.label?.trim() ? splitNps.label : defaultNpsCopy}
              name={survey.name}
            />
          </div>

          <div className="flex flex-1 flex-col items-center justify-center w-full min-h-[9rem] sm:min-h-[11rem] py-4 sm:py-6">
            {safeScore === null ? (
              <NeutralFaceOutline className="w-[7.5rem] h-[7.5rem] sm:w-[10rem] sm:h-[10rem] md:w-[11rem] md:h-[11rem] text-white opacity-95 shrink-0" />
            ) : (
              <span
                className="text-[5.5rem] leading-none sm:text-[6.5rem] md:text-8xl select-none"
                style={{ lineHeight: 1 }}
                role="img"
                aria-hidden
              >
                {getScoreEmoji(safeScore)}
              </span>
            )}
          </div>

          <div className="mt-auto shrink-0 pt-2">
            <div className="relative pb-6 sm:pb-5">
              <div className="grid grid-cols-11 gap-px sm:gap-0.5 text-center w-full min-w-0">
                {Array.from({ length: 11 }, (_, i) => {
                  const active = safeScore === i;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setAnswer(splitNps.id, i)}
                      className={`touch-manipulation min-h-[44px] flex items-center justify-center text-[11px] sm:text-sm font-semibold rounded-md transition-colors ${
                        active ? "bg-white/25 text-white" : "text-white/90 hover:bg-white/10 active:bg-white/15"
                      }`}
                    >
                      {i}
                    </button>
                  );
                })}
              </div>
              {safeScore !== null && (
                <div
                  className="absolute bottom-0 left-0 h-0 w-0 border-l-[7px] border-r-[7px] border-b-[9px] border-l-transparent border-r-transparent z-10"
                  style={{
                    borderBottomColor: "white",
                    left: `${((safeScore + 0.5) / 11) * 100}%`,
                    transform: "translateX(-50%)",
                  }}
                  aria-hidden
                />
              )}
            </div>
          </div>
        </div>

        {/* Coluna direita — opinião */}
        <div className="flex-1 bg-white px-4 py-6 sm:px-8 sm:py-10 flex flex-col min-w-0">
          <p className="text-center text-sm text-slate-500 mb-4 sm:mb-6">Deixe sua opinião</p>

          <div className="flex-1 space-y-6">
            {rightQuestions.map((q) => (
              <SplitRightQuestionBlock
                key={q.id}
                question={q}
                answers={answers}
                setAnswer={setAnswer}
              />
            ))}
          </div>

          <Button
            type="button"
            onClick={onSubmit}
            className="mt-6 sm:mt-8 w-full rounded-full py-5 sm:py-6 text-base font-bold tracking-wide uppercase text-white shadow-md border-0 hover:opacity-95 touch-manipulation min-h-[48px]"
            style={{ backgroundColor: TEAL }}
          >
            Enviar
          </Button>
        </div>
      </div>
    </div>
  );
}
