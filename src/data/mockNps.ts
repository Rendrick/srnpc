import { subDays, format } from "date-fns";

export type ExamType = "Raio-X" | "Tomografia" | "Ressonância" | "Ultrassom" | "Mamografia";

export interface NpsResponse {
  id: string;
  score: number;
  comment: string;
  date: string;
  examType: ExamType;
  patientName: string;
}

export type NpsCategory = "promoter" | "neutral" | "detractor";

export function getCategory(score: number): NpsCategory {
  if (score >= 9) return "promoter";
  if (score >= 7) return "neutral";
  return "detractor";
}

export function getCategoryLabel(cat: NpsCategory): string {
  return { promoter: "Promotor", neutral: "Neutro", detractor: "Detrator" }[cat];
}

const names = [
  "Maria Silva", "João Santos", "Ana Oliveira", "Carlos Souza", "Fernanda Lima",
  "Pedro Costa", "Juliana Pereira", "Ricardo Almeida", "Camila Rodrigues", "Bruno Ferreira",
  "Luciana Martins", "Rafael Nascimento", "Patrícia Araújo", "Gustavo Ribeiro", "Daniela Barbosa",
  "Marcos Carvalho", "Tatiana Gomes", "André Mendes", "Vanessa Rocha", "Felipe Correia",
  "Cristina Dias", "Roberto Moura", "Aline Cardoso", "Eduardo Teixeira", "Priscila Monteiro",
  "Thiago Nunes", "Renata Pinto", "Alexandre Vieira", "Mariana Castro", "Lucas Freitas",
];

const comments: Record<NpsCategory, string[]> = {
  promoter: [
    "Excelente atendimento! Muito profissionais e atenciosos.",
    "Resultado rápido e equipe muito simpática. Recomendo!",
    "Ambiente limpo e organizado, fui muito bem atendido.",
    "Melhor clínica de radiologia da região, sem dúvida.",
    "Atendimento humanizado, me senti muito acolhida.",
    "Pontualidade no agendamento e resultado no prazo.",
    "Equipe técnica excepcional, explica tudo com clareza.",
    "Recomendo de olhos fechados! Voltarei sempre.",
  ],
  neutral: [
    "Atendimento ok, mas demorou um pouco na recepção.",
    "Bom serviço, porém o estacionamento é complicado.",
    "Nada a reclamar, mas também nada excepcional.",
    "Atendimento razoável, poderia melhorar a comunicação.",
    "Achei o preço um pouco elevado pelo serviço.",
  ],
  detractor: [
    "Esperei mais de 1 hora além do horário marcado.",
    "Atendimento frio e impessoal, me senti um número.",
    "Resultado demorou muito mais do que prometido.",
    "Recepção desorganizada, tive que repetir meus dados várias vezes.",
    "Experiência ruim, não pretendo voltar.",
  ],
};

const examTypes: ExamType[] = ["Raio-X", "Tomografia", "Ressonância", "Ultrassom", "Mamografia"];

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function generateResponses(): NpsResponse[] {
  const responses: NpsResponse[] = [];
  for (let i = 0; i < 120; i++) {
    const r = seededRandom(i + 42);
    // Distribution: ~55% promoters, ~25% neutrals, ~20% detractors
    let score: number;
    if (r < 0.55) score = Math.floor(seededRandom(i + 100) * 2) + 9; // 9-10
    else if (r < 0.80) score = Math.floor(seededRandom(i + 200) * 2) + 7; // 7-8
    else score = Math.floor(seededRandom(i + 300) * 7); // 0-6

    const cat = getCategory(score);
    const commentList = comments[cat];
    const comment = commentList[Math.floor(seededRandom(i + 400) * commentList.length)];
    const daysAgo = Math.floor(seededRandom(i + 500) * 90);
    const date = format(subDays(new Date(), daysAgo), "yyyy-MM-dd");
    const name = names[Math.floor(seededRandom(i + 600) * names.length)];
    const examType = examTypes[Math.floor(seededRandom(i + 700) * examTypes.length)];

    responses.push({
      id: `nps-${i + 1}`,
      score,
      comment,
      date,
      examType,
      patientName: name,
    });
  }
  return responses.sort((a, b) => b.date.localeCompare(a.date));
}

export const mockResponses: NpsResponse[] = generateResponses();

export function calculateNpsScore(responses: Array<{ score: number }>): number {
  if (!responses.length) return 0;
  const promoters = responses.filter((r) => r.score >= 9).length;
  const detractors = responses.filter((r) => r.score <= 6).length;
  return Math.round(((promoters - detractors) / responses.length) * 100);
}

export function getDistribution(responses: Array<{ score: number }>) {
  const total = responses.length || 1;
  const promoters = responses.filter(r => r.score >= 9).length;
  const neutrals = responses.filter(r => r.score >= 7 && r.score <= 8).length;
  const detractors = responses.filter(r => r.score <= 6).length;
  return {
    promoters: { count: promoters, pct: Math.round((promoters / total) * 100) },
    neutrals: { count: neutrals, pct: Math.round((neutrals / total) * 100) },
    detractors: { count: detractors, pct: Math.round((detractors / total) * 100) },
  };
}
