import type { Survey, SurveyResponse } from "@/types/survey";
import { getSupabaseClient } from "@/lib/supabaseClient";

type SurveyRow = {
  id: string;
  slug: string;
  clinic_id: string | null;
  name: string;
  sector: string | null;
  questions: Survey["questions"];
  status: Survey["status"];
  created_at: string;
};

type SurveyResponseRow = {
  id: string;
  survey_id: string;
  answers: SurveyResponse["answers"];
  date: string;
};

function toSurvey(row: SurveyRow): Survey {
  return {
    id: row.id,
    clinicId: String(row.clinic_id ?? ""),
    slug: row.slug,
    name: row.name,
    sector: row.sector ?? "",
    questions: (row.questions ?? []) as Survey["questions"],
    status: row.status,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

function toResponse(row: SurveyResponseRow): SurveyResponse {
  return {
    id: row.id,
    surveyId: row.survey_id,
    answers: (row.answers ?? {}) as SurveyResponse["answers"],
    date: row.date,
  };
}

export async function getSurveys(clinicId: string): Promise<Survey[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("surveys")
    .select("id,slug,clinic_id,name,sector,questions,status,created_at")
    .eq("clinic_id", clinicId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as SurveyRow[]).map(toSurvey);
}

export async function getSurveyById(id: string, clinicId?: string): Promise<Survey | undefined> {
  const supabase = getSupabaseClient();
  let q = supabase
    .from("surveys")
    .select("id,slug,clinic_id,name,sector,questions,status,created_at")
    .eq("id", id);
  if (clinicId) q = q.eq("clinic_id", clinicId);

  const { data, error } = await q.maybeSingle();

  if (error) throw error;
  return data ? toSurvey(data as SurveyRow) : undefined;
}

export async function getSurveyBySlug(slug: string, clinicId: string): Promise<Survey | undefined> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("surveys")
    .select("id,slug,clinic_id,name,sector,questions,status,created_at")
    .eq("slug", slug)
    .eq("clinic_id", clinicId)
    .eq("status", "published")
    .maybeSingle();

  if (error) throw error;
  return data ? toSurvey(data as SurveyRow) : undefined;
}

export async function saveSurvey(survey: Survey): Promise<void> {
  const supabase = getSupabaseClient();

  const createdAt = survey.createdAt ? new Date(survey.createdAt) : new Date();
  const row = {
    id: survey.id,
    slug: survey.slug,
    clinic_id: survey.clinicId,
    name: survey.name,
    sector: survey.sector ?? "",
    questions: survey.questions,
    status: survey.status,
    created_at: createdAt.toISOString(),
  };

  const { error } = await supabase.from("surveys").upsert(row, { onConflict: "id" });
  if (error) throw error;
}

export async function deleteSurvey(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("surveys").delete().eq("id", id);
  if (error) throw error;
}

export async function getResponses(surveyId?: string, clinicId?: string): Promise<SurveyResponse[]> {
  const supabase = getSupabaseClient();
  let query = supabase.from("survey_responses").select("id,survey_id,answers,date");

  if (surveyId) {
    query = query.eq("survey_id", surveyId);
  } else if (clinicId) {
    const surveys = await getSurveys(clinicId);
    const ids = surveys.map((s) => s.id);
    if (ids.length === 0) return [];
    query = query.in("survey_id", ids);
  }

  query = query.order("date", { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return (data as SurveyResponseRow[]).map(toResponse);
}

function generateResponseId(): string {
  return `resp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function addResponse(
  response: Omit<SurveyResponse, "id" | "date">
): Promise<SurveyResponse> {
  const supabase = getSupabaseClient();

  const newResponse: SurveyResponse = {
    ...response,
    id: generateResponseId(),
    date: new Date().toISOString().slice(0, 10),
  };

  // Sem .select(): o role anon não tem política de SELECT em survey_responses; o PostgREST
  // devolveria 403 ao tentar ler a linha após o INSERT (Prefer: return=representation).
  const { error } = await supabase.from("survey_responses").insert({
    id: newResponse.id,
    survey_id: newResponse.surveyId,
    answers: newResponse.answers,
    date: newResponse.date,
  });

  if (error) throw error;
  return toResponse({
    id: newResponse.id,
    survey_id: newResponse.surveyId,
    answers: newResponse.answers,
    date: newResponse.date,
  } as SurveyResponseRow);
}

function generateId(): string {
  return `survey-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function createSurvey(clinicId: string, name: string, sector: string): Survey {
  const id = generateId();
  const baseSlug = slugify(name || sector || id);
  return {
    id,
    clinicId,
    slug: baseSlug,
    name: name || "Nova pesquisa",
    sector: sector || "",
    questions: [],
    status: "draft",
    createdAt: new Date().toISOString(),
  };
}

export async function isSlugAvailable(
  slug: string,
  clinicId: string,
  excludeSurveyId?: string
): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("surveys")
    .select("id")
    .eq("slug", slug)
    .eq("clinic_id", clinicId);

  if (error) throw error;
  return !((data ?? []) as Array<{ id: string }>).some((s) => s.id !== excludeSurveyId);
}

export function generateQuestionId(): string {
  return `q-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Resposta unificada com score NPS para dashboard/relatórios (mock + store) */
export interface UnifiedNpsResponse {
  id: string;
  score: number;
  date: string;
  surveyId: string;
  surveyName: string;
  sector: string;
  comment?: string;
}

/** Converte respostas do banco para um formato unificado com score (dashboard/relatórios). */
export async function getUnifiedResponsesFromStore(clinicId: string): Promise<UnifiedNpsResponse[]> {
  const surveys = await getSurveys(clinicId);
  const surveyById = new Map<string, Survey>(surveys.map((s) => [s.id, s]));

  if (surveys.length === 0) return [];

  const responses = await getResponses(undefined, clinicId);

  const result: UnifiedNpsResponse[] = [];
  for (const r of responses) {
    const survey = surveyById.get(r.surveyId);
    const npsQuestion = survey?.questions.find((q) => q.type === "nps");

    const rawScore = npsQuestion ? r.answers[npsQuestion.id] : undefined;
    const score =
      typeof rawScore === "number"
        ? rawScore
        : typeof rawScore === "string"
          ? Number(rawScore)
          : undefined;

    if (typeof score === "number" && Number.isFinite(score) && score >= 0 && score <= 10) {
      const commentEntry = survey?.questions.find(
        (q) => (q.type === "text_short" || q.type === "text_long") && r.answers[q.id]
      );

      result.push({
        id: r.id,
        score: Number(score),
        date: r.date,
        surveyId: r.surveyId,
        surveyName: survey?.name ?? "Pesquisa",
        sector: survey?.sector ?? "",
        comment: commentEntry ? String(r.answers[commentEntry.id]) : undefined,
      });
    }
  }
  return result.sort((a, b) => b.date.localeCompare(a.date));
}
