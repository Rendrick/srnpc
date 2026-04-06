import { useParams } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useClinicDocumentTitle } from "@/hooks/useClinic";
import { useResolvedClinic } from "@/hooks/useResolvedClinic";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { clinicSlug: routeClinic } = useParams<{ clinicSlug?: string }>();
  const { clinicId, clinicName, loading: clinicLoading } = useResolvedClinic();
  useClinicDocumentTitle(clinicId ?? undefined, clinicName, clinicLoading);

  const subtitle = !routeClinic
    ? "Área administrativa"
    : clinicLoading
      ? null
      : clinicName ?? "Clínica";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="min-h-14 flex items-center border-b border-border/80 bg-card/80 backdrop-blur-sm px-4 py-2 shrink-0 shadow-sm">
            <SidebarTrigger className="mr-3" />
            <div className="min-w-0 flex flex-col justify-center gap-0.5">
              <h1 className="text-base font-semibold tracking-tight text-foreground">ServiceRapide NPS</h1>
              {routeClinic && clinicLoading ? (
                <Skeleton className="h-4 w-44 max-w-full mt-0.5" />
              ) : (
                <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
              )}
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
