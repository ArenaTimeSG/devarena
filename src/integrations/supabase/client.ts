// Cliente Supabase corrigido para resolver o erro "Invalid API key"
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Validar variáveis de ambiente obrigatórias
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  const missing = [];
  if (!SUPABASE_URL) missing.push('VITE_SUPABASE_URL');
  if (!SUPABASE_PUBLISHABLE_KEY) missing.push('VITE_SUPABASE_ANON_KEY');
  
  throw new Error(
    `❌ Variáveis de ambiente do Supabase não configuradas: ${missing.join(', ')}\n` +
    `Por favor, configure essas variáveis no arquivo .env`
  );
}

// Verificar se estamos no browser
const isBrowser = typeof window !== 'undefined';

// Configuração de storage segura para browser
const getStorage = () => {
  if (!isBrowser) {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
  }

  try {
    // Testar se localStorage está disponível
    const test = '__supabase_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return localStorage;
  } catch (error) {
    console.warn('localStorage não disponível, usando storage em memória');
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
  }
};

// Criar cliente com configuração simplificada
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: getStorage(),
    persistSession: isBrowser,
    autoRefreshToken: isBrowser,
    detectSessionInUrl: isBrowser,
  },
});

// Verificar se o cliente foi criado corretamente
if (isBrowser) {
  console.log('🔧 Cliente Supabase configurado para browser');
  console.log('URL:', SUPABASE_URL);
  console.log('Storage disponível:', !!getStorage());
} else {
  console.log('🔧 Cliente Supabase configurado para servidor');
}