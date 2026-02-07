/**
 * Função para sanitizar dados sensíveis em logs
 * Remove campos sensíveis antes de logar
 */
const sensitiveFields = [
  'password',
  'password_hash',
  'access_token',
  'refresh_token',
  'token',
  'authorization',
  'x-signature',
  'prod_access_token',
  'public_key',
  'webhook_secret',
  'secret',
  'api_key',
  'apikey',
  'card_number',
  'cvv',
  'security_code',
  'cardholder_name',
];

/**
 * Sanitiza um objeto removendo campos sensíveis
 */
export const sanitizeForLogging = (data: any, additionalFields: string[] = []): any => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const allSensitiveFields = [...sensitiveFields, ...additionalFields];
  const sanitized = Array.isArray(data) ? [...data] : { ...data };

  for (const key in sanitized) {
    const lowerKey = key.toLowerCase();
    
    // Verificar se a chave contém algum campo sensível
    if (allSensitiveFields.some(field => lowerKey.includes(field.toLowerCase()))) {
      sanitized[key] = '***REDACTED***';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      // Recursivamente sanitizar objetos aninhados
      sanitized[key] = sanitizeForLogging(sanitized[key], additionalFields);
    }
  }

  return sanitized;
};

/**
 * Middleware para sanitizar logs de requisições
 */
export const logSanitizer = (req: any, res: any, next: any): void => {
  // Salvar método original de log
  const originalLog = console.log;
  const originalError = console.error;

  // Interceptar logs para sanitizar
  console.log = (...args: any[]) => {
    const sanitized = args.map(arg => {
      if (typeof arg === 'object' && arg !== null) {
        return sanitizeForLogging(arg);
      }
      return arg;
    });
    originalLog(...sanitized);
  };

  console.error = (...args: any[]) => {
    const sanitized = args.map(arg => {
      if (typeof arg === 'object' && arg !== null) {
        return sanitizeForLogging(arg);
      }
      return arg;
    });
    originalError(...sanitized);
  };

  next();
};
