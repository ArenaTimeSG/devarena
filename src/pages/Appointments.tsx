import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useAppointments } from '@/hooks/useAppointments';
import { formatCurrency, formatModalityWithValue } from '@/utils/currency';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, ArrowLeft, Search, Filter, Plus, ChevronLeft, ChevronRight, Clock, CheckCircle, TrendingUp, Users, AlertCircle } from 'lucide-react';
import ResponsiveFilters from '@/components/ui/responsive-filters';
import { format, isBefore, isEqual, startOfMonth, endOfMonth, addMonths, subMonths, isAfter, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AppointmentDetailsModal from '@/components/AppointmentDetailsModal';
import { AppointmentWithModality } from '@/hooks/useAppointments';

// Função auxiliar para exibir modalidade com valor e indicador de cortesia
const formatModalityWithCortesia = (appointment: AppointmentWithModality) => {
  if (appointment.modality_info) {
    return (
      <div className="flex items-center gap-2">
        <span>{formatModalityWithValue(appointment.modality_info.name, appointment.valor_total)}</span>
        {appointment.is_cortesia && (
          <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200 text-xs">
            🎁 Cortesia
          </Badge>
        )}
      </div>
    );
  }
  return appointment.modality || 'Modalidade não definida';
};

interface GroupedAppointments {
  [clientName: string]: AppointmentWithModality[];
}

const Appointments = () => {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const { appointments, isLoading } = useAppointments();
  
  const navigate = useNavigate();
  const [filteredAppointments, setFilteredAppointments] = useState<AppointmentWithModality[]>([]);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithModality | null>(null);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modalityFilter, setModalityFilter] = useState<string>('all');
  
  // Navegação por mês
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      // Os agendamentos são carregados automaticamente pelo hook useAppointments
    }
  }, [user, selectedMonth]);

  useEffect(() => {
    applyFilters();
  }, [appointments, searchTerm, statusFilter, modalityFilter, selectedMonth]);

  // Função para filtrar agendamentos por mês selecionado
  const getAppointmentsForSelectedMonth = () => {
    return appointments.filter(apt => {
      const appointmentDate = new Date(apt.date);
      // Normalizar as datas para comparar apenas ano e mês
      const aptYear = appointmentDate.getFullYear();
      const aptMonth = appointmentDate.getMonth();
      const selectedYear = selectedMonth.getFullYear();
      const selectedMonthNum = selectedMonth.getMonth();
      
      return aptYear === selectedYear && aptMonth === selectedMonthNum;
    });
  };

  const applyFilters = () => {
    let filtered = getAppointmentsForSelectedMonth();

    // Filtro por termo de busca (nome do cliente)
    if (searchTerm) {
      filtered = filtered.filter(apt => 
        apt.client.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(apt => apt.status === statusFilter);
    }

    // Filtro por modalidade
    if (modalityFilter !== 'all') {
      filtered = filtered.filter(apt => apt.modality_info?.name === modalityFilter);
    }

    setFilteredAppointments(filtered);
  };

  const getStatusColor = (status: string, is_cortesia?: boolean) => {
    // Se for cortesia (independente do status), sempre mostrar como cortesia
    if (is_cortesia) {
      return 'bg-pink-100 text-pink-800 border-pink-200';
    }
    
    switch (status) {
      case 'pago': return 'bg-green-100 text-green-800 border-green-200';
      case 'a_cobrar': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cortesia': return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'agendado': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelado': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string, is_cortesia?: boolean) => {
    switch (status) {
      case 'pago': return 'Pago';
      case 'a_cobrar': return 'A Cobrar';
      case 'cortesia': return '🎁 Cortesia';
      case 'agendado': return is_cortesia ? '🎁 Cortesia' : 'Agendado';
      case 'cancelado': return 'Cancelado';
      default: return status;
    }
  };

  const getPaymentStatusColor = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      case 'not_required': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPaymentStatusLabel = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'pending': return 'Pagamento Pendente';
      case 'failed': return 'Pagamento Falhou';
      case 'not_required': return 'Sem Pagamento';
      default: return 'N/A';
    }
  };

  const handleAppointmentClick = (appointment: AppointmentWithModality) => {
    setSelectedAppointment(appointment);
    setIsDetailsModalOpen(true);
  };

  const handleAppointmentUpdated = () => {
    // Os agendamentos são atualizados automaticamente pelo hook useAppointments
  };

  const getModalities = () => {
    const modalities = new Set(appointments.map(apt => apt.modality_info?.name).filter(Boolean));
    return Array.from(modalities).sort();
  };

  const handlePreviousMonth = () => {
    setSelectedMonth(subMonths(selectedMonth, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(addMonths(selectedMonth, 1));
  };

  const handleCurrentMonth = () => {
    setSelectedMonth(new Date());
  };

  // Separar agendamentos em futuros e realizados
  const separateAppointments = () => {
    const today = startOfDay(new Date());
    
    const futureAppointments = filteredAppointments.filter(apt => 
      isAfter(new Date(apt.date), today) || isEqual(new Date(apt.date), today)
    );
    
    const pastAppointments = filteredAppointments.filter(apt => 
      isBefore(new Date(apt.date), today)
    );

    return { futureAppointments, pastAppointments };
  };

  // Agrupar agendamentos por cliente
  const groupAppointmentsByClient = (appointments: AppointmentWithModality[]): GroupedAppointments => {
    const grouped: GroupedAppointments = {};
    
    appointments.forEach(appointment => {
      const clientName = appointment.client?.name || 'Cliente não identificado';
      if (!grouped[clientName]) {
        grouped[clientName] = [];
      }
      grouped[clientName].push(appointment);
    });

    // Ordenar agendamentos de cada cliente por data
    Object.keys(grouped).forEach(clientName => {
      grouped[clientName].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    });

    return grouped;
  };

  const { futureAppointments, pastAppointments } = separateAppointments();
  const groupedFutureAppointments = groupAppointmentsByClient(futureAppointments);
  const groupedPastAppointments = groupAppointmentsByClient(pastAppointments);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-slate-600 font-medium">Carregando agendamentos...</p>
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
                  <Calendar className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span>Agendamentos</span>
                </h1>
                <p className="text-slate-600 text-xs sm:text-sm font-medium hidden sm:block">Gerenciamento completo de agendamentos</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4">
              
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => navigate('/appointments/new')}
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 text-xs sm:text-sm px-3 sm:px-4 py-2"
                >
                  <Plus className="h-4 w-4 sm:h-5 sm:w-5 sm:mr-2" />
                  <span className="hidden sm:inline">Novo Agendamento</span>
                  <span className="sm:hidden">Novo</span>
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Navegação por Mês */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-xl rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200/60 p-6">
              <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-800">
                <Calendar className="h-6 w-6 text-blue-600" />
                Navegação por Mês
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                  {format(selectedMonth, 'MMMM yyyy', { locale: ptBR }) === format(new Date(), 'MMMM yyyy', { locale: ptBR }) && (
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
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Filtros Responsivos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <ResponsiveFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            filters={[
              {
                label: "Status",
                value: statusFilter,
                options: [
                  { value: "all", label: "Todos" },
                  { value: "a_cobrar", label: "A Cobrar" },
                  { value: "pago", label: "Pago" },
                  { value: "cancelado", label: "Cancelado" }
                ],
                onValueChange: setStatusFilter
              },
              {
                label: "Modalidade",
                value: modalityFilter,
                options: [
                  { value: "all", label: "Todas" },
                  ...getModalities().map(modality => ({
                    value: modality,
                    label: modality
                  }))
                ],
                onValueChange: setModalityFilter
              }
            ]}
            actions={[
              {
                label: "Novo Agendamento",
                icon: <Plus className="h-4 w-4 mr-2" />,
                onClick: () => navigate('/appointments/new'),
                variant: 'default'
              }
            ]}
          />
        </motion.div>

        {/* Estatísticas */}
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-xl rounded-2xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-600 tracking-wide uppercase">Total</p>
                  <p className="text-2xl font-bold text-slate-800">{filteredAppointments.length}</p>
                </div>
                <div className="p-3 bg-slate-100 rounded-xl">
                  <TrendingUp className="h-6 w-6 text-slate-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-xl rounded-2xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-600 tracking-wide uppercase">Futuros</p>
                  <p className="text-2xl font-bold text-blue-600">{futureAppointments.length}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-xl rounded-2xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-600 tracking-wide uppercase">Realizados</p>
                  <p className="text-2xl font-bold text-green-600">{pastAppointments.length}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-xl">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-xl rounded-2xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-600 tracking-wide uppercase">Pendentes</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {filteredAppointments.filter(apt => apt.status === 'a_cobrar').length}
                  </p>
                </div>
                <div className="p-3 bg-orange-100 rounded-xl">
                  <AlertCircle className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Agendamentos Futuros */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-xl rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200/60 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold text-slate-800">
                  <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                  Agendamentos Futuros - {format(selectedMonth, 'MMMM yyyy', { locale: ptBR })}
                </CardTitle>
                <div className="hidden sm:flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
                    <span className="text-slate-600">Recorrente</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-purple-100 border border-purple-300 rounded"></div>
                    <span className="text-slate-600">Único</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {Object.keys(groupedFutureAppointments).length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-16 w-16 mx-auto text-slate-300 mb-4" />
                  <p className="text-lg font-medium text-slate-600 mb-2">Nenhum agendamento futuro</p>
                  <p className="text-slate-500 mb-6">
                    Não há agendamentos futuros em {format(selectedMonth, 'MMMM yyyy', { locale: ptBR })}
                  </p>
                  <Button 
                    onClick={() => navigate('/appointments/new')}
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    Criar Novo Agendamento
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedFutureAppointments).map(([clientName, clientAppointments]) => (
                    <motion.div 
                      key={clientName} 
                      className="border border-slate-200 rounded-xl p-6 bg-white/50 hover:bg-white/80 transition-all duration-300"
                      whileHover={{ scale: 1.02 }}
                    >
                      <h3 className="text-lg font-semibold mb-4 text-slate-800">{clientName}</h3>
                      <div className="space-y-3">
                        {clientAppointments.map((appointment) => (
                          <motion.div 
                            key={appointment.id} 
                            className={`border rounded-xl p-4 hover:bg-slate-50 cursor-pointer transition-all duration-300 ${
                              appointment.recurrence_id 
                                ? 'border-blue-300 bg-blue-50/30' // Azul para recorrência
                                : 'border-purple-300 bg-purple-50/30' // Roxo para único
                            }`}
                            onClick={() => handleAppointmentClick(appointment)}
                            whileHover={{ scale: 1.02 }}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div className="flex-1">
                                <p className="text-sm text-slate-600 font-medium">
                                  {formatModalityWithCortesia(appointment)}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                  {appointment.recurrence_id ? (
                                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                                      🔄 Recorrente
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-200 text-xs">
                                      ⭐ Único
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                                <div className="flex items-center gap-4">
                                  <div className="text-center sm:text-right">
                                    <p className="text-xs sm:text-sm text-slate-500 font-medium">Data</p>
                                    <p className="font-semibold text-slate-800 text-sm sm:text-base">
                                      {format(new Date(appointment.date), 'dd/MM/yyyy', { locale: ptBR })}
                                    </p>
                                  </div>
                                  <div className="text-center sm:text-right">
                                    <p className="text-xs sm:text-sm text-slate-500 font-medium">Horário</p>
                                    <p className="font-semibold text-slate-800 text-sm sm:text-base">
                                      {format(new Date(appointment.date), 'HH:mm', { locale: ptBR })}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-1 sm:items-center">
                                  <Badge className={getStatusColor(appointment.status, appointment.is_cortesia)}>
                                    {getStatusLabel(appointment.status, appointment.is_cortesia)}
                                  </Badge>
                                  {appointment.payment_status && appointment.payment_status !== 'not_required' && appointment.status !== 'pago' && (
                                    <Badge className={getPaymentStatusColor(appointment.payment_status)}>
                                      {getPaymentStatusLabel(appointment.payment_status)}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Agendamentos Realizados */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-xl rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-green-50 border-b border-slate-200/60 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold text-slate-800">
                  <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                  Agendamentos Realizados - {format(selectedMonth, 'MMMM yyyy', { locale: ptBR })}
                </CardTitle>
                <div className="hidden sm:flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
                    <span className="text-slate-600">Recorrente</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-purple-100 border border-purple-300 rounded"></div>
                    <span className="text-slate-600">Único</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {Object.keys(groupedPastAppointments).length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-16 w-16 mx-auto text-slate-300 mb-4" />
                  <p className="text-lg font-medium text-slate-600 mb-2">Nenhum agendamento realizado</p>
                  <p className="text-slate-500 mb-6">
                    Não há agendamentos realizados em {format(selectedMonth, 'MMMM yyyy', { locale: ptBR })}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedPastAppointments).map(([clientName, clientAppointments]) => (
                    <motion.div 
                      key={clientName} 
                      className="border border-slate-200 rounded-xl p-6 bg-white/50 hover:bg-white/80 transition-all duration-300"
                      whileHover={{ scale: 1.02 }}
                    >
                      <h3 className="text-lg font-semibold mb-4 text-slate-800">{clientName}</h3>
                      <div className="space-y-3">
                        {clientAppointments.map((appointment) => (
                          <motion.div 
                            key={appointment.id} 
                            className={`border rounded-xl p-4 hover:bg-slate-50 cursor-pointer transition-all duration-300 ${
                              appointment.recurrence_id 
                                ? 'border-blue-300 bg-blue-50/30' // Azul para recorrência
                                : 'border-purple-300 bg-purple-50/30' // Roxo para único
                            }`}
                            onClick={() => handleAppointmentClick(appointment)}
                            whileHover={{ scale: 1.02 }}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div className="flex-1">
                                <p className="text-sm text-slate-600 font-medium">
                                  {formatModalityWithCortesia(appointment)}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                  {appointment.recurrence_id ? (
                                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                                      🔄 Recorrente
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-200 text-xs">
                                      ⭐ Único
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                                <div className="flex items-center gap-4">
                                  <div className="text-center sm:text-right">
                                    <p className="text-xs sm:text-sm text-slate-500 font-medium">Data</p>
                                    <p className="font-semibold text-slate-800 text-sm sm:text-base">
                                      {format(new Date(appointment.date), 'dd/MM/yyyy', { locale: ptBR })}
                                    </p>
                                  </div>
                                  <div className="text-center sm:text-right">
                                    <p className="text-xs sm:text-sm text-slate-500 font-medium">Horário</p>
                                    <p className="font-semibold text-slate-800 text-sm sm:text-base">
                                      {format(new Date(appointment.date), 'HH:mm', { locale: ptBR })}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-1 sm:items-center">
                                  <Badge className={getStatusColor(appointment.status, appointment.is_cortesia)}>
                                    {getStatusLabel(appointment.status, appointment.is_cortesia)}
                                  </Badge>
                                  {appointment.payment_status && appointment.payment_status !== 'not_required' && appointment.status !== 'pago' && (
                                    <Badge className={getPaymentStatusColor(appointment.payment_status)}>
                                      {getPaymentStatusLabel(appointment.payment_status)}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <AppointmentDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedAppointment(null);
        }}
        appointment={selectedAppointment}
        onAppointmentUpdated={handleAppointmentUpdated}
      />
    </div>
  );
};

export default Appointments;
