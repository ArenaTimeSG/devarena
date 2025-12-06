import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { format, addDays, subDays, isSameDay, startOfWeek, addWeeks, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AppointmentCard } from '@/components/animated/AppointmentCard';
import { useIsMobile } from '@/hooks/useIsMobile';

interface Appointment {
  id: string;
  date: string;
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
          <table className="w-full border-collapse">
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
                    const appointment = getAppointmentForSlot(day, timeSlot);
                    const hasAppointment = !!appointment;
                    const isBlocked = isTimeSlotBlocked(day, timeSlot);
                    
                    return (
                                             <motion.td 
                         key={j} 
                         className={`border border-slate-200 p-1 h-16 align-top cursor-pointer transition-all duration-200 min-w-[100px] relative ${
                           hasAppointment 
                             ? 'bg-gradient-to-br from-blue-50 to-indigo-50' 
                             : isBlocked 
                               ? 'bg-slate-100 border-slate-300' 
                               : isSameDay(day, new Date()) 
                                 ? 'bg-blue-50/50 hover:bg-blue-100/50' 
                                 : 'bg-white hover:bg-slate-50'
                         }`}
                         onClick={() => onCellClick(day, timeSlot)}
                         whileHover={{ scale: 1.02 }}
                         transition={{ duration: 0.2 }}
                       >
                         <div className="w-full h-full flex items-center justify-center">
                           <AnimatePresence mode="wait">
                             {appointment ? (
                               <AppointmentCard
                                 key={appointment.id}
                                 appointment={appointment}
                                 onClick={() => onCellClick(day, timeSlot)}
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
                                     {getBlockadeReason ? getBlockadeReason(day, timeSlot) || 'Bloqueado' : 'Bloqueado'}
                                   </div>
                                 )}
                               </motion.div>
                             )}
                           </AnimatePresence>
                         </div>
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
