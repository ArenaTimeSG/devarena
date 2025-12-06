import React, { useMemo, useState } from 'react';
import { addMonths, eachDayOfInterval, endOfMonth, format, getDay, getMonth, getYear, isSameDay, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

export interface MonthlyEvent {
  id: string;
  date: string; // ISO string (yyyy-MM-dd or full ISO)
  title?: string;
  color?: string; // Tailwind color classes
  onClick?: (id: string) => void;
}

export interface AgendaMensalProps {
  initialDate?: Date;
  onDayClick?: (day: Date) => void;
  // Map yyyy-MM-dd -> array of events
  eventsByDay?: Record<string, MonthlyEvent[]>;
  // Optional background color per day (Tailwind classes)
  dayBgByKey?: Record<string, string>;
  // Callback when month/year changes
  onMonthChange?: (newMonth: Date) => void;
}

// Helper to format to yyyy-MM-dd
const toDateKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const yearsRange = (centerYear: number, span = 5) => {
  const start = centerYear - span;
  return Array.from({ length: span * 2 + 1 }, (_, i) => start + i);
};

const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const AgendaMensal: React.FC<AgendaMensalProps> = ({ initialDate = new Date(), onDayClick, eventsByDay = {}, dayBgByKey = {}, onMonthChange }) => {
  const [cursor, setCursor] = useState<Date>(new Date(initialDate));

  const monthStart = useMemo(() => startOfMonth(cursor), [cursor]);
  const monthEnd = useMemo(() => endOfMonth(cursor), [cursor]);

  // Build grid days (start from Sunday of the first week containing monthStart, to Saturday of last week containing monthEnd)
  const gridDays = useMemo(() => {
    const startWeekday = getDay(monthStart); // 0=Sun
    const gridStart = new Date(monthStart);
    gridStart.setDate(monthStart.getDate() - startWeekday);

    const endWeekday = getDay(monthEnd);
    const gridEnd = new Date(monthEnd);
    gridEnd.setDate(monthEnd.getDate() + (6 - endWeekday));

    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [monthStart, monthEnd]);

  const handlePrev = () => {
    const newCursor = addMonths(cursor, -1);
    setCursor(newCursor);
    onMonthChange?.(newCursor);
  };
  
  const handleNext = () => {
    const newCursor = addMonths(cursor, 1);
    setCursor(newCursor);
    onMonthChange?.(newCursor);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = parseInt(e.target.value, 10);
    const updated = new Date(cursor);
    updated.setFullYear(newYear);
    setCursor(updated);
    onMonthChange?.(updated);
  };

  const monthYearLabel = `${format(cursor, 'MMMM', { locale: ptBR })} de ${getYear(cursor)}`;

  const years = useMemo(() => yearsRange(getYear(new Date())), []);

  return (
    <div className="bg-white/90 backdrop-blur-xl border border-slate-200/60 rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200/60 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            <h2 className="text-lg sm:text-xl font-bold text-slate-800">Agenda</h2>
          </div>
          
          <div className="hidden sm:flex items-center gap-2">
            <div className="flex items-center gap-1 px-2 py-1 bg-green-50 rounded-md">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-green-700 text-sm font-medium">Pago</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 bg-yellow-50 rounded-md">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="text-yellow-700 text-sm font-medium">A Cobrar</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-md">
              <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
              <span className="text-gray-700 text-sm font-medium">Cancelado</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-between bg-slate-200/60 rounded-2xl p-3 sm:p-4">
          <button
            onClick={handlePrev}
            className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-800 transition-colors"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-xs sm:text-sm font-medium hidden sm:inline">Anterior</span>
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <h3 className="text-sm sm:text-lg lg:text-xl font-semibold text-slate-800 capitalize tracking-tight">
              {monthYearLabel}
            </h3>
            <select
              className="text-xs sm:text-sm bg-white border border-slate-200 rounded-lg px-1 sm:px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-200 shadow-sm"
              value={getYear(cursor)}
              onChange={handleYearChange}
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleNext}
            className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-800 transition-colors"
            aria-label="Próximo mês"
          >
            <span className="text-xs sm:text-sm font-medium hidden sm:inline">Próxima</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 text-[11px] sm:text-xs md:text-sm text-slate-600 bg-slate-50/80 border-b border-slate-200/60">
        {dayNames.map(d => (
          <div key={d} className="px-2 py-2 text-center uppercase tracking-wide font-medium">{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7">
        {gridDays.map((day, idx) => {
          const isCurrentMonth = getMonth(day) === getMonth(cursor);
          const isToday = isSameDay(day, new Date());
          const dateKey = toDateKey(day);
          const dayEvents = eventsByDay[dateKey] || [];

          // Usar a cor do primeiro evento para preencher a célula inteira
          const bgClass = dayBgByKey[dateKey] || dayEvents[0]?.color;
          const cellHasBg = !!bgClass;
          const baseBgClass = cellHasBg
            ? ''
            : (isCurrentMonth ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/60 text-slate-400 hover:bg-slate-100');

          const hasEvents = dayEvents.length > 0;

          const handleCellClick = () => {
            if (hasEvents) {
              // Abrir ações do primeiro evento do dia
              dayEvents[0].onClick?.(dayEvents[0].id);
              return;
            }
            onDayClick?.(day);
          };

          return (
            <button
              key={dateKey + idx}
              onClick={handleCellClick}
              className={[
                'min-h-[80px] sm:min-h-[92px] lg:min-h-[104px] p-1 sm:p-2 border text-left transition-all duration-200 rounded-xl',
                baseBgClass,
                bgClass ? `${bgClass}` : '',
                isToday ? 'relative ring-2 ring-blue-400 ring-offset-1 shadow-lg' : '',
                'hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]'
              ].join(' ')}
            >
              <div className="flex items-center justify-between">
                <span className={['text-xs sm:text-sm font-bold', isCurrentMonth ? 'text-slate-700' : 'text-slate-400'].join(' ')}>
                  {format(day, 'd', { locale: ptBR })}
                </span>
                {isToday && (
                  <span className="text-[8px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700 shadow-sm">Hoje</span>
                )}
              </div>

              {/* Events preview area */}
              <div className="mt-1 sm:mt-2 space-y-0.5 sm:space-y-1 pointer-events-none">
                {dayEvents.slice(0, 2).map(ev => (
                  <div
                    key={ev.id}
                    className={[
                      'text-[9px] sm:text-[11px] lg:text-[12px] px-1 sm:px-2 py-0.5 sm:py-1.5 rounded-lg truncate shadow-lg font-semibold',
                      cellHasBg ? 'bg-white/95 text-slate-900 border-2 border-white/80 backdrop-blur-sm' : (ev.color || 'bg-blue-200 text-blue-900 border-2 border-blue-300')
                    ].join(' ')}
                    title={ev.title}
                    // Os eventos não recebem cliques diretos; o clique da célula centraliza a ação
                  >
                    {ev.title || 'Evento'}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <div className="text-[8px] sm:text-[9px] text-slate-500 font-medium">+{dayEvents.length - 2} mais</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AgendaMensal;


