import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useWorkingHours } from '@/hooks/useWorkingHours';
import { useSettingsSync } from '@/hooks/useSettingsSync';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Plus, Users, DollarSign, Activity, LogOut, FileText, Settings, ChevronLeft, ChevronRight, User, ChevronDown, Shield, Mail, Phone, Clock, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, isBefore, isEqual } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import NewAppointmentModal from '@/components/NewAppointmentModal';
import AppointmentDetailsModal from '@/components/AppointmentDetailsModal';
import { StatCard } from '@/components/animated/StatCard';
import { AppointmentCard } from '@/components/animated/AppointmentCard';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Appointment {
  id: string;
  date: string;
  status: 'a_cobrar' | 'pago' | 'cancelado' | 'agendado';
  modality: string;
  client: {
    name: string;
  };
  recurrence_id?: string;
}

const Dashboard = () => {
  const { user, loading, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | undefined>();
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [blockedTimeSlot, setBlockedTimeSlot] = useState<{day: Date, timeSlot: string} | null>(null);
  const [userProfile, setUserProfile] = useState<{
    name: string;
    email: string;
    phone?: string;
  } | null>(null);

  // Hook para gerenciar horários de funcionamento
  const {
    generateTimeSlots,
    isTimeSlotBlocked,
    isTimeSlotAvailable,
    getCellBackgroundColor,
    canCreateAppointment,
    getAvailableHoursForDay,
    isDayEnabled
  } = useWorkingHours();

  // Hook para sincronizar configurações
  useSettingsSync();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && !loading) {
      fetchAppointments();
      fetchUserProfile();
    }
  }, [user, currentWeek, loading]);

  const fetchUserProfile = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('name, email, phone')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Erro ao buscar perfil do usuário:', error);
        setUserProfile({
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
          email: user.email || '',
          phone: user.user_metadata?.phone || ''
        });
      } else {
        setUserProfile(data);
      }
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      setUserProfile({
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
        email: user.email || '',
        phone: user.user_metadata?.phone || ''
      });
    }
  };

  const fetchAppointments = async () => {
    try {
      const weekStart = startOfWeek(currentWeek, { locale: ptBR });
      const weekEnd = addDays(weekStart, 6);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          date,
          status,
          modality,
          recurrence_id,
          user_id,
          client:booking_clients(name)
        `)
        .gte('date', weekStart.toISOString())
        .lte('date', weekEnd.toISOString())
        .order('date');

      if (error) {
        console.error('🔍 Dashboard - Erro no join com clients:', error);
        throw error;
      }

      const processedData = data
        .map(apt => ({
          ...apt,
          client: apt.client as any
        })) as Appointment[];

      setAppointments(processedData);
    } catch (error: any) {
      console.error('🔍 Dashboard - Erro ao buscar agendamentos:', error);
      toast({
        title: 'Erro ao carregar agendamentos',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string, date?: string, recurrence_id?: string, is_cortesia?: boolean) => {
    let effectiveStatus = status;
    if (date && status === 'agendado') {
      const appointmentDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      appointmentDate.setHours(0, 0, 0, 0);
      
      if (isBefore(appointmentDate, today)) {
        // Se for cortesia, manter como 'cortesia', senão mudar para 'a_cobrar'
        effectiveStatus = is_cortesia ? 'cortesia' : 'a_cobrar';
      }
    }
    
    // Se for cortesia (independente do status), sempre mostrar como cortesia
    if (is_cortesia) {
      effectiveStatus = 'cortesia';
    }
    
    if (recurrence_id) {
      switch (effectiveStatus) {
        case 'pago': return 'bg-green-100 text-green-800 border-green-200';
        case 'a_cobrar': return 'bg-red-100 text-red-800 border-red-200';
        case 'cortesia': return 'bg-pink-100 text-pink-800 border-pink-200';
        case 'agendado': return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'cancelado': return 'bg-gray-100 text-gray-600 border-gray-200 line-through';
        default: return 'bg-blue-50 text-blue-700 border-blue-200';
      }
    } else {
      switch (effectiveStatus) {
        case 'pago': return 'bg-green-100 text-green-800 border-green-200';
        case 'a_cobrar': return 'bg-red-100 text-red-800 border-red-200';
        case 'cortesia': return 'bg-pink-100 text-pink-800 border-pink-200';
        case 'agendado': return 'bg-purple-100 text-purple-800 border-purple-200';
        case 'cancelado': return 'bg-gray-100 text-gray-600 border-gray-200 line-through';
        default: return 'bg-purple-50 text-purple-700 border-purple-200';
      }
    }
  };

  const getStatusLabel = (status: string, date?: string, is_cortesia?: boolean) => {
    if (date) {
      const appointmentDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      appointmentDate.setHours(0, 0, 0, 0);
      
      if (isBefore(appointmentDate, today) && status === 'agendado') {
        return is_cortesia ? '🎁 Cortesia' : 'A Cobrar';
      }
    }
    
    if (status === 'cancelado') return 'Cancelado';
    if (status === 'pago') return 'Pago';
    if (status === 'agendado') return is_cortesia ? '🎁 Cortesia' : 'Agendado';
    if (status === 'a_cobrar') return 'A Cobrar';
    if (status === 'cortesia') return '🎁 Cortesia';
    
    return 'A Cobrar';
  };

  const timeSlots = generateTimeSlots();

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const weekStart = startOfWeek(currentWeek, { locale: ptBR });
    return addDays(weekStart, i);
  });

  const getAppointmentForSlot = (day: Date, timeSlot: string) => {
    const slotHour = parseInt(timeSlot.split(':')[0]);
    
    const appointment = appointments.find(apt => {
      const aptDate = new Date(apt.date);
      const aptHour = aptDate.getHours();
      return isSameDay(aptDate, day) && aptHour === slotHour;
    });

    return appointment;
  };

  const handleCellClick = (day: Date, timeSlot: string) => {
    const appointment = getAppointmentForSlot(day, timeSlot);
    
    if (appointment) {
      setSelectedAppointment(appointment);
      setIsDetailsModalOpen(true);
    } else if (!isTimeSlotBlocked(day, timeSlot)) {
      setSelectedDate(day);
      setSelectedTime(timeSlot);
      setIsModalOpen(true);
    } else {
      setBlockedTimeSlot({ day, timeSlot });
      setIsConfirmationModalOpen(true);
    }
  };

  const handleAppointmentCreated = () => {
    fetchAppointments();
  };

  const handleAppointmentUpdated = () => {
    fetchAppointments();
  };

  const handleProfileClick = () => {
    navigate('/settings');
  };

  const handleConfirmBlockedTimeSlot = () => {
    if (blockedTimeSlot) {
      setSelectedDate(blockedTimeSlot.day);
      setSelectedTime(blockedTimeSlot.timeSlot);
      setIsConfirmationModalOpen(false);
      setBlockedTimeSlot(null);
      setIsModalOpen(true);
    }
  };

  const handleCancelBlockedTimeSlot = () => {
    setIsConfirmationModalOpen(false);
    setBlockedTimeSlot(null);
  };

  const generateAvailableHoursPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text('Horários Disponíveis da Semana', 105, 20, { align: 'center' });
    
    let currentY = 35;
    
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const weekStart = startOfWeek(currentWeek, { locale: ptBR });
      return addDays(weekStart, i);
    });
    
    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    
    weekDays.forEach((day, dayIndex) => {
      const dayName = dayNames[dayIndex];
      const dayDate = format(day, 'dd/MM', { locale: ptBR });
      
      const isEnabled = isDayEnabled(day);
      
      doc.setFontSize(12);
      doc.text(`${dayName} (${dayDate})`, 20, currentY);
      currentY += 8;
      
      if (!isEnabled) {
        doc.setFontSize(10);
        doc.text('FECHADO', 25, currentY);
        currentY += 12;
      } else {
        const availableHours = getAvailableHoursForDay(day);
        
        const dayAppointments = appointments.filter(apt => 
          isSameDay(new Date(apt.date), day)
        );
        
        const occupiedHours = dayAppointments.map(apt => 
          format(new Date(apt.date), 'HH:00')
        );
        
        const freeHours = availableHours.filter(time => 
          !occupiedHours.includes(time)
        );
        
        if (freeHours.length > 0) {
          const columns = 5;
          const rows = Math.ceil(freeHours.length / columns);
          
          for (let row = 0; row < rows; row++) {
            for (let col = 0; col < columns; col++) {
              const index = row * columns + col;
              if (index < freeHours.length) {
                const hour = freeHours[index];
                const x = 25 + col * 35;
                const y = currentY + row * 5;
                doc.setFontSize(9);
                doc.text(hour, x, y);
              }
            }
          }
          currentY += rows * 5 + 3;
        } else {
          doc.setFontSize(10);
          doc.text('Nenhum horário disponível', 25, currentY);
          currentY += 8;
        }
      }
      
      currentY += 3;
    });
    
    const fileName = `horarios_semana_${format(currentWeek, 'yyyy_MM_dd', { locale: ptBR })}.pdf`;
    doc.save(fileName);
    
    toast({
      title: 'PDF gerado!',
      description: 'Relatório de horários da semana foi baixado.',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-slate-600 font-medium">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Modern Sidebar */}
      <motion.aside 
        className="fixed left-0 top-0 h-full w-20 bg-white/80 backdrop-blur-xl border-r border-slate-200/60 shadow-xl z-40"
        initial={{ x: -100 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col items-center py-6 space-y-6 h-full">
          {/* Logo */}
          <motion.div 
            className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg"
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ duration: 0.3 }}
          >
            <span className="text-white font-bold text-lg">AT</span>
          </motion.div>

          {/* Navigation */}
          <div className="flex flex-col items-center space-y-3 flex-1">
            {/* Dashboard - Active */}
            <motion.div 
              className="relative"
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }}
            >
              <div className="absolute -left-3 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-r-full"></div>
              <Button
                variant="ghost"
                size="sm"
                className="w-12 h-12 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition-all duration-300 shadow-sm"
                title="Dashboard"
              >
                <Calendar className="h-5 w-5" />
              </Button>
            </motion.div>

            {/* Appointments */}
            <motion.div 
              className="relative"
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/appointments')}
                className="w-12 h-12 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-all duration-300 shadow-sm"
                title="Agendamentos"
              >
                <Clock className="h-5 w-5" />
              </Button>
            </motion.div>

            {/* New Appointment */}
            <motion.div 
              className="relative"
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/appointments/new')}
                className="w-12 h-12 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-all duration-300 shadow-sm"
                title="Novo Agendamento"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </motion.div>

            {/* Clients */}
            <motion.div 
              className="relative"
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/clients')}
                className="w-12 h-12 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-all duration-300 shadow-sm"
                title="Clientes"
              >
                <Users className="h-5 w-5" />
              </Button>
            </motion.div>

            {/* Financial */}
            <motion.div 
              className="relative"
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/financial')}
                className="w-12 h-12 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-all duration-300 shadow-sm"
                title="Financeiro"
              >
                <DollarSign className="h-5 w-5" />
              </Button>
            </motion.div>

            {/* Settings */}
            <motion.div 
              className="relative"
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/settings')}
                className="w-12 h-12 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-all duration-300 shadow-sm"
                title="Configurações"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </motion.div>
          </div>

          {/* User Profile */}
          <div className="w-full px-2">
            <motion.div 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }}
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-12 bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-blue-700 rounded-xl transition-all duration-300 shadow-sm"
                    title={userProfile?.name || 'Usuário'}
                  >
                    <Avatar className="h-6 w-6 border-2 border-blue-200">
                      <AvatarImage src="" alt={userProfile?.name || 'Usuário'} />
                      <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-bold">
                        {userProfile?.name?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src="" alt={userProfile?.name || 'Usuário'} />
                          <AvatarFallback className="bg-blue-100 text-blue-700 font-bold">
                            {userProfile?.name?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-semibold leading-none">{userProfile?.name || 'Usuário'}</p>
                          <p className="text-xs text-muted-foreground mt-1">{userProfile?.email}</p>
                        </div>
                        <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  <div className="px-3 py-2 bg-slate-50 rounded-lg mx-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span className="truncate">{userProfile?.email}</span>
                    </div>
                    {userProfile?.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                        <Phone className="h-4 w-4" />
                        <span>{userProfile.phone}</span>
                      </div>
                    )}
                  </div>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem onClick={handleProfileClick} className="py-3">
                    <User className="mr-3 h-4 w-4" />
                    <span>Meu Perfil</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem 
                    onClick={signOut}
                    className="text-red-600 focus:text-red-600 focus:bg-red-50 py-3"
                  >
                    <LogOut className="mr-3 h-4 w-4" />
                    <span>Sair</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </motion.div>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="ml-20">
        {/* Modern Header */}
        <motion.header 
          className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-30 shadow-sm"
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  ArenaTime
                </h1>
                <p className="text-slate-600 text-sm font-medium">Dashboard de Gestão</p>
              </div>
              
              <div className="flex items-center gap-4">
                {viewMode === 'weekly' && (
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={generateAvailableHoursPDF}
                      className="bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 shadow-sm"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Horários Disponíveis
                    </Button>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </motion.header>

        {/* Main Content Area */}
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
          {/* Enhanced Stats Cards */}
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <StatCard
              title="Agendamentos Hoje"
              value={appointments.filter(apt => {
                const aptDate = new Date(apt.date);
                const today = new Date();
                return isSameDay(aptDate, today);
              }).length}
              icon={Calendar}
              color="blue"
              description="Horários do dia"
              delay={0}
            />
            
            <StatCard
              title="A Cobrar"
              value={appointments.filter(apt => {
                if (apt.status === 'a_cobrar') return true;
                if (apt.status === 'agendado') {
                  const aptDate = new Date(apt.date);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  aptDate.setHours(0, 0, 0, 0);
                  return isBefore(aptDate, today);
                }
                return false;
              }).length}
              icon={AlertCircle}
              color="red"
              description="Pendentes de pagamento"
              delay={0.1}
            />
            
            <StatCard
              title="Pagos"
              value={appointments.filter(apt => apt.status === 'pago').length}
              icon={CheckCircle}
              color="green"
              description="Recebidos este período"
              delay={0.2}
            />
            
            <StatCard
              title="Esta Semana"
              value={appointments.length}
              icon={TrendingUp}
              color="orange"
              description="Total de agendamentos"
              delay={0.3}
            />
          </motion.div>

          {/* Enhanced Weekly Calendar */}
          <motion.div
            key={currentWeek.toISOString()}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-xl rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200/60 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-800">
                      <Calendar className="h-6 w-6 text-blue-600" />
                      Agenda Semanal
                    </CardTitle>
                    
                    <div className="flex items-center gap-3 bg-white rounded-xl p-2 shadow-sm border border-slate-200">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentWeek(addDays(currentWeek, -7))}
                        className="hover:bg-slate-100 transition-colors px-3 py-2"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Anterior
                      </Button>
                      
                      <div className="px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
                        <span className="text-sm font-semibold text-blue-800">
                          {format(startOfWeek(currentWeek, { locale: ptBR }), 'dd/MM', { locale: ptBR })} - {format(addDays(startOfWeek(currentWeek, { locale: ptBR }), 6), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentWeek(addDays(currentWeek, 7))}
                        className="hover:bg-slate-100 transition-colors px-3 py-2"
                      >
                        Próxima
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded-md">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-blue-700 text-sm font-medium">Recorrentes</span>
                      </div>
                      <div className="flex items-center gap-1 px-2 py-1 bg-purple-50 rounded-md">
                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                        <span className="text-purple-700 text-sm font-medium">Únicos</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-0">
                <div className="overflow-auto max-h-[400px] rounded-b-2xl">
                  <div className="min-w-[800px]">
                    <table className="w-full border-collapse">
                      <thead className="sticky top-0 z-10">
                        <tr>
                          <th className="border border-slate-200 p-3 text-left font-bold bg-slate-50 text-slate-700 text-sm min-w-[80px]">
                            Horário
                          </th>
                          {weekDays.map((day, i) => (
                            <motion.th 
                              key={i} 
                              className={`border border-slate-200 p-3 text-center font-bold text-sm min-w-[120px] ${
                                isSameDay(day, new Date()) 
                                  ? 'bg-blue-50 text-blue-800 border-blue-200' 
                                  : 'bg-slate-50 text-slate-700'
                              }`}
                              initial={{ opacity: 0, y: -20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3, delay: i * 0.05 }}
                            >
                              <div className="space-y-1">
                                <div className="font-bold text-sm">
                                  {format(day, 'EEE', { locale: ptBR })}
                                </div>
                                <div className={`text-xs ${
                                  isSameDay(day, new Date()) 
                                    ? 'text-blue-600 font-semibold' 
                                    : 'text-slate-500'
                                }`}>
                                  {format(day, 'dd/MM', { locale: ptBR })}
                                  {isSameDay(day, new Date()) && ' • Hoje'}
                                </div>
                              </div>
                            </motion.th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {timeSlots.map((timeSlot, i) => (
                          <tr key={i}>
                            <motion.td 
                              className="border border-slate-200 p-3 font-bold bg-slate-50 text-slate-700 text-sm min-w-[80px] sticky left-0 z-10"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.3, delay: i * 0.02 }}
                            >
                              <div className="flex items-center justify-center">
                                <span className="font-mono text-sm">{timeSlot}</span>
                              </div>
                            </motion.td>
                            {weekDays.map((day, j) => {
                              const appointment = getAppointmentForSlot(day, timeSlot);
                              const hasAppointment = !!appointment;
                              const isBlocked = isTimeSlotBlocked(day, timeSlot);
                              
                              return (
                                <motion.td 
                                  key={j} 
                                  className={`border border-slate-200 p-1 h-16 align-top cursor-pointer transition-all duration-200 min-w-[120px] relative ${
                                    hasAppointment 
                                      ? 'bg-gradient-to-br from-blue-50 to-indigo-50' 
                                      : isBlocked 
                                        ? 'bg-slate-100 border-slate-300' 
                                        : isSameDay(day, new Date()) 
                                          ? 'bg-blue-50/50 hover:bg-blue-100/50' 
                                          : 'bg-white hover:bg-slate-50'
                                  }`}
                                  onClick={() => handleCellClick(day, timeSlot)}
                                  whileHover={{ scale: hasAppointment ? 1 : 1.02 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <AnimatePresence mode="wait">
                                    {appointment ? (
                                      <AppointmentCard
                                        key={appointment.id}
                                        appointment={appointment}
                                        onClick={() => handleCellClick(day, timeSlot)}
                                        getStatusColor={getStatusColor}
                                        getStatusLabel={getStatusLabel}
                                        date={appointment.date}
                                      />
                                    ) : (
                                      <motion.div
                                        className="w-full h-full flex items-center justify-center"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                      >
                                        {isBlocked && (
                                          <div className="text-slate-400 text-xs">
                                            Bloqueado
                                          </div>
                                        )}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </motion.td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      <NewAppointmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        onAppointmentCreated={handleAppointmentCreated}
      />

      <AppointmentDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedAppointment(null);
        }}
        appointment={selectedAppointment}
        onAppointmentUpdated={handleAppointmentUpdated}
      />

      {/* Enhanced Confirmation Modal */}
      {isConfirmationModalOpen && blockedTimeSlot && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div 
            className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">Confirmar Agendamento</h3>
            </div>
            
            <p className="text-slate-600 mb-4">
              Você está tentando agendar um horário que normalmente não está disponível:
            </p>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-yellow-600" />
                  <span className="font-medium">Data:</span>
                  <span>{format(blockedTimeSlot.day, 'dd/MM/yyyy', { locale: ptBR })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="font-medium">Horário:</span>
                  <span>{blockedTimeSlot.timeSlot}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-yellow-600" />
                  <span className="font-medium">Dia:</span>
                  <span>{format(blockedTimeSlot.day, 'EEEE', { locale: ptBR })}</span>
                </div>
              </div>
            </div>
            
            <p className="text-slate-600 mb-6">
              Deseja continuar mesmo assim?
            </p>
            
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={handleCancelBlockedTimeSlot}
                className="border-slate-200 hover:bg-slate-50"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmBlockedTimeSlot}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Confirmar Agendamento
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
