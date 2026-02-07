import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { queryClient } from "@/lib/queryClient";
import { useTheme } from "@/hooks/useTheme";
import { useRecurringStatusUpdate } from "@/hooks/useRecurringStatusUpdate";

// Lazy loading de rotas para reduzir bundle inicial
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Clients = lazy(() => import("./pages/Clients"));
const NewClient = lazy(() => import("./pages/NewClient"));
const ClientDetail = lazy(() => import("./pages/ClientDetail"));
const Modalities = lazy(() => import("./pages/Modalities"));
const NewAppointment = lazy(() => import("./pages/NewAppointment"));
const Appointments = lazy(() => import("./pages/Appointments"));
const Financial = lazy(() => import("./pages/Financial"));
const Settings = lazy(() => import("./pages/Settings"));
const Courts = lazy(() => import("./pages/Courts"));
const OnlineBooking = lazy(() => import("./pages/OnlineBooking"));
const ClientLogin = lazy(() => import("./pages/ClientLogin"));
const ClientRegister = lazy(() => import("./pages/ClientRegister"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ClientDashboard = lazy(() => import("./pages/ClientDashboard"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentFailure = lazy(() => import("./pages/PaymentFailure"));
const PaymentPending = lazy(() => import("./pages/PaymentPending"));

// Componente de loading simples
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);


const AppContent = () => {
  // Inicializar o tema
  useTheme();
  
  // Atualizar automaticamente o status dos agendamentos recorrentes
  useRecurringStatusUpdate();
  
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
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
          <Route path="/courts" element={<Courts />} />

          <Route path="/agendar/:username" element={<OnlineBooking />} />
          <Route path="/booking/:username" element={<OnlineBooking />} />
          <Route path="/booking" element={<OnlineBooking />} />
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
      </Suspense>
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
