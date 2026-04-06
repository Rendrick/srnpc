export type QuestionType = "nps" | "text_short" | "text_long" | "select" | "thumbs_group";

export interface SurveyQuestion {
  id: string;
  type: QuestionType;
  label: string;
  required: boolean;
  options?: string[];
  /** Somente para `type === "nps"`: ativa o layout público em duas colunas (estilo hospital). */
  useSplitPublicLayout?: boolean;
}

/** Chave de resposta para a linha `rowIndex` do grupo `thumbs_group` (`0` = polegar baixo, `1` = cima). */
export function thumbsRowAnswerKey(questionId: string, rowIndex: number): string {
  return `${questionId}__${rowIndex}`;
}

export type SurveyStatus = "draft" | "published";

export interface ClinicSector {
  id: string;
  clinicId: string;
  name: string;
  sortOrder: number;
  createdAt: string;
}

export interface Survey {
  id: string;
  clinicId: string;
  slug: string;
  name: string;
  /** Nome do setor para exibição (sincronizado com cadastro ou texto legacy). */
  sector: string;
  /** Setor cadastrado na tabela `clinic_sectors` (opcional). */
  sectorId?: string | null;
  questions: SurveyQuestion[];
  status: SurveyStatus;
  createdAt: string;
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  answers: Record<string, string | number>;
  date: string;
}
