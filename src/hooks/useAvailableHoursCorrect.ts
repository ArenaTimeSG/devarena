import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface AvailableHoursParams {
  adminUserId: string;
  selectedDate: Date;
  workingHours: any;
  tempoMinimoAntecedencia: number;
  timeFormatInterval?: 30 | 60; // intervalo de horários (30min ou 60min)
}

export const useAvailableHoursCorrect = ({
  adminUserId,
  selectedDate,
  workingHours,
  tempoMinimoAntecedencia,
  timeFormatInterval = 60
}: AvailableHoursParams) => {
  return useQuery({
    queryKey: ['availableHours', adminUserId, format(selectedDate, 'yyyy-MM-dd'), workingHours],
    queryFn: async () => {
      try {
        // 1. Normalizar a data
        const normalizedDate = format(selectedDate, 'yyyy-MM-dd');

        // 2. Obter o dia da semana (0 = domingo, 1 = segunda, etc.)
        const dayOfWeek = selectedDate.getDay();
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = dayNames[dayOfWeek];

        // 3. Verificar se o dia está habilitado
        const daySchedule = workingHours?.[dayName];
        if (!daySchedule || !daySchedule.enabled) {
          return [];
        }

        // 4. Gerar todos os horários possíveis baseados no working_hours
        const startHour = parseInt(daySchedule.start.split(':')[0]);
        const startMinutes = parseInt(daySchedule.start.split(':')[1] || '0');
        let endHour = parseInt(daySchedule.end.split(':')[0]);
        const endMinutes = parseInt(daySchedule.end.split(':')[1] || '0');
        
        // Se end_time = 00:00, tratar como 23:59
        if (endHour === 0 && endMinutes === 0) {
          endHour = 23;
        }

        const allHours: string[] = [];
        
                 // Verificar se o funcionamento atravessa a madrugada
         // Se o horário original termina às 00:00, não atravessa a madrugada (é fim do dia)
         const originalEndHour = parseInt(daySchedule.end.split(':')[0]);
         const originalEndMinutes = parseInt(daySchedule.end.split(':')[1] || '0');
         const crossesMidnight = (originalEndHour !== 0) && (endHour < startHour);
         
         if (crossesMidnight) {
           // Funcionamento atravessa a madrugada (ex: 18:00 - 02:00)
           // Gerar horários de startHour até 23:00
           for (let hour = startHour; hour <= 23; hour++) {
             if (hour !== 12) { // Excluir horário do almoço
               if ((timeFormatInterval || 60) === 30) {
                 // Para horários quebrados, gerar apenas horários de :30
                 allHours.push(`${hour.toString().padStart(2, '0')}:30`);
               } else {
                 allHours.push(`${hour.toString().padStart(2, '0')}:00`);
               }
             }
           }
           // Gerar horários de 00:00 até endHour
           for (let hour = 0; hour < endHour; hour++) {
             if (hour !== 12) { // Excluir horário do almoço
               if ((timeFormatInterval || 60) === 30) {
                 // Para horários quebrados, gerar apenas horários de :30
                 allHours.push(`${hour.toString().padStart(2, '0')}:30`);
               } else {
                 allHours.push(`${hour.toString().padStart(2, '0')}:00`);
               }
             }
           }
         } else {
           // Funcionamento normal no mesmo dia
           // Se endHour é 23 (após conversão de 00:00), NÃO incluir 23:00
           const maxHour = endHour === 23 ? 22 : endHour;
           for (let hour = startHour; hour <= maxHour; hour++) {
             if (hour !== 12) { // Excluir horário do almoço
               if ((timeFormatInterval || 60) === 30) {
                 // Para horários quebrados, gerar apenas horários de :30
                 // Não adicionar :30 se for o último horário e for 23h
                 if (hour < maxHour || (hour === maxHour && maxHour < 23)) {
                   allHours.push(`${hour.toString().padStart(2, '0')}:30`);
                 }
               } else {
                 allHours.push(`${hour.toString().padStart(2, '0')}:00`);
               }
             }
           }
         }

        // 5. Buscar agendamentos existentes para este dia
        const { data: existingAppointments, error: appointmentsError } = await supabase
          .from('appointments')
          .select('date, status')
          .eq('user_id', adminUserId)
          .gte('date', `${normalizedDate}T00:00:00`)
          .lt('date', `${normalizedDate}T23:59:59`)
          .in('status', ['agendado', 'pago']); // Apenas agendamentos confirmados

        if (appointmentsError) {
          console.error('Erro ao buscar agendamentos:', appointmentsError);
          throw new Error(`Erro ao buscar agendamentos: ${appointmentsError.message}`);
        }

        // 6. Extrair horários ocupados dos agendamentos existentes
        const occupiedHours = existingAppointments?.map(apt => {
          const appointmentDate = new Date(apt.date);
          const hour = appointmentDate.getHours();
          const timeString = `${hour.toString().padStart(2, '0')}:00`;
          return timeString;
        }) || [];

        // 7. Filtrar horários disponíveis
        let availableHours = allHours.filter(hour => {
          const isOccupied = occupiedHours.includes(hour);
          return !isOccupied;
        });

        // 7.1. Verificar bloqueios do horário de funcionamento
        // Se end_time = 00:00, não incluir horários após 23:00
        const originalEndHour = parseInt(workingHours[dayOfWeek].end.split(':')[0]);
        const originalEndMinutes = parseInt(workingHours[dayOfWeek].end.split(':')[1] || '0');
        
        if (originalEndHour === 0 && originalEndMinutes === 0) {
          // Se termina às 00:00, remover horários das 23h se estiverem na lista
          availableHours = availableHours.filter(hour => {
            const hourNum = parseInt(hour.split(':')[0]);
            return hourNum < 23; // Remover 23:00 se estiver presente
          });
        }

        // 7.2. Verificar bloqueios manuais do localStorage (seguindo o mesmo padrão do bloqueio do meio-dia)
        try {
          const savedBlockades = localStorage.getItem('manualBlockades');
          if (savedBlockades) {
            const manualBlockades = JSON.parse(savedBlockades);
            
            // Filtrar horários bloqueados manualmente
            availableHours = availableHours.filter(hour => {
              const blockadeKey = `${normalizedDate}-${hour}`;
              return !manualBlockades[blockadeKey]?.blocked;
            });
          }
        } catch (error) {
          console.error('Erro ao verificar bloqueios manuais:', error);
        }

        // 8. Aplicar regra de tempo mínimo de antecedência
        const now = new Date();
        const selectedDateTime = new Date(selectedDate);
        selectedDateTime.setHours(0, 0, 0, 0);
        
        const timeDiff = selectedDateTime.getTime() - now.getTime();
        const hoursDiff = timeDiff / (1000 * 60 * 60);

        if (hoursDiff < tempoMinimoAntecedencia) {
          // Se não atende ao tempo mínimo, retornar vazio
          return [];
        }

        return availableHours;
      } catch (error) {
        console.error('Erro ao buscar horários disponíveis:', error);
        return []; // Retornar array vazio em caso de erro
      }
    },
    enabled: !!adminUserId && !!selectedDate && !!workingHours,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    retry: 1, // Limitar retry para evitar loops
  });
};
