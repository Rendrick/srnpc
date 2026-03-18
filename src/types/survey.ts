export type QuestionType = "nps" | "text_short" | "text_long" | "select";

export interface SurveyQuestion {
  id: string;
  type: QuestionType;
  label: string;
  required: boolean;
  options?: string[];
}

export type SurveyStatus = "draft" | "published";

export interface Survey {
  id: string;
  slug: string;
  name: string;
  sector: string;
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
