/**
 * Valida variáveis de ambiente obrigatórias na inicialização
 * Lança erro se alguma variável crítica estiver faltando
 */
export const validateEnv = (): void => {
  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY', // Para operações administrativas
  ];

  // Variáveis opcionais mas recomendadas
  const recommendedEnvVars = [
    'JWT_SECRET',
    'ENCRYPTION_KEY',
    'MP_ACCESS_TOKEN',
    'WEBHOOK_URL',
    'FRONTEND_URL',
  ];

  const missing: string[] = [];
  const missingRecommended: string[] = [];

  // Verificar obrigatórias
  requiredEnvVars.forEach(key => {
    if (!process.env[key]) {
      missing.push(key);
    }
  });

  // Verificar recomendadas
  recommendedEnvVars.forEach(key => {
    if (!process.env[key]) {
      missingRecommended.push(key);
    }
  });

  // Lançar erro se faltar variável obrigatória
  if (missing.length > 0) {
    throw new Error(
      `❌ Variáveis de ambiente obrigatórias faltando: ${missing.join(', ')}\n` +
      `Por favor, configure essas variáveis no arquivo .env`
    );
  }

  // Avisar sobre variáveis recomendadas
  if (missingRecommended.length > 0) {
    console.warn(
      `⚠️ Variáveis de ambiente recomendadas não configuradas: ${missingRecommended.join(', ')}\n` +
      `Algumas funcionalidades podem não funcionar corretamente.`
    );
  }

  // Validar formato de URLs
  if (process.env.SUPABASE_URL && !process.env.SUPABASE_URL.startsWith('http')) {
    throw new Error('SUPABASE_URL deve ser uma URL válida (começar com http:// ou https://)');
  }

  if (process.env.FRONTEND_URL && !process.env.FRONTEND_URL.startsWith('http')) {
    throw new Error('FRONTEND_URL deve ser uma URL válida (começar com http:// ou https://)');
  }

  console.log('✅ Variáveis de ambiente validadas com sucesso');
};
