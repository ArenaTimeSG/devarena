# Sistema de Pagamentos Mercado Pago - Produção

Este sistema implementa uma integração completa com o Mercado Pago para processamento de pagamentos em produção, incluindo confirmação automática de reservas via webhook.

## 🚀 Funcionalidades

- ✅ Configuração de chaves de produção por admin
- ✅ Criação de preferências de pagamento com metadata
- ✅ Webhook com validação de assinatura
- ✅ Confirmação automática de agendamentos
- ✅ Verificação manual de pagamentos (fallback)
- ✅ Cron job de reconciliação
- ✅ Estados de agendamento completos
- ✅ Criptografia de chaves sensíveis
- ✅ Idempotência de webhooks

## 📋 Estados do Agendamento

- `pending_payment` → Aguardando pagamento
- `confirmed` → Pago e reservado
- `expired` → Não pago no prazo
- `conflict_payment` → Pago mas horário já ocupado

## 🔧 Configuração

### 1. Variáveis de Ambiente

```bash
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Mercado Pago (Global - para compatibilidade)
MP_ACCESS_TOKEN=your_global_access_token

# URLs
WEBHOOK_URL=https://your-backend.vercel.app
FRONTEND_URL=https://your-frontend.vercel.app

# Criptografia
ENCRYPTION_KEY=your_32_character_encryption_key

# JWT (para autenticação)
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h
```

### 2. Migrações do Banco

Execute as migrações na ordem:

```sql
-- 1. Tabela de chaves dos admins
\i migrations/001_admin_keys_table.sql

-- 2. Tabela de registros de pagamento
\i migrations/002_payment_records_table.sql

-- 3. Tabela de notificações de webhook
\i migrations/003_webhook_notifications_table.sql

-- 4. Atualizar enum de status
\i migrations/004_update_appointments_status.sql
```

## 🔑 Configuração de Chaves do Admin

### 1. Salvar Chaves de Produção

```bash
POST /api/admin/keys
Headers: {
  "x-user-id": "admin-user-id",
  "Content-Type": "application/json"
}
Body: {
  "prod_access_token": "APP_USR-1234567890...",
  "public_key": "APP_USR-1234567890...",
  "webhook_secret": "your-webhook-secret"
}
```

### 2. Verificar se Admin tem Chaves

```bash
GET /api/admin/keys/check
Headers: {
  "x-user-id": "admin-user-id"
}
```

### 3. Buscar Chaves do Admin

```bash
GET /api/admin/keys
Headers: {
  "x-user-id": "admin-user-id"
}
```

## 💳 Fluxo de Pagamento

### 1. Criar Preferência de Pagamento

```bash
POST /api/create-payment-preference
Body: {
  "owner_id": "admin-user-id",
  "booking_id": "booking-uuid",
  "price": 50.00,
  "items": [
    {
      "title": "Agendamento de Quadra",
      "quantity": 1,
      "unit_price": 50.00
    }
  ],
  "return_url": "https://your-app.com/payment/result"
}
```

**Resposta:**
```json
{
  "success": true,
  "preference_id": "1234567890-abcdef",
  "init_point": "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=..."
}
```

### 2. Redirecionar para Pagamento

```javascript
// Frontend
const response = await fetch('/api/create-payment-preference', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    owner_id: 'admin-id',
    booking_id: 'booking-id',
    price: 50.00
  })
});

const data = await response.json();
if (data.success) {
  window.location.href = data.init_point;
}
```

### 3. Webhook (Automático)

O Mercado Pago enviará notificações para:
```
POST /api/notification/webhook
```

O sistema automaticamente:
- Valida a assinatura
- Busca detalhes do pagamento
- Confirma o agendamento se aprovado
- Atualiza status no banco

### 4. Verificação Manual (Fallback)

```bash
GET /api/verify-payment?preference_id=1234567890-abcdef
```

**Resposta:**
```json
{
  "status": "confirmed",
  "payment_id": "payment-id",
  "booking_id": "booking-id"
}
```

## 🔄 Reconciliação

### Automática (Cron Job)

O sistema executa reconciliação a cada 5 minutos automaticamente, verificando:
- Pagamentos pendentes que foram aprovados
- Pagamentos que expiraram
- Conflitos de horário

### Manual

```bash
POST /api/admin/reconcile
Headers: {
  "x-user-id": "admin-user-id"
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "Reconciliação executada com sucesso",
  "data": {
    "reconcilied": 5,
    "expired": 2,
    "total": 7
  }
}
```

## 📊 Verificação de Status

```bash
GET /api/booking/{booking-id}/status
```

**Resposta:**
```json
{
  "booking_id": "booking-uuid",
  "status": "confirmed",
  "payment_status": "approved",
  "payment_id": "payment-id",
  "preference_id": "preference-id",
  "created_at": "2024-01-01T10:00:00Z",
  "updated_at": "2024-01-01T10:05:00Z"
}
```

## 🛡️ Segurança

### 1. Criptografia de Chaves

As chaves sensíveis são criptografadas usando AES-256-GCM antes de serem salvas no banco.

### 2. Validação de Webhook

```javascript
// Verificação de assinatura automática
const isValid = crypto.timingSafeEqual(
  Buffer.from(computedSignature),
  Buffer.from(receivedSignature)
);
```

### 3. Idempotência

Cada notificação de webhook é registrada para evitar processamento duplicado.

### 4. RLS (Row Level Security)

Políticas de segurança garantem que admins só acessem seus próprios dados.

## 🚨 Tratamento de Erros

### Conflitos de Horário

Se um pagamento for aprovado mas o horário já estiver ocupado:
- Status: `conflict_payment`
- Agendamento não é confirmado
- Admin deve resolver manualmente

### Pagamentos Expirados

Pagamentos não pagos em 30 minutos:
- Status: `expired`
- Agendamento é liberado
- Cliente pode tentar novamente

### Falhas de Webhook

Se o webhook falhar:
- Frontend pode usar verificação manual
- Cron job de reconciliação corrige automaticamente
- Logs detalhados para debugging

## 📝 Logs

O sistema gera logs detalhados para cada operação:

```
🚀 [CREATE-PREFERENCE] Iniciando criação de preferência
🔑 [CREATE-PREFERENCE] Buscando chaves do admin: admin-id
✅ [CREATE-PREFERENCE] Agendamento encontrado: booking-id
💳 [CREATE-PREFERENCE] Criando preferência no Mercado Pago...
✅ [CREATE-PREFERENCE] Preferência criada com sucesso!
```

## 🔧 Desenvolvimento

### Instalar Dependências

```bash
npm install
```

### Executar em Desenvolvimento

```bash
npm run dev
```

### Build para Produção

```bash
npm run build
npm start
```

### Testes

```bash
# Testar criação de preferência
curl -X POST http://localhost:3000/api/create-payment-preference \
  -H "Content-Type: application/json" \
  -d '{"owner_id":"test","booking_id":"test","price":50}'

# Testar verificação de pagamento
curl "http://localhost:3000/api/verify-payment?preference_id=test"

# Testar reconciliação
curl -X POST http://localhost:3000/api/admin/reconcile \
  -H "x-user-id: test"
```

## 🚀 Deploy

### Vercel

1. Conectar repositório
2. Configurar variáveis de ambiente
3. Deploy automático

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 📞 Suporte

Para dúvidas ou problemas:
1. Verificar logs do servidor
2. Testar endpoints individualmente
3. Verificar configuração do Mercado Pago
4. Validar migrações do banco

---

**⚠️ Importante:** Este sistema é para produção. Certifique-se de:
- Usar chaves de produção do Mercado Pago
- Configurar webhook no painel do MP
- Implementar autenticação JWT adequada
- Monitorar logs e métricas
- Fazer backup regular do banco
