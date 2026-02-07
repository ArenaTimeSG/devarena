import { QueryClient } from '@tanstack/react-query';
import { logger } from '@/utils/logger';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (aumentado para melhor cache)
      retry: (failureCount, error: any) => {
        // Não tentar novamente para erros de timeout, autenticação ou RLS
        if (error?.message?.includes('Timeout') ||
            error?.message?.includes('autenticado') || 
            error?.message?.includes('auth') ||
            error?.message?.includes('permission') ||
            error?.message?.includes('RLS')) {
          logger.log('🚫 Não tentando novamente:', error.message);
          return false;
        }
        
        // Máximo 2 tentativas para outros erros
        if (failureCount >= 2) {
          logger.log('🔄 Máximo de tentativas atingido');
          return false;
        }
        
        logger.log(`🔄 Tentativa ${failureCount + 1} de 2`);
        return true;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
    },
    mutations: {
      retry: false,
      retryDelay: 0,
    },
  },
});
