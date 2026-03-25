import { LayoutDashboard, MessageSquareText, BarChart3, ClipboardPlus, Activity } from "lucide-react";
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

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { clinicId } = useParams<{ clinicId?: string }>();

  const base = clinicId ? `/clinicas/${clinicId}` : "/clinicas";

  const items = [
    { title: "Dashboard", url: base, icon: LayoutDashboard },
    { title: "Respostas", url: `${base}/respostas`, icon: MessageSquareText },
    { title: "Relatórios", url: `${base}/relatorios`, icon: BarChart3 },
    { title: "Pesquisas", url: `${base}/pesquisa`, icon: ClipboardPlus },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h2 className="text-sm font-bold text-sidebar-foreground truncate">RadioClínica NPS</h2>
              <p className="text-xs text-sidebar-foreground/60 truncate">Sistema de Avaliação</p>
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
