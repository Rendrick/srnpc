import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClipboardList, CheckCircle2, Send, ThumbsDown, ThumbsUp } from "lucide-react";
import { getSurveyBySlug, addResponse } from "@/data/surveyStore";
import type { Survey, SurveyQuestion } from "@/types/survey";
import { toast } from "sonner";

function getScoreColor(score: number) {
  if (score <= 6) return "bg-nps-detractor text-white";
  if (score <= 8) return "bg-nps-neutral text-white";
  return "bg-nps-promoter text-white";
}

function getScoreHoverColor(score: number) {
  if (score <= 6) return "hover:bg-nps-detractor/80";
  if (score <= 8) return "hover:bg-nps-neutral/80";
  return "hover:bg-nps-promoter/80";
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

function getScoreEmojiContainerClasses(score: number | null) {
  if (score === null) return "bg-muted text-muted-foreground";
  if (score <= 6) return "bg-nps-detractor/10 text-nps-detractor";
  if (score <= 8) return "bg-nps-neutral/10 text-nps-neutral";
  return "bg-nps-promoter/10 text-nps-promoter";
}

export default function PublicSurvey() {
  const { slug, clinicId } = useParams<{ clinicId: string; slug: string }>();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!slug || !clinicId) return;
      try {
        const s = await getSurveyBySlug(slug, clinicId);
        if (!cancelled) setSurvey(s ?? null);
      } catch {
        if (!cancelled) toast.error("Falha ao carregar a pesquisa.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug, clinicId]);

  const setAnswer = (questionId: string, value: string | number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const validate = (): boolean => {
    if (!survey) return false;
    for (const q of survey.questions) {
      if (q.required) {
        const v = answers[q.id];
        if (v === undefined || v === "" || (typeof v === "number" && isNaN(v))) {
          toast.error(`Por favor, responda: ${q.label || "esta pergunta"}`);
          return false;
        }
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!survey) return;
    if (!validate()) return;

    try {
      await addResponse({ surveyId: survey.id, answers });
      setSubmitted(true);
      toast.success("Obrigado pela sua avaliação!");
    } catch {
      toast.error("Não foi possível enviar sua avaliação. Tente novamente.");
    }
  };

  if (!slug || !clinicId) return null;
  if (!survey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-10">
            <p className="text-muted-foreground">Pesquisa não encontrada ou não está publicada.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-10">
            <div className="w-20 h-20 rounded-full bg-nps-promoter/10 flex items-center justify-center mx-auto mb-6 text-4xl">
              😊
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Obrigado!</h2>
            <p className="text-muted-foreground">
              Sua avaliação é muito importante para continuarmos melhorando nosso atendimento.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-lg w-full">
        <CardContent className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{survey.name}</h1>
              <p className="text-xs text-muted-foreground">
                {survey.sector ? `Setor: ${survey.sector}` : "Pesquisa NPS"}
              </p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-6">
            Sua opinião nos ajuda a melhorar! 😊
          </p>

          <div className="space-y-8">
            {survey.questions.map((q) => (
              <QuestionBlock
                key={q.id}
                question={q}
                value={answers[q.id]}
                onChange={(v) => setAnswer(q.id, v)}
              />
            ))}
          </div>

          <Button onClick={handleSubmit} className="w-full mt-6" size="lg">
            <Send className="w-4 h-4 mr-2" />
            Enviar avaliação
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function QuestionBlock({
  question,
  value,
  onChange,
}: {
  question: SurveyQuestion;
  value: string | number | undefined;
  onChange: (v: string | number) => void;
}) {
  if (question.type === "nps") {
    const score = typeof value === "number" ? value : value !== undefined ? Number(value) : null;
    const safeScore = score !== null && Number.isFinite(score) ? score : null;
    return (
      <NpsQuestionBlock
        question={question}
        score={safeScore}
        onChange={onChange}
      />
    );
  }

  if (question.type === "text_short") {
    return (
      <div>
        <label className="text-sm font-medium text-foreground block mb-1.5">
          {question.label}
          {question.required && <span className="text-destructive ml-0.5">*</span>}
        </label>
        <Input
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Sua resposta..."
        />
      </div>
    );
  }

  if (question.type === "text_long") {
    return (
      <div>
        <label className="text-sm font-medium text-foreground block mb-1.5">
          {question.label}
          {question.required && <span className="text-destructive ml-0.5">*</span>}
        </label>
        <Textarea
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Conte-nos mais..."
          rows={3}
        />
      </div>
    );
  }

  if (question.type === "select" && question.options?.length) {
    return (
      <div>
        <label className="text-sm font-medium text-foreground block mb-1.5">
          {question.label}
          {question.required && <span className="text-destructive ml-0.5">*</span>}
        </label>
        <Select
          value={typeof value === "string" ? value : ""}
          onValueChange={(v) => onChange(v)}
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

function NpsQuestionBlock({
  question,
  score,
  onChange,
}: {
  question: SurveyQuestion;
  score: number | null;
  onChange: (v: number) => void;
}) {
  const [flipNonce, setFlipNonce] = useState(0);

  useEffect(() => {
    if (score === null) return;
    setFlipNonce((n) => n + 1);
  }, [score]);

  const emoji = score === null ? "😐" : getScoreEmoji(score);
  const emojiClasses = getScoreEmojiContainerClasses(score);

  return (
    <div>
      <label className="text-sm font-medium text-foreground block mb-2">
        {question.label || "De 0 a 10, qual a probabilidade de você nos recomendar?"}
        {question.required && <span className="text-destructive ml-0.5">*</span>}
      </label>

      <div className="flex items-center justify-center mb-3">
        <div className={`w-24 h-24 rounded-2xl flex items-center justify-center ${emojiClasses} shadow-sm`}>
          <span
            key={flipNonce}
            className="text-5xl nps-emoji-flip"
            role="img"
            aria-label={emoji}
          >
            {emoji}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-11 gap-1.5 mb-2">
        {Array.from({ length: 11 }, (_, i) => {
          const active = score === i;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onChange(i)}
              className={`aspect-square rounded-lg text-sm font-bold transition-all flex flex-col items-center justify-center gap-0
                ${active
                  ? `${getScoreColor(i)} scale-110 shadow-lg`
                  : `bg-muted text-muted-foreground ${getScoreHoverColor(i)} hover:text-white`
                }`}
            >
              <span className="text-lg leading-none">{getScoreEmoji(i)}</span>
              <span className="text-[10px] mt-0.5">{i}</span>
            </button>
          );
        })}
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <ThumbsDown className="w-3 h-3 text-nps-detractor" />
          Nada provável
        </span>
        <span className="flex items-center gap-1">
          <ThumbsUp className="w-3 h-3 text-nps-promoter" />
          Muito provável
        </span>
      </div>
    </div>
  );
}
