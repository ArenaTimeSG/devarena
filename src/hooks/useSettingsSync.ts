import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSettings } from '@/hooks/useSettings';

export const useSettingsSync = () => {
  const queryClient = useQueryClient();
  const { settings, isSuccess } = useSettings();

  // Sincronizar configurações quando elas mudam
  useEffect(() => {
    if (isSuccess && settings) {
      console.log('🔄 Sincronizando configurações...');
      
      // Invalidar queries relacionadas para forçar re-render
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      
      // Atualizar cache de configurações
      queryClient.setQueryData(['settings'], settings);
      
      console.log('✅ Configurações sincronizadas com sucesso');
    }
  }, [settings, isSuccess, queryClient]);

  return {
    settings,
    isSuccess
  };
};

