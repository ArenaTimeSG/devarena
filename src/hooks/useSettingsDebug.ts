import { useEffect, useRef } from 'react';
import { useSettings } from './useSettings';
import { useAuth } from './useAuth';

export const useSettingsDebug = () => {
  const { user, loading: authLoading } = useAuth();
  const { settings, isLoading, error, isSaving, isSuccess, isError } = useSettings();
  const prevState = useRef<any>(null);

  useEffect(() => {
    const currentState = {
      user: user?.id,
      authLoading,
      settingsLoaded: !!settings,
      isLoading,
      isSaving,
      isSuccess,
      isError,
      error: error?.message,
      settingsKeys: settings ? Object.keys(settings) : null
    };

    // Só logar se o estado mudou
    if (JSON.stringify(prevState.current) !== JSON.stringify(currentState)) {
      console.log('🔍 Settings Debug:', currentState);
      prevState.current = currentState;
    }
  }, [user?.id, authLoading, settings, isLoading, isSaving, isSuccess, isError, error]);

  return {
    user,
    authLoading,
    settings,
    isLoading,
    isSaving,
    isSuccess,
    isError,
    error
  };
};
