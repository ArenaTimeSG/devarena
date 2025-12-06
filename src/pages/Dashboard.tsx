import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useWorkingHours } from '@/hooks/useWorkingHours';
import { useSettingsSync } from '@/hooks/useSettingsSync';
import { useToast } from '@/hooks/use-toast';
import { useAppointments } from '@/hooks/useAppointments';
import { formatCurrency } from '@/utils/currency';
import { supabase as supabaseClient } from '@/integrations/supabase/client';
import { Calendar, Plus, Users, DollarSign, Activity, LogOut, FileText, Settings, ChevronLeft, ChevronRight, User, ChevronDown, Shield, Mail, Phone, Clock, TrendingUp, CheckCircle, AlertCircle, AlertTriangle, Repeat } from 'lucide-react';

import { format, startOfWeek, addDays, isSameDay, isBefore, isEqual, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import NewAppointmentModal from '@/components/NewAppointmentModal';
import AppointmentDetailsModal from '@/components/AppointmentDetailsModal';
import BlockTimeModal from '@/components/BlockTimeModal';
import UnblockConfirmModal from '@/components/UnblockConfirmModal';
import { BlockedTimeSlotModal } from '@/components/BlockedTimeSlotModal';
import { StatCard } from '@/components/animated/StatCard';
import { AppointmentCard } from '@/components/animated/AppointmentCard';
import ResponsiveCalendar from '@/components/ResponsiveCalendar';
import AgendaMensal from '@/components/AgendaMensal';
import NewMonthlyEventModal, { NewMonthlyEventData } from '@/components/NewMonthlyEventModal';
import EventActionsModal from '@/components/EventActionsModal';
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
  modality: string | null;
  modality_id: string | null;
  valor_total: number;
  client: {
    name: string;
  };
  client_id?: string;
  booking_source?: 'manual' | 'online';
  modality_info?: {
    name: string;
    valor: number;
  };
  recurrence_id?: string;
}

const Dashboard = () => {
  const { user, loading, signOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { appointments, getFinancialSummary, isLoading: appointmentsLoading, refetch } = useAppointments();
  
  const navigate = useNavigate();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | undefined>();
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [blockedTimeSlot, setBlockedTimeSlot] = useState<{ day: Date; timeSlot: string } | null>(null);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [isUnblockModalOpen, setIsUnblockModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly');
  const [monthlyEventsByDay, setMonthlyEventsByDay] = useState<Record<string, NewMonthlyEventData[]>>({});
  const [isMonthlyEventModalOpen, setIsMonthlyEventModalOpen] = useState(false);
  const [selectedMonthlyDate, setSelectedMonthlyDate] = useState<Date | null>(null);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<{ id: string; dateKey: string } | null>(null);

  const addMonthlyEvent = (data: NewMonthlyEventData) => {
    setMonthlyEventsByDay(prev => {
      const list = prev[data.date] ? [...prev[data.date]] : [];
      list.push(data);
      return { ...prev, [data.date]: list };
    });
  };

  // Persist to Supabase (com logs de erro para diagnóstico)
  const saveMonthlyEvent = async (data: NewMonthlyEventData) => {
    if (!user?.id) {
      console.error('MonthlyEvents: usuário não autenticado');
      return;
    }
    try {
      const { data: inserted, error } = await supabaseClient
        .from('monthly_events')
        .insert({
          user_id: user.id,
          event_date: data.date,
          client_name: data.clientName,
          phone: data.phone,
          amount: data.amount,
          start_time: data.startTime,
          end_time: data.endTime,
          notes: data.notes,
          guests: data.guests || 0,
          status: data.status
        })
        .select('id, event_date')
        .single();

      if (error) {
        console.error('MonthlyEvents insert error:', error);
        toast({
          title: 'Erro ao salvar evento',
          description: error.message || 'Falha desconhecida ao salvar.',
          variant: 'destructive'
        });
      } else {
        console.log('MonthlyEvents salvo com sucesso:', inserted);
      }
    } catch (e: any) {
      console.error('MonthlyEvents insert exception:', e);
      toast({
        title: 'Erro inesperado',
        description: e?.message || 'Falha inesperada ao salvar o evento.',
        variant: 'destructive'
      });
    }
  };

  // Load events for the visible month
  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      const start = new Date(currentWeek.getFullYear(), currentWeek.getMonth(), 1);
      const end = new Date(currentWeek.getFullYear(), currentWeek.getMonth() + 1, 0);
      const { data, error } = await supabaseClient
        .from('monthly_events')
        .select('id, event_date, client_name, phone, amount, start_time, end_time, notes, guests, status')
        .gte('event_date', start.toISOString().slice(0,10))
        .lte('event_date', end.toISOString().slice(0,10))
        .eq('user_id', user.id);
      if (error) {
        console.error('MonthlyEvents load error:', error);
      }
      const map: Record<string, NewMonthlyEventData[]> = {};
      (data || []).forEach(ev => {
        const key = ev.event_date;
        const arr = map[key] || [];
        arr.push({
          id: ev.id,
          date: key,
          clientName: ev.client_name,
          phone: ev.phone || undefined,
          amount: Number(ev.amount || 0),
          startTime: ev.start_time,
          endTime: ev.end_time,
          notes: ev.notes || undefined,
          guests: Number(ev.guests || 0),
          status: ev.status
        });
        map[key] = arr;
      });
      setMonthlyEventsByDay(map);
    };
    load();
  }, [user?.id, currentWeek]);

  const monthlyEventsDisplay = useMemo(() => {
    const map: Record<string, { id: string; title: string; color?: string }[]> = {};
    Object.entries(monthlyEventsByDay).forEach(([date, list]) => {
      map[date] = list.map(ev => ({
        id: ev.id,
        title: ev.clientName,
        color:
          (ev.status ?? '').toString().toLowerCase().trim() === 'pago'
            ? 'bg-green-200 text-green-800'
            : (ev.status ?? '').toString().toLowerCase().trim() === 'cancelado'
            ? 'bg-gray-200 text-gray-600'
            : 'bg-yellow-200 text-yellow-800'
      }));
    });
    return map;
  }, [monthlyEventsByDay]);

  const monthlyTotals = useMemo(() => {
    let aCobrar = 0;
    let pagos = 0;
    Object.values(monthlyEventsByDay).forEach(list => {
      list.forEach(ev => {
        const st = (ev.status ?? '').toString().toLowerCase().trim();
        if (st === 'a_cobrar') aCobrar += Number(ev.amount || 0);
        if (st === 'pago') pagos += Number(ev.amount || 0);
      });
    });
    return { aCobrar, pagos };
  }, [monthlyEventsByDay]);

  // Função para contar eventos mensais da semana atual
  const getMonthlyEventsForCurrentWeek = () => {
    const weekStart = startOfWeek(currentWeek, { locale: ptBR });
    const weekEnd = addDays(weekStart, 6);
    
    let count = 0;
    Object.entries(monthlyEventsByDay).forEach(([dateKey, events]) => {
      const eventDate = new Date(dateKey);
      if (eventDate >= weekStart && eventDate <= weekEnd) {
        count += events.length;
      }
    });
    return count;
  };

  // Função para contar eventos mensais do mês selecionado
  const getMonthlyEventsForSelectedMonth = () => {
    const monthStart = startOfMonth(currentWeek);
    const monthEnd = endOfMonth(currentWeek);
    
    let count = 0;
    Object.entries(monthlyEventsByDay).forEach(([dateKey, events]) => {
      const eventDate = new Date(dateKey);
      if (eventDate >= monthStart && eventDate <= monthEnd) {
        count += events.length;
      }
    });
    return count;
  };

  // Função para calcular totais financeiros do mês selecionado
  const getMonthlyTotalsForSelectedMonth = () => {
    const monthStart = startOfMonth(currentWeek);
    const monthEnd = endOfMonth(currentWeek);
    
    let aCobrar = 0;
    let pagos = 0;
    
    Object.entries(monthlyEventsByDay).forEach(([dateKey, events]) => {
      const eventDate = new Date(dateKey);
      if (eventDate >= monthStart && eventDate <= monthEnd) {
        events.forEach(ev => {
          const st = (ev.status ?? '').toString().toLowerCase().trim();
          if (st === 'a_cobrar') aCobrar += Number(ev.amount || 0);
          if (st === 'pago') pagos += Number(ev.amount || 0);
        });
      }
    });
    
    return { aCobrar, pagos };
  };
  const [isRecurringForUnblock, setIsRecurringForUnblock] = useState(false);
  const [isBlockedTimeSlotModalOpen, setIsBlockedTimeSlotModalOpen] = useState(false);
  const [isForceAppointment, setIsForceAppointment] = useState(false);
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
    isDayEnabled,
    blockTimeSlot,
    unblockTimeSlot,
    getBlockadeReason,
    isRecurringBlockade,
    isRecurringBlockadeFromDB,
    getBlockadeInfo
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
      fetchUserProfile();
    }
  }, [user, loading]);

  const fetchUserProfile = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabaseClient
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


  // Função para filtrar agendamentos da semana atual
  const getAppointmentsForCurrentWeek = () => {
    // Usar a mesma lógica do ResponsiveCalendar para garantir consistência
    const weekStart = startOfWeek(currentWeek, { locale: ptBR });
    const weekEnd = addDays(weekStart, 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    const filteredAppointments = appointments.filter(apt => {
      const appointmentDate = new Date(apt.date);
      
      // Normalizar a data do agendamento para comparar apenas a data (sem hora)
      const aptDateOnly = new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), appointmentDate.getDate());
      
      // Verificar se o agendamento está dentro da semana
      const isInWeek = aptDateOnly >= weekStart && aptDateOnly <= weekEnd;
      
      return isInWeek;
    });
    

    
    return filteredAppointments;
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
        case 'a_cobrar': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'cortesia': return 'bg-pink-100 text-pink-800 border-pink-200';
        case 'agendado': return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'cancelado': return 'bg-gray-100 text-gray-600 border-gray-200 line-through';
        default: return 'bg-blue-50 text-blue-700 border-blue-200';
      }
    } else {
      switch (effectiveStatus) {
        case 'pago': return 'bg-green-100 text-green-800 border-green-200';
        case 'a_cobrar': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
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

  const handleCellClick = (day: Date, timeSlot: string, event?: React.MouseEvent) => {
    const appointment = getAppointmentForSlot(day, timeSlot);
    
    if (appointment) {
      setSelectedAppointment(appointment);
      setIsDetailsModalOpen(true);
    } else {
      // Verificar se o horário está bloqueado
      const isBlocked = isTimeSlotBlocked(day, timeSlot);
      
      if (isBlocked) {
        // Verificar se é um bloqueio manual (que pode ser desbloqueado)
        const blockadeReason = getBlockadeReason(day, timeSlot);
        const isManualBlockade = blockadeReason !== 'BLOQUEADO';
        
        if (isManualBlockade) {
          // Se é bloqueio manual, mostrar modal de desbloqueio
          setSelectedDate(day);
          setSelectedTime(timeSlot);
          // Verificar se é recorrente baseado no banco de dados
          isRecurringBlockadeFromDB(day, timeSlot).then(isRecurring => {
            setIsRecurringForUnblock(isRecurring);
            setIsUnblockModalOpen(true);
          });
        } else {
          // Se é bloqueio por padrão (horário funcionamento/almoço), mostrar modal de confirmação
          setBlockedTimeSlot({ day, timeSlot });
          setIsBlockedTimeSlotModalOpen(true);
        }
      } else {
        // Se Ctrl está pressionado, abrir modal de bloqueio
        if (event && event.ctrlKey) {
          setSelectedDate(day);
          setSelectedTime(timeSlot);
          setIsBlockModalOpen(true);
        } else {
          // Se não está bloqueado, abrir modal de agendamento
          setSelectedDate(day);
          setSelectedTime(timeSlot);
          setIsModalOpen(true);
        }
      }
    }
  };

  const handleAppointmentCreated = async () => {
    console.log('🔄 Dashboard - Agendamento criado, invalidando cache...');
    
    // Invalidar cache de agendamentos
    queryClient.invalidateQueries({ queryKey: ['appointments'] });
    queryClient.invalidateQueries({ queryKey: ['appointments', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['clientBookings'] });
    
    // Invalidar cache de horários disponíveis
    queryClient.invalidateQueries({ queryKey: ['availableHours'] });
    queryClient.invalidateQueries({ queryKey: ['workingHours'] });
    
    // Recarregar dados
    await refetch();
  };

  const handleAppointmentUpdated = async () => {
    console.log('🔄 Dashboard - Agendamento atualizado, invalidando cache...');
    
    // Invalidar cache de agendamentos
    queryClient.invalidateQueries({ queryKey: ['appointments'] });
    queryClient.invalidateQueries({ queryKey: ['appointments', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['clientBookings'] });
    
    // Invalidar cache de horários disponíveis
    queryClient.invalidateQueries({ queryKey: ['availableHours'] });
    queryClient.invalidateQueries({ queryKey: ['workingHours'] });
    
    // Recarregar dados
    await refetch();
  };


  // Calcular valores financeiros para a semana atual
  const getFinancialSummaryForCurrentWeek = () => {
    const weekAppointments = getAppointmentsForCurrentWeek();
    return getFinancialSummary(weekAppointments);
  };

  const handleProfileClick = () => {
    navigate('/settings');
  };


  const handleBlocked = (blockData: {
    reason: string;
    description?: string;
    isRecurring: boolean;
    endDate?: Date;
    isIndefinite?: boolean;
    recurrenceType?: 'daily' | 'weekly' | 'monthly';
  }) => {
    if (selectedDate && selectedTime) {
      blockTimeSlot(selectedDate, selectedTime, blockData.reason, {
        description: blockData.description,
        isRecurring: blockData.isRecurring,
        endDate: blockData.endDate,
        isIndefinite: blockData.isIndefinite,
        recurrenceType: blockData.recurrenceType
      });
    }
  };

  const handleOpenBlockModal = () => {
    setIsModalOpen(false);
    setIsBlockModalOpen(true);
  };

  const handleUnblockTimeSlot = (removeAllFollowing: boolean) => {
    if (selectedDate && selectedTime) {
      unblockTimeSlot(selectedDate, selectedTime, removeAllFollowing);
      toast({ 
        title: "Sucesso", 
        description: removeAllFollowing 
          ? "Todos os bloqueios seguintes foram removidos!" 
          : "Horário desbloqueado com sucesso!" 
      });
    }
  };

  const handleConfirmBlockedTimeSlot = () => {
    if (blockedTimeSlot) {
      setSelectedDate(blockedTimeSlot.day);
      setSelectedTime(blockedTimeSlot.timeSlot);
      setIsForceAppointment(true); // Marcar como agendamento forçado
      setIsBlockedTimeSlotModalOpen(false);
      setBlockedTimeSlot(null);
      setIsModalOpen(true);
    }
  };

  const handleCancelBlockedTimeSlot = () => {
    setIsBlockedTimeSlotModalOpen(false);
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
        className="fixed left-0 top-0 h-full w-16 sm:w-20 bg-white/80 backdrop-blur-xl border-r border-slate-200/60 shadow-xl z-40"
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
      <div className="ml-16 sm:ml-20">
        {/* Modern Header */}
        <motion.header 
          className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-30 shadow-sm"
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  ArenaTime
                </h1>
                <p className="text-slate-600 text-xs sm:text-sm font-medium hidden sm:block">Dashboard de Gestão</p>
              </div>
              
              <div className="flex items-center gap-2 sm:gap-4">
                {viewMode === 'weekly' && (
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={generateAvailableHoursPDF}
                      className="bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 shadow-sm text-xs sm:text-sm px-2 sm:px-3"
                    >
                      <FileText className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Horários Disponíveis</span>
                    </Button>
                  </motion.div>
                )}

                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setViewMode(m => (m === 'weekly' ? 'monthly' : 'weekly'))}
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm text-xs sm:text-sm px-2 sm:px-3"
                  >
                    <span className="hidden sm:inline">
                      {viewMode === 'weekly' ? 'Ver Agenda Mensal' : 'Ver Agenda Semanal'}
                    </span>
                    <span className="sm:hidden">
                      {viewMode === 'weekly' ? 'Mensal' : 'Semanal'}
                    </span>
                  </Button>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.header>

        {/* Main Content Area */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
          {/* Stats Cards - Adapt to viewMode */}
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {viewMode === 'weekly' ? (
              <>
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
                  value={formatCurrency(getFinancialSummaryForCurrentWeek().total_pendente)}
                  icon={AlertCircle}
                  color="red"
                  description="Pendentes de pagamento"
                  delay={0.1}
                />
                <StatCard
                  title="Pagos"
                  value={formatCurrency(getFinancialSummaryForCurrentWeek().total_recebido)}
                  icon={CheckCircle}
                  color="green"
                  description="Recebidos este período"
                  delay={0.2}
                />
                <StatCard
                  title="Esta Semana"
                  value={getAppointmentsForCurrentWeek().length}
                  icon={TrendingUp}
                  color="orange"
                  description="Total de agendamentos"
                  delay={0.3}
                />
              </>
            ) : (
              <>
                <StatCard
                  title="Esta Semana"
                  value={getMonthlyEventsForCurrentWeek()}
                  icon={TrendingUp}
                  color="orange"
                  description="Eventos desta semana"
                  delay={0}
                />
                <StatCard
                  title="A Cobrar"
                  value={formatCurrency(getMonthlyTotalsForSelectedMonth().aCobrar)}
                  icon={AlertCircle}
                  color="red"
                  description="Pendências de eventos"
                  delay={0.1}
                />
                <StatCard
                  title="Pagos"
                  value={formatCurrency(getMonthlyTotalsForSelectedMonth().pagos)}
                  icon={CheckCircle}
                  color="green"
                  description="Recebidos em eventos"
                  delay={0.2}
                />
                <StatCard
                  title="Este Mês"
                  value={getMonthlyEventsForSelectedMonth()}
                  icon={Calendar}
                  color="blue"
                  description="Eventos cadastrados"
                  delay={0.3}
                />
              </>
            )}
          </motion.div>


          {/* Calendar Area - Weekly or Monthly */}
          <motion.div
            key={currentWeek.toISOString()}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.5 }}
          >
                       {appointmentsLoading ? (
             <div className="flex items-center justify-center p-8">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
               <span className="ml-3 text-slate-600">Carregando agenda...</span>
             </div>
           ) : (
              viewMode === 'weekly' ? (
                <ResponsiveCalendar
                  currentWeek={currentWeek}
                  setCurrentWeek={setCurrentWeek}
                  appointments={getAppointmentsForCurrentWeek()}
                  timeSlots={timeSlots}
                  onCellClick={handleCellClick}
                  getAppointmentForSlot={getAppointmentForSlot}
                  isTimeSlotBlocked={isTimeSlotBlocked}
                  getStatusColor={getStatusColor}
                  getStatusLabel={getStatusLabel}
                  getBlockadeReason={getBlockadeReason}
                />
              ) : (
                <AgendaMensal
                  initialDate={currentWeek}
                  onDayClick={(d) => {
                    setCurrentWeek(d);
                    setSelectedMonthlyDate(d);
                    setIsMonthlyEventModalOpen(true);
                  }}
                  onMonthChange={(newMonth) => {
                    setCurrentWeek(newMonth);
                  }}
                  eventsByDay={Object.fromEntries(
                    Object.entries(monthlyEventsDisplay).map(([k, arr]) => [
                      k,
                      arr.map(ev => ({
                        ...ev,
                        onClick: (id: string) => {
                          setSelectedEvent({ id, dateKey: k });
                          setIsActionsOpen(true);
                        }
                      }))
                    ])
                  )}
                  dayBgByKey={Object.fromEntries(
                    Object.entries(monthlyEventsByDay).map(([k, arr]) => {
                      const hasPaid = arr.some(e => {
                        const status = (e.status ?? '').toString().toLowerCase().trim();
                        return status === 'pago';
                      });
                      const isAllCancelled = arr.length > 0 && arr.every(e => {
                        const status = (e.status ?? '').toString().toLowerCase().trim();
                        return status === 'cancelado';
                      });
                      const hasPending = arr.some(e => {
                        const status = (e.status ?? '').toString().toLowerCase().trim();
                        return status === 'a_cobrar';
                      });
                      
                      let bg = '';
                      if (hasPaid) {
                        bg = 'bg-gradient-to-br from-green-400 to-green-500 border-green-600 shadow-green-200/50';
                      } else if (isAllCancelled) {
                        bg = 'bg-gradient-to-br from-gray-400 to-gray-500 border-gray-600 shadow-gray-200/50';
                      } else if (hasPending) {
                        bg = 'bg-gradient-to-br from-yellow-400 to-yellow-500 border-yellow-600 shadow-yellow-200/50';
                      }
                      
                      return [k, bg];
                    })
                  )}
                />
              )
           )}
          </motion.div>
        </div>
      </div>

      <NewAppointmentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setIsForceAppointment(false); // Resetar estado de agendamento forçado
        }}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        onAppointmentCreated={handleAppointmentCreated}
        onBlockTime={handleOpenBlockModal}
        forceAppointment={isForceAppointment}
      />

      <BlockTimeModal
        isOpen={isBlockModalOpen}
        onClose={() => setIsBlockModalOpen(false)}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        onBlocked={handleBlocked}
      />

      <UnblockConfirmModal
        isOpen={isUnblockModalOpen}
        onClose={() => setIsUnblockModalOpen(false)}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        isRecurring={isRecurringForUnblock}
        onConfirm={handleUnblockTimeSlot}
      />

      {/* Modal de horário bloqueado por padrão */}
      <BlockedTimeSlotModal
        isOpen={isBlockedTimeSlotModalOpen}
        onClose={handleCancelBlockedTimeSlot}
        onConfirm={handleConfirmBlockedTimeSlot}
        blockedDate={blockedTimeSlot?.day || null}
        blockedTimeSlot={blockedTimeSlot?.timeSlot || null}
        blockadeReason={blockedTimeSlot ? getBlockadeReason(blockedTimeSlot.day, blockedTimeSlot.timeSlot) : undefined}
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

      {/* Modal de novo evento mensal (sem horários padrão) */}
      <NewMonthlyEventModal
        isOpen={isMonthlyEventModalOpen}
        onClose={() => setIsMonthlyEventModalOpen(false)}
        selectedDate={selectedMonthlyDate}
        onCreate={async (data) => {
          addMonthlyEvent(data);
          await saveMonthlyEvent(data);
        }}
      />

      <EventActionsModal
        isOpen={isActionsOpen}
        onClose={() => setIsActionsOpen(false)}
        eventId={selectedEvent?.id || null}
        currentStatus={(selectedEvent && monthlyEventsByDay[selectedEvent.dateKey]?.find(e => e.id === selectedEvent.id)?.status) || 'a_cobrar'}
        info={selectedEvent ? {
          clientName: monthlyEventsByDay[selectedEvent.dateKey]?.find(e => e.id === selectedEvent.id)?.clientName || '',
          phone: monthlyEventsByDay[selectedEvent.dateKey]?.find(e => e.id === selectedEvent.id)?.phone,
          amount: monthlyEventsByDay[selectedEvent.dateKey]?.find(e => e.id === selectedEvent.id)?.amount || 0,
          startTime: monthlyEventsByDay[selectedEvent.dateKey]?.find(e => e.id === selectedEvent.id)?.startTime || '',
          endTime: monthlyEventsByDay[selectedEvent.dateKey]?.find(e => e.id === selectedEvent.id)?.endTime || '',
          notes: monthlyEventsByDay[selectedEvent.dateKey]?.find(e => e.id === selectedEvent.id)?.notes,
          guests: monthlyEventsByDay[selectedEvent.dateKey]?.find(e => e.id === selectedEvent.id)?.guests,
          eventDate: selectedEvent.dateKey,
        } : null}
        onUpdateStatus={async (newStatus) => {
          if (!selectedEvent || !user?.id) return;
          const dateKey = selectedEvent.dateKey;
          console.log(`🔄 Atualizando status do evento ${selectedEvent.id} para: ${newStatus}`);
          
          // Update state
          setMonthlyEventsByDay(prev => {
            const copy = { ...prev };
            copy[dateKey] = (copy[dateKey] || []).map(ev => ev.id === selectedEvent.id ? { ...ev, status: newStatus } : ev);
            return copy;
          });
          
          // Update DB
          try {
            console.log(`📤 Enviando para DB: id=${selectedEvent.id}, user_id=${user.id}, status=${newStatus}`);
            
            // Primeiro, verificar se o evento existe
            const { data: existingEvent, error: fetchError } = await supabaseClient
              .from('monthly_events')
              .select('id, user_id, status')
              .eq('id', selectedEvent.id)
              .single();
              
            if (fetchError) {
              console.error('❌ Erro ao buscar evento:', fetchError);
              return;
            }
            
            console.log('📋 Evento encontrado:', existingEvent);
            
            // Atualizar apenas o status
            const { data, error } = await supabaseClient
              .from('monthly_events')
              .update({ status: newStatus })
              .eq('id', selectedEvent.id)
              .select();
              
            if (error) {
              console.error('❌ Erro ao atualizar status no DB:', error);
              console.error('❌ Detalhes do erro:', JSON.stringify(error, null, 2));
            } else {
              console.log('✅ Status atualizado no DB:', data);
            }
          } catch (err) {
            console.error('❌ Exceção ao atualizar status:', err);
          }
        }}
        onSave={async (payload) => {
          if (!selectedEvent || !user?.id) return;
          const dateKey = selectedEvent.dateKey;
          // Atualiza estado
          setMonthlyEventsByDay(prev => {
            const copy = { ...prev };
            copy[dateKey] = (copy[dateKey] || []).map(ev => ev.id === selectedEvent.id ? {
              ...ev,
              clientName: payload.clientName,
              phone: payload.phone,
              amount: payload.amount,
              startTime: payload.startTime,
              endTime: payload.endTime,
              notes: payload.notes,
              guests: payload.guests,
              status: payload.status
            } : ev);
            return copy;
          });
          // Atualiza banco
          await supabaseClient.from('monthly_events').update({
            client_name: payload.clientName,
            phone: payload.phone,
            amount: payload.amount,
            start_time: payload.startTime,
            end_time: payload.endTime,
            notes: payload.notes,
            guests: payload.guests,
            status: payload.status
          }).eq('id', selectedEvent.id).eq('user_id', user.id);
        }}
        onDelete={async () => {
          if (!selectedEvent || !user?.id) return;
          const dateKey = selectedEvent.dateKey;
          setMonthlyEventsByDay(prev => {
            const copy = { ...prev };
            copy[dateKey] = (copy[dateKey] || []).filter(ev => ev.id !== selectedEvent.id);
            return copy;
          });
          await supabaseClient.from('monthly_events').delete().eq('id', selectedEvent.id).eq('user_id', user.id);
        }}
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
                {getBlockadeReason && getBlockadeReason(blockedTimeSlot.day, blockedTimeSlot.timeSlot) && (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <span className="font-medium">Motivo do bloqueio:</span>
                    <span className="text-yellow-700">{getBlockadeReason(blockedTimeSlot.day, blockedTimeSlot.timeSlot)}</span>
                  </div>
                )}
                {isRecurringBlockade && isRecurringBlockade(blockedTimeSlot.day, blockedTimeSlot.timeSlot) && (
                  <div className="flex items-center gap-2">
                    <Repeat className="h-4 w-4 text-yellow-600" />
                    <span className="font-medium text-yellow-700">Bloqueio Recorrente</span>
                  </div>
                )}
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
                variant="outline"
                onClick={() => {
                  setSelectedDate(blockedTimeSlot.day);
                  setSelectedTime(blockedTimeSlot.timeSlot);
                  setIsConfirmationModalOpen(false);
                  setBlockedTimeSlot(null);
                  handleOpenUnblockModal();
                }}
                className="border-orange-200 hover:bg-orange-50 text-orange-700"
              >
                Desbloquear
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
