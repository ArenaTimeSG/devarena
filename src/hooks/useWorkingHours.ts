import { useMemo, useCallback, useState, useEffect } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format, isSameDay, parseISO } from 'date-fns';
import { DAY_ORDER } from '@/types/settings';

export const useWorkingHours = () => {
  const { settings } = useSettings();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [manualBlockades, setManualBlockades] = useState<{[key: string]: {
    blocked: boolean, 
    reason: string, 
    description?: string,
    isRecurring?: boolean,
    endDate?: string,
    isIndefinite?: boolean,
    recurrenceType?: 'daily' | 'weekly' | 'monthly',
    originalDate?: string
  }}>({});



  // Detectar e atualizar bloqueios recorrentes
  const detectAndUpdateRecurringBlockades = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Buscar todos os bloqueios para recalcular recorrência
      const { data, error } = await (supabase as any)
        .from('time_blockades')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true })
        .order('time_slot', { ascending: true });

      if (error) {
        console.error('Erro ao recarregar bloqueios para detecção de recorrência:', error);
        return;
      }

      // Converter dados do banco para o formato local
      const blockadesMap: {[key: string]: any} = {};
      data?.forEach(blockade => {
        const formattedTimeSlot = (blockade.time_slot as string).substring(0, 5);
        const blockadeKey = `${blockade.date}-${formattedTimeSlot}`;
        blockadesMap[blockadeKey] = {
          blocked: true,
          reason: blockade.reason,
          description: blockade.description,
          isRecurring: false, // Será detectado automaticamente
          originalDate: blockade.date
        };
      });
      
      // Detectar bloqueios recorrentes baseado em múltiplos horários iguais
      const timeSlotCounts: {[timeSlot: string]: number} = {};
      data?.forEach(blockade => {
        const timeSlot = (blockade.time_slot as string).substring(0, 5);
        timeSlotCounts[timeSlot] = (timeSlotCounts[timeSlot] || 0) + 1;
      });
      
      // Marcar como recorrentes os bloqueios que têm múltiplas ocorrências
      Object.entries(blockadesMap).forEach(([key, blockade]) => {
        const timeSlot = key.split('-')[1]; // Extrair horário da chave
        if (timeSlotCounts[timeSlot] > 1) {
          blockade.isRecurring = true;
        }
      });

      setManualBlockades(blockadesMap);
    } catch (error) {
      console.error('Erro ao detectar bloqueios recorrentes:', error);
    }
  }, [user?.id]);

  // Lidar com mudanças em tempo real
  const handleRealtimeChange = useCallback((payload: any) => {
    if (payload.eventType === 'INSERT') {
      // Novo bloqueio inserido
      const newBlockade = payload.new;
      const blockadeKey = `${newBlockade.date}-${newBlockade.time_slot}`;
      
      setManualBlockades(prev => {
        const newBlockades = { ...prev };
        newBlockades[blockadeKey] = {
          blocked: true,
          reason: newBlockade.reason,
          description: newBlockade.description,
          isRecurring: false, // Será detectado automaticamente
          originalDate: newBlockade.date
        };
        return newBlockades;
      });

      // Detectar se é recorrente e atualizar outros bloqueios similares
      detectAndUpdateRecurringBlockades();
    } else if (payload.eventType === 'DELETE') {
      // Bloqueio removido
      const deletedBlockade = payload.old;
      const blockadeKey = `${deletedBlockade.date}-${deletedBlockade.time_slot}`;
      
      setManualBlockades(prev => {
        const newBlockades = { ...prev };
        delete newBlockades[blockadeKey];
        return newBlockades;
      });

      // Recalcular recorrência após remoção
      detectAndUpdateRecurringBlockades();
    } else if (payload.eventType === 'UPDATE') {
      // Bloqueio atualizado
      const updatedBlockade = payload.new;
      const blockadeKey = `${updatedBlockade.date}-${updatedBlockade.time_slot}`;
      
      setManualBlockades(prev => {
        const newBlockades = { ...prev };
        newBlockades[blockadeKey] = {
          blocked: true,
          reason: updatedBlockade.reason,
          description: updatedBlockade.description,
          isRecurring: false, // Será detectado automaticamente
          originalDate: updatedBlockade.date
        };
        return newBlockades;
      });

      // Recalcular recorrência após atualização
      detectAndUpdateRecurringBlockades();
    }
  }, [detectAndUpdateRecurringBlockades]);

  // Configurar subscription em tempo real para mudanças na tabela time_blockades
  const setupRealtimeSubscription = useCallback(() => {
    if (!user?.id) return null;

    try {
      const subscription = (supabase as any)
        .channel('time_blockades_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'time_blockades',
            filter: `user_id=eq.${user.id}`
          },
          (payload: any) => {
            console.log('🔄 Mudança detectada na tabela time_blockades:', payload);
            handleRealtimeChange(payload);
          }
        )
        .subscribe();

      console.log('✅ Subscription Realtime configurada com sucesso');
      return subscription;
    } catch (error) {
      console.warn('⚠️ Realtime não disponível, usando polling como fallback:', error);
      return null;
    }
  }, [user?.id, handleRealtimeChange]);

  // Fallback para polling quando Realtime não estiver disponível
  const setupPollingFallback = useCallback(() => {
    if (!user?.id) return null;

    console.log('🔄 Configurando polling como fallback para sincronização');
    
    // Polling a cada 5 segundos
    const pollInterval = setInterval(async () => {
      try {
        await loadBlockadesFromDatabase();
      } catch (error) {
        console.warn('Erro durante polling:', error);
      }
    }, 5000);

    return pollInterval;
  }, [user?.id]);

  // Limpar subscription
  const cleanupRealtimeSubscription = useCallback(() => {
    (supabase as any).removeAllChannels();
  }, []);

  // Carregar bloqueios do banco de dados
  const loadBlockadesFromDatabase = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await (supabase as any)
        .from('time_blockades')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true })
        .order('time_slot', { ascending: true });

      if (error) {
        console.error('Erro ao carregar bloqueios:', error);
        return;
      }

      // Converter dados do banco para o formato local
      const blockadesMap: {[key: string]: any} = {};
      data?.forEach(blockade => {
        // Garante que o time_slot esteja no formato HH:MM para consistência
        const formattedTimeSlot = (blockade.time_slot as string).substring(0, 5);
        const blockadeKey = `${blockade.date}-${formattedTimeSlot}`;
        blockadesMap[blockadeKey] = {
          blocked: true,
          reason: blockade.reason,
          description: blockade.description,
          isRecurring: false, // Será detectado automaticamente
          originalDate: blockade.date
        };
      });
      
      // Detectar bloqueios recorrentes baseado em múltiplos horários iguais
      const timeSlotCounts: {[timeSlot: string]: number} = {};
      data?.forEach(blockade => {
        const timeSlot = (blockade.time_slot as string).substring(0, 5);
        timeSlotCounts[timeSlot] = (timeSlotCounts[timeSlot] || 0) + 1;
      });
      
      // Marcar como recorrentes os bloqueios que têm múltiplas ocorrências
      Object.entries(blockadesMap).forEach(([key, blockade]) => {
        const timeSlot = key.split('-')[1]; // Extrair horário da chave
        if (timeSlotCounts[timeSlot] > 1) {
          blockade.isRecurring = true;
        }
      });

      setManualBlockades(blockadesMap);
    } catch (error) {
      console.error('Erro ao carregar bloqueios:', error);
    }
  };

  // Carregar bloqueios do banco de dados
  useEffect(() => {
    let subscription: any = null;
    let pollInterval: any = null;

    if (user?.id) {
      loadBlockadesFromDatabase();
      subscription = setupRealtimeSubscription();
      
      // Se não conseguiu configurar Realtime, configurar polling
      if (!subscription) {
        pollInterval = setupPollingFallback();
      }
    }

    // Cleanup da subscription e polling
    return () => {
      if (subscription) {
        cleanupRealtimeSubscription();
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [user?.id, setupRealtimeSubscription, setupPollingFallback, cleanupRealtimeSubscription]);

  // Mapeamento de dias da semana para as chaves das configurações
  // getDay() retorna: 0 = Domingo, 1 = Segunda, 2 = Terça, etc.
  const dayMapping = useMemo(() => ({
    0: 'sunday',    // Domingo
    1: 'monday',    // Segunda
    2: 'tuesday',   // Terça
    3: 'wednesday', // Quarta
    4: 'thursday',  // Quinta
    5: 'friday',    // Sexta
    6: 'saturday'   // Sábado
  }), []);

  // Verificar se um dia está habilitado
  const isDayEnabled = useCallback((date: Date): boolean => {
    const dayOfWeek = date.getDay();
    const dayKey = dayMapping[dayOfWeek];
    
    if (!dayKey || !settings?.working_hours) {
      return false;
    }

    const daySchedule = settings.working_hours[dayKey] as any;
    const isEnabled = daySchedule?.enabled || false;
    
    return isEnabled;
  }, [settings?.working_hours, dayMapping]);

  // Verificar se um horário específico está disponível
  const isTimeSlotAvailable = useCallback((date: Date, timeSlot: string): boolean => {
    // Se o dia não está habilitado, o horário não está disponível
    if (!isDayEnabled(date)) {
      return false;
    }

    const dayOfWeek = date.getDay();
    const dayKey = dayMapping[dayOfWeek];
    
    if (!dayKey || !settings?.working_hours) {
      return false;
    }

    const daySchedule = settings.working_hours[dayKey] as any;
    
    if (!daySchedule?.enabled) {
      return false;
    }

    // Converter horário do slot para minutos
    const slotHour = parseInt(timeSlot.split(':')[0]);
    const slotMinutes = parseInt(timeSlot.split(':')[1] || '0');
    const slotTimeInMinutes = slotHour * 60 + slotMinutes;

    // Converter horários de início e fim para minutos
    const startHour = parseInt(daySchedule.start.split(':')[0]);
    const startMinutes = parseInt(daySchedule.start.split(':')[1]);
    const startTimeInMinutes = startHour * 60 + startMinutes;

    let endHour = parseInt(daySchedule.end.split(':')[0]);
    const endMinutes = parseInt(daySchedule.end.split(':')[1]);
    let endTimeInMinutes = endHour * 60 + endMinutes;

    // Se end_time = 00:00, tratar como 23:59:59 (fim do dia)
    if (endHour === 0 && endMinutes === 0) {
      endTimeInMinutes = 23 * 60 + 59; // 23:59
    }

    // Verificar se o funcionamento atravessa a madrugada
    const crossesMidnight = endTimeInMinutes < startTimeInMinutes;

    if (crossesMidnight) {
      // Funcionamento atravessa a madrugada (ex: 18:00 - 02:00)
      // Horário é válido se: >= startTime OU < endTime
      return slotTimeInMinutes >= startTimeInMinutes || slotTimeInMinutes < endTimeInMinutes;
    } else {
      // Funcionamento normal no mesmo dia
      // Se endHour é 00:00 (convertido para 23:59), incluir até 23:00
      if (endHour === 0) {
        // Funcionamento termina às 00:00, então incluir até 23:00
        return slotTimeInMinutes >= startTimeInMinutes && slotTimeInMinutes <= (23 * 60);
      } else {
        // Funcionamento termina em outro horário
        return slotTimeInMinutes >= startTimeInMinutes && slotTimeInMinutes < endTimeInMinutes;
      }
    }
  }, [settings?.working_hours, dayMapping, isDayEnabled]);

  // Gerar slots de horário baseados nas configurações
  const generateTimeSlots = useCallback((): string[] => {
    const interval = settings?.time_format_interval || 60; // Default to 60 minutes
    
    if (!settings?.working_hours) {
      // Fallback para horários padrão se não houver configurações
      return Array.from({ length: 16 }, (_, i) => {
        const hour = i + 8; // 08:00 to 23:00
        return `${hour.toString().padStart(2, '0')}:00`;
      });
    }

    // Encontrar o horário mais cedo e mais tarde de todos os dias habilitados
    let earliestHour = 23;
    let latestHour = 8;

    Object.values(settings.working_hours).forEach(daySchedule => {
      if ((daySchedule as any)?.enabled) {
        const startHour = parseInt((daySchedule as any).start.split(':')[0]);
        let endHour = parseInt((daySchedule as any).end.split(':')[0]);
        
        // Se end_time = 00:00, tratar como 23:59
        if (endHour === 0) {
          endHour = 23;
        }
        
        earliestHour = Math.min(earliestHour, startHour);
        latestHour = Math.max(latestHour, endHour);
      }
    });

    // Gerar slots baseados no intervalo configurado
    const slots: string[] = [];
    
    // Se o horário mais tarde é menor que o mais cedo, significa que atravessa a madrugada
    if (latestHour < earliestHour) {
      // Gerar slots de 00:00 até latestHour
      for (let hour = 0; hour <= latestHour; hour++) {
        if (interval === 30) {
          // Para horários quebrados, gerar apenas horários de :30
          slots.push(`${hour.toString().padStart(2, '0')}:30`);
        } else {
          slots.push(`${hour.toString().padStart(2, '0')}:00`);
        }
      }
      // Gerar slots de earliestHour até 23:00
      for (let hour = earliestHour; hour <= 23; hour++) {
        if (interval === 30) {
          // Para horários quebrados, gerar apenas horários de :30
          slots.push(`${hour.toString().padStart(2, '0')}:30`);
        } else {
          slots.push(`${hour.toString().padStart(2, '0')}:00`);
        }
      }
    } else {
      // Funcionamento normal no mesmo dia
      // Se o horário mais tarde é 23h, incluir até 23:00
      const maxHour = latestHour === 23 ? 23 : latestHour;
      for (let hour = earliestHour; hour <= maxHour; hour++) {
        if (interval === 30) {
          // Para horários quebrados, gerar apenas horários de :30
          // Não adicionar :30 se for o último horário e for 23h
          if (hour < maxHour || (hour === maxHour && maxHour < 23)) {
            slots.push(`${hour.toString().padStart(2, '0')}:30`);
          }
        } else {
          slots.push(`${hour.toString().padStart(2, '0')}:00`);
        }
      }
    }

    return slots;
  }, [settings?.working_hours, settings?.time_format_interval]);

  // Obter horário de funcionamento para um dia específico
  const getDaySchedule = useCallback((date: Date) => {
    const dayOfWeek = date.getDay();
    const dayKey = dayMapping[dayOfWeek];
    
    if (!dayKey || !settings?.working_hours) {
      return null;
    }

    return settings.working_hours[dayKey];
  }, [settings?.working_hours, dayMapping]);

  // Verificar se um horário está bloqueado (indisponível)
  const isTimeSlotBlocked = useCallback((date: Date, timeSlot: string): boolean => {
    // Se o dia não está habilitado, está bloqueado
    if (!isDayEnabled(date)) {
      return true;
    }

    // Se o horário não está disponível, está bloqueado
    if (!isTimeSlotAvailable(date, timeSlot)) {
      return true;
    }

    // Horário das 12h - bloqueado todos os dias (almoço)
    const slotHour = parseInt(timeSlot.split(':')[0]);
    if (slotHour === 12) {
      return true;
    }

    // Verificar bloqueios manuais (seguindo o mesmo padrão do bloqueio do meio-dia)
    const dateString = format(date, 'yyyy-MM-dd');
    const blockadeKey = `${dateString}-${timeSlot}`;
    if (manualBlockades[blockadeKey]?.blocked) {
      return true;
    }

    return false;
  }, [isDayEnabled, isTimeSlotAvailable, manualBlockades]);

  // Obter o motivo do bloqueio de um horário
  const getBlockadeReason = useCallback((date: Date, timeSlot: string): string => {
    // Verificar bloqueios manuais primeiro (para mostrar o motivo específico)
    const dateString = format(date, 'yyyy-MM-dd');
    const blockadeKey = `${dateString}-${timeSlot}`;
    if (manualBlockades[blockadeKey]?.blocked) {
      const blockadeInfo = manualBlockades[blockadeKey];
      if (blockadeInfo.reason) {
        return blockadeInfo.reason; // Mostrar apenas o motivo do bloqueio manual
      }
    }

    // Para outros tipos de bloqueio, mostrar apenas "BLOQUEADO"
    // Horário das 12h - bloqueado todos os dias (almoço)
    const slotHour = parseInt(timeSlot.split(':')[0]);
    if (slotHour === 12) {
      return 'BLOQUEADO';
    }

    // Se o dia não está habilitado
    if (!isDayEnabled(date)) {
      return 'BLOQUEADO';
    }

    // Se o horário não está disponível
    if (!isTimeSlotAvailable(date, timeSlot)) {
      return 'BLOQUEADO';
    }

    return 'Horário disponível';
  }, [isDayEnabled, isTimeSlotAvailable, manualBlockades]);

  // Obter cor de fundo para uma célula da agenda
  const getCellBackgroundColor = useCallback((date: Date, timeSlot: string, hasAppointment: boolean = false): string => {
    const isBlocked = isTimeSlotBlocked(date, timeSlot);
    
    if (isBlocked) {
      return 'bg-gray-300 cursor-not-allowed'; // Cinza para horários bloqueados
    }
    
    if (hasAppointment) {
      return 'bg-blue-50 border-blue-200'; // Azul para agendamentos
    }
    
    return 'bg-white hover:bg-muted/50'; // Branco para horários disponíveis
  }, [isTimeSlotBlocked]);

  // Verificar se um agendamento pode ser criado em um horário
  const canCreateAppointment = useCallback((date: Date, timeSlot: string): boolean => {
    return !isTimeSlotBlocked(date, timeSlot);
  }, [isTimeSlotBlocked]);

  // Obter horários disponíveis para um dia específico
  const getAvailableHoursForDay = useCallback((date: Date): string[] => {
    if (!isDayEnabled(date)) {
      return [];
    }

    const daySchedule = getDaySchedule(date);
    if (!daySchedule) {
      return [];
    }

    const interval = settings?.time_format_interval || 60; // Default to 60 minutes
    const startHour = parseInt((daySchedule as any).start.split(':')[0]);
    const startMinutes = parseInt((daySchedule as any).start.split(':')[1] || '0');
    const startTimeInMinutes = startHour * 60 + startMinutes;

    let endHour = parseInt((daySchedule as any).end.split(':')[0]);
    const endMinutes = parseInt((daySchedule as any).end.split(':')[1] || '0');
    let endTimeInMinutes = endHour * 60 + endMinutes;

    // Se end_time = 00:00, tratar como 23:59:59 (fim do dia)
    if (endHour === 0 && endMinutes === 0) {
      endTimeInMinutes = 23 * 60 + 59; // 23:59
    }

    const availableHours: string[] = [];
    
    // Verificar se o funcionamento atravessa a madrugada
    const crossesMidnight = endTimeInMinutes < startTimeInMinutes;
    
    if (crossesMidnight) {
      // Funcionamento atravessa a madrugada (ex: 18:00 - 02:00)
      // Gerar horários de startHour até 23:00
      for (let hour = startHour; hour <= 23; hour++) {
        if (hour !== 12) { // Excluir horário do almoço
          if (interval === 30) {
            // Para horários quebrados, gerar apenas horários de :30
            availableHours.push(`${hour.toString().padStart(2, '0')}:30`);
          } else {
            availableHours.push(`${hour.toString().padStart(2, '0')}:00`);
          }
        }
      }
      // Gerar horários de 00:00 até endHour
      for (let hour = 0; hour < endHour; hour++) {
        if (hour !== 12) { // Excluir horário do almoço
          if (interval === 30) {
            // Para horários quebrados, gerar apenas horários de :30
            availableHours.push(`${hour.toString().padStart(2, '0')}:30`);
          } else {
            availableHours.push(`${hour.toString().padStart(2, '0')}:00`);
          }
        }
      }
    } else {
      // Funcionamento normal no mesmo dia
      // Se endHour é 00:00 (convertido para 23:59), incluir até 23:00
      if (endHour === 0) {
        // Funcionamento termina às 00:00, então incluir até 23:00
        for (let hour = startHour; hour <= 23; hour++) {
          if (hour !== 12) { // Excluir horário do almoço
            if (interval === 30) {
              // Para horários quebrados, gerar apenas horários de :30
              // Não adicionar :30 se for 23h
              if (hour < 23) {
                availableHours.push(`${hour.toString().padStart(2, '0')}:30`);
              }
            } else {
              availableHours.push(`${hour.toString().padStart(2, '0')}:00`);
            }
          }
        }
      } else {
        // Funcionamento termina em outro horário
        for (let hour = startHour; hour < endHour; hour++) {
          if (hour !== 12) { // Excluir horário do almoço
            if (interval === 30) {
              // Para horários quebrados, gerar apenas horários de :30
              // Não adicionar :30 se for o último horário
              if (hour < endHour - 1) {
                availableHours.push(`${hour.toString().padStart(2, '0')}:30`);
              }
            } else {
              availableHours.push(`${hour.toString().padStart(2, '0')}:00`);
            }
          }
        }
      }
    }

    // Filtrar horários bloqueados manualmente
    const dateString = format(date, 'yyyy-MM-dd');
    const filteredHours = availableHours.filter(hour => {
      const blockadeKey = `${dateString}-${hour}`;
      return !manualBlockades[blockadeKey]?.blocked;
    });

    return filteredHours;
  }, [isDayEnabled, getDaySchedule, dayMapping, manualBlockades, settings?.time_format_interval]);

  // Função para gerar bloqueios recorrentes
  const generateRecurringBlockades = useCallback((
    startDate: Date,
    timeSlot: string,
    reason: string,
    recurrenceType: 'daily' | 'weekly' | 'monthly',
    endDate?: Date,
    isIndefinite?: boolean,
    description?: string
  ) => {
    const blockades: {[key: string]: any} = {};
    
    // Para bloqueios recorrentes, SEMPRE usar a data selecionada pelo usuário
    // Não alterar a data base - deixar o usuário escolher
    let effectiveStartDate = startDate;
    
    console.log('🔍 Usando data selecionada pelo usuário:', format(startDate, 'yyyy-MM-dd'));
    console.log('🔍 Data atual:', format(new Date(), 'yyyy-MM-dd'));
    
    // Incluir o bloqueio inicial
    const startDateString = format(effectiveStartDate, 'yyyy-MM-dd');
    const startBlockadeKey = `${startDateString}-${timeSlot}`;
    blockades[startBlockadeKey] = {
      blocked: true,
      reason,
      description,
      isRecurring: true,
      endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
      isIndefinite,
      recurrenceType,
      originalDate: startDateString
    };

    // Se não for indefinido e não tiver data limite, usar limite padrão
    let effectiveEndDate = endDate;
    if (!isIndefinite && !endDate) {
      effectiveEndDate = new Date(effectiveStartDate);
      effectiveEndDate.setDate(effectiveEndDate.getDate() + 365); // Limite de 1 ano
    }

    // Calcular número máximo de repetições baseado no tipo de recorrência
    let maxRepetitions: number;
    if (isIndefinite) {
      maxRepetitions = 52; // Limite de 1 ano para recorrências indefinidas
    } else if (effectiveEndDate) {
      switch (recurrenceType) {
        case 'daily':
          maxRepetitions = Math.ceil((effectiveEndDate.getTime() - effectiveStartDate.getTime()) / (1000 * 60 * 60 * 24));
          break;
        case 'weekly':
          maxRepetitions = Math.ceil((effectiveEndDate.getTime() - effectiveStartDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
          break;
        case 'monthly':
          maxRepetitions = Math.ceil((effectiveEndDate.getTime() - effectiveStartDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
          break;
        default:
          maxRepetitions = 30;
      }
    } else {
      maxRepetitions = 30; // Limite padrão
    }
    
    let currentDate = new Date(effectiveStartDate);
    let repetitionsAdded = 0;
    
    console.log('🔍 Gerando bloqueios recorrentes a partir de:', format(effectiveStartDate, 'yyyy-MM-dd'));
    console.log('🔍 Tipo de recorrência:', recurrenceType);
    console.log('🔍 Data limite:', effectiveEndDate ? format(effectiveEndDate, 'yyyy-MM-dd') : 'Indefinido');
    console.log('🔍 Máximo de repetições:', maxRepetitions);
    
    while (repetitionsAdded < maxRepetitions) {
      let nextDate: Date;
      
      switch (recurrenceType) {
        case 'daily':
          nextDate = new Date(currentDate);
          nextDate.setDate(currentDate.getDate() + 1);
          break;
        case 'weekly':
          nextDate = new Date(currentDate);
          nextDate.setDate(currentDate.getDate() + 7);
          break;
        case 'monthly':
          nextDate = new Date(currentDate);
          nextDate.setMonth(currentDate.getMonth() + 1);
          break;
        default:
          nextDate = new Date(currentDate);
          nextDate.setDate(currentDate.getDate() + 7);
      }
      
      currentDate = nextDate;
      repetitionsAdded++;
      
      // Verificar se passou da data limite
      if (effectiveEndDate && currentDate > effectiveEndDate) {
        break;
      }
      
      const dateString = format(currentDate, 'yyyy-MM-dd');
      const blockadeKey = `${dateString}-${timeSlot}`;
      
      blockades[blockadeKey] = {
        blocked: true,
        reason,
        description,
        isRecurring: true,
        endDate: effectiveEndDate ? format(effectiveEndDate, 'yyyy-MM-dd') : undefined,
        isIndefinite,
        recurrenceType,
        originalDate: startDateString
      };
    }
    
    console.log('🔍 Total de bloqueios gerados:', Object.keys(blockades).length);
    console.log('🔍 Primeiro bloqueio:', Object.keys(blockades)[0]);
    console.log('🔍 Último bloqueio:', Object.keys(blockades)[Object.keys(blockades).length - 1]);
    
    return blockades;
  }, []);

  // Função para bloquear um horário manualmente
  const blockTimeSlot = useCallback(async (
    date: Date, 
    timeSlot: string, 
    reason: string,
    options?: {
      description?: string;
      isRecurring?: boolean;
      endDate?: Date;
      isIndefinite?: boolean;
      recurrenceType?: 'daily' | 'weekly' | 'monthly';
    }
  ) => {
    if (!user?.id) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive"
      });
      return;
    }

    try {
      if (options?.isRecurring && options?.recurrenceType) {
        // Gerar bloqueios recorrentes
        const recurringBlockades = generateRecurringBlockades(
          date,
          timeSlot,
          reason,
          options.recurrenceType,
          options.endDate,
          options.isIndefinite,
          options.description
        );

        console.log('🔍 Bloqueios recorrentes gerados:', recurringBlockades);

        // ATUALIZAR ESTADO LOCAL IMEDIATAMENTE para feedback visual instantâneo
        setManualBlockades(prev => {
          const newBlockades = { ...prev };
          Object.entries(recurringBlockades).forEach(([key, blockade]) => {
            newBlockades[key] = {
              ...blockade,
              isRecurring: true,
              recurrenceType: options.recurrenceType,
              endDate: options.endDate ? format(options.endDate, 'yyyy-MM-dd') : undefined,
              isIndefinite: options.isIndefinite
            };
          });
          return newBlockades;
        });

        // Salvar todos os bloqueios recorrentes no banco de dados
        const blockadeData = Object.entries(recurringBlockades).map(([key, blockade]) => {
          const parts = key.split('-');
          const dateStr = `${parts[0]}-${parts[1]}-${parts[2]}`;
          const blockadeInfo = blockade as any;
          
          return {
            user_id: user.id,
            date: dateStr,
            time_slot: `${timeSlot}:00`, // Adicionar segundos para formato TIME
            reason: blockadeInfo.reason,
            description: blockadeInfo.description || null,
            is_recurring: blockadeInfo.isRecurring || false,
            recurrence_type: blockadeInfo.recurrenceType || null,
            original_date: blockadeInfo.originalDate || null,
            end_date: blockadeInfo.endDate || null,
            is_indefinite: blockadeInfo.isIndefinite || false
          };
        });

        // Inserir todos os bloqueios de uma vez
        const { error } = await (supabase as any)
          .from('time_blockades')
          .insert(blockadeData);

        if (error) {
          console.error('❌ Erro ao salvar bloqueios recorrentes:', error);
          throw error;
        }

        const insertedCount = blockadeData.length;
        const skippedCount = 0;

        let message = `${insertedCount} horários foram bloqueados recorrentemente!`;
        if (skippedCount > 0) {
          message += ` (${skippedCount} já existiam e foram pulados)`;
        }

        toast({
          title: "Sucesso",
          description: message,
        });
      } else {
        // Bloqueio único
        const dateString = format(date, 'yyyy-MM-dd');
        const blockadeKey = `${dateString}-${timeSlot}`;
        
        // ATUALIZAR ESTADO LOCAL IMEDIATAMENTE para feedback visual instantâneo
        setManualBlockades(prev => {
          const newBlockades = { ...prev };
          newBlockades[blockadeKey] = {
            blocked: true,
            reason,
            description: options?.description,
            isRecurring: false
          };
          return newBlockades;
        });

        // Salvar no banco de dados
        const { error } = await (supabase as any)
          .from('time_blockades')
          .insert({
            user_id: user.id,
            date: dateString,
            time_slot: `${timeSlot}:00`, // Adicionar segundos para formato TIME
            reason: reason,
            description: options?.description || null,
            is_recurring: false,
            recurrence_type: null,
            original_date: null,
            end_date: null,
            is_indefinite: false
          });

        if (error) {
          // Se falhou no banco, reverter o estado local
          setManualBlockades(prev => {
            const newBlockades = { ...prev };
            delete newBlockades[blockadeKey];
            return newBlockades;
          });

          console.error('Erro ao salvar bloqueio:', error);
          toast({
            title: "Erro",
            description: "Erro ao salvar bloqueio no banco de dados",
            variant: "destructive"
          });
          return;
        }

        toast({
          title: "Sucesso",
          description: "Horário bloqueado com sucesso!",
        });
      }
    } catch (error) {
      console.error('Erro ao bloquear horário:', error);
      toast({
        title: "Erro",
        description: "Erro ao bloquear horário",
        variant: "destructive"
      });
    }
  }, [user?.id, toast, generateRecurringBlockades]);

  // Função para desbloquear um horário manualmente
  const unblockTimeSlot = useCallback(async (date: Date, timeSlot: string, removeAllFollowing: boolean = false) => {
    if (!user?.id) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive"
      });
      return;
    }

    const dateString = format(date, 'yyyy-MM-dd');
    const blockadeKey = `${dateString}-${timeSlot}`;
    
    try {
      if (removeAllFollowing) {
        // Desbloquear toda a recorrência
        console.log('🔍 Desbloqueando toda a recorrência para:', timeSlot);
        
        // Primeiro, buscar o bloqueio original para identificar a recorrência
        const { data: originalBlockade, error: originalError } = await (supabase as any)
          .from('time_blockades')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', dateString)
          .eq('time_slot', timeSlot)
          .single();
        
        if (originalError || !originalBlockade) {
          console.error('Erro ao buscar bloqueio original:', originalError);
          toast({
            title: "Erro",
            description: "Erro ao identificar bloqueio original",
            variant: "destructive"
          });
          return;
        }
        
        // Buscar todos os bloqueios com o mesmo horário para análise
        const { data: allBlockades, error: fetchError } = await (supabase as any)
          .from('time_blockades')
          .select('*')
          .eq('user_id', user.id)
          .eq('time_slot', timeSlot)
          .gte('date', dateString); // A partir da data selecionada
        
        if (fetchError) {
          console.error('Erro ao buscar bloqueios para remoção:', fetchError);
          toast({
            title: "Erro",
            description: "Erro ao buscar bloqueios para remoção",
            variant: "destructive"
          });
          return;
        }
        
        if (!allBlockades || allBlockades.length === 0) {
          toast({
            title: "Aviso",
            description: "Nenhum bloqueio recorrente encontrado para remover",
            variant: "default"
          });
          return;
        }
        
        // Identificar quais bloqueios pertencem à mesma recorrência
        const blockadesToRemove = allBlockades.filter(blockade => {
          console.log('🔍 Analisando bloqueio:', {
            date: blockade.date,
            time_slot: blockade.time_slot,
            is_recurring: blockade.is_recurring,
            recurrence_type: blockade.recurrence_type,
            original_date: blockade.original_date,
            blockadeDayOfWeek: new Date(blockade.date).getDay(),
            blockadeDayName: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][new Date(blockade.date).getDay()]
          });
          
          // Usar dados do banco de dados para identificar recorrência
          if (blockade.is_recurring && blockade.original_date && blockade.recurrence_type) {
            const originalDate = blockade.original_date;
            const recurrenceType = blockade.recurrence_type;
            
            console.log('🔍 Bloqueio é recorrente:', {
              originalDate,
              recurrenceType,
              selectedDate: dateString,
              selectedDayOfWeek: new Date(dateString).getDay(),
              selectedDayName: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][new Date(dateString).getDay()]
            });
            
            // Verificar se pertence à mesma recorrência baseado no tipo
            switch (recurrenceType) {
              case 'daily':
                // Para diário, remover todos a partir da data original
                const dailyResult = blockade.date >= originalDate;
                console.log('🔍 Diário - Resultado:', dailyResult);
                return dailyResult;
              case 'weekly':
                // Para semanal, remover apenas os do mesmo dia da semana
                const originalDayOfWeek = new Date(originalDate).getDay();
                const blockadeDayOfWeek = new Date(blockade.date).getDay();
                const selectedDayOfWeek = new Date(dateString).getDay();
                
                // CORREÇÃO: Verificar se é da mesma recorrência E do mesmo dia da semana
                const weeklyResult = blockade.original_date === originalDate && 
                                   blockadeDayOfWeek === selectedDayOfWeek;
                
                console.log('🔍 Semanal - Comparação CORRIGIDA:', {
                  blockadeOriginalDate: blockade.original_date,
                  selectedOriginalDate: originalDate,
                  blockadeDate: blockade.date,
                  selectedDate: dateString,
                  originalDayOfWeek,
                  blockadeDayOfWeek,
                  selectedDayOfWeek,
                  sameOriginalDate: blockade.original_date === originalDate,
                  sameDayOfWeek: blockadeDayOfWeek === selectedDayOfWeek,
                  result: weeklyResult
                });
                return weeklyResult;
              case 'monthly':
                // Para mensal, remover apenas os do mesmo dia do mês
                const originalDayOfMonth = new Date(originalDate).getDate();
                const blockadeDayOfMonth = new Date(blockade.date).getDate();
                const selectedDayOfMonth = new Date(dateString).getDate();
                
                // CORREÇÃO: Verificar se é da mesma recorrência E do mesmo dia do mês
                const monthlyResult = blockade.original_date === originalDate && 
                                    blockadeDayOfMonth === selectedDayOfMonth;
                
                console.log('🔍 Mensal - Comparação CORRIGIDA:', {
                  blockadeOriginalDate: blockade.original_date,
                  selectedOriginalDate: originalDate,
                  blockadeDate: blockade.date,
                  selectedDate: dateString,
                  originalDayOfMonth,
                  blockadeDayOfMonth,
                  selectedDayOfMonth,
                  sameOriginalDate: blockade.original_date === originalDate,
                  sameDayOfMonth: blockadeDayOfMonth === selectedDayOfMonth,
                  result: monthlyResult
                });
                return monthlyResult;
              default:
                console.log('🔍 Tipo de recorrência desconhecido:', recurrenceType);
                return false;
            }
          } else {
            // Para bloqueios sem dados de recorrência, usar lógica mais conservadora
            // Apenas remover se for exatamente a mesma data e horário
            const exactMatch = blockade.date === dateString;
            console.log('🔍 Bloqueio não recorrente - Comparação exata:', {
              blockadeDate: blockade.date,
              selectedDate: dateString,
              result: exactMatch
            });
            return exactMatch;
          }
        });
        
        console.log('🔍 Bloqueios identificados para remoção:', blockadesToRemove.length);
        console.log('🔍 Datas dos bloqueios:', blockadesToRemove.map(b => b.date));
        console.log('🔍 Detalhes dos bloqueios para remoção:', blockadesToRemove.map(b => ({
          date: b.date,
          time_slot: b.time_slot,
          is_recurring: b.is_recurring,
          recurrence_type: b.recurrence_type,
          original_date: b.original_date,
          dayOfWeek: new Date(b.date).getDay()
        })));
        console.log('🔍 Data selecionada para exclusão:', dateString);
        console.log('🔍 Dia da semana selecionado:', new Date(dateString).getDay());
        
        // Verificar se há muitos bloqueios para remover (limite de segurança)
        if (blockadesToRemove.length > 100) {
          console.warn('⚠️ Muitos bloqueios para remover:', blockadesToRemove.length);
          toast({
            title: "Aviso",
            description: `Muitos bloqueios encontrados (${blockadesToRemove.length}). Removendo apenas os primeiros 100.`,
            variant: "default"
          });
          // Limitar a 100 bloqueios para evitar erro 400
          blockadesToRemove.splice(100);
        }
        
        // ATUALIZAR ESTADO LOCAL IMEDIATAMENTE para feedback visual instantâneo
        setManualBlockades(prev => {
          const newBlockades = { ...prev };
          // Remover apenas os bloqueios identificados como parte da recorrência
          blockadesToRemove.forEach(blockade => {
            const blockadeKey = `${blockade.date}-${blockade.time_slot}`;
            delete newBlockades[blockadeKey];
          });
          return newBlockades;
        });
        
        if (blockadesToRemove.length > 0) {
          // Remover os bloqueios identificados do banco de dados
          const blockadeIds = blockadesToRemove.map(b => b.id);
          const { error: deleteError } = await (supabase as any)
            .from('time_blockades')
            .delete()
            .in('id', blockadeIds);
          
          if (deleteError) {
            // Se falhou na remoção, reverter o estado local
            await loadBlockadesFromDatabase();
            console.error('Erro ao remover bloqueios recorrentes:', deleteError);
            toast({
              title: "Erro",
              description: "Erro ao remover bloqueios recorrentes",
              variant: "destructive"
            });
            return;
          }
          
          toast({
            title: "Sucesso",
            description: `${blockadesToRemove.length} bloqueios da recorrência foram removidos!`,
          });
        } else {
          toast({
            title: "Aviso",
            description: "Nenhum bloqueio da recorrência encontrado para remover",
            variant: "default"
          });
        }
      } else {
        // Desbloquear apenas o horário específico
        // ATUALIZAR ESTADO LOCAL IMEDIATAMENTE para feedback visual instantâneo
        setManualBlockades(prev => {
          const newBlockades = { ...prev };
          delete newBlockades[blockadeKey];
          return newBlockades;
        });

        const { error } = await (supabase as any)
          .from('time_blockades')
          .delete()
          .eq('user_id', user.id)
          .eq('date', dateString)
          .eq('time_slot', timeSlot);

        if (error) {
          // Se falhou no banco, reverter o estado local
          await loadBlockadesFromDatabase();
          console.error('Erro ao remover bloqueio:', error);
          toast({
            title: "Erro",
            description: "Erro ao remover bloqueio do banco de dados",
            variant: "destructive"
          });
          return;
        }

        toast({
          title: "Sucesso",
          description: "Horário desbloqueado com sucesso!",
        });
      }

    } catch (error) {
      // Em caso de erro, recarregar o estado do banco para garantir consistência
      await loadBlockadesFromDatabase();
      console.error('Erro ao desbloquear horário:', error);
      toast({
        title: "Erro",
        description: "Erro ao desbloquear horário",
        variant: "destructive"
      });
    }
  }, [user?.id, toast, loadBlockadesFromDatabase, manualBlockades]);

  // Função para obter o motivo específico do bloqueio manual
  const getManualBlockadeReason = useCallback((date: Date, timeSlot: string): string | null => {
    const dateString = format(date, 'yyyy-MM-dd');
    const blockadeKey = `${dateString}-${timeSlot}`;
    return manualBlockades[blockadeKey]?.reason || null;
  }, [manualBlockades]);

  // Função para verificar se um bloqueio é recorrente (versão síncrona para UI)
  const isRecurringBlockade = useCallback((date: Date, timeSlot: string): boolean => {
    const dateString = format(date, 'yyyy-MM-dd');
    const blockadeKey = `${dateString}-${timeSlot}`;
    
    // Verificar se existe um bloqueio neste horário
    const blockade = manualBlockades[blockadeKey];
    if (!blockade) return false;
    
    // Verificar se é recorrente baseado no estado local
    // Se temos múltiplos bloqueios com o mesmo horário, é recorrente
    const allBlockadesForTimeSlot = Object.entries(manualBlockades).filter(([key, value]) => {
      const [blockadeDate, blockadeTime] = key.split('-');
      return blockadeTime === timeSlot && value.blocked;
    });
    
    console.log('🔍 Verificando recorrência para:', timeSlot, 'encontrados:', allBlockadesForTimeSlot.length, 'bloqueios no estado local');
    
    // Se há mais de 1 bloqueio com o mesmo horário, é recorrente
    return allBlockadesForTimeSlot.length > 1;
  }, [manualBlockades]);

  // Função para verificar se um bloqueio é recorrente baseado no banco de dados
  const isRecurringBlockadeFromDB = useCallback(async (date: Date, timeSlot: string): Promise<boolean> => {
    if (!user?.id) return false;
    
    try {
      // Buscar no banco de dados todos os bloqueios com o mesmo horário
      const { data: allBlockades, error } = await (supabase as any)
        .from('time_blockades')
        .select('date')
        .eq('user_id', user.id)
        .eq('time_slot', timeSlot);
      
      if (error) {
        console.error('Erro ao verificar recorrência no banco:', error);
        return false;
      }
      
      console.log('🔍 Verificando recorrência no banco para:', timeSlot, 'encontrados:', allBlockades?.length || 0, 'bloqueios');
      
      // Se há mais de 1 bloqueio com o mesmo horário, é recorrente
      return (allBlockades?.length || 0) > 1;
    } catch (error) {
      console.error('Erro ao verificar recorrência no banco:', error);
      return false;
    }
  }, [user?.id]);

  // Função para obter informações completas do bloqueio
  const getBlockadeInfo = useCallback((date: Date, timeSlot: string) => {
    const dateString = format(date, 'yyyy-MM-dd');
    const blockadeKey = `${dateString}-${timeSlot}`;
    return manualBlockades[blockadeKey] || null;
  }, [manualBlockades]);

  // Função para forçar atualização do estado (útil para sincronização manual)
  const refreshBlockades = useCallback(async () => {
    await loadBlockadesFromDatabase();
  }, [loadBlockadesFromDatabase]);

  return {
    // Estados
    workingHours: settings?.working_hours,
    manualBlockades, // Expor o estado para debugging
    
    // Funções de verificação
    isDayEnabled,
    isTimeSlotAvailable,
    isTimeSlotBlocked,
    canCreateAppointment,
    
    // Funções de geração
    generateTimeSlots,
    getAvailableHoursForDay,
    
    // Funções de UI
    getCellBackgroundColor,
    getDaySchedule,
    
    // Funções de bloqueio manual
    blockTimeSlot,
    unblockTimeSlot,
    getBlockadeReason,
    isRecurringBlockade,
    isRecurringBlockadeFromDB,
    getBlockadeInfo,
    
    // Funções de sincronização
    refreshBlockades,
    
    // Utilitários
    dayMapping
  };
};
