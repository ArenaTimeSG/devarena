import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { updateRecurringAppointmentsStatus } from '@/utils/updateRecurringStatus';

/**
 * Hook para atualizar automaticamente o status de TODOS os agendamentos vencidos
 * Executa a cada hora e quando o hook é carregado
 * Inclui tanto agendamentos únicos quanto recorrentes
 */
export const useRecurringStatusUpdate = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;

    // Executar imediatamente
    const updateStatus = async () => {
      const result = await updateRecurringAppointmentsStatus(user.id);
      if (result.success && result.updatedCount > 0) {
        console.log('✅ Status atualizado para', result.updatedCount, 'agendamentos vencidos:', {
          únicos: result.uniqueCount || 0,
          recorrentes: result.recurringCount || 0
        });
        // Invalidar cache para refletir as mudanças
        queryClient.invalidateQueries({ queryKey: ['appointments', user.id] });
      }
    };

    updateStatus();
    
    // Executar a cada hora para manter os status atualizados
    const interval = setInterval(updateStatus, 1000 * 60 * 60); // A cada hora
    
    return () => clearInterval(interval);
  }, [user?.id, queryClient]);

  return null;
};

