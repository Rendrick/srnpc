import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, CheckCircle2, Send } from "lucide-react";
import { ExamType } from "@/data/mockNps";
import { toast } from "sonner";

const examTypes: ExamType[] = ["Raio-X", "Tomografia", "Ressonância", "Ultrassom", "Mamografia"];

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

export default function Survey() {
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [examType, setExamType] = useState<string>("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (selectedScore === null) {
      toast.error("Por favor, selecione uma nota.");
      return;
    }
    setSubmitted(true);
    toast.success("Obrigado pela sua avaliação!");
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-10">
            <div className="w-20 h-20 rounded-full bg-nps-promoter/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-nps-promoter" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Obrigado!</h2>
            <p className="text-muted-foreground">
              Sua avaliação é muito importante para continuarmos melhorando nosso atendimento.
            </p>
            <Button className="mt-6" onClick={() => { setSubmitted(false); setSelectedScore(null); setComment(""); setExamType(""); }}>
              Nova Avaliação
            </Button>
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
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Activity className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">RadioClínica</h1>
              <p className="text-xs text-muted-foreground">Pesquisa de Satisfação</p>
            </div>
          </div>

          <h2 className="text-lg font-semibold text-foreground mb-2">
            De 0 a 10, qual a probabilidade de você recomendar nossa clínica?
          </h2>
          <p className="text-sm text-muted-foreground mb-6">Sua opinião nos ajuda a melhorar!</p>

          {/* Score buttons */}
          <div className="grid grid-cols-11 gap-1.5 mb-6">
            {Array.from({ length: 11 }, (_, i) => (
              <button
                key={i}
                onClick={() => setSelectedScore(i)}
                className={`aspect-square rounded-lg text-sm font-bold transition-all
                  ${selectedScore === i
                    ? `${getScoreColor(i)} scale-110 shadow-lg`
                    : `bg-muted text-muted-foreground ${getScoreHoverColor(i)} hover:text-white`
                  }`}
              >
                {i}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mb-6">
            <span>Nada provável</span>
            <span>Muito provável</span>
          </div>

          {selectedScore !== null && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Tipo de exame (opcional)</label>
                <Select value={examType} onValueChange={setExamType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o exame" />
                  </SelectTrigger>
                  <SelectContent>
                    {examTypes.map((e) => (
                      <SelectItem key={e} value={e}>{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Comentário (opcional)</label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Conte-nos sobre sua experiência..."
                  rows={3}
                />
              </div>

              <Button onClick={handleSubmit} className="w-full" size="lg">
                <Send className="w-4 h-4 mr-2" />
                Enviar Avaliação
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
