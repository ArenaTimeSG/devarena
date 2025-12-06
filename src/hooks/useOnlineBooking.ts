import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface OnlineReservation {
  id: string;
  admin_user_id: string;
  modalidade_id: string;
  data: string; // ISO string
  horario: string;
  cliente_nome: string;
  cliente_email: string;
  cliente_telefone: string;
  valor: number;
  status: string; // Permitir string genérica
  auto_confirmada: boolean;
  created_at: string;
  updated_at: string;
}

interface CreateOnlineReservationData {
  admin_user_id: string;
  modalidade_id: string;
  modalidade_name: string; // Nome da modalidade
  data: string; // ISO string
  horario: string;
  cliente_nome: string;
  cliente_email: string;
  cliente_telefone: string;
  valor: number;
  auto_confirmada: boolean;
}

export const useOnlineBooking = () => {
  const queryClient = useQueryClient();

  const createReservationMutation = useMutation({
    mutationFn: async (data: CreateOnlineReservationData): Promise<OnlineReservation> => {
      try {
        // 1. Primeiro, verificar se o cliente já existe ou criar um novo
        let clientId: string;
        
        // Buscar cliente existente por email ou telefone
        const normalizedEmail = (data.cliente_email || '').trim().toLowerCase();
        const { data: existingClient } = await supabase
          .from('booking_clients')
          .select('id')
          .or(`email.eq.${normalizedEmail},phone.eq.${data.cliente_telefone}`)
          .maybeSingle();

        if (existingClient) {
          clientId = existingClient.id;
          console.log('✅ Cliente existente encontrado:', { clientId, email: data.cliente_email });
          
          // Atualizar dados do cliente se necessário
          const { error: updateError } = await supabase
            .from('booking_clients')
            .update({
              name: data.cliente_nome,
              phone: data.cliente_telefone,
              email: normalizedEmail,
            })
            .eq('id', clientId);

          if (updateError) {
            console.error('❌ Erro ao atualizar cliente:', updateError);
          } else {
            console.log('✅ Cliente atualizado com sucesso');
          }
        } else {
          console.log('🆕 Criando novo cliente:', { 
            name: data.cliente_nome, 
            email: normalizedEmail, 
            phone: data.cliente_telefone 
          });
          
          // Criar novo cliente
          const { data: newClient, error: clientError } = await supabase
            .from('booking_clients')
            .insert({
              name: data.cliente_nome,
              phone: data.cliente_telefone,
              email: normalizedEmail,
              // clientes criados via agendamento não devem ter senha de login
              password_hash: null,
              user_id: data.admin_user_id // Associar ao admin
            })
            .select('id')
            .single();

          if (clientError) {
            console.error('❌ Erro ao criar cliente:', clientError);
            throw new Error(`Erro ao criar cliente: ${clientError.message}`);
          }

          clientId = newClient.id;
          console.log('✅ Novo cliente criado:', { clientId, email: data.cliente_email });
        }

        // 2. Verificar se já existe agendamento para esta data e hora
        const normalizedDate = data.data; // Já vem no formato YYYY-MM-DD
        const normalizedTime = data.horario; // Formato HH:mm
        
        console.log('🔍 Verificando duplicidade:', {
          data: normalizedDate,
          hora: normalizedTime,
          adminUserId: data.admin_user_id
        });

        // Verificar se já existe agendamento
        const { data: existingAppointments, error: checkError } = await supabase
          .from('appointments')
          .select('id')
          .eq('user_id', data.admin_user_id)
          .eq('date', `${normalizedDate}T${normalizedTime}:00`)
          .not('status', 'eq', 'a_cobrar');

        if (checkError) {
          throw new Error(`Erro ao verificar agendamento existente: ${checkError.message}`);
        }

        if (existingAppointments && existingAppointments.length > 0) {
          throw new Error('Este horário já está ocupado. Por favor, escolha outro horário.');
        }

        // 3. Criar o agendamento real na tabela appointments
        console.log('🔍 Criando agendamento:', {
          clientId: clientId,
          data: normalizedDate,
          hora: normalizedTime,
          adminUserId: data.admin_user_id,
          modalidade: data.modalidade_name,
          valor: data.valor,
          auto_confirmada: data.auto_confirmada
        });

        // Determinar o status baseado na configuração de auto-agendamento
        // Se auto_confirmada é true, status é 'agendado', senão é 'a_cobrar' (pendente)
        const appointmentStatus = data.auto_confirmada ? 'agendado' : 'a_cobrar';
        console.log('📊 Status do agendamento:', appointmentStatus);

        const appointmentData = {
          client_id: clientId,
          date: `${normalizedDate}T${normalizedTime}:00`,
          status: appointmentStatus,
          modality: data.modalidade_name, // Usar o nome da modalidade
          user_id: data.admin_user_id, // Vincular ao admin
          valor_total: data.valor,
        };

        console.log('📝 Dados do agendamento:', appointmentData);

        const { data: appointment, error: appointmentError } = await supabase
          .from('appointments')
          .insert(appointmentData)
          .select()
          .single();

        if (appointmentError) {
          console.error('❌ Erro ao criar agendamento:', appointmentError);
          throw new Error(`Erro ao criar agendamento: ${appointmentError.message}`);
        }

        console.log('✅ Agendamento criado com sucesso:', appointment);

        // 3. Criar registro na tabela online_reservations para histórico
        const { data: reservation, error } = await supabase
          .from('online_reservations')
          .insert({
            admin_user_id: data.admin_user_id,
            modalidade_id: data.modalidade_id,
            data: data.data,
            horario: data.horario,
            cliente_nome: data.cliente_nome,
            cliente_email: data.cliente_email,
            cliente_telefone: data.cliente_telefone,
            valor: data.valor,
            status: data.auto_confirmada ? 'confirmada' : 'pendente',
            auto_confirmada: data.auto_confirmada,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) {
          throw error;
        }

        return reservation;
      } catch (error) {
        console.error('Erro ao criar reserva online:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidar queries relacionadas para atualizar a lista de reservas
      queryClient.invalidateQueries({ queryKey: ['onlineReservations'] });
      queryClient.invalidateQueries({ queryKey: ['adminByUsername'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });

  return {
    createReservation: createReservationMutation.mutate,
    isCreating: createReservationMutation.isPending,
    error: createReservationMutation.error,
    isSuccess: createReservationMutation.isSuccess,
  };
};
