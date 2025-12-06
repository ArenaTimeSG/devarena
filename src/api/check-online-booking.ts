import { supabase } from '@/integrations/supabase/client';

export interface OnlineBookingStatus {
  enabled: boolean;
  message?: string;
  adminName?: string;
}

/**
 * Verifica se o agendamento online está habilitado para um determinado username
 * @param username - Username do administrador
 * @returns Status do agendamento online
 */
export async function checkOnlineBookingStatus(username: string): Promise<OnlineBookingStatus> {
  try {
    console.log('🔍 Verificando status do agendamento online para:', username);

    // 1. Buscar o usuário pelo username
    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select('user_id, name')
      .eq('username', username)
      .single();

    if (userError || !userProfile) {
      console.log('❌ Usuário não encontrado:', username);
      return {
        enabled: false,
        message: 'Agenda não encontrada'
      };
    }

    // 2. Buscar as configurações do usuário
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('online_enabled')
      .eq('user_id', userProfile.user_id)
      .single();

    if (settingsError) {
      console.log('❌ Erro ao buscar configurações:', settingsError);
      return {
        enabled: false,
        message: 'Erro ao verificar configurações'
      };
    }

    const isEnabled = settings?.online_enabled ?? false;

    console.log('✅ Status do agendamento online:', {
      username,
      adminName: userProfile.name,
      enabled: isEnabled
    });

    return {
      enabled: isEnabled,
      adminName: userProfile.name,
      message: isEnabled ? undefined : 'Agendamento online desativado pelo administrador'
    };

  } catch (error) {
    console.error('❌ Erro ao verificar status do agendamento online:', error);
    return {
      enabled: false,
      message: 'Erro interno do servidor'
    };
  }
}

/**
 * Verifica se o agendamento online está habilitado e retorna os dados do admin
 * @param username - Username do administrador
 * @returns Dados do admin e status do agendamento
 */
export async function getAdminDataForBooking(username: string) {
  try {
    console.log('🔍 Buscando dados do admin para agendamento:', username);

    // 1. Buscar o usuário pelo username
    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select('user_id, name, username')
      .eq('username', username)
      .single();

    if (userError || !userProfile) {
      console.log('❌ Usuário não encontrado:', username);
      throw new Error('Agenda não encontrada');
    }

    // 2. Buscar as configurações do usuário
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('online_enabled, online_booking, working_hours, payment_policy, time_format_interval, mercado_pago_enabled, mercado_pago_access_token, mercado_pago_public_key, mercado_pago_webhook_url')
      .eq('user_id', userProfile.user_id)
      .single();

    if (settingsError) {
      console.log('❌ Erro ao buscar configurações:', settingsError);
      throw new Error('Erro ao verificar configurações');
    }

    console.log('🔍 API - settings encontradas:', settings);
    console.log('🔍 API - time_format_interval:', settings?.time_format_interval);

    // 3. Verificar se o agendamento online está habilitado
    const isEnabled = settings?.online_enabled ?? false;
    
    if (!isEnabled) {
      throw new Error('Agendamento online desativado pelo administrador');
    }

    // 4. Buscar modalidades do usuário
    const { data: modalities, error: modalitiesError } = await supabase
      .from('modalities')
      .select('*')
      .eq('user_id', userProfile.user_id)
      .order('name');

    if (modalitiesError) {
      console.log('❌ Erro ao buscar modalidades:', modalitiesError);
      // Não falhar se não conseguir buscar modalidades
    }

    console.log('✅ Dados do admin carregados com sucesso:', {
      username,
      adminName: userProfile.name,
      enabled: isEnabled,
      modalitiesCount: modalities?.length || 0,
      timeFormatInterval: settings?.time_format_interval
    });

    const result = {
      user: {
        user_id: userProfile.user_id,
        name: userProfile.name,
        username: userProfile.username
      },
      settings: {
        online_enabled: isEnabled,
        online_booking: settings.online_booking || {
          auto_agendar: false,
          tempo_minimo_antecedencia: 24,
          duracao_padrao: 60
        },
        working_hours: settings.working_hours || {
          monday: { enabled: true, start: '08:00', end: '18:00' },
          tuesday: { enabled: true, start: '08:00', end: '18:00' },
          wednesday: { enabled: true, start: '08:00', end: '18:00' },
          thursday: { enabled: true, start: '08:00', end: '18:00' },
          friday: { enabled: true, start: '08:00', end: '18:00' },
          saturday: { enabled: true, start: '08:00', end: '18:00' },
          sunday: { enabled: false, start: '08:00', end: '18:00' }
        },
        payment_policy: settings.payment_policy || 'sem_pagamento',
        time_format_interval: settings.time_format_interval || 60,
        mercado_pago_enabled: settings.mercado_pago_enabled || false,
        mercado_pago_access_token: settings.mercado_pago_access_token || '',
        mercado_pago_public_key: settings.mercado_pago_public_key || '',
        mercado_pago_webhook_url: settings.mercado_pago_webhook_url || ''
      },
      modalities: modalities || []
    };

    console.log('🔍 API - Resultado final:', result);
    console.log('🔍 API - time_format_interval no resultado:', result.settings.time_format_interval);

    return result;

  } catch (error) {
    console.error('❌ Erro ao buscar dados do admin:', error);
    throw error;
  }
}
