import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronUp,
  ChevronDown,
  Trash2,
  Plus,
  Save,
  Send,
} from "lucide-react";
import {
  getSurveyById,
  saveSurvey,
  createSurvey,
  slugify,
  isSlugAvailable,
  generateQuestionId,
} from "@/data/surveyStore";
import type { Survey, SurveyQuestion, QuestionType } from "@/types/survey";
import { toast } from "sonner";

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "nps", label: "NPS (0 a 10)" },
  { value: "text_short", label: "Texto curto" },
  { value: "text_long", label: "Parágrafo" },
  { value: "select", label: "Múltipla escolha" },
];

function addQuestion(type: QuestionType): SurveyQuestion {
  return {
    id: generateQuestionId(),
    type,
    label: "",
    required: false,
    ...(type === "select" ? { options: ["Opção 1", "Opção 2"] } : {}),
  };
}

export default function SurveyEdit() {
  const { clinicId, id } = useParams<{ clinicId: string; id?: string }>();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [sector, setSector] = useState("");
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [publishedLink, setPublishedLink] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!clinicId) return;

      if (!id) {
        setSurvey(null);
        setName("");
        setSector("");
        setQuestions([]);
        setPublishedLink(null);
        return;
      }

      setLoading(true);
      try {
        const s = await getSurveyById(id, clinicId);
        if (cancelled) return;

        if (s) {
          setSurvey(s);
          setName(s.name);
          setSector(s.sector);
          setQuestions(s.questions);
          setPublishedLink(
            s.status === "published" ? `${window.location.origin}/p/${clinicId}/${s.slug}` : null
          );
        } else {
          toast.error("Pesquisa não encontrada.");
          navigate(`/clinicas/${clinicId}/pesquisa`);
        }
      } catch {
        toast.error("Falha ao carregar a pesquisa.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, clinicId, navigate]);

  const handleSaveDraft = async () => {
    const slug = survey?.slug ?? slugify(name || sector || "pesquisa");
    const baseSlug = slug;
    let finalSlug = baseSlug;
    let n = 0;
    while (!(await isSlugAvailable(finalSlug, clinicId ?? survey?.clinicId ?? "", survey?.id))) {
      finalSlug = `${baseSlug}-${++n}`;
    }
    const toSave: Survey = {
      id: survey?.id ?? `survey-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      clinicId: clinicId ?? survey?.clinicId ?? "",
      slug: finalSlug,
      name: name || "Nova pesquisa",
      sector,
      questions,
      status: survey?.status ?? "draft",
      createdAt: survey?.createdAt ?? new Date().toISOString(),
    };

    try {
      await saveSurvey(toSave);
    } catch {
      toast.error("Não foi possível salvar o rascunho.");
      return;
    }

    setSurvey(toSave);
    if (!id) navigate(`/clinicas/${clinicId}/pesquisa/${toSave.id}/editar`, { replace: true });
    toast.success("Rascunho salvo.");
  };

  const handlePublish = async () => {
    if (questions.length === 0) {
      toast.error("Adicione pelo menos uma pergunta antes de publicar.");
      return;
    }
    const slug = survey?.slug ?? slugify(name || sector || "pesquisa");
    const baseSlug = slug || "pesquisa";
    let finalSlug = baseSlug;
    let n = 0;
    while (!(await isSlugAvailable(finalSlug, clinicId ?? survey?.clinicId ?? "", survey?.id))) {
      finalSlug = `${baseSlug}-${++n}`;
    }
    const toSave: Survey = {
      id: survey?.id ?? `survey-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      clinicId: clinicId ?? survey?.clinicId ?? "",
      slug: finalSlug,
      name: name || "Nova pesquisa",
      sector,
      questions,
      status: "published",
      createdAt: survey?.createdAt ?? new Date().toISOString(),
    };

    try {
      await saveSurvey(toSave);
    } catch {
      toast.error("Não foi possível publicar a pesquisa.");
      return;
    }

    setSurvey(toSave);
    setPublishedLink(`${window.location.origin}/p/${clinicId}/${toSave.slug}`);
    toast.success("Pesquisa publicada! O link está pronto para compartilhar.");
  };

  const addQuestionAt = (type: QuestionType, index: number) => {
    const q = addQuestion(type);
    setQuestions((prev) => {
      const next = [...prev];
      next.splice(index, 0, q);
      return next;
    });
  };

  const removeQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const moveQuestion = (index: number, dir: "up" | "down") => {
    setQuestions((prev) => {
      const next = [...prev];
      const j = dir === "up" ? index - 1 : index + 1;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  };

  const updateQuestion = (index: number, patch: Partial<SurveyQuestion>) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, ...patch } : q))
    );
  };

  const updateOption = (qIndex: number, optIndex: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex || !q.options) return q;
        const opts = [...q.options];
        opts[optIndex] = value;
        return { ...q, options: opts };
      })
    );
  };

  const addOption = (qIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex
          ? { ...q, options: [...(q.options || []), "Nova opção"] }
          : q
      )
    );
  };

  const removeOption = (qIndex: number, optIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex || !q.options) return q;
        const opts = q.options.filter((_, j) => j !== optIndex);
        return { ...q, options: opts };
      })
    );
  };

  if (loading || (!survey && !!id) || !clinicId) return null;

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {survey ? "Editar pesquisa" : "Nova pesquisa"}
            </h2>
            <p className="text-muted-foreground">
              Defina o título, setor e as perguntas no estilo Google Forms.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link to={`/clinicas/${clinicId}/pesquisa`}>Voltar</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <label className="text-sm font-medium text-foreground">Título da pesquisa</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Satisfação - Atendimento"
            />
            <label className="text-sm font-medium text-foreground mt-2">Setor</label>
            <Input
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              placeholder="Ex: Recepção, Laboratório"
            />
          </CardHeader>
        </Card>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Perguntas</h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar pergunta
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {QUESTION_TYPES.map(({ value, label }) => (
                  <DropdownMenuItem
                    key={value}
                    onSelect={() => addQuestionAt(value, questions.length)}
                  >
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {questions.map((q, index) => (
            <Card key={q.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <div className="flex flex-col gap-0.5 pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={index === 0}
                      onClick={() => moveQuestion(index, "up")}
                    >
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={index === questions.length - 1}
                      onClick={() => moveQuestion(index, "down")}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <Input
                      value={q.label}
                      onChange={(e) => updateQuestion(index, { label: e.target.value })}
                      placeholder="Texto da pergunta"
                    />
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`req-${q.id}`}
                        checked={q.required}
                        onCheckedChange={(checked) =>
                          updateQuestion(index, { required: !!checked })
                        }
                      />
                      <label
                        htmlFor={`req-${q.id}`}
                        className="text-sm text-muted-foreground"
                      >
                        Obrigatória
                      </label>
                    </div>
                    {q.type === "select" && q.options && (
                      <div className="space-y-1 pl-2 border-l-2 border-muted">
                        {q.options.map((opt, oi) => (
                          <div key={oi} className="flex gap-2">
                            <Input
                              value={opt}
                              onChange={(e) =>
                                updateOption(index, oi, e.target.value)
                              }
                              placeholder={`Opção ${oi + 1}`}
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="shrink-0"
                              onClick={() => removeOption(index, oi)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addOption(index)}
                        >
                          + Opção
                        </Button>
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive shrink-0"
                    onClick={() => removeQuestion(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Tipo: {QUESTION_TYPES.find((t) => t.value === q.type)?.label}
                </p>
              </CardContent>
            </Card>
          ))}

          {questions.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhuma pergunta. Clique em &quot;Adicionar pergunta&quot; para começar.
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSaveDraft}>
            <Save className="w-4 h-4 mr-2" />
            Salvar rascunho
          </Button>
          <Button onClick={handlePublish}>
            <Send className="w-4 h-4 mr-2" />
            Publicar pesquisa
          </Button>
        </div>

        {publishedLink && (
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-foreground mb-2">
                Link da pesquisa (compartilhe com os respondentes):
              </p>
              <div className="flex gap-2">
                <Input readOnly value={publishedLink} className="font-mono text-sm" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(publishedLink);
                    toast.success("Link copiado!");
                  }}
                >
                  Copiar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
