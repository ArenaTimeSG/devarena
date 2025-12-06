import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Interface para agendamentos de clientes (usando a tabela appointments)
export interface ClientBooking {
  id: string;
  user_id: string; // agenda_id do admin
  client_id: string;
  date: string;
  status: 'a_cobrar' | 'pago' | 'cancelado' | 'agendado';
  modality: string;
  valor_total: number;
  payment_status?: 'not_required' | 'pending' | 'failed';
  created_at: string;
  booking_clients?: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
}

export interface CreateClientBookingData {
  user_id: string; // agenda_id do admin
  client_id?: string; // Opcional - será criado automaticamente se não fornecido
  client_data?: { // Dados do cliente para criação automática
    name: string;
    email: string;
    phone?: string;
  };
  date: string;
  modality: string;
  valor_total: number;
  payment_policy?: 'sem_pagamento' | 'opcional';
}

export interface UpdateClientBookingData {
  status?: 'a_cobrar' | 'pago' | 'cancelado' | 'agendado';
  modality?: string;
  valor_total?: number;
}

export const useClientBookings = (adminUserId?: string) => {
  const queryClient = useQueryClient();

  const { data: agendamentos = [], isLoading, error } = useQuery({
    queryKey: ['clientBookings', adminUserId],
    queryFn: async () => {
      if (!adminUserId) return [];

      // Buscar agendamentos primeiro (incluindo os sem cliente)
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', adminUserId)
        .order('date', { ascending: true });

      if (appointmentsError) {
        console.error('Erro ao buscar agendamentos:', appointmentsError);
        return [];
      }

      if (!appointments || appointments.length === 0) {
        return [];
      }

      // Buscar dados dos clientes separadamente (apenas para agendamentos com client_id)
      const clientIds = appointments.map(apt => apt.client_id).filter(Boolean);
      let clients = [];
      if (clientIds.length > 0) {
        const { data: clientsData, error: clientsError } = await supabase
          .from('booking_clients')
          .select('id, name, email, phone')
          .in('id', clientIds)
          .eq('user_id', adminUserId);

        if (clientsError) {
          console.error('Erro ao buscar clientes:', clientsError);
          return [];
        }
        clients = clientsData || [];
      }

      // Combinar dados
      const data = appointments.map(appointment => {
        let clientData = null;
        
        if (appointment.client_id) {
          clientData = clients.find(client => client.id === appointment.client_id) || null;
        }
        
        // Se não há cliente ou dados do cliente, criar um objeto padrão
        if (!clientData) {
          clientData = {
            id: null,
            name: 'Cliente não identificado',
            email: 'N/A',
            phone: 'N/A'
          };
        }
        
        return {
          ...appointment,
          booking_clients: clientData
        };
      });

      return data || [];
    },
    enabled: !!adminUserId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false,
    retry: 1
  });

  const createBookingMutation = useMutation({
    mutationFn: async (data: CreateClientBookingData & { autoConfirmada?: boolean }) => {
      const { autoConfirmada, ...bookingData } = data;
      
      // Criar/encontrar cliente para agendamentos online
      let clientId = bookingData.client_id;
      
      if (!clientId && bookingData.client_data) {
        console.log('🔍 Processando cliente para agendamento online:', bookingData.client_data.email);
        
        // Buscar cliente existente primeiro - verificar por email E user_id
        const normalizedEmail = (bookingData.client_data.email || '').trim().toLowerCase();
        const { data: existingClient } = await supabase
          .from('booking_clients')
          .select('id, name, email, user_id')
          .eq('email', normalizedEmail)
          .eq('user_id', bookingData.user_id)
          .maybeSingle();

        console.log('🔍 useClientBookings: Buscando cliente existente:', {
          email: bookingData.client_data.email,
          user_id: bookingData.user_id,
          found: !!existingClient
        });

        if (existingClient) {
          clientId = existingClient.id;
          console.log('✅ Cliente existente encontrado:', { clientId, email: bookingData.client_data.email, user_id: bookingData.user_id });
         } else {
           // Cliente não existe nesta conta, criar novo
           console.log('🔍 Criando novo cliente para esta conta...', { 
             name: bookingData.client_data.name,
             email: normalizedEmail,
             phone: bookingData.client_data.phone,
             user_id: bookingData.user_id
           });
           
           const { data: newClient, error: clientError } = await supabase
             .from('booking_clients')
             .insert({
               name: bookingData.client_data.name,
               email: normalizedEmail,
               phone: bookingData.client_data.phone || null,
               // clientes de agenda não devem ter senha
               password_hash: null,
               user_id: bookingData.user_id
             })
             .select('id, name, email, user_id')
             .single();

           if (clientError) {
             console.error('❌ Erro ao criar cliente:', clientError);
             throw new Error('Erro ao criar cliente: ' + clientError.message);
           } else {
             clientId = newClient.id;
             console.log('✅ Cliente criado com sucesso:', { 
               clientId, 
               name: newClient.name,
               email: newClient.email,
               user_id: newClient.user_id
             });
           }
         }
      }
      
      if (!clientId) {
        throw new Error('ID do cliente é obrigatório');
      }
      
      // Verificar se já existe um agendamento neste horário (validação precisa por data+hora)
      try {
        // bookingData.date já deve estar no formato completo 'YYYY-MM-DDTHH:mm:ss'
        const fullDateTime = bookingData.date;

        // Verificar se já existe um agendamento exatamente neste horário
        const { data: existingAppointments, error: existingError } = await supabase
          .from('appointments')
          .select('id')
          .eq('user_id', bookingData.user_id)
          .eq('date', fullDateTime)
          .not('status', 'eq', 'cancelado');

        if (existingError) {
          console.error('❌ Erro ao verificar agendamentos existentes:', existingError);
          throw new Error('Erro ao verificar disponibilidade do horário');
        }

        if (existingAppointments && existingAppointments.length > 0) {
          console.error('❌ Horário já ocupado:', { date: fullDateTime });
          throw new Error('Este horário já está ocupado');
        }

      } catch (error) {
        console.error('❌ Validação de horário falhou:', error);
        throw error;
      }
      
      // Determinar payment_status e status baseado na política de pagamento
      let paymentStatus: 'not_required' | 'pending' | 'failed' = 'not_required';
      let appointmentStatus: 'a_cobrar' | 'agendado' = 'agendado'; // Padrão para agendamentos online
      
      console.log('🔍 useClientBookings: Determinando status do agendamento:', {
        payment_policy: bookingData.payment_policy,
        autoConfirmada: autoConfirmada,
        status_inicial: appointmentStatus
      });
      
      if (bookingData.payment_policy === 'opcional') {
        paymentStatus = 'not_required'; // Cliente pode escolher pagar depois
        // Para pagamento opcional, agendamentos online são sempre 'agendado'
        appointmentStatus = 'agendado';
      } else {
        // Para 'sem_pagamento', agendamentos online são sempre 'agendado'
        appointmentStatus = 'agendado';
      }
      
      console.log('✅ useClientBookings: Status final determinado:', {
        paymentStatus,
        appointmentStatus
      });


      const appointmentData = {
        user_id: bookingData.user_id,
        date: bookingData.date,
        status: appointmentStatus,
        modality: bookingData.modality,
        modality_id: bookingData.modality_id, // Adicionar modality_id
        valor_total: bookingData.valor_total,
        payment_status: paymentStatus,
        booking_source: 'online' // Agendamentos online sempre têm source 'online'
      };

      // Adicionar client_id ao agendamento
      appointmentData.client_id = clientId;

      console.log('🔍 useClientBookings: Criando agendamento:', {
        clientId: clientId,
        adminUserId: bookingData.user_id,
        date: bookingData.date,
        status: appointmentStatus,
        modality: bookingData.modality,
        valor_total: bookingData.valor_total,
        payment_status: paymentStatus,
        booking_source: 'online'
      });

      const { data: newBooking, error } = await supabase
        .from('appointments')
        .insert(appointmentData)
        .select()
        .single();

      if (error) {
        console.error('❌ useClientBookings: Erro ao criar agendamento:', error);
        throw error;
      }

      console.log('✅ useClientBookings: Agendamento criado com sucesso:', {
        id: newBooking.id,
        client_id: newBooking.client_id,
        user_id: newBooking.user_id,
        date: newBooking.date,
        status: newBooking.status
      });

      

      return newBooking;
    },
    onSuccess: (newBooking) => {
      // Salvar o ID do agendamento no sessionStorage para uso no pagamento
      sessionStorage.setItem('lastAppointmentId', newBooking.id);
      console.log('💾 Appointment ID salvo no sessionStorage:', newBooking.id);
      
      // Otimização: Atualizar cache diretamente para agendamentos online
      queryClient.setQueryData(['clientBookings', adminUserId], (oldData: any[] | undefined) => {
        if (!oldData) return [newBooking];
        return [newBooking, ...oldData];
      });
      
      // Atualizar cache principal de agendamentos
      queryClient.setQueryData(['appointments', adminUserId], (oldData: any[] | undefined) => {
        if (!oldData) return [newBooking];
        return [newBooking, ...oldData];
      });
      
      // Invalidar queries relacionadas de forma mais específica
      queryClient.invalidateQueries({ 
        queryKey: ['appointments'], 
        exact: false 
      });
      
      // Invalidar queries de horários disponíveis
      queryClient.invalidateQueries({ 
        queryKey: ['availableHours'], 
        exact: false 
      });
      
      // Invalidar queries de configurações de horários
      queryClient.invalidateQueries({ 
        queryKey: ['workingHours'], 
        exact: false 
      });
    }
  });

  const updateBookingMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & UpdateClientBookingData) => {
      const { data: updatedBooking, error } = await supabase
        .from('appointments')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updatedBooking;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientBookings', adminUserId] });
      queryClient.invalidateQueries({ queryKey: ['appointments', adminUserId] });
    }
  });

  const cancelBookingMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: cancelledBooking, error } = await supabase
        .from('appointments')
        .update({ status: 'cancelado' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return cancelledBooking;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientBookings', adminUserId] });
      queryClient.invalidateQueries({ queryKey: ['appointments', adminUserId] });
    }
  });

  const confirmBookingMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: confirmedBooking, error } = await supabase
        .from('appointments')
        .update({ status: 'agendado' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return confirmedBooking;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientBookings', adminUserId] });
      queryClient.invalidateQueries({ queryKey: ['appointments', adminUserId] });
    }
  });

  const markCompletedMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: completedBooking, error } = await supabase
        .from('appointments')
        .update({ status: 'pago' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return completedBooking;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientBookings', adminUserId] });
      queryClient.invalidateQueries({ queryKey: ['appointments', adminUserId] });
    }
  });

  return {
    agendamentos: agendamentos || [],
    isLoading,
    error,
    createBooking: createBookingMutation.mutate,
    updateBooking: updateBookingMutation.mutate,
    cancelBooking: cancelBookingMutation.mutate,
    confirmBooking: confirmBookingMutation.mutate,
    markCompleted: markCompletedMutation.mutate,
    isCreating: createBookingMutation.isPending,
    isUpdating: updateBookingMutation.isPending,
    isCancelling: cancelBookingMutation.isPending,
    isConfirming: confirmBookingMutation.isPending,
    isMarkingCompleted: markCompletedMutation.isPending,
    createError: createBookingMutation.error,
    updateError: updateBookingMutation.error,
    cancelError: cancelBookingMutation.error,
    confirmError: confirmBookingMutation.error,
    markCompletedError: markCompletedMutation.error
  };
};

