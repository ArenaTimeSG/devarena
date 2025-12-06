# ArenaTime Backend - Sistema de Pagamentos Mercado Pago

Backend completo em TypeScript com Express para processar pagamentos do Mercado Pago e gerenciar agendamentos no Supabase.

## 🚀 Funcionalidades

- ✅ **Criação de preferências de pagamento** com Mercado Pago
- ✅ **Webhook automático** para processar notificações de pagamento
- ✅ **Integração com Supabase** para gerenciar agendamentos
- ✅ **Verificação de status** de agendamentos
- ✅ **Logs detalhados** para debug
- ✅ **Deploy na Vercel** com URL pública para webhooks

## 📋 Fluxo do Sistema

```
[Front-end] → [Backend /create-preference] → [Mercado Pago Checkout]
     ↑                                           ↓
[Consulta Status] ← [Supabase] ← [Backend /webhook] ← [Mercado Pago]
```

## 🔧 Configuração

### 1. Variáveis de Ambiente

Copie o arquivo `env.example` para `.env` e configure:

```bash
# Mercado Pago
MP_ACCESS_TOKEN=seu_token_do_mercadopago

# Supabase
SUPABASE_URL=sua_url_do_supabase
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role

# URLs (para produção)
WEBHOOK_URL=https://seu-app.vercel.app
FRONTEND_URL=https://seu-frontend.vercel.app
```

### 2. Instalação

```bash
cd backend
npm install
```

### 3. Desenvolvimento

```bash
npm run dev
```

### 4. Build para Produção

```bash
npm run build
npm start
```

## 🌐 Deploy na Vercel

### 1. Conectar Repositório

- Conecte seu repositório GitHub na Vercel
- Configure as variáveis de ambiente no painel da Vercel

### 2. Configurar Webhook no Mercado Pago

No Dashboard do Mercado Pago:
- **URL do Webhook**: `https://seu-app.vercel.app/api/webhook`
- **Eventos**: `payment`

## 📡 Endpoints

### POST /api/create-preference

Cria uma preferência de pagamento no Mercado Pago.

**Body:**
```json
{
  "description": "Agendamento Personal Training",
  "amount": 50.00,
  "user_id": "uuid-do-admin",
  "client_name": "João Silva",
  "client_email": "joao@email.com",
  "booking_id": "uuid-do-agendamento"
}
```

**Response:**
```json
{
  "success": true,
  "preference_id": "1234567890-abcdef",
  "init_point": "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=...",
  "sandbox_init_point": "https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=..."
}
```

### POST /api/webhook

Recebe notificações do Mercado Pago (chamado automaticamente).

**Query:** `?data.id=payment_id`

**Processamento:**
- Consulta pagamento na API do Mercado Pago
- Atualiza agendamento no Supabase baseado no status
- Cria/atualiza registro na tabela payments

### GET /api/booking/:id/status

Verifica o status atual de um agendamento.

**Response:**
```json
{
  "booking_id": "uuid-do-agendamento",
  "status": "pago",
  "payment_status": "approved",
  "payment_id": "1234567890",
  "created_at": "2024-01-01T10:00:00Z",
  "updated_at": "2024-01-01T10:05:00Z"
}
```

## 🗄️ Estrutura do Banco (Supabase)

### Tabela: appointments
```sql
- id (UUID, PK)
- user_id (UUID)
- client_id (UUID)
- date (timestamp)
- status (enum: 'a_cobrar', 'pago', 'cancelado')
- payment_status (varchar: 'not_required', 'pending', 'approved', 'failed')
- modality (text)
- valor_total (numeric)
- created_at (timestamp)
- updated_at (timestamp)
```

### Tabela: payments
```sql
- id (UUID, PK)
- appointment_id (UUID, FK)
- amount (numeric)
- currency (varchar)
- status (varchar: 'pending', 'approved', 'rejected', 'cancelled')
- payment_method (varchar)
- mercado_pago_id (varchar)
- mercado_pago_status (varchar)
- mercado_pago_payment_id (varchar)
- created_at (timestamp)
- updated_at (timestamp)
```

## 🔍 Logs e Debug

O sistema possui logs detalhados em todos os pontos críticos:

- `🚀 [CREATE-PREFERENCE]` - Criação de preferências
- `🚀 [WEBHOOK]` - Processamento de webhooks
- `🔍 [CHECK-STATUS]` - Verificação de status
- `💳` - Operações do Mercado Pago
- `✅` - Sucessos
- `❌` - Erros

## 🎯 Resultado Final

1. **Frontend** chama `/api/create-preference` e abre checkout
2. **Cliente** paga no Mercado Pago
3. **Mercado Pago** chama `/api/webhook` automaticamente
4. **Backend** consulta pagamento e atualiza Supabase
5. **Agendamento** fica confirmado com status "pago"

**Sistema funciona sem loops ou verificações manuais! 🚀**
