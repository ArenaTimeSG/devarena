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
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [currentDay, setCurrentDay] = useState(new Date());
  const [dragDirection, setDragDirection] = useState<'left' | 'right' | null>(null);
  const constraintsRef = useRef(null);

  // Ajustar viewMode baseado no dispositivo
  useEffect(() => {
    if (isMobile) {
      setViewMode('day'); // Mobile sempre começa em dia
    } else {
      setViewMode('week'); // Desktop sempre em semana
    }
  }, [isMobile]);

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
      <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePreviousDay}
          className="hover:bg-white/50 transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        
        <div className="text-center">
          <h3 className="text-lg font-bold text-slate-800">
            {format(currentDay, 'EEEE', { locale: ptBR })}
          </h3>
          <p className="text-sm text-slate-600">
            {format(currentDay, 'dd/MM/yyyy', { locale: ptBR })}
            {isSameDay(currentDay, new Date()) && ' • Hoje'}
          </p>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNextDay}
          className="hover:bg-white/50 transition-colors"
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
                  ? 'border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50' 
                  : isBlocked 
                    ? 'border-slate-200 bg-slate-50' 
                    : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/30'
              }`}
              onClick={() => onCellClick(currentDay, timeSlot)}
              whileHover={{ scale: hasAppointment ? 1 : 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-500" />
                    <span className="font-mono font-semibold text-slate-700">
                      {timeSlot}
                    </span>
                  </div>
                  
                  {isBlocked && (
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                      {getBlockadeReason ? getBlockadeReason(currentDay, timeSlot) || 'Bloqueado' : 'Bloqueado'}
                    </span>
                  )}
                </div>
                
                {hasAppointment && (
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(appointment.status, appointment.date, appointment.recurrence_id, appointment.is_cortesia)}`}></div>
                    <span className="text-xs font-medium text-slate-600">
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
      <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePreviousWeek}
          className="hover:bg-white/50 transition-colors"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Anterior
        </Button>
        
        <div className="text-center">
          <h3 className="text-lg font-bold text-slate-800">Agenda Semanal</h3>
          <p className="text-sm text-slate-600">
            {format(startOfWeek(currentWeek, { locale: ptBR }), 'dd/MM', { locale: ptBR })} - {format(addDays(startOfWeek(currentWeek, { locale: ptBR }), 6), 'dd/MM/yyyy', { locale: ptBR })}
          </p>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNextWeek}
          className="hover:bg-white/50 transition-colors"
        >
          Próxima
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Week Grid */}
      <div className="overflow-auto max-h-[600px] rounded-xl border border-slate-200">
        <div className="min-w-[700px]">
          <table className="w-full border-collapse" style={{ position: 'relative' }}>
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="border border-slate-200 p-2 text-left font-bold bg-slate-50 text-slate-700 text-xs min-w-[60px]">
                  Horário
                </th>
                {weekDays.map((day, i) => (
                  <motion.th 
                    key={i} 
                    className={`border border-slate-200 p-2 text-center font-bold text-xs min-w-[100px] ${
                      isSameDay(day, new Date()) 
                        ? 'bg-blue-50 text-blue-800 border-blue-200' 
                        : 'bg-slate-50 text-slate-700'
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
                    className="border border-slate-200 p-2 font-bold bg-slate-50 text-slate-700 text-xs min-w-[60px] sticky left-0 z-10"
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
                    // Renderizar apenas se o agendamento começa nesta célula (não antes)
                    const appointmentsToRender = allDayAppointments.filter((appointment) => {
                      if (!appointment) return false;
                      const aptStart = new Date(appointment.date);
                      const aptEnd = appointment.end_time ? new Date(appointment.end_time) : new Date(aptStart.getTime() + 60 * 60 * 1000);
                      
                      // Verificar se o agendamento se sobrepõe com este slot
                      const overlaps = aptStart < slotEnd && slotStart < aptEnd;
                      
                      if (!overlaps) return false;
                      
                      // Renderizar apenas se o agendamento começa dentro deste slot
                      // Isso evita renderizar o mesmo agendamento múltiplas vezes
                      // O agendamento começa dentro do slot se: slotStart <= aptStart < slotEnd
                      return aptStart >= slotStart && aptStart < slotEnd;
                    });
                    
                    return (
                      <motion.td 
                        key={j} 
                        className={`border border-slate-200 p-0 h-16 align-top cursor-pointer transition-all duration-200 min-w-[100px] relative overflow-visible ${
                          isBlocked 
                            ? 'bg-slate-100 border-slate-300' 
                            : isSameDay(day, new Date()) 
                              ? 'bg-blue-50/50 hover:bg-blue-100/50' 
                              : 'bg-white hover:bg-slate-50'
                        }`}
                        style={{ overflow: 'visible' }}
                        onClick={() => onCellClick(day, timeSlot)}
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
                          const aptStartTime = aptStart.getTime();
                          
                          let topOffset = 0;
                          let height = totalHeight;
                          
                          // Agendamento sempre começa dentro deste slot (devido ao filtro acima)
                          topOffset = calculateAppointmentTopOffset(aptStart, hourCellHeight);
                          
                          // Calcular altura até o fim do agendamento
                          const slotEndTime = slotEnd.getTime();
                          const aptEndTime = aptEnd.getTime();
                          
                          if (aptEndTime <= slotEndTime) {
                            // Agendamento termina dentro deste slot
                            // Usar altura total calculada
                            height = totalHeight;
                          } else {
                            // Agendamento atravessa múltiplas células
                            // Calcular altura até o fim do slot atual
                            const heightUntilSlotEnd = hourCellHeight - topOffset;
                            // Calcular quantas células adicionais o agendamento atravessa
                            const additionalCells = Math.ceil((aptEndTime - slotEndTime) / (60 * 60 * 1000));
                            // Altura total = altura até fim do slot + altura das células seguintes
                            height = heightUntilSlotEnd + (additionalCells * hourCellHeight);
                          }
                          
                          // Não limitar altura - permitir que atravesse múltiplas células
                          // A altura pode ser maior que hourCellHeight se o agendamento atravessa múltiplas células
                          
                          // Calcular largura (100% da célula com pequeno padding)
                          const width = 'calc(100% - 4px)';
                          const left = '2px';
                          
                          return (
                            <motion.div
                              key={appointment.id}
                              className="absolute rounded-md shadow-sm border border-blue-200/50 overflow-hidden cursor-pointer z-20"
                              style={{
                                top: `${topOffset}px`,
                                left: left,
                                width: width,
                                height: `${Math.max(18, height)}px`,
                                minHeight: '18px',
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                onCellClick(day, timeSlot);
                              }}
                              whileHover={{ scale: 1.02, zIndex: 30 }}
                              transition={{ duration: 0.2 }}
                            >
                              <AppointmentCard
                                appointment={appointment}
                                onClick={() => onCellClick(day, timeSlot)}
                                getStatusColor={getStatusColor}
                                getStatusLabel={getStatusLabel}
                                date={appointment.date}
                              />
                            </motion.div>
                          );
                        })}
                        
                        {/* Mostrar bloqueio se não houver agendamentos */}
                        {appointmentsToRender.length === 0 && isBlocked && (
                          <div className="w-full h-full flex items-center justify-center">
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
    <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-xl rounded-2xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200/60 p-6">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-800">
            <Calendar className="h-6 w-6 text-blue-600" />
            Agenda
          </CardTitle>
          
          {/* Mobile Toggle - Only show on mobile */}
          {isMobile && (
            <div className="flex items-center gap-3">
              <div className="flex items-center space-x-2">
                <Label htmlFor="view-mode" className="text-sm font-medium text-slate-700">
                  Dia
                </Label>
                <Switch
                  id="view-mode"
                  checked={viewMode === 'week'}
                  onCheckedChange={(checked) => setViewMode(checked ? 'week' : 'day')}
                  className="data-[state=checked]:bg-blue-600"
                />
                <Label htmlFor="view-mode" className="text-sm font-medium text-slate-700">
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
