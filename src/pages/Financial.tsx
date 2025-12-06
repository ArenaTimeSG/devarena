import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useAppointments } from '@/hooks/useAppointments';
import { useQueryClient } from '@tanstack/react-query';
import { useModalities } from '@/hooks/useModalities';
import { formatCurrency } from '@/utils/currency';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, TrendingUp, TrendingDown, Calendar, ArrowLeft, Users, ChevronLeft, ChevronRight, FileText, CheckCircle, AlertCircle, Clock, XCircle, CreditCard } from 'lucide-react';
import BulkPaymentModal from '@/components/BulkPaymentModal';
import { isBefore, isEqual, startOfMonth, endOfMonth, addMonths, subMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface FinancialData {
  total_recebido: number;
  total_pago: number;
  total_pendente: number;
  total_agendado: number;
  total_cancelado: number;
  agendamentos_pagos: number;
  agendamentos_pendentes: number;
  agendamentos_agendados: number;
  agendamentos_cancelados: number;
  agendamentos_realizados: number;
}

interface ClientFinancial {
  id: string;
  name: string;
  total_pago: number;
  total_pendente: number;
  total_agendamentos: number;
}

interface AppointmentData {
  id: string;
  date: string;
  status: string;
  modality: string;
  valor_total: number;
  client: {
    name: string;
  };
}

const Financial = () => {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const { appointments, getFinancialSummary, refetch } = useAppointments();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [financialData, setFinancialData] = useState<FinancialData>({
    total_recebido: 0,
    total_pago: 0,
    total_pendente: 0,
    total_agendado: 0,
    total_cancelado: 0,
    agendamentos_pagos: 0,
    agendamentos_pendentes: 0,
    agendamentos_agendados: 0,
    agendamentos_cancelados: 0,
    agendamentos_realizados: 0,
  });
  const [clientsFinancial, setClientsFinancial] = useState<ClientFinancial[]>([]);
  const [appointmentsData, setAppointmentsData] = useState<AppointmentData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Navegação por ano
  const [selectedYear, setSelectedYear] = useState(new Date());
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  
  // Estado para modal de pagamento em massa
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedClientForPayment, setSelectedClientForPayment] = useState<{
    id: string;
    name: string;
    appointments: AppointmentData[];
  } | null>(null);

  // Estado para controlar aba ativa
  const [activeTab, setActiveTab] = useState<'horarios' | 'eventos'>('horarios');
  
  // Estado para dados financeiros dos eventos
  const [eventsFinancialData, setEventsFinancialData] = useState<FinancialData>({
    total_recebido: 0,
    total_pago: 0,
    total_pendente: 0,
    total_agendado: 0,
    total_cancelado: 0,
    agendamentos_pagos: 0,
    agendamentos_pendentes: 0,
    agendamentos_agendados: 0,
    agendamentos_cancelados: 0,
    agendamentos_realizados: 0,
  });
  const [eventsData, setEventsData] = useState<any[]>([]);
  

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && appointments.length > 0 && activeTab === 'horarios') {
      fetchFinancialData();
    }
  }, [user, selectedMonth, appointments, activeTab]);

  useEffect(() => {
    if (user && activeTab === 'eventos') {
      fetchEventsFinancialData();
    }
  }, [user, selectedYear, activeTab]);

  const fetchFinancialData = async () => {
    try {
      setIsLoading(true);

      // Para horários: usar filtro mensal
      const startOfSelectedMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
      const endOfSelectedMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);

      // Filtrar agendamentos do mês selecionado
      const monthAppointments = appointments.filter(apt => {
        const aptDate = new Date(apt.date);
        const aptYear = aptDate.getFullYear();
        const aptMonth = aptDate.getMonth();
        const selectedYearNum = selectedMonth.getFullYear();
        const selectedMonthNum = selectedMonth.getMonth();
        
        return aptYear === selectedYearNum && aptMonth === selectedMonthNum;
      });

      // Debug: verificar agendamentos cancelados
      const agendamentosCancelados = monthAppointments.filter(apt => apt.status === 'cancelado');
      console.log('🔍 Financial - Agendamentos cancelados encontrados:', agendamentosCancelados);
      console.log('🔍 Financial - Total de agendamentos do mês:', monthAppointments.length);
      console.log('🔍 Financial - Status dos agendamentos:', monthAppointments.map(apt => ({ id: apt.id, status: apt.status, date: apt.date, valor_total: apt.valor_total })));

      setAppointmentsData(monthAppointments.map(apt => ({
        id: apt.client_id,
        date: apt.date,
        status: apt.status,
        modality: apt.modality_info?.name || apt.modality || 'Modalidade não definida',
        valor_total: apt.valor_total || 0,
        client: apt.client
      })));

      // Usar o hook para calcular dados financeiros
      const summary = getFinancialSummary(monthAppointments);
      
      // Debug: verificar resumo financeiro
      console.log('🔍 Financial - Resumo financeiro calculado:', summary);
      console.log('🔍 Financial - Agendamentos cancelados no resumo:', summary.agendamentos_cancelados);
      console.log('🔍 Financial - Total cancelado no resumo:', summary.total_cancelado);
      console.log('🔍 Financial - Agendamentos pagos encontrados:', monthAppointments.filter(apt => apt.status === 'pago').length);
      console.log('🔍 Financial - Agendamentos a_cobrar encontrados:', monthAppointments.filter(apt => apt.status === 'a_cobrar').length);
      console.log('🔍 Financial - Status dos agendamentos após atualização:', monthAppointments.map(apt => ({ id: apt.id, status: apt.status, valor: apt.valor_total })));
      
      const agendamentosRealizados = monthAppointments.filter(a => {
        const aptDate = new Date(a.date);
        const today = new Date();
        return aptDate < today;
      }).length || 0;

      setFinancialData({
        total_recebido: summary.total_recebido,
        total_pago: summary.total_recebido, // total_pago = total_recebido
        total_pendente: summary.total_pendente,
        total_agendado: summary.total_agendado,
        total_cancelado: summary.total_cancelado,
        agendamentos_pagos: summary.agendamentos_pagos,
        agendamentos_pendentes: summary.agendamentos_pendentes,
        agendamentos_agendados: summary.agendamentos_agendados,
        agendamentos_cancelados: summary.agendamentos_cancelados,
        agendamentos_realizados: agendamentosRealizados,
      });

      // Agrupar por cliente
      const clientsMap = new Map<string, ClientFinancial>();
      
      monthAppointments.forEach(appointment => {
        const clientId = appointment.client_id;
        const clientName = appointment.client?.name || 'Cliente';
        const valor = appointment.valor_total || 0;
        
        if (!clientsMap.has(clientId)) {
          clientsMap.set(clientId, {
            id: clientId,
            name: clientName,
            total_pago: 0,
            total_pendente: 0,
            total_agendamentos: 0,
          });
        }
        
        const client = clientsMap.get(clientId)!;
        client.total_agendamentos++;
        
        if (appointment.status === 'pago') {
          client.total_pago += valor;
        } else if (appointment.status === 'a_cobrar') {
          client.total_pendente += valor;
        }
      });

      setClientsFinancial(Array.from(clientsMap.values()));

    } catch (error: any) {
      toast({
        title: 'Erro ao carregar dados financeiros',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Normaliza datas YYYY-MM-DD como datas locais (evita voltar 1 dia por fuso horário)
  const normalizeLocalDate = (isoDate: string): Date => {
    try {
      if (!isoDate) return new Date();
      const [yearStr, monthStr, dayStr] = isoDate.split('-');
      const year = parseInt(yearStr, 10);
      const month = Math.max(1, parseInt(monthStr || '1', 10)) - 1;
      const day = Math.max(1, parseInt(dayStr || '1', 10));
      return new Date(year, month, day);
    } catch {
      return new Date(isoDate);
    }
  };

  const fetchEventsFinancialData = async () => {
    try {
      setIsLoading(true);
      
      const yearStart = new Date(selectedYear.getFullYear(), 0, 1);
      const yearEnd = new Date(selectedYear.getFullYear(), 11, 31);
      
      // Buscar eventos do ano selecionado
      const { data: events, error } = await supabase
        .from('monthly_events')
        .select('*')
        .eq('user_id', user?.id)
        .gte('event_date', yearStart.toISOString().split('T')[0])
        .lte('event_date', yearEnd.toISOString().split('T')[0]);

      if (error) throw error;

      setEventsData(events || []);

      // Calcular dados financeiros dos eventos
      let total_recebido = 0;
      let total_pendente = 0;
      let total_pago = 0;
      let total_cancelado = 0;
      let agendamentos_pagos = 0;
      let agendamentos_pendentes = 0;
      let agendamentos_cancelados = 0;

      (events || []).forEach(event => {
        const amount = Number(event.amount || 0);
        
        if (event.status === 'pago') {
          total_recebido += amount;
          total_pago += amount;
          agendamentos_pagos++;
        } else if (event.status === 'a_cobrar') {
          total_pendente += amount;
          agendamentos_pendentes++;
        } else if (event.status === 'cancelado') {
          total_cancelado += amount;
          agendamentos_cancelados++;
        }
      });

      setEventsFinancialData({
        total_recebido,
        total_pago,
        total_pendente,
        total_agendado: 0,
        total_cancelado,
        agendamentos_pagos,
        agendamentos_pendentes,
        agendamentos_agendados: 0,
        agendamentos_cancelados,
        agendamentos_realizados: agendamentos_pagos + agendamentos_pendentes,
      });

    } catch (error: any) {
      toast({
        title: 'Erro ao carregar dados financeiros dos eventos',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreviousYear = () => {
    setSelectedYear(new Date(selectedYear.getFullYear() - 1, selectedYear.getMonth(), selectedYear.getDate()));
  };

  const handleNextYear = () => {
    setSelectedYear(new Date(selectedYear.getFullYear() + 1, selectedYear.getMonth(), selectedYear.getDate()));
  };

  const handleCurrentYear = () => {
    setSelectedYear(new Date());
  };

  const handlePreviousMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, selectedMonth.getDate()));
  };

  const handleNextMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, selectedMonth.getDate()));
  };

  const handleCurrentMonth = () => {
    setSelectedMonth(new Date());
  };

  // Função para abrir modal de pagamento em massa
  const handleOpenPaymentModal = (client: ClientFinancial) => {
    // Buscar agendamentos reais do hook useAppointments, não do appointmentsData
    const clientAppointments = appointments.filter(apt => apt.client_id === client.id);
    console.log('🔄 Financial - Abrindo modal de pagamento para cliente:', client);
    console.log('🔄 Financial - Agendamentos do cliente (do hook):', clientAppointments);
    console.log('🔄 Financial - Agendamentos a cobrar:', clientAppointments.filter(apt => apt.status === 'a_cobrar'));
    
    setSelectedClientForPayment({
      id: client.id,
      name: client.name,
      appointments: clientAppointments.map(apt => ({
        id: apt.id,
        date: apt.date,
        status: apt.status,
        modality: apt.modality_info?.name || apt.modality || 'Modalidade não definida',
        valor_total: apt.valor_total || 0,
        client: apt.client
      }))
    });
    setIsPaymentModalOpen(true);
  };

  // Função para fechar modal e recarregar dados
  const handlePaymentUpdated = async () => {
    console.log('🔄 Financial - Recarregando dados após pagamento');
    
    // Invalidar TODOS os caches relacionados a appointments
    queryClient.invalidateQueries({ queryKey: ['appointments'] });
    queryClient.invalidateQueries({ queryKey: ['appointments', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['clientBookings'] });
    
    // Limpar cache completamente
    queryClient.removeQueries({ queryKey: ['appointments', user?.id] });
    
    // Aguardar um pouco para o cache ser limpo
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Recarregar dados
    await refetch();
    
    // Aguardar mais um pouco
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Forçar recarregamento dos dados financeiros
    await fetchFinancialData();
    
    console.log('✅ Financial - Recarregamento concluído');
  };



  // Função para corrigir valores dos agendamentos recorrentes existentes
  const corrigirValoresRecorrentes = async () => {
    try {
      setIsLoading(true);
      
      toast({
        title: 'Corrigindo valores...',
        description: 'Atualizando agendamentos recorrentes com valores corretos.',
      });

      // Recarregar dados para aplicar a correção
      fetchFinancialData();
      
      toast({
        title: 'Valores corrigidos!',
        description: 'Os agendamentos recorrentes foram atualizados.',
      });
    } catch (error: any) {
      console.error('Erro ao corrigir valores:', error);
      toast({
        title: 'Erro ao corrigir valores',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generatePDFReport = () => {
    try {
      const doc = new jsPDF();
    
      // Cabeçalho
      doc.setFontSize(20);
      doc.text(`${user?.user_metadata?.full_name || user?.user_metadata?.name || 'Usuário'} - Relatório Financeiro`, 105, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text(`Período: ${activeTab === 'horarios' ? format(selectedMonth, 'MMMM yyyy', { locale: ptBR }) : selectedYear.getFullYear()}`, 105, 30, { align: 'center' });
      doc.text(`Data do relatório: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, 105, 40, { align: 'center' });
      
      if (activeTab === 'horarios') {
        // Relatório para agendamentos de horários
        doc.setFontSize(16);
        doc.text('Resumo Financeiro - Agendamentos', 20, 60);
        
        doc.setFontSize(10);
        doc.text(`Valor Recebido: R$ ${financialData.total_recebido.toFixed(2)}`, 20, 75);
        doc.text(`A Cobrar: R$ ${financialData.total_pendente.toFixed(2)}`, 20, 85);
        doc.text(`Cancelados: R$ ${financialData.total_cancelado.toFixed(2)}`, 20, 95);
        doc.text(`Agendamentos Realizados: ${financialData.agendamentos_realizados}`, 20, 105);
        
        // Tabela de clientes
        doc.setFontSize(16);
        doc.text('Resumo por Cliente', 20, 130);
        
        const clientTableData = clientsFinancial.map(client => [
          client.name,
          client.total_agendamentos.toString(),
          `R$ ${client.total_pago.toFixed(2)}`,
          `R$ ${client.total_pendente.toFixed(2)}`,
          `R$ ${(client.total_pago + client.total_pendente).toFixed(2)}`
        ]);
        
        autoTable(doc, {
          head: [['Cliente', 'Agendamentos', 'Pago', 'Pendente', 'Total']],
          body: clientTableData,
          startY: 140,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [59, 130, 246] }
        });
        
        // Lista de agendamentos
        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(16);
        doc.text('Lista de Agendamentos', 20, finalY);
        
        const tableData = appointmentsData.map(apt => [
          format(new Date(apt.date), 'dd/MM/yyyy', { locale: ptBR }),
          format(new Date(apt.date), 'HH:mm', { locale: ptBR }),
          apt.client?.name || 'Cliente',
          apt.modality,
          apt.status === 'pago' ? 'Pago' : apt.status === 'a_cobrar' ? 'A Cobrar' : apt.status === 'agendado' ? 'Agendado' : apt.status === 'cancelado' ? 'Cancelado' : apt.status,
          `R$ ${apt.valor_total.toFixed(2)}`
        ]);
        
        autoTable(doc, {
          head: [['Data', 'Horário', 'Cliente', 'Modalidade', 'Status', 'Valor']],
          body: tableData,
          startY: finalY + 10,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [59, 130, 246] }
        });
        
        doc.save(`relatorio-agendamentos-${format(selectedMonth, 'yyyy-MM', { locale: ptBR })}.pdf`);
        
      } else {
        // Relatório para eventos
        doc.setFontSize(16);
        doc.text('Resumo Financeiro - Eventos', 20, 60);
        
        doc.setFontSize(10);
        doc.text(`Valor Recebido: R$ ${eventsFinancialData.total_recebido.toFixed(2)}`, 20, 75);
        doc.text(`A Cobrar: R$ ${eventsFinancialData.total_pendente.toFixed(2)}`, 20, 85);
        doc.text(`Cancelados: R$ ${eventsFinancialData.total_cancelado.toFixed(2)}`, 20, 95);
        doc.text(`Total de Eventos: ${eventsFinancialData.agendamentos_realizados}`, 20, 105);
        
        // Lista de eventos
        doc.setFontSize(16);
        doc.text('Lista de Eventos', 20, 130);
        
        const eventTableData = eventsData.map(event => [
          format(normalizeLocalDate(event.event_date as any), 'dd/MM/yyyy', { locale: ptBR }),
          event.client_name,
          `${event.start_time} - ${event.end_time}`,
          event.guests > 0 ? event.guests.toString() : '-',
          event.status === 'pago' ? 'Pago' : event.status === 'a_cobrar' ? 'A Cobrar' : 'Cancelado',
          `R$ ${event.amount.toFixed(2)}`,
          event.notes || '-'
        ]);
        
        autoTable(doc, {
          head: [['Data', 'Cliente', 'Horário', 'Convidados', 'Status', 'Valor', 'Observações']],
          body: eventTableData,
          startY: 140,
          styles: { fontSize: 7 },
          headStyles: { fillColor: [59, 130, 246] },
          columnStyles: {
            6: { cellWidth: 30 } // Coluna de observações mais larga
          }
        });
        
        doc.save(`relatorio-eventos-${selectedYear.getFullYear()}.pdf`);
      }
      
      toast({
        title: 'Relatório gerado!',
        description: `Relatório de ${activeTab === 'horarios' ? format(selectedMonth, 'MMMM yyyy', { locale: ptBR }) : selectedYear.getFullYear()} foi baixado com sucesso.`,
      });
      
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast({
        title: 'Erro ao gerar relatório',
        description: 'Não foi possível gerar o relatório PDF. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-slate-600 font-medium">Carregando dados financeiros...</p>
        </div>
      </div>
    );
  }

  // Verificar se há erro
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <p className="text-lg text-slate-600">Usuário não autenticado</p>
          <Button onClick={() => navigate('/auth')} className="mt-4">
            Fazer Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Modern Header */}
      <motion.header 
        className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-30 shadow-sm"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="hover:bg-slate-100 px-2 sm:px-3"
              >
                <ArrowLeft className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Voltar</span>
              </Button>
              <div className="space-y-1">
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
                  <DollarSign className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span>Área Financeira</span>
                </h1>
                <p className="text-slate-600 text-xs sm:text-sm font-medium hidden sm:block">Controle financeiro do ginásio</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generatePDFReport}
                  className="bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 shadow-sm text-xs sm:text-sm px-2 sm:px-3"
                >
                  <FileText className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Gerar Relatório</span>
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Navegação por Ano */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-xl rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200/60 p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold text-slate-800">
                <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                {activeTab === 'horarios' ? 'Navegação por Mês' : 'Navegação por Ano'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {activeTab === 'horarios' ? (
                  // Navegação mensal para horários
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePreviousMonth}
                      className="hover:bg-slate-100 transition-colors px-3 py-2 order-2 sm:order-1"
                    >
                      <ChevronLeft className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Mês Anterior</span>
                    </Button>
                    
                    <div className="flex items-center gap-2 sm:gap-4 order-1 sm:order-2 justify-between">
                      <div className="px-3 sm:px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
                        <h3 className="text-base sm:text-lg font-semibold text-blue-800">
                          {format(selectedMonth, 'MMMM yyyy', { locale: ptBR })}
                        </h3>
                      </div>
                      {(selectedMonth.getMonth() === new Date().getMonth() && selectedMonth.getFullYear() === new Date().getFullYear()) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCurrentMonth}
                          className="border-slate-200 hover:bg-slate-50 px-3"
                        >
                          <span className="hidden sm:inline">Mês Atual</span>
                          <span className="sm:hidden">Hoje</span>
                        </Button>
                      )}
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleNextMonth}
                      className="hover:bg-slate-100 transition-colors px-3 py-2 order-3"
                    >
                      <span className="hidden sm:inline">Próximo Mês</span>
                      <ChevronRight className="h-4 w-4 sm:ml-2" />
                    </Button>
                  </>
                ) : (
                  // Navegação anual para eventos
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePreviousYear}
                      className="hover:bg-slate-100 transition-colors px-3 py-2 order-2 sm:order-1"
                    >
                      <ChevronLeft className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Ano Anterior</span>
                    </Button>
                    
                    <div className="flex items-center gap-2 sm:gap-4 order-1 sm:order-2 justify-between">
                      <div className="px-3 sm:px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
                        <h3 className="text-base sm:text-lg font-semibold text-blue-800">
                          {selectedYear.getFullYear()}
                        </h3>
                      </div>
                      {selectedYear.getFullYear() === new Date().getFullYear() && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCurrentYear}
                          className="border-slate-200 hover:bg-slate-50 px-3"
                        >
                          <span className="hidden sm:inline">Ano Atual</span>
                          <span className="sm:hidden">Hoje</span>
                        </Button>
                      )}
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleNextYear}
                      className="hover:bg-slate-100 transition-colors px-3 py-2 order-3"
                    >
                      <span className="hidden sm:inline">Próximo Ano</span>
                      <ChevronRight className="h-4 w-4 sm:ml-2" />
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Financial Overview with Tabs */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'horarios' | 'eventos')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6">
              <TabsTrigger value="horarios" className="flex items-center justify-center gap-2 text-xs sm:text-sm py-2">
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">Agenda de Horários</span>
                <span className="sm:hidden">Horários</span>
              </TabsTrigger>
              <TabsTrigger value="eventos" className="flex items-center justify-center gap-2 text-xs sm:text-sm py-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Agenda de Eventos</span>
                <span className="sm:hidden">Eventos</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="horarios" className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-xl rounded-2xl overflow-hidden">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-600 tracking-wide uppercase">Valor Recebido</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(financialData.total_recebido)}
                  </p>
                  <p className="text-xs text-slate-500 font-medium">
                    {financialData.agendamentos_pagos} agendamentos
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-xl">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-xl rounded-2xl overflow-hidden">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-600 tracking-wide uppercase">A Cobrar</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {formatCurrency(financialData.total_pendente)}
                  </p>
                  <p className="text-xs text-slate-500 font-medium">
                    {financialData.agendamentos_pendentes} agendamentos
                  </p>
                </div>
                <div className="p-3 bg-orange-100 rounded-xl">
                  <AlertCircle className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-xl rounded-2xl overflow-hidden">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-600 tracking-wide uppercase">A Receber</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(financialData.total_agendado)}
                  </p>
                  <p className="text-xs text-slate-500 font-medium">
                    {financialData.agendamentos_agendados} agendamentos
                  </p>
                  
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-xl rounded-2xl overflow-hidden">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-600 tracking-wide uppercase">Cancelados</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(financialData.total_cancelado)}
                  </p>
                  <p className="text-xs text-slate-500 font-medium">
                    {financialData.agendamentos_cancelados} agendamentos
                  </p>
                </div>
                <div className="p-3 bg-red-100 rounded-xl">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
              </div>
            </TabsContent>

            <TabsContent value="eventos" className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-xl rounded-2xl overflow-hidden">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-slate-600 tracking-wide uppercase">Valor Recebido</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(eventsFinancialData.total_recebido)}
                        </p>
                        <p className="text-xs text-slate-500 font-medium">
                          {eventsFinancialData.agendamentos_pagos} eventos
                        </p>
                      </div>
                      <div className="p-3 bg-green-100 rounded-xl">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-xl rounded-2xl overflow-hidden">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-slate-600 tracking-wide uppercase">A Cobrar</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {formatCurrency(eventsFinancialData.total_pendente)}
                        </p>
                        <p className="text-xs text-slate-500 font-medium">
                          {eventsFinancialData.agendamentos_pendentes} eventos
                        </p>
                      </div>
                      <div className="p-3 bg-orange-100 rounded-xl">
                        <AlertCircle className="h-6 w-6 text-orange-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-xl rounded-2xl overflow-hidden">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-slate-600 tracking-wide uppercase">Total de Eventos</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {eventsFinancialData.agendamentos_realizados}
                        </p>
                        <p className="text-xs text-slate-500 font-medium">
                          eventos realizados
                        </p>
                      </div>
                      <div className="p-3 bg-blue-100 rounded-xl">
                        <Calendar className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-xl rounded-2xl overflow-hidden">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-slate-600 tracking-wide uppercase">Cancelados</p>
                        <p className="text-2xl font-bold text-red-600">
                          {formatCurrency(eventsFinancialData.total_cancelado)}
                        </p>
                        <p className="text-xs text-slate-500 font-medium">
                          {eventsFinancialData.agendamentos_cancelados} eventos
                        </p>
                      </div>
                      <div className="p-3 bg-red-100 rounded-xl">
                        <XCircle className="h-6 w-6 text-red-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Relatório PDF */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-xl rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200/60 p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold text-slate-800">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                Relatório Anual
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-2">
                  <p className="text-xs sm:text-sm text-slate-600 font-medium">
                    Gere um relatório completo em PDF com todos os dados financeiros do ano selecionado.
                  </p>
                  <p className="text-[11px] sm:text-xs text-slate-500">
                    O relatório incluirá: lista de agendamentos, resumo por cliente, estatísticas financeiras e receita total.
                  </p>
                </div>
                <Button 
                  onClick={generatePDFReport}
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 text-xs sm:text-sm px-3 sm:px-4 py-2"
                >
                  <FileText className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Gerar Relatório em PDF</span>
                  <span className="sm:hidden">PDF</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Clients Financial Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-xl rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200/60 p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold text-slate-800">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                {activeTab === 'horarios' ? `Resumo por Cliente - ${format(selectedMonth, 'MMMM yyyy', { locale: ptBR })}` : `Resumo por Evento - ${selectedYear.getFullYear()}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {activeTab === 'horarios' ? (
                // Conteúdo para agendamentos de horários
                clientsFinancial.length === 0 ? (
                  <div className="text-center py-12">
                    <DollarSign className="h-16 w-16 mx-auto text-slate-300 mb-4" />
                    <p className="text-lg font-medium text-slate-600 mb-2">Nenhum dado financeiro</p>
                    <p className="text-slate-500 mb-6">
                      Não há agendamentos registrados em {format(selectedMonth, 'MMMM yyyy', { locale: ptBR })}
                    </p>
                    <Button 
                      onClick={() => navigate('/appointments/new')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Criar Primeiro Agendamento
                    </Button>
                  </div>
                ) : (
                <div className="space-y-4">
                  {clientsFinancial.map((client) => (
                    <motion.div 
                      key={client.id} 
                      className="border border-slate-200 rounded-xl p-4 sm:p-6 bg-white/50 hover:bg-white/80 transition-all duration-300"
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-slate-800 text-base sm:text-lg break-words">{client.name}</h3>
                          <p className="text-sm text-slate-500 font-medium">
                            {client.total_agendamentos} agendamentos
                          </p>
                        </div>
                        <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:gap-6">
                          <div className="text-right">
                            <p className="text-sm text-slate-500 font-medium">Pago</p>
                            <p className="font-bold text-green-600 text-base sm:text-lg">
                              {formatCurrency(client.total_pago)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-slate-500 font-medium">Pendente</p>
                            <p className="font-bold text-orange-600 text-base sm:text-lg">
                              {formatCurrency(client.total_pendente)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-slate-500 font-medium">Total</p>
                            <p className="font-bold text-slate-800 text-base sm:text-lg">
                              {formatCurrency(client.total_pago + client.total_pendente)}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleOpenPaymentModal(client)}
                            className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-2 h-9 w-full sm:w-auto"
                          >
                            <CreditCard className="h-3 w-3 mr-1" />
                            <span className="hidden sm:inline">Pagamento</span>
                            <span className="sm:hidden">Pagar</span>
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
                )
              ) : (
                // Conteúdo para eventos mensais
                eventsData.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="h-16 w-16 mx-auto text-slate-300 mb-4" />
                    <p className="text-lg font-medium text-slate-600 mb-2">Nenhum evento encontrado</p>
                    <p className="text-slate-500 mb-6">
                      Não há eventos registrados em {selectedYear.getFullYear()}
                    </p>
                    <Button 
                      onClick={() => navigate('/dashboard')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Ir para Dashboard
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Eventos Futuros */}
                    <div>
                      <h4 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-blue-600" />
                        Eventos Futuros
                      </h4>
                      <div className="space-y-3">
                        {eventsData
                          .filter(event => {
                            const eventDate = normalizeLocalDate(event.event_date as any);
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return eventDate >= today;
                          })
                          .map((event) => (
                            <motion.div 
                              key={event.id} 
                              className="border border-slate-200 rounded-xl p-4 bg-white/50 hover:bg-white/80 transition-all duration-300"
                              whileHover={{ scale: 1.01 }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <h3 className="font-semibold text-slate-800 mb-1">{event.client_name}</h3>
                                  <div className="flex items-center gap-4 text-sm">
                                    <span className="text-slate-600">
                                      <strong>{format(normalizeLocalDate(event.event_date as any), 'dd/MM/yyyy')}</strong>
                                    </span>
                                    <span className="text-slate-600">
                                      {event.start_time} - {event.end_time}
                                    </span>
                                    {event.guests > 0 && (
                                      <span className="text-slate-600">
                                        {event.guests} convidados
                                      </span>
                                    )}
                                  </div>
                                  {event.notes && (
                                    <p className="text-xs text-slate-500 mt-1 italic">{event.notes}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <p className="text-sm text-slate-500 font-medium">Valor</p>
                                    <p className={`font-bold ${
                                      event.status === 'pago' ? 'text-green-600' :
                                      event.status === 'a_cobrar' ? 'text-orange-600' :
                                      'text-red-600'
                                    }`}>
                                      {formatCurrency(event.amount)}
                                    </p>
                                  </div>
                                  <Badge 
                                    variant={event.status === 'pago' ? 'default' : event.status === 'a_cobrar' ? 'secondary' : 'destructive'}
                                    className="text-xs"
                                  >
                                    {event.status === 'pago' ? 'Pago' :
                                     event.status === 'a_cobrar' ? 'A Cobrar' :
                                     'Cancelado'}
                                  </Badge>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        {eventsData.filter(event => {
                          const eventDate = normalizeLocalDate(event.event_date as any);
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          return eventDate >= today;
                        }).length === 0 && (
                          <div className="text-center py-4 text-slate-500">
                            Nenhum evento futuro encontrado
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Eventos Realizados */}
                    <div>
                      <h4 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        Eventos Realizados
                      </h4>
                      <div className="space-y-3">
                        {eventsData
                          .filter(event => {
                            const eventDate = normalizeLocalDate(event.event_date as any);
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return eventDate < today;
                          })
                          .map((event) => (
                            <motion.div 
                              key={event.id} 
                              className="border border-slate-200 rounded-xl p-4 bg-white/50 hover:bg-white/80 transition-all duration-300"
                              whileHover={{ scale: 1.01 }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <h3 className="font-semibold text-slate-800 mb-1">{event.client_name}</h3>
                                  <div className="flex items-center gap-4 text-sm">
                                    <span className="text-slate-600">
                                      <strong>{format(normalizeLocalDate(event.event_date as any), 'dd/MM/yyyy')}</strong>
                                    </span>
                                    <span className="text-slate-600">
                                      {event.start_time} - {event.end_time}
                                    </span>
                                    {event.guests > 0 && (
                                      <span className="text-slate-600">
                                        {event.guests} convidados
                                      </span>
                                    )}
                                  </div>
                                  {event.notes && (
                                    <p className="text-xs text-slate-500 mt-1 italic">{event.notes}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <p className="text-sm text-slate-500 font-medium">Valor</p>
                                    <p className={`font-bold ${
                                      event.status === 'pago' ? 'text-green-600' :
                                      event.status === 'a_cobrar' ? 'text-orange-600' :
                                      'text-red-600'
                                    }`}>
                                      {formatCurrency(event.amount)}
                                    </p>
                                  </div>
                                  <Badge 
                                    variant={event.status === 'pago' ? 'default' : event.status === 'a_cobrar' ? 'secondary' : 'destructive'}
                                    className="text-xs"
                                  >
                                    {event.status === 'pago' ? 'Pago' :
                                     event.status === 'a_cobrar' ? 'A Cobrar' :
                                     'Cancelado'}
                                  </Badge>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        {eventsData.filter(event => {
                          const eventDate = normalizeLocalDate(event.event_date as any);
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          return eventDate < today;
                        }).length === 0 && (
                          <div className="text-center py-4 text-slate-500">
                            Nenhum evento realizado encontrado
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-xl rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200/60 p-6">
              <CardTitle className="text-xl font-bold text-slate-800">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    variant="outline" 
                    className="h-24 w-full flex-col gap-3 border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all duration-300"
                    onClick={() => navigate('/clients')}
                  >
                    <Users className="h-8 w-8 text-blue-600" />
                    <span className="font-semibold">Gerenciar Clientes</span>
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    variant="outline" 
                    className="h-24 w-full flex-col gap-3 border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all duration-300"
                    onClick={() => navigate('/appointments/new')}
                  >
                    <Calendar className="h-8 w-8 text-blue-600" />
                    <span className="font-semibold">Novo Agendamento</span>
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    variant="outline" 
                    className="h-24 w-full flex-col gap-3 border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all duration-300"
                    onClick={() => navigate('/appointments')}
                  >
                    <Calendar className="h-8 w-8 text-blue-600" />
                    <span className="font-semibold">Ver Agendamentos</span>
                  </Button>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Modal de Pagamento em Massa */}
      {selectedClientForPayment && (
        <BulkPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          clientId={selectedClientForPayment.id}
          clientName={selectedClientForPayment.name}
          appointments={selectedClientForPayment.appointments}
          onStatusUpdated={handlePaymentUpdated}
        />
      )}

    </div>
  );
};

export default Financial;