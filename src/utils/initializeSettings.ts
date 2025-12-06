import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_SETTINGS } from '@/types/settings';

// Cache para evitar inicializações duplicadas
const initializedUsers = new Set<string>();

export const initializeUserSettings = async (userId: string, userEmail: string, userName?: string, userPhone?: string) => {
  // Evitar inicialização duplicada
  if (initializedUsers.has(userId)) {
    console.log('🔄 Usuário já inicializado:', userId);
    return;
  }

  try {
    console.log('🚀 Iniciando configurações para usuário:', userId);
    
    // Verificar se já existe configuração para o usuário
    const { data: existingSettings, error: checkError } = await supabase
      .from('settings')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Erro ao verificar configurações existentes:', checkError);
      return;
    }

    // Se já existe, marcar como inicializado e retornar
    if (existingSettings) {
      console.log('✅ Configurações já existem para usuário:', userId);
      initializedUsers.add(userId);
      return;
    }

    // Criar configurações padrão
    const defaultSettings = {
      ...DEFAULT_SETTINGS,
      personal_data: {
        name: userName || '',
        email: userEmail,
        phone: userPhone || ''
      }
    };

    console.log('📝 Criando configurações padrão:', {
      modalities_enabled: defaultSettings.modalities_enabled,
      default_interval: defaultSettings.default_interval,
      theme: defaultSettings.theme,
      working_hours: Object.keys(defaultSettings.working_hours).length
    });

    const { error } = await supabase
      .from('settings')
      .insert({
        user_id: userId,
        modalities_enabled: defaultSettings.modalities_enabled as any,
        modalities_colors: defaultSettings.modalities_colors as any,
        working_hours: defaultSettings.working_hours as any,
        default_interval: defaultSettings.default_interval,
        notifications_enabled: defaultSettings.notifications_enabled as any,
        theme: defaultSettings.theme,
        personal_data: defaultSettings.personal_data as any,
        payment_policy: defaultSettings.payment_policy
      });

    if (error) {
      console.error('❌ Erro ao criar configurações padrão:', error);
      return;
    }

    console.log('✅ Configurações padrão criadas com sucesso para usuário:', userId);
    initializedUsers.add(userId);
  } catch (error) {
    console.error('❌ Erro ao inicializar configurações:', error);
  }
};

// Função para limpar cache (útil para testes)
export const clearInitializedUsersCache = () => {
  initializedUsers.clear();
  console.log('🧹 Cache de inicialização limpo');
};

// Função para verificar se usuário foi inicializado
export const isUserInitialized = (userId: string) => {
  return initializedUsers.has(userId);
};
