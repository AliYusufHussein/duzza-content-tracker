import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Pipeline from "./pages/Pipeline";
import Performance from "./pages/Performance";
import Growth from "./pages/Growth";
import Ideas from "./pages/Ideas";
import Repurposing from "./pages/Repurposing";
import Calendar from "./pages/Calendar";
import Channels from "./pages/Channels";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/performance" element={<Performance />} />
            <Route path="/growth" element={<Growth />} />
            <Route path="/ideas" element={<Ideas />} />
            <Route path="/repurposing" element={<Repurposing />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/channels" element={<Channels />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
