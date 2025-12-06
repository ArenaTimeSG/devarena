import { useMemo } from 'react';
import { format, addDays, isBefore, startOfDay } from 'date-fns';

interface WorkingHours {
  monday: { enabled: boolean; start: string; end: string };
  tuesday: { enabled: boolean; start: string; end: string };
  wednesday: { enabled: boolean; start: string; end: string };
  thursday: { enabled: boolean; start: string; end: string };
  friday: { enabled: boolean; start: string; end: string };
  saturday: { enabled: boolean; start: string; end: string };
  sunday: { enabled: boolean; start: string; end: string };
}

interface UseAvailableHoursSyncProps {
  workingHours: WorkingHours;
  selectedDate: Date;
  tempoMinimoAntecedencia?: number; // em horas
  existingAppointments?: Array<{ date: string; modality: string }>;
  modalityDuration?: number; // duração da modalidade em minutos
  timeFormatInterval?: 30 | 60; // intervalo de horários (30min ou 60min)
}

export const useAvailableHoursSync = ({
  workingHours,
  selectedDate,
  tempoMinimoAntecedencia = 24,
  existingAppointments = [],
  modalityDuration = 60,
  timeFormatInterval = 60
}: UseAvailableHoursSyncProps) => {
  return useMemo(() => {
    try {
      const dayOfWeek = format(selectedDate, 'EEEE').toLowerCase() as keyof WorkingHours;
      const daySchedule = workingHours[dayOfWeek];

      // Se o dia não está habilitado, retorna array vazio
      if (!daySchedule?.enabled) {
        return [];
      }

      // Verificar se a data está dentro do tempo mínimo de antecedência
      const now = new Date();
      const minTime = addDays(now, tempoMinimoAntecedencia / 24);
      
      if (isBefore(selectedDate, startOfDay(minTime))) {
        return [];
      }

             // Gerar horários disponíveis baseados no horário de funcionamento
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
              allHours.push(`${hour.toString().padStart(2, '0')}:00`);
            }
          }
          // Gerar horários de 00:00 até endHour
          for (let hour = 0; hour < endHour; hour++) {
            if (hour !== 12) { // Excluir horário do almoço
              allHours.push(`${hour.toString().padStart(2, '0')}:00`);
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

      // Se não há agendamentos existentes, retorna todos os horários
      if (existingAppointments.length === 0) {
        return allHours;
      }

      // Criar array de horários ocupados
      const occupiedTimes: string[] = [];
      
      existingAppointments.forEach(appointment => {
        const appointmentDate = new Date(appointment.date);
        const appointmentHour = format(appointmentDate, 'HH:mm');
        
        // Adicionar o horário do agendamento
        occupiedTimes.push(appointmentHour);
        
        // Adicionar horários subsequentes baseados na duração da modalidade
        const durationHours = Math.ceil(modalityDuration / 60);
        for (let i = 1; i < durationHours; i++) {
          const nextHour = appointmentDate.getHours() + i;
          if (nextHour < endHour) {
            const nextHourString = `${nextHour.toString().padStart(2, '0')}:00`;
            occupiedTimes.push(nextHourString);
          }
        }
      });

      // Filtrar horários disponíveis
      let availableHours = allHours.filter(hour => !occupiedTimes.includes(hour));

      // Verificar bloqueios do horário de funcionamento
      // Se end_time = 00:00, não incluir horários após 23:00
      const originalEndHour = parseInt(daySchedule.end.split(':')[0]);
      const originalEndMinutes = parseInt(daySchedule.end.split(':')[1] || '0');
      
      if (originalEndHour === 0 && originalEndMinutes === 0) {
        // Se termina às 00:00, remover horários das 23h se estiverem na lista
        availableHours = availableHours.filter(hour => {
          const hourNum = parseInt(hour.split(':')[0]);
          return hourNum < 23; // Remover 23:00 se estiver presente
        });
      }
      
      // Verificar bloqueios manuais do localStorage (seguindo o mesmo padrão do bloqueio do meio-dia)
      try {
        const dateKey = format(selectedDate, 'yyyy-MM-dd');
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
      
      return availableHours;
    } catch (error) {
      console.error('Erro ao gerar horários disponíveis:', error);
      return [];
    }
  }, [workingHours, selectedDate, tempoMinimoAntecedencia, existingAppointments, modalityDuration]);
};
