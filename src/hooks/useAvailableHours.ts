import { useQuery } from '@tanstack/react-query';
import { format, addDays, isBefore, startOfDay, addMinutes, parseISO, addHours, isSameDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface WorkingHours {
  monday: { enabled: boolean; start: string; end: string };
  tuesday: { enabled: boolean; start: string; end: string };
  wednesday: { enabled: boolean; start: string; end: string };
  thursday: { enabled: boolean; start: string; end: string };
  friday: { enabled: boolean; start: string; end: string };
  saturday: { enabled: boolean; start: string; end: string };
  sunday: { enabled: boolean; start: string; end: string };
}

interface UseAvailableHoursProps {
  workingHours: WorkingHours;
  selectedDate: Date;
  tempoMinimoAntecedencia?: number; // em horas
  adminUserId?: string; // ID do admin para filtrar agendamentos
  modalityDuration?: number; // duração da modalidade em minutos
  timeFormatInterval?: 30 | 60; // intervalo de horários (30min ou 60min)
}

export const useAvailableHours = ({
  workingHours,
  selectedDate,
  tempoMinimoAntecedencia = 24,
  adminUserId,
  modalityDuration = 60,
  timeFormatInterval = 60
}: UseAvailableHoursProps) => {
  const dateKey = format(selectedDate, 'yyyy-MM-dd');
  
  return useQuery({
    queryKey: ['availableHours', adminUserId, dateKey, modalityDuration, timeFormatInterval],
    queryFn: async (): Promise<string[]> => {
      try {
        const dayOfWeek = format(selectedDate, 'EEEE').toLowerCase() as keyof WorkingHours;
        const daySchedule = workingHours[dayOfWeek];

        // Se o dia não está habilitado, retorna array vazio
        if (!daySchedule?.enabled) {
          return [];
        }

        // Verificar se a data está dentro do tempo mínimo de antecedência
        const now = new Date();
        const minBookingTime = addHours(now, tempoMinimoAntecedencia);
        

        
        // Se a data selecionada é hoje, verificar se já passou do tempo mínimo
        if (isSameDay(selectedDate, now)) {
          // Para hoje, só permitir horários que estejam após o tempo mínimo
          const currentHour = now.getHours();
          const minHour = minBookingTime.getHours();
          

          
          // REMOVIDO TEMPORARIAMENTE: Se ainda não chegou no tempo mínimo, não mostrar nenhum horário
          // if (currentHour < minHour) {
          //   console.log('🔍 useAvailableHours - Retornando array vazio (ainda não chegou no tempo mínimo)');
          //   return [];
          // }
        }

        // Gerar horários disponíveis baseados no horário de funcionamento
        const startHour = parseInt(daySchedule.start.split(':')[0]);
        const startMinutes = parseInt(daySchedule.start.split(':')[1] || '0');
        let endHour = parseInt(daySchedule.end.split(':')[0]);
        const endMinutes = parseInt(daySchedule.end.split(':')[1] || '0');
        
        console.log('🔍 useAvailableHours - timeFormatInterval:', timeFormatInterval);
        
        // Fallback: se timeFormatInterval for undefined/null, usar 60
        const safeTimeFormatInterval = timeFormatInterval || 60;
        console.log('🔍 useAvailableHours - safeTimeFormatInterval:', safeTimeFormatInterval);
        
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
               if (safeTimeFormatInterval === 30) {
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
               if (safeTimeFormatInterval === 30) {
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
               if (safeTimeFormatInterval === 30) {
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
         


                 // Se não há adminUserId, retorna todos os horários
         if (!adminUserId) {
           console.log('🔍 Debug - Sem adminUserId, retornando todos os horários:', allHours);
           return allHours;
         }
         


        // Buscar agendamentos existentes para este admin na data selecionada
        const startOfSelectedDate = startOfDay(selectedDate);
        const endOfSelectedDate = addDays(startOfSelectedDate, 1);

        const { data: existingAppointments, error } = await supabase
          .from('appointments')
          .select('date, modality')
          .eq('user_id', adminUserId)
          .gte('date', startOfSelectedDate.toISOString())
          .lt('date', endOfSelectedDate.toISOString())
          .not('status', 'eq', 'cancelado');

        if (error) {
          console.error('Erro ao buscar agendamentos:', error);
          return allHours;
        }

        // Criar array de horários ocupados
        const occupiedTimes: string[] = [];
        
        existingAppointments?.forEach(appointment => {
          const appointmentDate = parseISO(appointment.date);
          const appointmentHour = format(appointmentDate, 'HH:mm');
          
          // Adicionar o horário do agendamento e os próximos horários baseados na duração
          occupiedTimes.push(appointmentHour);
          
          // Adicionar horários subsequentes baseados na duração da modalidade
          let currentTime = appointmentDate;
          for (let i = 1; i < Math.ceil(modalityDuration / 60); i++) {
            currentTime = addMinutes(currentTime, 60);
            const nextHour = format(currentTime, 'HH:mm');
            occupiedTimes.push(nextHour);
          }
        });

      // Filtrar horários disponíveis
      let availableHours = allHours.filter(hour => !occupiedTimes.includes(hour));

      // Verificar bloqueios do horário de funcionamento
      // Se end_time = 00:00, não incluir horários após 23:00
      if (originalEndHour === 0 && originalEndMinutes === 0) {
        // Se termina às 00:00, remover horários das 23h se estiverem na lista
        availableHours = availableHours.filter(hour => {
          const hourNum = parseInt(hour.split(':')[0]);
          return hourNum < 23; // Remover 23:00 se estiver presente
        });
      }
         
         // Filtrar horários baseado no tempo mínimo de antecedência
         if (isSameDay(selectedDate, now)) {
           availableHours = availableHours.filter(hour => {
             const [hourStr] = hour.split(':');
             const hourNum = parseInt(hourStr);
             const currentHour = now.getHours();
             const minHour = currentHour + tempoMinimoAntecedencia;
             const isAvailable = hourNum >= minHour;
             
             return isAvailable;
           });
         }
         

        
        // Verificar bloqueios manuais do localStorage (seguindo o mesmo padrão do bloqueio do meio-dia)
        try {
          const savedBlockades = localStorage.getItem('manualBlockades');
          if (savedBlockades) {
            const manualBlockades = JSON.parse(savedBlockades);
            
            // Filtrar horários bloqueados manualmente
            availableHours = availableHours.filter(hour => {
              const blockadeKey = `${dateKey}-${hour}`;
              return !manualBlockades[blockadeKey]?.blocked;
            });
          }
        } catch (error) {
          console.error('Erro ao verificar bloqueios manuais:', error);
        }

        // Verificar bloqueios da tabela time_blockades do banco de dados
        try {
          const { data: timeBlockades, error: blockadesError } = await supabase
            .from('time_blockades')
            .select('time_slot')
            .eq('user_id', adminUserId)
            .eq('date', dateKey);

          if (blockadesError) {
            console.error('Erro ao buscar bloqueios do banco:', blockadesError);
          } else if (timeBlockades && timeBlockades.length > 0) {
            // Criar array de horários bloqueados
            const blockedTimes = timeBlockades.map(blockade => blockade.time_slot);
            
            // Filtrar horários bloqueados
            availableHours = availableHours.filter(hour => {
              // Verificar se o horário está na lista de bloqueios
              return !blockedTimes.includes(hour);
            });
            
            console.log('🔍 Horários bloqueados encontrados:', blockedTimes);
            console.log('🔍 Horários disponíveis após filtro de bloqueios:', availableHours);
          }
        } catch (error) {
          console.error('Erro ao verificar bloqueios do banco:', error);
        }
         

         return availableHours;
      } catch (error) {
        console.error('Erro ao gerar horários disponíveis:', error);
        return [];
      }
    },
    staleTime: 1000 * 10, // 10 segundos para horários disponíveis (muito responsivo)
    gcTime: 1000 * 60 * 2, // 2 minutos de cache
    enabled: !!adminUserId && !!selectedDate,
  });
};
