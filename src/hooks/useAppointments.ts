import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface AppointmentWithModality {
  id: string;
  client_id: string;
  court_id: string | null;
  date: string;
  end_time: string;
  status: 'a_cobrar' | 'pago' | 'cancelado' | 'agendado';
  modality: string | null;
  modality_id: string | null;
  valor_total: number;
  recurrence_id: string | null;
  user_id: string;
  booking_source: 'manual' | 'online';
  payment_status?: 'not_required' | 'pending' | 'failed';
  is_cortesia?: boolean;
  created_at: string;
  client?: {
    name: string;
    phone?: string;
  };
  modality_info?: {
    name: string;
    valor: number;
  };
}

export interface CreateAppointmentData {
  client_id: string;
  date: string;
  end_time: string;
  modality_id: string;
  court_id?: string | null;
  status?: 'a_cobrar' | 'pago' | 'cancelado' | 'agendado';
  recurrence_id?: string;
  booking_source?: 'manual' | 'online';
  is_cortesia?: boolean;
  customValue?: number | null;
}

export interface UpdateAppointmentData {
  client_id?: string;
  date?: string;
  end_time?: string;
  modality_id?: string;
  status?: 'a_cobrar' | 'pago' | 'cancelado' | 'agendado';
  valor_total?: number;
}

// Cache compartilhado para clientes e modalidades
const clientsCache = new Map<string, Map<string, any>>();
const modalitiesCache = new Map<string, Map<string, any>>();

export interface UseAppointmentsOptions {
  courtId?: string | null; // Se fornecido, filtra por quadra específica
}

export const useAppointments = (options?: UseAppointmentsOptions) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const { courtId } = options || {};

  // Função otimizada para buscar dados relacionados
  const fetchRelatedData = useCallback(async (appointments: any[]) => {
    if (!appointments.length) return { clientsMap: new Map(), modalitiesMap: new Map() };

    const uniqueClientIds = [...new Set(appointments.map(apt => apt.client_id).filter(Boolean))];
    const uniqueModalityIds = [...new Set(appointments.map(apt => apt.modality_id).filter(Boolean))];

    // Verificar cache primeiro
    const userId = user?.id || '';
    const cachedClients = clientsCache.get(userId);
    const cachedModalities = modalitiesCache.get(userId);

    // Filtrar IDs que não estão no cache
    const missingClientIds = uniqueClientIds.filter(id => !cachedClients?.has(id));
    const missingModalityIds = uniqueModalityIds.filter(id => !cachedModalities?.has(id));

    // Buscar dados em paralelo apenas para IDs que não estão no cache
    const [clientsResponse, modalitiesResponse] = await Promise.all([
      missingClientIds.length > 0 
        ? supabase.from('booking_clients').select('id, name, phone').in('id', missingClientIds).eq('user_id', userId)
        : Promise.resolve({ data: null, error: null }),
      missingModalityIds.length > 0 
        ? supabase.from('modalities').select('id, name, valor').in('id', missingModalityIds).eq('user_id', userId)
        : Promise.resolve({ data: null, error: null })
    ]);

    // Atualizar cache
    const newClientsMap = new Map(cachedClients || []);
    const newModalitiesMap = new Map(cachedModalities || []);

    if (clientsResponse.data) {
      clientsResponse.data.forEach(client => newClientsMap.set(client.id, client));
    }
    if (modalitiesResponse.data) {
      modalitiesResponse.data.forEach(modality => newModalitiesMap.set(modality.id, modality));
    }

    // Salvar no cache compartilhado
    clientsCache.set(userId, newClientsMap);
    modalitiesCache.set(userId, newModalitiesMap);

    return { clientsMap: newClientsMap, modalitiesMap: newModalitiesMap };
  }, [user?.id]);

  // Garantir que o queryKey sempre tenha um valor consistente
  const queryKeyCourtId = courtId ?? 'all';
  
  // Escutar evento de mudança de quadra e mudanças no courtId para forçar refetch
  useEffect(() => {
    if (!user?.id) return;
    
    const handleCourtChange = async (event: CustomEvent) => {
      const { courtId: newCourtId } = event.detail;
      const newQueryKeyCourtId = newCourtId ?? 'all';
      
      console.log('🔄 useAppointments - Evento courtChanged recebido, newCourtId:', newCourtId, 'newQueryKeyCourtId:', newQueryKeyCourtId);
      
      // Remover TODAS as queries de appointments do cache completamente
      queryClient.removeQueries({ 
        queryKey: ['appointments'],
        exact: false 
      });
      
      // Aguardar um pouco para garantir que o cache foi limpo
      setTimeout(() => {
        // Forçar refetch com a nova query key
        queryClient.refetchQueries({ 
          queryKey: ['appointments', user.id, newQueryKeyCourtId],
          exact: true 
        });
      }, 50);
    };

    window.addEventListener('courtChanged', handleCourtChange as EventListener);
    
    return () => {
      window.removeEventListener('courtChanged', handleCourtChange as EventListener);
    };
  }, [user?.id, queryClient]);
  
  // Forçar refetch quando courtId mudar - React Query deve detectar automaticamente pela query key
  useEffect(() => {
    if (!user?.id) return;
    
    console.log('🔄 useAppointments - courtId mudou para:', courtId, 'queryKeyCourtId:', queryKeyCourtId);
    
    // Remover TODAS as queries de appointments do cache completamente
    queryClient.removeQueries({ 
      queryKey: ['appointments'],
      exact: false 
    });
    
    // Aguardar um pouco e então forçar refetch com a nova query key
    setTimeout(() => {
      queryClient.refetchQueries({ 
        queryKey: ['appointments', user.id, queryKeyCourtId],
        exact: true 
      });
    }, 50);
  }, [courtId, queryKeyCourtId, user?.id, queryClient]);
  
  // Query otimizada para buscar agendamentos
  const {
    data: appointments = [],
    isLoading: isQueryLoading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['appointments', user?.id, queryKeyCourtId],
    staleTime: 0, // Sempre considerar dados como stale para garantir atualização imediata quando a quadra mudar
    gcTime: 0, // Não manter cache - sempre buscar dados frescos quando a query key mudar
    refetchOnMount: 'always', // Sempre refazer quando montar
    refetchOnWindowFocus: false,
    enabled: !!user?.id, // Só executar se houver usuário
    refetchOnReconnect: false,
    queryFn: async ({ queryKey }): Promise<AppointmentWithModality[]> => {
      // Obter courtId atual da query key para evitar problemas de closure
      const currentCourtId = queryKey[2] === 'all' ? null : (queryKey[2] as string | null);
      const currentUserId = queryKey[1] as string;
      
      console.log('🔄 useAppointments - Executando queryFn');
      console.log('🔄 useAppointments - QueryKey completa:', queryKey);
      console.log('🔄 useAppointments - currentCourtId da queryKey:', currentCourtId);
      console.log('🔄 useAppointments - courtId do closure:', courtId);
      
      if (!currentUserId) {
        throw new Error('Usuário não autenticado');
      }

      // Buscar todos os agendamentos (Supabase tem limite padrão de 1000 linhas)
      // Implementar paginação para buscar todos os registros
      let allAppointments: any[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;
      let error: any = null;

      while (hasMore) {
        let query = supabase
          .from('appointments')
          .select('*')
          .eq('user_id', currentUserId);
        
        // Filtrar por quadra se especificado - USAR O VALOR DA QUERY KEY, NÃO DO CLOSURE
        // IMPORTANTE: Quando uma quadra específica está selecionada, mostrar APENAS agendamentos dessa quadra
        // Quando currentCourtId é null/undefined, não aplicar filtro de quadra (mostrar todos)
        if (currentCourtId) {
          console.log('🔍 useAppointments - Filtrando por quadra:', currentCourtId);
          query = query.eq('court_id', currentCourtId);
        } else {
          console.log('🔍 useAppointments - Sem filtro de quadra (mostrando todos)');
        }
        
        const { data: pageData, error: pageError } = await query
          .order('date', { ascending: false })
          .range(from, from + pageSize - 1);

        if (pageError) {
          console.error('❌ Erro ao buscar agendamentos:', pageError);
          error = pageError;
          break;
        }

        if (pageData && pageData.length > 0) {
          allAppointments = [...allAppointments, ...pageData];
          from += pageSize;
          // Se retornou menos que pageSize, não há mais dados
          hasMore = pageData.length === pageSize;
        } else {
          // Se não retornou dados, não há mais páginas
          hasMore = false;
        }
        
        // Proteção contra loop infinito (máximo 10 páginas = 10.000 registros)
        if (from >= pageSize * 10) {
          console.warn('⚠️ Limite de paginação atingido (10.000 registros)');
          hasMore = false;
        }
      }

      if (error) {
        throw error;
      }

      const data = allAppointments;

      // Buscar dados relacionados de forma otimizada
      const { clientsMap, modalitiesMap } = await fetchRelatedData(data || []);

      // Combinar dados de forma mais eficiente
      return (data || []).map((appointment) => {
        const clientData = appointment.client_id ? clientsMap.get(appointment.client_id) : null;
        const modalityData = appointment.modality_id ? modalitiesMap.get(appointment.modality_id) : null;

        return {
          ...appointment,
          client: clientData ? { name: clientData.name, phone: clientData.phone } : undefined,
          modality_info: modalityData ? {
            name: modalityData.name,
            valor: modalityData.valor
          } : undefined
        };
      });
    },
    enabled: !!user?.id,
  });

  // Query otimizada para buscar agendamentos por período
  const getAppointmentsByPeriod = useCallback(async (startDate: string, endDate: string, filterCourtId?: string | null) => {
    if (!user?.id) {
      throw new Error('Usuário não autenticado');
    }

    let query = supabase
      .from('appointments')
      .select('*')
      .eq('user_id', user.id);
    
    // Filtrar por quadra se especificado
    // IMPORTANTE: Quando uma quadra específica está selecionada, mostrar APENAS agendamentos dessa quadra
    if (filterCourtId) {
      query = query.eq('court_id', filterCourtId);
    }
    
    const { data, error } = await query
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date');

    if (error) {
      console.error('❌ Erro ao buscar agendamentos por período:', error);
      throw error;
    }

    // Usar a mesma função otimizada para buscar dados relacionados
    const { clientsMap, modalitiesMap } = await fetchRelatedData(data || []);

    // Combinar dados de forma mais eficiente
    return (data || []).map((appointment) => {
      const clientData = appointment.client_id ? clientsMap.get(appointment.client_id) : null;
      const modalityData = appointment.modality_id ? modalitiesMap.get(appointment.modality_id) : null;

      return {
        ...appointment,
        client: clientData ? { name: clientData.name, phone: clientData.phone } : undefined,
        modality_info: modalityData ? {
          name: modalityData.name,
          valor: modalityData.valor
        } : undefined
      };
    });
  }, [user?.id, courtId, fetchRelatedData]);

  // Mutation otimizada para criar agendamento
  const createAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: CreateAppointmentData): Promise<AppointmentWithModality> => {
      if (!user?.id) {
        throw new Error('Usuário não autenticado');
      }

      // Buscar o valor da modalidade
      const { data: modalityData, error: modalityError } = await (supabase as any)
        .from('modalities')
        .select('valor')
        .eq('id', appointmentData.modality_id)
        .eq('user_id', user.id)
        .single();

      if (modalityError || !modalityData) {
        throw new Error('Modalidade não encontrada');
      }

      // Calcular valor proporcional baseado na duração
      let valorTotal = modalityData.valor;
      if (!appointmentData.is_cortesia && appointmentData.customValue === null) {
        const startTime = new Date(appointmentData.date);
        const endTime = new Date(appointmentData.end_time);
        const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
        
        // Se a duração for diferente de 60 minutos, calcular proporcional
        if (durationMinutes !== 60) {
          // Assumir que o valor da modalidade é por hora
          valorTotal = (modalityData.valor / 60) * durationMinutes;
        }
      }

      const insertData: any = {
        client_id: appointmentData.client_id,
        date: appointmentData.date,
        end_time: appointmentData.end_time,
        modality_id: appointmentData.modality_id,
        valor_total: appointmentData.is_cortesia ? 0 : (appointmentData.customValue !== null ? appointmentData.customValue : valorTotal),
        is_cortesia: appointmentData.is_cortesia || false,
        status: appointmentData.status || 'agendado',
        recurrence_id: appointmentData.recurrence_id,
        booking_source: appointmentData.booking_source || 'manual',
        user_id: user.id
      };

      // Adicionar court_id se fornecido
      // IMPORTANTE: Sempre associar agendamento à quadra selecionada
      if (appointmentData.court_id) {
        insertData.court_id = appointmentData.court_id;
        console.log('🔍 useAppointments - Criando agendamento com court_id do appointmentData:', appointmentData.court_id);
      } else if (courtId) {
        // Se não fornecido mas há courtId no contexto, usar ele
        insertData.court_id = courtId;
        console.log('🔍 useAppointments - Criando agendamento com court_id do contexto:', courtId);
      } else {
        console.warn('⚠️ useAppointments - Criando agendamento SEM court_id (será null)');
        insertData.court_id = null;
      }

      const { data, error } = await supabase
        .from('appointments')
        .insert(insertData)
        .select('*')
        .single();

      if (error) {
        console.error('❌ Erro ao criar agendamento:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (newAppointment) => {
      toast({
        title: 'Agendamento criado!',
        description: `Agendamento foi criado com sucesso.`,
      });
      
      // Atualizar cache diretamente
      queryClient.setQueryData(['appointments', user?.id], (oldData: AppointmentWithModality[] | undefined) => {
        if (!oldData) return [newAppointment];
        return [newAppointment, ...oldData];
      });
      
      // Invalidar queries relacionadas para garantir sincronização
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['clientBookings'] });
      queryClient.invalidateQueries({ queryKey: ['availableHours'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar agendamento',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mutation otimizada para atualizar agendamento
  const updateAppointmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateAppointmentData }): Promise<AppointmentWithModality> => {
      if (!user?.id) {
        throw new Error('Usuário não autenticado');
      }

      const updateData: any = { ...data };

      // Se a modalidade foi alterada, buscar o novo valor do cache se disponível
      if (data.modality_id) {
        const userId = user.id;
        const cachedModalities = modalitiesCache.get(userId);
        let modalityData = cachedModalities?.get(data.modality_id);

        if (!modalityData) {
          const { data: fetchedModality, error: modalityError } = await supabase
            .from('modalities')
            .select('valor')
            .eq('id', data.modality_id)
            .eq('user_id', user.id)
            .single();

          if (modalityError || !fetchedModality) {
            throw new Error('Modalidade não encontrada');
          }
          modalityData = fetchedModality;
        }

        updateData.valor_total = modalityData.valor;
      }

      const { data: updatedAppointment, error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select('*')
        .single();

      if (error) {
        console.error('❌ Erro ao atualizar agendamento:', error);
        throw error;
      }

      return updatedAppointment;
    },
    onSuccess: (updatedAppointment) => {
      toast({
        title: 'Agendamento atualizado!',
        description: `Agendamento foi atualizado com sucesso.`,
      });
      
      // Atualizar cache diretamente
      queryClient.setQueryData(['appointments', user?.id], (oldData: AppointmentWithModality[] | undefined) => {
        if (!oldData) return [updatedAppointment];
        return oldData.map(apt => apt.id === updatedAppointment.id ? updatedAppointment : apt);
      });
      
      // Invalidar queries relacionadas para garantir sincronização
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['clientBookings'] });
      queryClient.invalidateQueries({ queryKey: ['availableHours'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar agendamento',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mutation otimizada para deletar agendamento
  const deleteAppointmentMutation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (!user?.id) {
        throw new Error('Usuário não autenticado');
      }

      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('❌ Erro ao deletar agendamento:', error);
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      toast({
        title: 'Agendamento removido!',
        description: 'Agendamento foi removido com sucesso.',
      });
      
      // Remover do cache diretamente
      queryClient.setQueryData(['appointments', user?.id], (oldData: AppointmentWithModality[] | undefined) => {
        if (!oldData) return [];
        return oldData.filter(apt => apt.id !== variables);
      });
      
      // Invalidar queries relacionadas para garantir sincronização
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['clientBookings'] });
      queryClient.invalidateQueries({ queryKey: ['availableHours'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao remover agendamento',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Funções de conveniência otimizadas
  const createAppointment = useCallback(async (data: CreateAppointmentData) => {
    setIsLoading(true);
    try {
      await createAppointmentMutation.mutateAsync(data);
    } finally {
      setIsLoading(false);
    }
  }, [createAppointmentMutation]);

  const updateAppointment = useCallback(async (id: string, data: UpdateAppointmentData) => {
    setIsLoading(true);
    try {
      await updateAppointmentMutation.mutateAsync({ id, data });
    } finally {
      setIsLoading(false);
    }
  }, [updateAppointmentMutation]);

  const deleteAppointment = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      await deleteAppointmentMutation.mutateAsync(id);
    } finally {
      setIsLoading(false);
    }
  }, [deleteAppointmentMutation]);

  // Função otimizada para cálculos financeiros
  const getFinancialSummary = useCallback((appointments: AppointmentWithModality[]) => {
    return appointments.reduce((summary, appointment) => {
      const valor = appointment.valor_total || 0;

      switch (appointment.status) {
        case 'pago':
          summary.total_recebido += valor;
          summary.agendamentos_pagos += 1;
          break;
        case 'a_cobrar':
          summary.total_pendente += valor;
          summary.agendamentos_pendentes += 1;
          break;
        case 'agendado':
          summary.total_agendado += valor;
          summary.agendamentos_agendados += 1;
          break;
        case 'cancelado':
          summary.total_cancelado += valor;
          summary.agendamentos_cancelados += 1;
          break;
      }

      return summary;
    }, {
      total_recebido: 0,
      total_pendente: 0,
      total_agendado: 0,
      total_cancelado: 0,
      agendamentos_pagos: 0,
      agendamentos_pendentes: 0,
      agendamentos_agendados: 0,
      agendamentos_cancelados: 0,
    });
  }, []);

  // Memoizar o resumo financeiro para evitar recálculos desnecessários
  const financialSummary = useMemo(() => {
    return getFinancialSummary(appointments);
  }, [appointments, getFinancialSummary]);

  return {
    // Data
    appointments,
    financialSummary,
    
    // Loading states
    isLoading: isLoading || isQueryLoading,
    isCreating: createAppointmentMutation.isPending,
    isUpdating: updateAppointmentMutation.isPending,
    isDeleting: deleteAppointmentMutation.isPending,
    
    // Error states
    error: queryError,
    
    // Actions
    createAppointment,
    updateAppointment,
    deleteAppointment,
    getAppointmentsByPeriod,
    getFinancialSummary,
    refetch,
  };
};
