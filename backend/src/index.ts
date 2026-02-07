import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import { createPreference } from './routes/createPreference';
import { webhook } from './routes/webhook';
import { checkBookingStatus } from './routes/checkBookingStatus';
import { verifyPayment } from './routes/verifyPayment';
import { saveAdminKeys, getAdminKeys, checkAdminKeys } from './routes/adminKeys';
import { runReconcile } from './routes/reconcile';
import { ReconcileService } from './services/reconcileService';
import { validateEnv } from './middleware/validateEnv';
import { authenticateToken } from './middleware/auth';
import { apiLimiter, paymentLimiter, webhookLimiter } from './middleware/rateLimiter';
import { sanitizeForLogging } from './middleware/sanitizeLogs';

// Carregar variáveis de ambiente
dotenv.config();

// Validar variáveis de ambiente na inicialização
try {
  validateEnv();
} catch (error: any) {
  console.error(error.message);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Headers de segurança HTTP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://www.mercadopago.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.mercadopago.com", "https://*.supabase.co"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configurado adequadamente
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://arenatimesind.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Limite de tamanho de requisição
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Rate limiting geral
app.use('/api/', apiLimiter);

// Log de requisições (sanitizado)
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  // Log sanitizado do body (sem dados sensíveis)
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('📥 Body:', sanitizeForLogging(req.body));
  }
  next();
});

// Middleware de autenticação JWT para rotas administrativas
// Em desenvolvimento, ainda permite x-user-id como fallback se JWT_SECRET não estiver configurado
app.use('/api/admin', (req: any, res: any, next: any) => {
  // Se JWT_SECRET estiver configurado, usar autenticação JWT real
  if (process.env.JWT_SECRET) {
    return authenticateToken(req, res, next);
  }
  
  // Fallback para desenvolvimento (com aviso)
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️ Usando autenticação simplificada (desenvolvimento). Configure JWT_SECRET para produção.');
    req.user = { userId: req.headers['x-user-id'] as string || 'default-user' };
    return next();
  }
  
  // Em produção sem JWT_SECRET, bloquear
  res.status(500).json({
    success: false,
    error: 'Autenticação não configurada. Configure JWT_SECRET.'
  });
});

// Rotas de pagamento (com rate limiting específico)
app.post('/api/create-payment-preference', paymentLimiter, createPreference);
app.post('/api/notification/webhook', webhookLimiter, webhook);
app.get('/api/verify-payment', verifyPayment);
app.get('/api/booking/:id/status', checkBookingStatus);

// Rotas de administração (requerem autenticação)
app.post('/api/admin/keys', saveAdminKeys);
app.get('/api/admin/keys', getAdminKeys);
app.get('/api/admin/keys/check', checkAdminKeys);

// Rotas de reconciliação
app.post('/api/admin/reconcile', runReconcile);

// Rota de health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      supabase: !!process.env.SUPABASE_URL,
      mercado_pago: !!process.env.MP_ACCESS_TOKEN,
      reconcile_service: 'running'
    }
  });
});

// Middleware de erro
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Sanitizar erro antes de logar
  const sanitizedError = sanitizeForLogging({
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method
  });
  
  console.error('❌ Erro no servidor:', sanitizedError);
  
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.statusCode || 500).json({ 
    success: false,
    error: isDevelopment ? err.message : 'Erro interno do servidor',
    ...(isDevelopment && { stack: err.stack })
  });
});

// Rota 404
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Inicializar serviços
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💳 Mercado Pago configurado: ${process.env.MP_ACCESS_TOKEN ? 'Sim' : 'Não'}`);
  console.log(`🗄️ Supabase configurado: ${process.env.SUPABASE_URL ? 'Sim' : 'Não'}`);
  console.log(`🔐 Chave de criptografia: ${process.env.ENCRYPTION_KEY ? 'Sim' : 'Não'}`);
  
  // Iniciar serviço de reconciliação
  ReconcileService.start();
  
  console.log('✅ Sistema de pagamentos Mercado Pago iniciado com sucesso!');
});

export default app;
