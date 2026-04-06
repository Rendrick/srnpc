import { LayoutDashboard, MessageSquareText, BarChart3, ClipboardPlus, Activity, Building2 } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useParams } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useClinic } from "@/hooks/useClinic";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { clinicId } = useParams<{ clinicId?: string }>();
  const { name: clinicName, loading: clinicLoading } = useClinic(clinicId);

  const base = clinicId ? `/clinicas/${clinicId}` : "/clinicas";

  const items = [
    { title: "Dashboard", url: base, icon: LayoutDashboard },
    { title: "Respostas", url: `${base}/respostas`, icon: MessageSquareText },
    { title: "Relatórios", url: `${base}/relatorios`, icon: BarChart3 },
    { title: "Pesquisas", url: `${base}/pesquisa`, icon: ClipboardPlus },
    { title: "Setores", url: `${base}/setores`, icon: Building2 },
  ];

  const subtitleLine = !clinicId
    ? "Área administrativa"
    : clinicLoading
      ? null
      : clinicName ?? "Clínica";

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4 flex items-center gap-3 border-b border-sidebar-border/60">
          <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0 shadow-sm">
            <Activity className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-sidebar-foreground truncate leading-tight">ServiceRapide NPS</h2>
              {clinicId && clinicLoading ? (
                <Skeleton className="h-3.5 w-32 max-w-full mt-1.5 bg-sidebar-accent" />
              ) : (
                <p className="text-xs text-sidebar-foreground/70 truncate mt-0.5">{subtitleLine}</p>
              )}
            </div>
          )}
        </div>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/clinicas"}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
