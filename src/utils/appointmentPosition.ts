/**
 * Utilitários para calcular posição e altura proporcional de agendamentos no calendário
 */

import { format, parse, differenceInMinutes, getHours, getMinutes, startOfHour, addMinutes } from 'date-fns';

/**
 * Calcula a altura proporcional de um bloco de agendamento baseado na duração
 * @param startTime - Horário de início (Date ou string ISO)
 * @param endTime - Horário de fim (Date ou string ISO)
 * @param hourCellHeight - Altura de uma célula de 1 hora em pixels (padrão: 64px)
 * @returns Altura em pixels
 */
export function calculateAppointmentHeight(
  startTime: Date | string,
  endTime: Date | string,
  hourCellHeight: number = 64
): number {
  const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
  const end = typeof endTime === 'string' ? new Date(endTime) : endTime;
  
  const durationMinutes = differenceInMinutes(end, start);
  const height = (durationMinutes / 60) * hourCellHeight;
  
  // Altura mínima para garantir visibilidade (18px para agendamentos curtos)
  return Math.max(18, height);
}

/**
 * Calcula o offset vertical para posicionar o início do bloco dentro de uma célula de hora
 * @param startTime - Horário de início (Date ou string ISO)
 * @param hourCellHeight - Altura de uma célula de 1 hora em pixels (padrão: 64px)
 * @returns Offset em pixels a partir do topo da célula
 */
export function calculateAppointmentTopOffset(
  startTime: Date | string,
  hourCellHeight: number = 64
): number {
  const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
  
  const hourStart = startOfHour(start);
  const minutesFromHour = differenceInMinutes(start, hourStart);
  
  // Calcular offset proporcional dentro da célula de hora
  const offset = (minutesFromHour / 60) * hourCellHeight;
  
  return offset;
}

/**
 * Verifica se dois agendamentos se sobrepõem
 * @param start1 - Início do primeiro agendamento
 * @param end1 - Fim do primeiro agendamento
 * @param start2 - Início do segundo agendamento
 * @param end2 - Fim do segundo agendamento
 * @returns true se houver sobreposição
 */
export function appointmentsOverlap(
  start1: Date | string,
  end1: Date | string,
  start2: Date | string,
  end2: Date | string
): boolean {
  const s1 = typeof start1 === 'string' ? new Date(start1) : start1;
  const e1 = typeof end1 === 'string' ? new Date(end1) : end1;
  const s2 = typeof start2 === 'string' ? new Date(start2) : start2;
  const e2 = typeof end2 === 'string' ? new Date(end2) : end2;
  
  // Verificar sobreposição: (s1 < e2) && (s2 < e1)
  return s1 < e2 && s2 < e1;
}

/**
 * Valida se um agendamento tem horários válidos
 * @param startTime - Horário de início
 * @param endTime - Horário de fim
 * @returns Objeto com isValid (boolean) e errorMessage (string | null)
 */
export function validateAppointmentTime(
  startTime: Date | string,
  endTime: Date | string
): { isValid: boolean; errorMessage: string | null } {
  const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
  const end = typeof endTime === 'string' ? new Date(endTime) : endTime;
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { isValid: false, errorMessage: 'Horários inválidos' };
  }
  
  if (end <= start) {
    return { isValid: false, errorMessage: 'Horário de término deve ser posterior ao horário de início' };
  }
  
  const durationMinutes = differenceInMinutes(end, start);
  if (durationMinutes < 5) {
    return { isValid: false, errorMessage: 'Duração mínima de 5 minutos' };
  }
  
  return { isValid: true, errorMessage: null };
}

/**
 * Formata o intervalo de horários para exibição
 * @param startTime - Horário de início
 * @param endTime - Horário de fim
 * @returns String formatada como "HH:mm → HH:mm"
 */
export function formatTimeRange(startTime: Date | string, endTime: Date | string): string {
  const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
  const end = typeof endTime === 'string' ? new Date(endTime) : endTime;
  
  return `${format(start, 'HH:mm')} → ${format(end, 'HH:mm')}`;
}

/**
 * Gera todas as horas do dia para exibir no calendário
 * @param startHour - Hora inicial (0-23)
 * @param endHour - Hora final (0-23)
 * @returns Array de objetos { hour, label } onde hour é Date e label é string "HH:mm"
 */
export function generateHourLabels(startHour: number = 8, endHour: number = 23): Array<{ hour: Date; label: string }> {
  const labels: Array<{ hour: Date; label: string }> = [];
  
  for (let h = startHour; h <= endHour; h++) {
    const hourDate = new Date();
    hourDate.setHours(h, 0, 0, 0);
    labels.push({
      hour: hourDate,
      label: format(hourDate, 'HH:mm')
    });
  }
  
  return labels;
}


