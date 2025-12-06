import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createPreference } from './routes/createPreference';
import { webhook } from './routes/webhook';
import { checkBookingStatus } from './routes/checkBookingStatus';
import { verifyPayment } from './routes/verifyPayment';
import { saveAdminKeys, getAdminKeys, checkAdminKeys } from './routes/adminKeys';
import { runReconcile } from './routes/reconcile';
import { ReconcileService } from './services/reconcileService';

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Log de todas as requisições
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Middleware de autenticação simples (para desenvolvimento)
// Em produção, implementar autenticação JWT adequada
app.use('/api/admin', (req: any, res, next) => {
  // Simular usuário autenticado para desenvolvimento
  // Em produção, validar JWT token
  req.user = { id: req.headers['x-user-id'] as string || 'default-user' };
  next();
});

// Rotas de pagamento
app.post('/api/create-payment-preference', createPreference);
app.post('/api/notification/webhook', webhook);
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
  console.error('❌ Erro no servidor:', err);
  res.status(500).json({ 
    error: 'Erro interno do servidor',
    message: err.message 
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
