import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface UseAppointmentsRealtimeProps {
  userId: string;
  onNewAppointment: (appointment: any) => void;
  enabled?: boolean;
}

export const useAppointmentsRealtime = ({ 
  userId, 
  onNewAppointment, 
  enabled = true 
}: UseAppointmentsRealtimeProps) => {
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!enabled) return;

    console.log('🔍 Configurando Realtime para agendamentos do usuário:', userId);

    // Criar canal do Realtime
    const channel = supabase
      .channel('realtime:appointments')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'appointments',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('🔔 Novo agendamento inserido via Realtime:', payload.new);
          
          // Verificar se é um agendamento recente (últimos 5 minutos) e aprovado
          const createdAt = new Date(payload.new.created_at);
          const now = new Date();
          const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
          
          if (diffMinutes <= 5 && payload.new.status === 'agendado' && payload.new.payment_status === 'approved') {
            console.log('✅ Agendamento confirmado via Realtime!', payload.new);
            onNewAppointment(payload.new);
          }
        }
      )
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'appointments',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('🔔 Agendamento atualizado via Realtime:', payload.new);
          
          // Verificar se o status mudou para aprovado
          if (payload.new.status === 'agendado' && payload.new.payment_status === 'approved') {
            console.log('✅ Agendamento confirmado via Realtime!', payload.new);
            onNewAppointment(payload.new);
          }
        }
      )
      .subscribe((status) => {
        console.log('🔍 Status da conexão Realtime:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime conectado com sucesso');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('❌ Erro na conexão Realtime:', status);
        }
      });

    channelRef.current = channel;

    // Cleanup function
    return () => {
      if (channelRef.current) {
        console.log('🧹 Limpando conexão Realtime');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, onNewAppointment, enabled]);

  // Função para verificar se o Realtime está conectado
  const isConnected = () => {
    return channelRef.current && channelRef.current.state === 'joined';
  };

  return {
    isConnected,
    channel: channelRef.current
  };
};