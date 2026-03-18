import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import SurveyList from "./pages/SurveyList";
import SurveyEdit from "./pages/SurveyEdit";
import PublicSurvey from "./pages/PublicSurvey";
import Responses from "./pages/Responses";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/pesquisa" element={<SurveyList />} />
          <Route path="/pesquisa/nova" element={<SurveyEdit />} />
          <Route path="/pesquisa/:id/editar" element={<SurveyEdit />} />
          <Route path="/p/:slug" element={<PublicSurvey />} />
          <Route path="/respostas" element={<Responses />} />
          <Route path="/relatorios" element={<Reports />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
