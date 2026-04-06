import type { ClinicSector, Survey, SurveyResponse } from "@/types/survey";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { isClinicsSlugMissingError } from "@/lib/supabaseErrors";

const SURVEY_SELECT_ADMIN =
  "id,slug,clinic_id,name,sector,sector_id,questions,status,created_at,clinic_sectors(id,name)";
const SURVEY_SELECT_PUBLIC =
  "id,slug,clinic_id,name,sector,sector_id,questions,status,created_at";

type SurveyRow = {
  id: string;
  slug: string;
  clinic_id: string | null;
  name: string;
  sector: string | null;
  sector_id: string | null;
  questions: Survey["questions"];
  status: Survey["status"];
  created_at: string;
  clinic_sectors?: { id: string; name: string } | { id: string; name: string }[] | null;
};

type SectorRow = {
  id: string;
  clinic_id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

type SurveyResponseRow = {
  id: string;
  survey_id: string;
  answers: SurveyResponse["answers"];
  date: string;
};

function normalizeSectorEmbed(
  embed: SurveyRow["clinic_sectors"]
): { name: string } | null {
  if (!embed || typeof embed !== "object") return null;
  if (Array.isArray(embed)) {
    const first = embed[0];
    return first && typeof first.name === "string" ? { name: first.name } : null;
  }
  return typeof embed.name === "string" ? { name: embed.name } : null;
}

function toSurvey(row: SurveyRow): Survey {
  const cs = normalizeSectorEmbed(row.clinic_sectors);
  const linkedName = cs?.name?.trim();
  const legacyName = row.sector?.trim() ?? "";
  const sector = linkedName || legacyName;
  return {
    id: row.id,
    clinicId: String(row.clinic_id ?? ""),
    slug: row.slug,
    name: row.name,
    sector,
    sectorId: row.sector_id ?? null,
    questions: (row.questions ?? []) as Survey["questions"],
    status: row.status,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

function toSector(row: SectorRow): ClinicSector {
  return {
    id: row.id,
    clinicId: row.clinic_id,
    name: row.name,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

export async function listSectors(clinicId: string): Promise<ClinicSector[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("clinic_sectors")
    .select("id,clinic_id,name,sort_order,created_at")
    .eq("clinic_id", clinicId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as SectorRow[]).map(toSector);
}

export async function createSector(clinicId: string, name: string): Promise<ClinicSector> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("clinic_sectors")
    .insert({ clinic_id: clinicId, name: name.trim(), sort_order: 0 })
    .select("id,clinic_id,name,sort_order,created_at")
    .single();

  if (error) throw error;
  return toSector(data as SectorRow);
}

export async function updateSector(
  sectorId: string,
  clinicId: string,
  patch: { name?: string; sortOrder?: number }
): Promise<void> {
  const supabase = getSupabaseClient();
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name.trim();
  if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder;
  const { error } = await supabase
    .from("clinic_sectors")
    .update(row)
    .eq("id", sectorId)
    .eq("clinic_id", clinicId);

  if (error) throw error;
}

export async function deleteSector(sectorId: string, clinicId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("clinic_sectors")
    .delete()
    .eq("id", sectorId)
    .eq("clinic_id", clinicId);

  if (error) throw error;
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
    .select(SURVEY_SELECT_ADMIN)
    .eq("clinic_id", clinicId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as SurveyRow[]).map(toSurvey);
}

export async function getSurveyById(id: string, clinicId?: string): Promise<Survey | undefined> {
  const supabase = getSupabaseClient();
  let q = supabase.from("surveys").select(SURVEY_SELECT_ADMIN).eq("id", id);
  if (clinicId) q = q.eq("clinic_id", clinicId);

  const { data, error } = await q.maybeSingle();

  if (error) throw error;
  return data ? toSurvey(data as SurveyRow) : undefined;
}

export async function getSurveyBySlug(slug: string, clinicId: string): Promise<Survey | undefined> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("surveys")
    .select(SURVEY_SELECT_PUBLIC)
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
    sector_id: survey.sectorId ?? null,
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

const CLINIC_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isClinicRouteUuid(param: string): boolean {
  return CLINIC_UUID_REGEX.test(param.trim());
}

export type ResolvedClinic = { id: string; slug: string; name: string };

/** Gera um slug único global na tabela `clinics` (para insert). */
export async function generateUniqueClinicSlug(displayName: string): Promise<string> {
  const supabase = getSupabaseClient();
  const base = slugify(displayName) || "clinica";
  for (let n = 0; n < 200; n++) {
    const candidate = n === 0 ? base : `${base}-${n}`;
    const { data, error } = await supabase.from("clinics").select("id").eq("slug", candidate).maybeSingle();
    if (error && isClinicsSlugMissingError(error)) {
      return candidate;
    }
    if (error) throw error;
    if (!data) return candidate;
  }
  return `${base}-${Date.now()}`;
}

export type ClinicListRow = { id: string; name: string; slug?: string | null; created_at?: string };

/** Lista clínicas por id; faz fallback se a coluna `slug` ainda não existir na BD. */
export async function listClinicsByIds(ids: string[]): Promise<ClinicListRow[]> {
  const supabase = getSupabaseClient();
  if (ids.length === 0) return [];
  let { data, error } = await supabase
    .from("clinics")
    .select("id, name, slug, created_at")
    .in("id", ids);
  if (error && isClinicsSlugMissingError(error)) {
    ({ data, error } = await supabase.from("clinics").select("id, name, created_at").in("id", ids));
  }
  if (error) throw error;
  return (data ?? []) as ClinicListRow[];
}

/** Resolve segmento de rota (UUID legado ou slug) para id + slug canónico. */
export async function resolveClinicRouteParam(param: string): Promise<ResolvedClinic | null> {
  const supabase = getSupabaseClient();
  const trimmed = param.trim();
  if (!trimmed) return null;

  if (CLINIC_UUID_REGEX.test(trimmed)) {
    let { data, error } = await supabase
      .from("clinics")
      .select("id, slug, name")
      .eq("id", trimmed)
      .maybeSingle();
    if (error && isClinicsSlugMissingError(error)) {
      ({ data, error } = await supabase.from("clinics").select("id, name").eq("id", trimmed).maybeSingle());
    }
    if (error) throw error;
    if (!data?.id) return null;
    const row = data as { id: string; slug?: string | null; name: string };
    return { id: row.id, slug: row.slug?.trim() || trimmed, name: row.name };
  }

  let { data, error } = await supabase
    .from("clinics")
    .select("id, slug, name")
    .eq("slug", trimmed)
    .maybeSingle();
  if (error && isClinicsSlugMissingError(error)) {
    return null;
  }
  if (error) throw error;
  if (!data?.id || !(data as { slug?: string | null }).slug?.trim()) return null;
  const row = data as { id: string; slug: string; name: string };
  return { id: row.id, slug: row.slug.trim(), name: row.name };
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
    sectorId: null,
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
  sectorId?: string | null;
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
        sectorId: survey?.sectorId ?? null,
        comment: commentEntry ? String(r.answers[commentEntry.id]) : undefined,
      });
    }
  }
  return result.sort((a, b) => b.date.localeCompare(a.date));
}
