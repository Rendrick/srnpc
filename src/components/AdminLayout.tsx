import { useParams } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useClinic, useClinicDocumentTitle } from "@/hooks/useClinic";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { clinicId } = useParams<{ clinicId?: string }>();
  const { name: clinicName, loading: clinicLoading } = useClinic(clinicId);
  useClinicDocumentTitle(clinicId, clinicName, clinicLoading);

  const subtitle = !clinicId
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
              {clinicId && clinicLoading ? (
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
