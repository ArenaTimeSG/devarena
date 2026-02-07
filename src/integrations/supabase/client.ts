// Cliente Supabase corrigido para resolver o erro "Invalid API key"
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Variáveis de ambiente com fallback para manter funcionalidade
// ⚠️ AVISO: Em produção, configure as variáveis de ambiente no Vercel
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://bnonmzdwqdqjkdoyulqd.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJub25temR3cWRxamtkb3l1bHFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MzE3MjMsImV4cCI6MjA4MDEwNzcyM30.HHCK1_PlhVwcUofTBngX3ChoQxEXCfToolHTrePmfj4";

// Avisar se estiver usando valores padrão (apenas em desenvolvimento)
if (typeof window !== 'undefined' && (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY)) {
  console.warn(
    '⚠️ [SEGURANÇA] Variáveis de ambiente do Supabase não configuradas.\n' +
    'Usando valores padrão. Para produção, configure no Vercel: Settings > Environment Variables'
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