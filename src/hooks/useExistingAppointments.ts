import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, endOfDay } from 'date-fns';

interface UseExistingAppointmentsProps {
  adminUserId?: string;
  selectedDate?: Date;
}

export const useExistingAppointments = ({ adminUserId, selectedDate }: UseExistingAppointmentsProps) => {
  return useQuery({
    queryKey: ['existingAppointments', adminUserId, selectedDate?.toISOString()],
    queryFn: async () => {
      if (!adminUserId || !selectedDate) {
        return [];
      }

      const startOfSelectedDate = startOfDay(selectedDate);
      const endOfSelectedDate = endOfDay(selectedDate);

      const { data, error } = await supabase
        .from('appointments')
        .select('date, modality, status')
        .eq('user_id', adminUserId)
        .gte('date', startOfSelectedDate.toISOString())
        .lte('date', endOfSelectedDate.toISOString())
        .not('status', 'eq', 'a_cobrar'); // Excluir agendamentos pendentes

      if (error) {
        console.error('Erro ao buscar agendamentos existentes:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!adminUserId && !!selectedDate,
  });
};
