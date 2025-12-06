import { supabase } from '@/integrations/supabase/client';

/**
 * Atualiza automaticamente o status de TODOS os agendamentos vencidos
 * de 'agendado' para 'a_cobrar' quando a data passa
 * Inclui tanto agendamentos únicos quanto recorrentes
 */
export const updateRecurringAppointmentsStatus = async (userId: string) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Início do dia

    // Buscar TODOS os agendamentos com status 'agendado' que já passaram da data
    // Inclui tanto agendamentos únicos (recurrence_id = null) quanto recorrentes
    // Exclui agendamentos cortesia (is_cortesia = true)
    const { data: expiredAppointments, error } = await supabase
      .from('appointments')
      .select('id, date, recurrence_id, is_cortesia')
      .eq('user_id', userId)
      .eq('status', 'agendado')
      .lt('date', today.toISOString())
      .or('is_cortesia.is.null,is_cortesia.eq.false');

    if (error) {
      console.error('❌ Erro ao buscar agendamentos vencidos:', error);
      return { success: false, error, updatedCount: 0 };
    }

    if (expiredAppointments && expiredAppointments.length > 0) {
      // Separar agendamentos únicos e recorrentes para logging
      const uniqueAppointments = expiredAppointments.filter(apt => !apt.recurrence_id);
      const recurringAppointments = expiredAppointments.filter(apt => apt.recurrence_id);

      console.log('🔍 Atualizando status de agendamentos vencidos:', {
        total: expiredAppointments.length,
        únicos: uniqueAppointments.length,
        recorrentes: recurringAppointments.length,
        appointments: expiredAppointments.map(apt => ({
          id: apt.id,
          date: apt.date,
          recurrence_id: apt.recurrence_id,
          type: apt.recurrence_id ? 'recorrente' : 'único'
        }))
      });

      // Atualizar status para 'a_cobrar' para TODOS os agendamentos vencidos
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ status: 'a_cobrar' })
        .in('id', expiredAppointments.map(apt => apt.id));

      if (updateError) {
        console.error('❌ Erro ao atualizar status dos agendamentos:', updateError);
        return { success: false, error: updateError, updatedCount: 0 };
      }

      // Buscar e atualizar agendamentos cortesia vencidos para status 'cortesia'
      const { data: expiredCortesiaAppointments, error: cortesiaError } = await supabase
        .from('appointments')
        .select('id, date, recurrence_id')
        .eq('user_id', userId)
        .eq('status', 'agendado')
        .eq('is_cortesia', true)
        .lt('date', today.toISOString());

      if (cortesiaError) {
        console.error('❌ Erro ao buscar agendamentos cortesia vencidos:', cortesiaError);
      } else if (expiredCortesiaAppointments && expiredCortesiaAppointments.length > 0) {
        const { error: cortesiaUpdateError } = await supabase
          .from('appointments')
          .update({ status: 'cortesia' })
          .in('id', expiredCortesiaAppointments.map(apt => apt.id));

        if (cortesiaUpdateError) {
          console.error('❌ Erro ao atualizar status dos agendamentos cortesia:', cortesiaUpdateError);
        } else {
          console.log('✅ Status atualizado para', expiredCortesiaAppointments.length, 'agendamentos cortesia vencidos');
        }
      }

      console.log('✅ Status atualizado para', expiredAppointments.length, 'agendamentos vencidos:', {
        únicos: uniqueAppointments.length,
        recorrentes: recurringAppointments.length
      });

      return { 
        success: true, 
        error: null, 
        updatedCount: expiredAppointments.length,
        updatedAppointments: expiredAppointments,
        uniqueCount: uniqueAppointments.length,
        recurringCount: recurringAppointments.length
      };
    }

    return { success: true, error: null, updatedCount: 0 };
  } catch (error) {
    console.error('❌ Erro ao atualizar status dos agendamentos vencidos:', error);
    return { success: false, error, updatedCount: 0 };
  }
};

/**
 * Função para executar atualização manual dos status
 * Útil para botões de ação no dashboard
 */
export const forceUpdateAppointmentsStatus = async (userId: string) => {
  console.log('🔄 Executando atualização manual dos status...');
  const result = await updateRecurringAppointmentsStatus(userId);
  
  if (result.success && result.updatedCount > 0) {
    console.log('✅ Atualização manual concluída:', {
      total: result.updatedCount,
      únicos: result.uniqueCount || 0,
      recorrentes: result.recurringCount || 0
    });
  } else {
    console.log('ℹ️ Nenhum agendamento precisou ser atualizado');
  }
  
  return result;
};

