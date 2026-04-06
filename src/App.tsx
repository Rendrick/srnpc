import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/AuthContext";
import { RequireAuth } from "@/components/RequireAuth";
import Index from "./pages/Index";
import SurveyList from "./pages/SurveyList";
import SurveyEdit from "./pages/SurveyEdit";
import PublicSurvey from "./pages/PublicSurvey";
import Responses from "./pages/Responses";
import Reports from "./pages/Reports";
import ClinicSectors from "./pages/ClinicSectors";
import Login from "./pages/Login";
import Clinics from "./pages/Clinics";
import Superadmin from "./pages/Superadmin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/superadmin" element={<RequireAuth><Superadmin /></RequireAuth>} />
            <Route path="/clinicas" element={<RequireAuth><Clinics /></RequireAuth>} />
            <Route path="/clinicas/:clinicId" element={<RequireAuth><Index /></RequireAuth>} />
            <Route path="/clinicas/:clinicId/pesquisa" element={<RequireAuth><SurveyList /></RequireAuth>} />
            <Route path="/clinicas/:clinicId/pesquisa/nova" element={<RequireAuth><SurveyEdit /></RequireAuth>} />
            <Route path="/clinicas/:clinicId/pesquisa/:id/editar" element={<RequireAuth><SurveyEdit /></RequireAuth>} />
            <Route path="/clinicas/:clinicId/respostas" element={<RequireAuth><Responses /></RequireAuth>} />
            <Route path="/clinicas/:clinicId/relatorios" element={<RequireAuth><Reports /></RequireAuth>} />
            <Route path="/clinicas/:clinicId/setores" element={<RequireAuth><ClinicSectors /></RequireAuth>} />

            <Route path="/" element={<RequireAuth><Navigate to="/clinicas" replace /></RequireAuth>} />
            <Route path="/pesquisa" element={<RequireAuth><Navigate to="/clinicas" replace /></RequireAuth>} />
            <Route path="/pesquisa/nova" element={<RequireAuth><Navigate to="/clinicas" replace /></RequireAuth>} />
            <Route path="/pesquisa/:id/editar" element={<RequireAuth><Navigate to="/clinicas" replace /></RequireAuth>} />
            <Route path="/p/:clinicId/:slug" element={<PublicSurvey />} />
            <Route path="/respostas" element={<RequireAuth><Navigate to="/clinicas" replace /></RequireAuth>} />
            <Route path="/relatorios" element={<RequireAuth><Navigate to="/clinicas" replace /></RequireAuth>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
