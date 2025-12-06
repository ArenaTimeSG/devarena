# 🚀 Supabase Edge Functions - Mercado Pago Produção

Sistema completo de pagamentos Mercado Pago usando **Supabase Edge Functions** para máxima performance e confiabilidade.

## 🎯 **Arquitetura Ideal**

- ✅ **Frontend (checkout)** → Vercel (Next.js/React)
- ✅ **Backend (webhooks)** → Supabase Edge Functions
- ✅ **Banco de dados** → Supabase PostgreSQL
- ✅ **Sem cold start** → Edge Functions são instantâneas
- ✅ **Integração nativa** → Acesso direto ao banco

## 📁 **Estrutura de Arquivos**

```
supabase/
├── functions/
│   ├── create-payment-preference/
│   │   └── index.ts
│   ├── notification-webhook/
│   │   └── index.ts
│   ├── verify-payment/
│   │   └── index.ts
│   ├── reconcile/
│   │   └── index.ts
│   └── _shared/
│       └── cors.ts
├── migrations/
│   └── mercadopago_functions.sql
└── README_MERCADOPAGO.md
```

## 🚀 **Deploy das Funções**

### 1. **Instalar Supabase CLI**

```bash
npm install -g supabase
```

### 2. **Login no Supabase**

```bash
supabase login
```

### 3. **Link do Projeto**

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

### 4. **Deploy das Funções**

```bash
# Deploy individual
supabase functions deploy create-payment-preference
supabase functions deploy notification-webhook
supabase functions deploy verify-payment
supabase functions deploy reconcile

# Ou deploy todas de uma vez
supabase functions deploy
```

## 🔧 **Configuração**

### 1. **Variáveis de Ambiente**

No painel do Supabase, vá em **Settings > Edge Functions** e configure:

```bash
# Supabase (automático)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Mercado Pago (fallback global)
MP_FALLBACK_ACCESS_TOKEN=APP_USR-1234567890...

# URLs
BASE_API_URL=https://your-project.supabase.co
```

### 2. **Executar Migrações**

No **SQL Editor** do Supabase, execute:

```sql
-- Copie e cole o conteúdo de migrations/mercadopago_functions.sql
```

## 🔗 **URLs das Funções**

Após o deploy, suas funções estarão disponíveis em:

```
https://your-project.supabase.co/functions/v1/create-payment-preference
https://your-project.supabase.co/functions/v1/notification-webhook
https://your-project.supabase.co/functions/v1/verify-payment
https://your-project.supabase.co/functions/v1/reconcile
```

## 💳 **Configuração do Mercado Pago**

### 1. **Webhook URL**

No painel do Mercado Pago, configure:

```
URL: https://your-project.supabase.co/functions/v1/notification-webhook
Eventos: payment
```

### 2. **Chaves dos Admins**

Cada admin deve configurar suas chaves via API:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/create-payment-preference \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "owner_id": "admin-user-id",
    "booking_id": "booking-id",
    "price": 50.00
  }'
```

## 🧪 **Testes**

### 1. **Teste de Criação de Preferência**

```bash
curl -X POST https://your-project.supabase.co/functions/v1/create-payment-preference \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "owner_id": "test-admin-id",
    "booking_id": "test-booking-id",
    "price": 1.00,
    "items": [
      {
        "title": "Teste de Agendamento",
        "quantity": 1,
        "unit_price": 1.00
      }
    ]
  }'
```

### 2. **Teste de Verificação**

```bash
curl "https://your-project.supabase.co/functions/v1/verify-payment?preference_id=TEST_PREFERENCE_ID" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### 3. **Teste de Reconciliação**

```bash
curl -X POST https://your-project.supabase.co/functions/v1/reconcile \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## 🔄 **Integração com Frontend**

### 1. **Criar Pagamento**

```javascript
const createPayment = async (bookingData) => {
  try {
    const response = await fetch('/functions/v1/create-payment-preference', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify({
        owner_id: currentUser.id,
        booking_id: bookingData.id,
        price: bookingData.price,
        items: [{
          title: 'Agendamento de Quadra',
          quantity: 1,
          unit_price: bookingData.price
        }]
      })
    });

    const data = await response.json();
    
    if (data.success) {
      // Redirecionar para pagamento
      window.location.href = data.init_point;
    }
  } catch (error) {
    console.error('Erro ao criar pagamento:', error);
  }
};
```

### 2. **Verificar Status**

```javascript
const checkPaymentStatus = async (preferenceId) => {
  try {
    const response = await fetch(`/functions/v1/verify-payment?preference_id=${preferenceId}`, {
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    });
    
    const data = await response.json();
    
    if (data.status === 'confirmed') {
      showSuccessMessage('Pagamento confirmado!');
    } else if (data.status === 'not_confirmed') {
      setTimeout(() => checkPaymentStatus(preferenceId), 5000);
    }
  } catch (error) {
    console.error('Erro ao verificar pagamento:', error);
  }
};
```

## ⏰ **Agendamento de Reconciliação**

### Opção 1: Supabase Scheduled Functions

```sql
-- Criar função agendada (executa a cada 5 minutos)
SELECT cron.schedule(
  'reconcile-payments',
  '*/5 * * * *',
  'SELECT net.http_post(
    url:=''https://your-project.supabase.co/functions/v1/reconcile'',
    headers:=''{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}''
  );'
);
```

### Opção 2: Cron Externo

```bash
# Adicione ao crontab do servidor
*/5 * * * * curl -X POST https://your-project.supabase.co/functions/v1/reconcile -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

## 📊 **Monitoramento**

### 1. **Logs das Funções**

No painel do Supabase:
- Vá em **Edge Functions**
- Clique na função desejada
- Veja os logs em tempo real

### 2. **Métricas**

- **Tempo de resposta** < 100ms
- **Taxa de sucesso** > 99%
- **Webhooks processados** em tempo real

## 🔒 **Segurança**

### 1. **Autenticação**

- Use **Service Role Key** para operações internas
- Use **Anon Key** para operações do frontend
- Valide **assinaturas** de webhook

### 2. **RLS (Row Level Security)**

- Admins só veem seus próprios dados
- Políticas de segurança automáticas
- Isolamento completo entre usuários

## 🚨 **Troubleshooting**

### Problema: Função não responde

**Solução:**
1. Verificar logs no painel do Supabase
2. Verificar variáveis de ambiente
3. Testar localmente com `supabase functions serve`

### Problema: Webhook não é chamado

**Solução:**
1. Verificar URL do webhook no Mercado Pago
2. Verificar se a função está deployada
3. Testar manualmente com curl

### Problema: Pagamentos não são confirmados

**Solução:**
1. Executar reconciliação manual
2. Verificar chaves do admin
3. Verificar logs de webhook

## ✅ **Vantagens desta Arquitetura**

- 🚀 **Performance**: Edge Functions são instantâneas
- 🔒 **Segurança**: Integração nativa com Supabase
- 💰 **Custo**: Sem cold start, sem custos extras
- 🛠️ **Manutenção**: Código mais simples e direto
- 📊 **Monitoramento**: Logs integrados no Supabase
- 🔄 **Escalabilidade**: Auto-scaling automático

---

**🎉 Sistema pronto para produção com máxima performance e confiabilidade!**
