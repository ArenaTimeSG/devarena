import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { queryClient } from "@/lib/queryClient";
import { useTheme } from "@/hooks/useTheme";
import { useRecurringStatusUpdate } from "@/hooks/useRecurringStatusUpdate";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import NewClient from "./pages/NewClient";
import ClientDetail from "./pages/ClientDetail";
import Modalities from "./pages/Modalities";
import NewAppointment from "./pages/NewAppointment";
import Appointments from "./pages/Appointments";
import Financial from "./pages/Financial";
import Settings from "./pages/Settings";
import OnlineBooking from "./pages/OnlineBooking";
import OnlineBookingDebug from "./pages/OnlineBookingDebug";
import TestBooking from "./pages/TestBooking";
import ClientLogin from "./pages/ClientLogin";
import ClientRegister from "./pages/ClientRegister";
import NotFound from "./pages/NotFound";
import ClientDashboard from "./pages/ClientDashboard";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentFailure from "./pages/PaymentFailure";
import PaymentPending from "./pages/PaymentPending";


const AppContent = () => {
  // Inicializar o tema
  useTheme();
  
  // Atualizar automaticamente o status dos agendamentos recorrentes
  useRecurringStatusUpdate();
  
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/clients/new" element={<NewClient />} />
        <Route path="/clients/:id" element={<ClientDetail />} />
        <Route path="/modalities" element={<Modalities />} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/appointments/new" element={<NewAppointment />} />
        <Route path="/financial" element={<Financial />} />
        <Route path="/settings" element={<Settings />} />

        <Route path="/agendar/:username" element={<OnlineBooking />} />
        <Route path="/booking/:username" element={<OnlineBooking />} />
        <Route path="/booking" element={<OnlineBooking />} />
        <Route path="/booking-debug/:username" element={<OnlineBookingDebug />} />
        <Route path="/cliente/login" element={<ClientLogin />} />
        <Route path="/cliente/register" element={<ClientRegister />} />
        <Route path="/cliente/dashboard/:username" element={<ClientDashboard />} />
        
        {/* Payment Routes */}
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/payment/failure" element={<PaymentFailure />} />
        <Route path="/payment/pending" element={<PaymentPending />} />
        
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppContent />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
