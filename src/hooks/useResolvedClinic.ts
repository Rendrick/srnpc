import { useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { isClinicRouteUuid, resolveClinicRouteParam } from "@/data/surveyStore";

/**
 * Resolve `clinicSlug` da rota admin (slug ou UUID legado).
 * Redireciona UUID para o slug canónico quando `slug` existe na base.
 */
export function useResolvedClinic() {
  const { clinicSlug } = useParams<{ clinicSlug: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const query = useQuery({
    queryKey: ["clinic-route", clinicSlug],
    queryFn: () => resolveClinicRouteParam(clinicSlug!),
    enabled: Boolean(clinicSlug?.trim()),
  });

  useEffect(() => {
    if (!clinicSlug || !query.data?.slug || !isClinicRouteUuid(clinicSlug)) return;
    if (query.data.slug === clinicSlug) return;
    const prefix = `/clinicas/${clinicSlug}`;
    if (!location.pathname.startsWith(prefix)) return;
    const suffix = location.pathname.slice(prefix.length);
    navigate(`/clinicas/${query.data.slug}${suffix}` + location.search, { replace: true });
  }, [clinicSlug, query.data?.slug, location.pathname, location.search, navigate]);

  return {
    clinicId: query.data?.id ?? null,
    clinicSlug: query.data?.slug ?? null,
    clinicName: query.data?.name ?? null,
    loading: query.isLoading,
    error: query.error,
    isError: query.isError,
  };
}

/**
 * Resolve clínica na rota pública `/p/:clinicSlug/:surveySlug`.
 */
export function useResolvedPublicClinic() {
  const { clinicSlug, slug: surveySlug } = useParams<{ clinicSlug: string; slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const query = useQuery({
    queryKey: ["clinic-route-public", clinicSlug],
    queryFn: () => resolveClinicRouteParam(clinicSlug!),
    enabled: Boolean(clinicSlug?.trim()),
  });

  useEffect(() => {
    if (!clinicSlug || !surveySlug || !query.data?.slug || !isClinicRouteUuid(clinicSlug)) return;
    if (query.data.slug === clinicSlug) return;
    navigate(`/p/${query.data.slug}/${surveySlug}` + location.search, { replace: true });
  }, [clinicSlug, surveySlug, query.data?.slug, location.search, navigate]);

  return {
    clinicId: query.data?.id ?? null,
    clinicSlug: query.data?.slug ?? null,
    loading: query.isLoading,
    error: query.error,
    isError: query.isError,
  };
}
