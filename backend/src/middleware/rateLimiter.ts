import rateLimit from 'express-rate-limit';

/**
 * Rate limiter geral para todas as rotas da API
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
  message: {
    success: false,
    error: 'Muitas requisições deste IP, tente novamente em 15 minutos.'
  },
  standardHeaders: true, // Retorna informações de rate limit nos headers
  legacyHeaders: false,
});

/**
 * Rate limiter mais restritivo para login
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 tentativas de login
  skipSuccessfulRequests: true, // Não contar requisições bem-sucedidas
  message: {
    success: false,
    error: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter para criação de preferências de pagamento
 */
export const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // máximo 20 requisições por IP
  message: {
    success: false,
    error: 'Muitas requisições de pagamento. Tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter para webhooks (mais permissivo, mas ainda limitado)
 */
export const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100, // máximo 100 webhooks por minuto
  message: {
    success: false,
    error: 'Muitas requisições de webhook.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
