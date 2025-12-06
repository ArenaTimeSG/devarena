import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isBefore, startOfDay, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Modalidade {
  id: string;
  name: string;
  duracao: number;
  valor: number;
  descricao: string;
  cor: string;
}

interface WorkingHours {
  monday: { enabled: boolean; start: string; end: string };
  tuesday: { enabled: boolean; start: string; end: string };
  wednesday: { enabled: boolean; start: string; end: string };
  thursday: { enabled: boolean; start: string; end: string };
  friday: { enabled: boolean; start: string; end: string };
  saturday: { enabled: boolean; start: string; end: string };
  sunday: { enabled: boolean; start: string; end: string };
}

interface CalendarioProps {
  onDataSelect: (data: Date) => void;
  modalidade: Modalidade;
  workingHours?: WorkingHours;
  tempoMinimoAntecedencia?: number;
}

const Calendario = ({ onDataSelect, modalidade, workingHours, tempoMinimoAntecedencia = 24 }: CalendarioProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleDateClick = (date: Date) => {
    if (!isBefore(date, startOfDay(new Date()))) {
      setSelectedDate(date);
      onDataSelect(date);
    }
  };

  // Gerar dias do mês
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Adicionar dias do mês anterior para completar a primeira semana
  const startDate = monthStart;
  const daysFromPrevMonth = startDate.getDay();
  const prevMonthDays = [];
  
  for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
    prevMonthDays.push(subMonths(startDate, 1).setDate(startDate.getDate() - i - 1));
  }

  // Adicionar dias do próximo mês para completar a última semana
  const endDate = monthEnd;
  const daysFromNextMonth = 6 - endDate.getDay();
  const nextMonthDays = [];
  
  for (let i = 1; i <= daysFromNextMonth; i++) {
    nextMonthDays.push(addDays(endDate, i));
  }

  const allDays = [...prevMonthDays, ...monthDays, ...nextMonthDays];

  const isDateDisabled = (date: Date) => {
    // Verificar se é uma data passada
    if (isBefore(date, startOfDay(new Date()))) {
      return true;
    }

    // Verificar tempo mínimo de antecedência
    const now = new Date();
    const minTime = addDays(now, tempoMinimoAntecedencia / 24);
    if (isBefore(date, startOfDay(minTime))) {
      return true;
    }

    // Verificar se o dia da semana está habilitado
    if (workingHours) {
      const dayOfWeek = format(date, 'EEEE').toLowerCase() as keyof WorkingHours;
      const daySchedule = workingHours[dayOfWeek];
      if (!daySchedule.enabled) {
        return true;
      }
    }

    return false;
  };

  const isDateSelected = (date: Date) => {
    return selectedDate && isSameDay(date, selectedDate);
  };

  const isDateToday = (date: Date) => {
    return isSameDay(date, new Date());
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 max-w-md mx-auto">
      {/* Header do Calendário */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={prevMonth}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </button>
        
        <div className="text-center">
          <h3 className="text-xl font-bold text-gray-800">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </h3>
          <p className="text-sm text-gray-500 capitalize">
            {modalidade.name} - {modalidade.duracao}min
          </p>
        </div>
        
        <button
          onClick={nextMonth}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-slate-600" />
        </button>
      </div>

      {/* Dias da semana */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
          <div key={day} className="text-center py-2">
            <span className="text-sm font-medium text-gray-500">{day}</span>
          </div>
        ))}
      </div>

      {/* Dias do mês */}
      <div className="grid grid-cols-7 gap-1">
        {allDays.map((day, index) => {
          const date = new Date(day);
          const isDisabled = isDateDisabled(date);
          const isSelected = isDateSelected(date);
          const isToday = isDateToday(date);
          const isCurrentMonth = isSameMonth(date, currentMonth);

          return (
            <motion.button
              key={index}
              whileHover={!isDisabled ? { scale: 1.1 } : {}}
              whileTap={!isDisabled ? { scale: 0.95 } : {}}
              onClick={() => handleDateClick(date)}
              disabled={isDisabled}
              className={`
                w-10 h-10 rounded-lg text-sm font-medium transition-all duration-200
                ${isDisabled 
                  ? 'text-gray-300 cursor-not-allowed' 
                  : 'hover:bg-blue-50 cursor-pointer'
                }
                ${isSelected 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : isToday 
                    ? 'bg-blue-100 text-blue-600' 
                    : isCurrentMonth 
                      ? 'text-gray-800' 
                      : 'text-gray-400'
                }
              `}
            >
              {format(date, 'd')}
            </motion.button>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-100 rounded"></div>
            <span>Hoje</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-600 rounded"></div>
            <span>Selecionado</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gray-200 rounded"></div>
            <span>Indisponível</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calendario;
