import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { format, addDays, subDays, isSameDay, startOfWeek, addWeeks, subWeeks, getHours, getMinutes, startOfHour } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AppointmentCard } from '@/components/animated/AppointmentCard';
import { useIsMobile } from '@/hooks/useIsMobile';
import { calculateAppointmentHeight, calculateAppointmentTopOffset } from '@/utils/appointmentPosition';

interface Appointment {
  id: string;
  date: string;
  end_time?: string;
  status: 'a_cobrar' | 'pago' | 'cancelado' | 'agendado';
  payment_status?: 'not_required' | 'pending' | 'failed';
  modality: string;
  modality_id?: string | null;
  modality_info?: {
    name: string;
    valor: number;
  };
  client: {
    name: string;
  };
  client_id?: string;
  recurrence_id?: string;
  booking_source?: 'manual' | 'online';
  is_cortesia?: boolean;
}

interface ResponsiveCalendarProps {
  currentWeek: Date;
  setCurrentWeek: (date: Date) => void;
  appointments: Appointment[];
  timeSlots: string[];
  onCellClick: (day: Date, timeSlot: string) => void;
  getAppointmentForSlot: (day: Date, timeSlot: string) => Appointment | undefined;
  getAppointmentsForDay?: (day: Date) => Appointment[]; // Nova prop para buscar todos os agendamentos do dia
  isTimeSlotBlocked: (day: Date, timeSlot: string) => boolean;
  getStatusColor: (status: string, date?: string, recurrence_id?: string, is_cortesia?: boolean) => string;
  getStatusLabel: (status: string, date?: string, is_cortesia?: boolean) => string;
  getBlockadeReason?: (day: Date, timeSlot: string) => string | null;
}

const ResponsiveCalendar: React.FC<ResponsiveCalendarProps> = ({
  currentWeek,
  setCurrentWeek,
  appointments,
  timeSlots,
  onCellClick,
  getAppointmentForSlot,
  getAppointmentsForDay,
  isTimeSlotBlocked,
  getStatusColor,
  getStatusLabel,
  getBlockadeReason,
}) => {
  const isMobile = useIsMobile();
  
  // Carregar viewMode do localStorage ou usar padrão baseado no dispositivo
  const getInitialViewMode = (): 'day' | 'week' => {
    if (typeof window === 'undefined') {
      return isMobile ? 'day' : 'week';
    }
    
    try {
      const saved = localStorage.getItem('responsiveCalendar_viewMode');
      if (saved === 'day' || saved === 'week') {
        return saved;
      }
    } catch (error) {
      console.error('Erro ao ler localStorage:', error);
    }
    
    return isMobile ? 'day' : 'week';
  };
  
  const [viewMode, setViewMode] = useState<'day' | 'week'>(getInitialViewMode);
  const [currentDay, setCurrentDay] = useState(new Date());
  const [dragDirection, setDragDirection] = useState<'left' | 'right' | null>(null);
  const constraintsRef = useRef(null);

  // Salvar viewMode no localStorage quando mudar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('responsiveCalendar_viewMode', viewMode);
      } catch (error) {
        console.error('Erro ao salvar no localStorage:', error);
      }
    }
  }, [viewMode]);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const weekStart = startOfWeek(currentWeek, { locale: ptBR });
    return addDays(weekStart, i);
  });

  const handlePreviousDay = () => {
    setCurrentDay(prev => subDays(prev, 1));
  };

  const handleNextDay = () => {
    setCurrentDay(prev => addDays(prev, 1));
  };

  const handlePreviousWeek = () => {
    setCurrentWeek(subWeeks(currentWeek, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeek(addWeeks(currentWeek, 1));
  };

  const handleDragEnd = (event: any, info: PanInfo) => {
    const swipeThreshold = 50;
    
    if (info.offset.x > swipeThreshold) {
      // Swipe right - go to previous day
      handlePreviousDay();
      setDragDirection('right');
    } else if (info.offset.x < -swipeThreshold) {
      // Swipe left - go to next day
      handleNextDay();
      setDragDirection('left');
    }
    
    setTimeout(() => setDragDirection(null), 300);
  };

  const renderDayView = () => (
    <motion.div
      key={currentDay.toISOString()}
      initial={{ opacity: 0, x: dragDirection === 'left' ? 100 : -100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: dragDirection === 'left' ? -100 : 100 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* Day Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePreviousDay}
          className="hover:bg-white/50 dark:hover:bg-slate-700/50 transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        
        <div className="text-center">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            {format(currentDay, 'EEEE', { locale: ptBR })}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {format(currentDay, 'dd/MM/yyyy', { locale: ptBR })}
            {isSameDay(currentDay, new Date()) && ' • Hoje'}
          </p>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNextDay}
          className="hover:bg-white/50 dark:hover:bg-slate-700/50 transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Day Schedule */}
      <motion.div
        ref={constraintsRef}
        drag="x"
        dragConstraints={constraintsRef}
        onDragEnd={handleDragEnd}
        className="space-y-2"
      >
        {timeSlots.map((timeSlot, index) => {
          const appointment = getAppointmentForSlot(currentDay, timeSlot);
          const hasAppointment = !!appointment;
          const isBlocked = isTimeSlotBlocked(currentDay, timeSlot);
          
          return (
            <motion.div
              key={timeSlot}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={`p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                hasAppointment 
                  ? 'border-blue-200 dark:border-blue-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30' 
                  : isBlocked 
                    ? 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50' 
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/30 dark:hover:bg-blue-900/20'
              }`}
              onClick={() => onCellClick(currentDay, timeSlot)}
              whileHover={{ scale: hasAppointment ? 1 : 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-500" />
                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {timeSlot}
                    </span>
                  </div>
                  
                  {isBlocked && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-md">
                      {getBlockadeReason ? getBlockadeReason(currentDay, timeSlot) || 'Bloqueado' : 'Bloqueado'}
                    </span>
                  )}
                </div>
                
                {hasAppointment && (
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(appointment.status, appointment.date, appointment.recurrence_id, appointment.is_cortesia)}`}></div>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      {getStatusLabel(appointment.status, appointment.date, appointment.is_cortesia)}
                    </span>
                  </div>
                )}
              </div>
              
              <AnimatePresence mode="wait">
                {appointment && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-3"
                  >
                    <AppointmentCard
                      appointment={appointment}
                      onClick={() => onCellClick(currentDay, timeSlot)}
                      getStatusColor={getStatusColor}
                      getStatusLabel={getStatusLabel}
                      date={appointment.date}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );

  const renderWeekView = () => (
    <motion.div
      key={currentWeek.toISOString()}
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.5 }}
    >
      {/* Week Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl p-4 mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePreviousWeek}
          className="hover:bg-white/50 dark:hover:bg-slate-700/50 transition-colors"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Anterior
        </Button>
        
        <div className="text-center">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Agenda Semanal</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {format(startOfWeek(currentWeek, { locale: ptBR }), 'dd/MM', { locale: ptBR })} - {format(addDays(startOfWeek(currentWeek, { locale: ptBR }), 6), 'dd/MM/yyyy', { locale: ptBR })}
          </p>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNextWeek}
          className="hover:bg-white/50 dark:hover:bg-slate-700/50 transition-colors"
        >
          Próxima
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Week Grid */}
      <div className="overflow-auto max-h-[600px] rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="min-w-[700px]">
          <table className="w-full border-collapse" style={{ position: 'relative' }}>
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="border border-slate-200 dark:border-slate-700 p-2 text-left font-bold bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs min-w-[60px]">
                  Horário
                </th>
                {weekDays.map((day, i) => (
                  <motion.th 
                    key={i} 
                    className={`border border-slate-200 dark:border-slate-700 p-2 text-center font-bold text-xs min-w-[100px] ${
                      isSameDay(day, new Date()) 
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700' 
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-xs">
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
                    className="border border-slate-200 dark:border-slate-700 p-2 font-bold bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs min-w-[60px] sticky left-0 z-10"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.02 }}
                  >
                    <div className="flex items-center justify-center">
                      <span className="font-mono text-xs">{timeSlot}</span>
                    </div>
                  </motion.td>
                  {weekDays.map((day, j) => {
                    const isBlocked = isTimeSlotBlocked(day, timeSlot);
                    const slotHour = parseInt(timeSlot.split(':')[0]);
                    const slotMinute = parseInt(timeSlot.split(':')[1]) || 0;
                    
                    // Criar timestamp do início e fim do slot
                    const slotStart = new Date(day);
                    slotStart.setHours(slotHour, slotMinute, 0, 0);
                    const slotEnd = new Date(slotStart);
                    slotEnd.setHours(slotHour + 1, 0, 0, 0);
                    
                    // Buscar todos os agendamentos do dia
                    const dayAppointments = getAppointmentsForDay ? getAppointmentsForDay(day) : [];
                    
                    // Se não houver getAppointmentsForDay, usar getAppointmentForSlot para compatibilidade
                    const fallbackAppointment = !getAppointmentsForDay ? getAppointmentForSlot(day, timeSlot) : undefined;
                    const allDayAppointments = dayAppointments.length > 0 ? dayAppointments : (fallbackAppointment ? [fallbackAppointment] : []);
                    
                    // Filtrar agendamentos que devem ser renderizados nesta célula
                    // IMPORTANTE: Renderizar apenas agendamentos que COMEÇAM nesta célula
                    // Agendamentos que atravessam múltiplas células serão renderizados apenas na primeira,
                    // mas com altura suficiente para atravessar visualmente as células seguintes
                    const appointmentsToRender = allDayAppointments.filter((appointment) => {
                      if (!appointment) return false;
                      const aptStart = new Date(appointment.date);
                      const aptEnd = appointment.end_time ? new Date(appointment.end_time) : new Date(aptStart.getTime() + 60 * 60 * 1000);
                      
                      // Verificar se o agendamento se sobrepõe com este slot
                      const overlaps = aptStart < slotEnd && slotStart < aptEnd;
                      
                      if (!overlaps) return false;
                      
                      // Renderizar apenas se o agendamento COMEÇA nesta célula
                      // Isso evita renderizar o mesmo agendamento múltiplas vezes
                      const aptStartTime = aptStart.getTime();
                      const slotStartTime = slotStart.getTime();
                      const slotEndTime = slotEnd.getTime();
                      
                      // Renderizar se começa dentro desta célula (não antes)
                      return aptStartTime >= slotStartTime && aptStartTime < slotEndTime;
                    });
                    
                    // Verificar se há agendamentos atravessando esta célula (que começaram em células anteriores)
                    // Esses agendamentos não serão renderizados aqui, mas precisamos criar zonas clicáveis para áreas vazias
                    const crossingAppointments = allDayAppointments.filter((appointment) => {
                      if (!appointment) return false;
                      const aptStart = new Date(appointment.date);
                      const aptEnd = appointment.end_time ? new Date(appointment.end_time) : new Date(aptStart.getTime() + 60 * 60 * 1000);
                      const aptStartTime = aptStart.getTime();
                      const aptEndTime = aptEnd.getTime();
                      const slotStartTime = slotStart.getTime();
                      const slotEndTime = slotEnd.getTime();
                      
                      // Agendamento atravessa esta célula mas começou antes
                      return aptStartTime < slotStartTime && aptEndTime > slotStartTime && aptEndTime <= slotEndTime;
                    });
                    
                    return (
                      <motion.td 
                        key={j} 
                        className={`border border-slate-200 dark:border-slate-700 p-0 h-16 align-top cursor-pointer transition-all duration-200 min-w-[100px] relative overflow-visible ${
                          isBlocked 
                            ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-600' 
                            : isSameDay(day, new Date()) 
                              ? 'bg-blue-50/50 dark:bg-blue-900/20 hover:bg-blue-100/50 dark:hover:bg-blue-900/30' 
                              : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700'
                        }`}
                        style={{ overflow: 'visible', position: 'relative' }}
                        onClick={(e) => {
                          // Verificar se o clique foi em uma área vazia (não em um agendamento)
                          const target = e.target as HTMLElement;
                          // Se o clique foi diretamente no td ou não foi em um appointment-block, processar
                          if (target === e.currentTarget || !target.closest('.appointment-block')) {
                            onCellClick(day, timeSlot);
                          }
                        }}
                        whileHover={{ scale: 1.01 }}
                        transition={{ duration: 0.2 }}
                      >
                        {/* Renderizar blocos proporcionais */}
                        {appointmentsToRender.map((appointment) => {
                          if (!appointment) return null;
                          
                          const aptStart = new Date(appointment.date);
                          const aptEnd = appointment.end_time ? new Date(appointment.end_time) : new Date(aptStart.getTime() + 60 * 60 * 1000);
                          
                          // Debug em desenvolvimento
                          if (import.meta.env.DEV) {
                            console.log('🔍 ResponsiveCalendar - Renderizando agendamento:', {
                              id: appointment.id,
                              start: aptStart.toISOString(),
                              end: aptEnd.toISOString(),
                              end_time: appointment.end_time,
                              slot: timeSlot,
                              day: format(day, 'dd/MM/yyyy')
                            });
                          }
                          
                          // Calcular altura proporcional (64px = 1 hora)
                          const hourCellHeight = 64;
                          const totalHeight = calculateAppointmentHeight(aptStart, aptEnd, hourCellHeight);
                          
                          // Calcular posição vertical dentro da célula
                          const slotStartTime = slotStart.getTime();
                          const slotEndTime = slotEnd.getTime();
                          const aptStartTime = aptStart.getTime();
                          const aptEndTime = aptEnd.getTime();
                          
                          let topOffset = 0;
                          let height = totalHeight;
                          
                          // Agendamento sempre começa dentro desta célula (devido ao filtro acima)
                          topOffset = calculateAppointmentTopOffset(aptStart, hourCellHeight);
                          
                          // Calcular altura total que o agendamento precisa ocupar
                          // Se atravessa múltiplas células, calcular altura total incluindo todas
                          if (aptEndTime <= slotEndTime) {
                            // Agendamento termina dentro desta célula
                            height = totalHeight;
                          } else {
                            // Agendamento atravessa múltiplas células
                            // Calcular altura total desde o início até o fim do agendamento
                            // Isso fará o agendamento atravessar visualmente as células seguintes
                            const heightUntilSlotEnd = hourCellHeight - topOffset;
                            const minutesAfterSlotEnd = (aptEndTime - slotEndTime) / (60 * 1000);
                            const additionalHeight = (minutesAfterSlotEnd / 60) * hourCellHeight;
                            height = heightUntilSlotEnd + additionalHeight;
                          }
                          
                          // Não limitar altura - permitir que atravesse múltiplas células
                          // A altura pode ser maior que hourCellHeight se o agendamento atravessa múltiplas células
                          
                          // Calcular largura (100% da célula com pequeno padding)
                          const width = 'calc(100% - 4px)';
                          const left = '2px';
                          
                          // Verificar se o agendamento atravessa múltiplas células
                          const crossesCells = aptEndTime > slotEndTime;
                          
                          return (
                            <motion.div
                              key={`${appointment.id}-${timeSlot}-${day.toISOString()}`}
                              className="appointment-block absolute rounded-md shadow-sm border border-blue-200/50 overflow-hidden z-20"
                              style={{
                                top: `${topOffset}px`,
                                left: left,
                                width: width,
                                height: `${Math.max(18, height)}px`,
                                minHeight: '18px',
                                pointerEvents: 'auto', // Permitir cliques no agendamento
                                zIndex: 20, // Garantir que está acima do fundo mas permite cliques em áreas vazias
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                onCellClick(day, timeSlot);
                              }}
                              transition={{ duration: 0.2 }}
                            >
                              <div style={{ 
                                height: '100%', 
                                width: '100%',
                                display: 'flex',
                                flexDirection: 'column'
                              }}>
                                <AppointmentCard
                                  appointment={appointment}
                                  onClick={() => onCellClick(day, timeSlot)}
                                  getStatusColor={getStatusColor}
                                  getStatusLabel={getStatusLabel}
                                  date={appointment.date}
                                />
                              </div>
                            </motion.div>
                          );
                        })}
                        
                        {/* Áreas clicáveis vazias - dividir célula em zonas clicáveis para permitir cliques em áreas não ocupadas */}
                        {(() => {
                          const hourCellHeight = 64; // Altura da célula de 1 hora
                          // Criar zonas clicáveis para áreas vazias da célula
                          const zones: Array<{ top: number; height: number }> = [];
                          let currentTop = 0;
                          
                          // Combinar agendamentos que começam aqui e os que atravessam
                          const allAppointmentsInCell = [...appointmentsToRender, ...crossingAppointments];
                          
                          // Ordenar agendamentos por horário de início
                          const sortedAppointments = allAppointmentsInCell.sort((a, b) => {
                            if (!a || !b) return 0;
                            return new Date(a.date).getTime() - new Date(b.date).getTime();
                          });
                          
                          sortedAppointments.forEach((appointment) => {
                            if (!appointment) return;
                            const aptStart = new Date(appointment.date);
                            const aptEnd = appointment.end_time ? new Date(appointment.end_time) : new Date(aptStart.getTime() + 60 * 60 * 1000);
                            const aptStartTime = aptStart.getTime();
                            const aptEndTime = aptEnd.getTime();
                            const slotStartTime = slotStart.getTime();
                            const slotEndTime = slotEnd.getTime();
                            
                            let appointmentTop = 0;
                            let appointmentHeight = hourCellHeight;
                            
                            if (aptStartTime < slotStartTime) {
                              // Agendamento atravessa esta célula (começou antes)
                              appointmentTop = 0;
                              if (aptEndTime <= slotEndTime) {
                                // Termina dentro desta célula
                                const minutesFromSlotStart = (aptEndTime - slotStartTime) / (60 * 1000);
                                appointmentHeight = (minutesFromSlotStart / 60) * hourCellHeight;
                              } else {
                                // Atravessa além desta célula - ocupar toda a célula atual
                                appointmentHeight = hourCellHeight;
                              }
                            } else {
                              // Agendamento começa dentro desta célula
                              appointmentTop = calculateAppointmentTopOffset(aptStart, hourCellHeight);
                              if (aptEndTime <= slotEndTime) {
                                // Termina dentro desta célula
                                appointmentHeight = calculateAppointmentHeight(aptStart, aptEnd, hourCellHeight);
                              } else {
                                // Atravessa além desta célula - ocupar até o fim da célula atual
                                appointmentHeight = hourCellHeight - appointmentTop;
                              }
                            }
                            
                            // Se há espaço antes do agendamento, criar zona clicável
                            if (appointmentTop > currentTop) {
                              zones.push({
                                top: currentTop,
                                height: appointmentTop - currentTop
                              });
                            }
                            
                            // Atualizar currentTop para depois do agendamento
                            currentTop = Math.max(currentTop, appointmentTop + appointmentHeight);
                          });
                          
                          // Se há espaço depois do último agendamento, criar zona clicável
                          if (currentTop < hourCellHeight) {
                            zones.push({
                              top: currentTop,
                              height: hourCellHeight - currentTop
                            });
                          }
                          
                          // Se não há agendamentos, toda a célula é clicável
                          if (allAppointmentsInCell.length === 0) {
                            zones.push({
                              top: 0,
                              height: hourCellHeight
                            });
                          }
                          
                          return zones.map((zone, idx) => (
                            zone.height > 5 && ( // Só criar zona se tiver pelo menos 5px de altura
                              <div
                                key={`empty-zone-${idx}`}
                                className="absolute left-0 right-0 cursor-pointer z-10 hover:bg-blue-50/30 transition-colors"
                                style={{
                                  top: `${zone.top}px`,
                                  height: `${zone.height}px`,
                                  pointerEvents: 'auto',
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  
                                  // Verificar se a célula está completamente vazia (sem agendamentos)
                                  const cellElement = e.currentTarget.closest('td') as HTMLElement;
                                  if (!cellElement) {
                                    onCellClick(day, timeSlot);
                                    return;
                                  }
                                  
                                  // Se a zona começa no topo (top === 0) e ocupa toda ou quase toda a célula, usar hora cheia
                                  const isFullCell = zone.top === 0 && zone.height >= hourCellHeight - 10;
                                  
                                  // Também verificar se não há agendamentos na célula
                                  const hasAppointmentsInCell = allAppointmentsInCell.length > 0;
                                  
                                  if (isFullCell && !hasAppointmentsInCell) {
                                    // Célula completamente vazia - usar hora cheia
                                    onCellClick(day, timeSlot);
                                    return;
                                  }
                                  
                                  // Calcular o horário baseado na posição absoluta do clique dentro da célula completa
                                  const cellRect = cellElement.getBoundingClientRect();
                                  const clickYRelativeToCell = e.clientY - cellRect.top;
                                  
                                  // Converter posição em pixels para minutos dentro da célula de 1 hora
                                  // hourCellHeight pixels = 60 minutos
                                  const minutesFromCellTop = (clickYRelativeToCell / hourCellHeight) * 60;
                                  
                                  const slotHour = parseInt(timeSlot.split(':')[0]);
                                  const slotMinute = parseInt(timeSlot.split(':')[1]) || 0;
                                  
                                  // Calcular minutos totais desde o início do slot
                                  const totalMinutes = slotMinute + minutesFromCellTop;
                                  const clickHourFinal = slotHour + Math.floor(totalMinutes / 60);
                                  const clickMinuteFinal = Math.floor(totalMinutes % 60);
                                  
                                  // Arredondar para o intervalo de 30 minutos mais próximo
                                  const roundedMinute = Math.round(clickMinuteFinal / 30) * 30;
                                  const finalHour = roundedMinute >= 60 ? clickHourFinal + 1 : clickHourFinal;
                                  const finalMinute = roundedMinute >= 60 ? roundedMinute - 60 : roundedMinute;
                                  
                                  const clickTime = `${String(finalHour).padStart(2, '0')}:${String(finalMinute).padStart(2, '0')}`;
                                  onCellClick(day, clickTime);
                                }}
                              />
                            )
                          ));
                        })()}
                        
                        {/* Mostrar bloqueio se não houver agendamentos */}
                        {appointmentsToRender.length === 0 && isBlocked && (
                          <div className="w-full h-full flex items-center justify-center pointer-events-none">
                            <div className="text-slate-400 text-xs">
                              {getBlockadeReason ? getBlockadeReason(day, timeSlot) || 'Bloqueado' : 'Bloqueado'}
                            </div>
                          </div>
                        )}
                      </motion.td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );

  return (
    <Card className="shadow-lg border-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-800 dark:to-slate-800 border-b border-slate-200/60 dark:border-slate-700/60 p-6">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-slate-100">
            <Calendar className="h-6 w-6 text-blue-600" />
            Agenda
          </CardTitle>
          
          {/* Mobile Toggle - Only show on mobile */}
          {isMobile && (
            <div className="flex items-center gap-3">
              <div className="flex items-center space-x-2">
                <Label htmlFor="view-mode" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Dia
                </Label>
                <Switch
                  id="view-mode"
                  checked={viewMode === 'week'}
                  onCheckedChange={(checked) => setViewMode(checked ? 'week' : 'day')}
                  className="data-[state=checked]:bg-blue-600"
                />
                <Label htmlFor="view-mode" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Semana
                </Label>
              </div>
            </div>
          )}
          
          {/* Desktop Legend - Only show on desktop */}
          {!isMobile && (
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
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        <AnimatePresence mode="wait">
          {/* Mobile: Show day view by default, or week view if toggled */}
          {isMobile ? (
            viewMode === 'day' ? renderDayView() : renderWeekView()
          ) : (
            /* Desktop: Always show week view */
            renderWeekView()
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};

export default ResponsiveCalendar;
