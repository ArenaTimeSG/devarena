import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface AppointmentWithModality {
  id: string;
  client_id: string;
  date: string;
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
  modality_id: string;
  status?: 'a_cobrar' | 'pago' | 'cancelado' | 'agendado';
  recurrence_id?: string;
  booking_source?: 'manual' | 'online';
  is_cortesia?: boolean;
  customValue?: number | null;
}

export interface UpdateAppointmentData {
  client_id?: string;
  date?: string;
  modality_id?: string;
  status?: 'a_cobrar' | 'pago' | 'cancelado' | 'agendado';
  valor_total?: number;
}

// Cache compartilhado para clientes e modalidades
const clientsCache = new Map<string, Map<string, any>>();
const modalitiesCache = new Map<string, Map<string, any>>();

export const useAppointments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

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

  // Query otimizada para buscar agendamentos
  const {
    data: appointments = [],
    isLoading: isQueryLoading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['appointments', user?.id],
    staleTime: 1000 * 60, // 1 minuto (aumentado para reduzir requisições)
    gcTime: 1000 * 60 * 5, // 5 minutos de cache (aumentado)
    queryFn: async (): Promise<AppointmentWithModality[]> => {
      if (!user?.id) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) {
        console.error('❌ Erro ao buscar agendamentos:', error);
        throw error;
      }



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
  const getAppointmentsByPeriod = useCallback(async (startDate: string, endDate: string) => {
    if (!user?.id) {
      throw new Error('Usuário não autenticado');
    }

    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('user_id', user.id)
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
  }, [user?.id, fetchRelatedData]);

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

      const { data, error } = await supabase
        .from('appointments')
        .insert({
          client_id: appointmentData.client_id,
          date: appointmentData.date,
          modality_id: appointmentData.modality_id,
          valor_total: appointmentData.is_cortesia ? 0 : (appointmentData.customValue !== null ? appointmentData.customValue : modalityData.valor),
          is_cortesia: appointmentData.is_cortesia || false,
          status: appointmentData.status || 'agendado',
          recurrence_id: appointmentData.recurrence_id,
          booking_source: appointmentData.booking_source || 'manual',
          user_id: user.id
        })
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
