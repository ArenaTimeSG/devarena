/**
 * Utilitários para gerenciar durações de agendamentos
 */

export interface DurationOption {
  value: number; // minutos
  label: string; // ex: "1h 30min"
}

/**
 * Gera todas as opções de duração de 5 em 5 minutos até 5 horas
 * @returns Array de opções de duração
 */
export const generateDurationOptions = (): DurationOption[] => {
  const options: DurationOption[] = [];
  
  // Gerar de 5 minutos até 300 minutos (5 horas) em intervalos de 5
  for (let minutes = 5; minutes <= 300; minutes += 5) {
    options.push({
      value: minutes,
      label: formatDurationLabel(minutes)
    });
  }
  
  return options;
};

/**
 * Formata a duração em minutos para uma label legível
 * @param minutes - Duração em minutos
 * @returns String formatada (ex: "1h 30min", "45min")
 */
export const formatDurationLabel = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes}min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}min`;
};

/**
 * Calcula o preço proporcional baseado na duração
 * @param basePrice - Preço base por hora
 * @param durationMinutes - Duração em minutos
 * @returns Preço calculado
 */
export const calculateProportionalPrice = (basePrice: number, durationMinutes: number): number => {
  // Fórmula: (preço_por_hora / 60) * minutos_totais
  return (basePrice / 60) * durationMinutes;
};

/**
 * Calcula a hora de término baseada na hora de início e duração
 * @param startTime - Hora de início (string HH:MM)
 * @param durationMinutes - Duração em minutos
 * @returns Hora de término (string HH:MM)
 */
export const calculateEndTime = (startTime: string, durationMinutes: number): string => {
  const [hours, minutes] = startTime.split(':').map(Number);
  const startDate = new Date();
  startDate.setHours(hours, minutes, 0, 0);
  
  const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
  
  return endDate.toTimeString().slice(0, 5);
};

/**
 * Calcula a data/hora de término baseada na data/hora de início e duração
 * @param startDateTime - Data/hora de início (Date ou string ISO)
 * @param durationMinutes - Duração em minutos
 * @returns Data/hora de término (Date)
 */
export const calculateEndDateTime = (startDateTime: Date | string, durationMinutes: number): Date => {
  const start = typeof startDateTime === 'string' ? new Date(startDateTime) : startDateTime;
  return new Date(start.getTime() + durationMinutes * 60000);
};

/**
 * Verifica se uma duração é válida (entre 5 e 300 minutos)
 * @param minutes - Duração em minutos
 * @returns true se válida
 */
export const isValidDuration = (minutes: number): boolean => {
  return minutes >= 5 && minutes <= 300 && minutes % 5 === 0;
};

/**
 * Obtém a duração padrão (60 minutos)
 * @returns Duração padrão em minutos
 */
export const getDefaultDuration = (): number => {
  return 60;
};

/**
 * Obtém a opção de duração padrão
 * @returns Opção de duração padrão
 */
export const getDefaultDurationOption = (): DurationOption => {
  return {
    value: 60,
    label: "1h"
  };
};

