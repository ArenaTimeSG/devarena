# 🚀 Instruções de Deploy - Sistema Mercado Pago Produção

## 📋 Pré-requisitos

1. ✅ Conta no Mercado Pago com chaves de produção
2. ✅ Projeto no Supabase configurado
3. ✅ Conta no Vercel (ou outro provedor)
4. ✅ Node.js 18+ instalado localmente

## 🔧 Configuração Local

### 1. Instalar Dependências

```bash
cd backend
npm install
```

### 2. Configurar Variáveis de Ambiente

Copie o arquivo de exemplo e configure:

```bash
cp env.example .env
```

Edite o arquivo `.env` com suas configurações:

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Mercado Pago (Global - para compatibilidade)
MP_ACCESS_TOKEN=your-global-access-token

# URLs
WEBHOOK_URL=https://your-backend.vercel.app
FRONTEND_URL=https://your-frontend.vercel.app

# Criptografia (gere uma chave de 32 caracteres)
ENCRYPTION_KEY=your-32-character-encryption-key

# JWT (para autenticação)
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=24h
```

### 3. Executar Migrações

```bash
node scripts/run-migrations.js
```

### 4. Testar Localmente

```bash
npm run dev
```

Em outro terminal:

```bash
node examples/test-production-system.js
```

## 🌐 Deploy no Vercel

### 1. Conectar Repositório

1. Acesse [vercel.com](https://vercel.com)
2. Clique em "New Project"
3. Conecte seu repositório GitHub
4. Selecione a pasta `backend`

### 2. Configurar Variáveis de Ambiente

No painel do Vercel, vá em Settings > Environment Variables e adicione:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
MP_ACCESS_TOKEN=your-global-access-token
WEBHOOK_URL=https://your-backend.vercel.app
FRONTEND_URL=https://your-frontend.vercel.app
ENCRYPTION_KEY=your-32-character-encryption-key
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=24h
NODE_ENV=production
```

### 3. Deploy

1. Clique em "Deploy"
2. Aguarde o build completar
3. Anote a URL do deploy (ex: `https://your-backend.vercel.app`)

### 4. Configurar Webhook no Mercado Pago

1. Acesse o [painel do Mercado Pago](https://www.mercadopago.com.br/developers)
2. Vá em "Suas integrações" > "Webhooks"
3. Adicione a URL: `https://your-backend.vercel.app/api/notification/webhook`
4. Selecione os eventos: `payment`
5. Salve a configuração

## 🔑 Configuração das Chaves dos Admins

### 1. Via API (Recomendado)

```bash
curl -X POST https://your-backend.vercel.app/api/admin/keys \
  -H "Content-Type: application/json" \
  -H "x-user-id: admin-user-id" \
  -d '{
    "prod_access_token": "APP_USR-1234567890...",
    "public_key": "APP_USR-1234567890...",
    "webhook_secret": "your-webhook-secret"
  }'
```

### 2. Via Frontend

Implemente uma interface para que os admins configurem suas chaves:

```javascript
const saveAdminKeys = async (keys) => {
  const response = await fetch('/api/admin/keys', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify(keys)
  });
  
  return response.json();
};
```

## 🧪 Testes Pós-Deploy

### 1. Health Check

```bash
curl https://your-backend.vercel.app/api/health
```

### 2. Testar Criação de Preferência

```bash
curl -X POST https://your-backend.vercel.app/api/create-payment-preference \
  -H "Content-Type: application/json" \
  -d '{
    "owner_id": "admin-id",
    "booking_id": "booking-id",
    "price": 50.00
  }'
```

### 3. Testar Webhook

```bash
curl -X POST https://your-backend.vercel.app/api/notification/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "payment",
    "data": {
      "id": "test-payment-id"
    }
  }'
```

## 📊 Monitoramento

### 1. Logs do Vercel

- Acesse o painel do Vercel
- Vá em "Functions" > "View Function Logs"
- Monitore erros e performance

### 2. Logs do Supabase

- Acesse o painel do Supabase
- Vá em "Logs" para ver queries e erros

### 3. Métricas do Mercado Pago

- Acesse o painel do Mercado Pago
- Monitore transações e webhooks

## 🔒 Segurança

### 1. Autenticação JWT

Implemente autenticação adequada:

```javascript
// middleware/auth.js
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};
```

### 2. Rate Limiting

Implemente rate limiting para evitar abuso:

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // máximo 100 requests por IP
});

app.use('/api/', limiter);
```

### 3. Validação de Entrada

Sempre valide dados de entrada:

```javascript
const { body, validationResult } = require('express-validator');

const validatePayment = [
  body('owner_id').isUUID(),
  body('booking_id').isUUID(),
  body('price').isFloat({ min: 0.01 }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];
```

## 🚨 Troubleshooting

### Problema: Webhook não está sendo chamado

**Soluções:**
1. Verificar se a URL do webhook está correta
2. Verificar se o webhook está ativo no painel do MP
3. Testar com ngrok para desenvolvimento local
4. Verificar logs do Vercel

### Problema: Erro 401 no webhook

**Soluções:**
1. Verificar se o webhook_secret está correto
2. Verificar se a assinatura está sendo validada
3. Verificar logs de validação

### Problema: Pagamentos não são confirmados

**Soluções:**
1. Verificar se o cron job está rodando
2. Executar reconciliação manual
3. Verificar se as chaves do admin estão corretas
4. Verificar logs de processamento

### Problema: Conflitos de horário

**Soluções:**
1. Implementar verificação de disponibilidade
2. Usar transações no banco
3. Implementar retry logic
4. Notificar admin sobre conflitos

## 📞 Suporte

Para problemas ou dúvidas:

1. **Logs**: Verifique logs do Vercel e Supabase
2. **Documentação**: Consulte README_PRODUCTION.md
3. **Testes**: Use o script de exemplo
4. **Mercado Pago**: Consulte documentação oficial

## 🔄 Atualizações

Para atualizar o sistema:

1. Faça push das mudanças para o repositório
2. O Vercel fará deploy automático
3. Teste os endpoints após o deploy
4. Monitore logs por alguns minutos

---

**✅ Sistema pronto para produção!**

Após seguir todas as instruções, seu sistema estará:
- ✅ Configurado com chaves de produção
- ✅ Webhook funcionando
- ✅ Reconciliação automática ativa
- ✅ Monitoramento configurado
- ✅ Segurança implementada
