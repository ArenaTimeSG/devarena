# 🔧 CONFIGURAR VARIÁVEIS DE AMBIENTE NO VERCEL

**Problema:** A aplicação está falhando porque as variáveis de ambiente do Supabase não estão configuradas no Vercel.

---

## ⚡ SOLUÇÃO RÁPIDA

### 1. Acesse o Painel do Vercel

1. Vá para: https://vercel.com/dashboard
2. Faça login na sua conta
3. Selecione o projeto **arenadev** (ou o nome do seu projeto)

### 2. Configure as Variáveis de Ambiente

1. No projeto, clique em **Settings** (Configurações)
2. No menu lateral, clique em **Environment Variables** (Variáveis de Ambiente)
3. Adicione as seguintes variáveis:

#### Variáveis Obrigatórias para Frontend:

| Nome | Valor | Ambiente |
|------|-------|----------|
| `VITE_SUPABASE_URL` | `https://bnonmzdwqdqjkdoyulqd.supabase.co` | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJub25temR3cWRxamtkb3l1bHFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MzE3MjMsImV4cCI6MjA4MDEwNzcyM30.HHCK1_PlhVwcUofTBngX3ChoQxEXCfToolHTrePmfj4` | Production, Preview, Development |

**⚠️ IMPORTANTE:**
- Marque todas as opções: **Production**, **Preview** e **Development**
- Após adicionar, você precisa fazer um novo deploy para as variáveis entrarem em vigor

### 3. Fazer Novo Deploy

Após adicionar as variáveis:

1. Vá para a aba **Deployments**
2. Clique nos **3 pontos** do último deployment
3. Clique em **Redeploy**
4. Ou faça um novo commit e push (o Vercel fará deploy automático)

---

## 📋 VARIÁVEIS COMPLETAS (Opcional - para Backend)

Se você também tem o backend no Vercel, configure estas variáveis também:

| Nome | Valor | Descrição |
|------|-------|-----------|
| `SUPABASE_URL` | `https://bnonmzdwqdqjkdoyulqd.supabase.co` | URL do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | `sua_service_role_key` | Chave de serviço do Supabase |
| `JWT_SECRET` | `gerar_chave_segura` | Chave para JWT (gerar com: `openssl rand -base64 64`) |
| `ALLOWED_ORIGINS` | `https://arenadev.vercel.app` | Origens permitidas para CORS |
| `FRONTEND_URL` | `https://arenadev.vercel.app` | URL do frontend |
| `WEBHOOK_URL` | `https://seu-backend.vercel.app` | URL do backend para webhooks |

---

## 🔍 VERIFICAR SE ESTÁ FUNCIONANDO

Após o redeploy:

1. Acesse: https://arenadev.vercel.app/dashboard
2. Abra o Console do navegador (F12)
3. Não deve mais aparecer o erro de variáveis não configuradas
4. A aplicação deve carregar normalmente

---

## 🚨 TROUBLESHOOTING

### Erro persiste após configurar?

1. **Verifique se as variáveis foram salvas:**
   - Volte em Settings > Environment Variables
   - Confirme que estão listadas

2. **Verifique se fez redeploy:**
   - As variáveis só entram em vigor após novo deploy
   - Vá em Deployments > Redeploy

3. **Verifique os nomes das variáveis:**
   - Devem começar com `VITE_` para o frontend
   - Maiúsculas e minúsculas importam

4. **Verifique o ambiente:**
   - Certifique-se de marcar Production, Preview e Development

---

## 📝 NOTAS

- ✅ Variáveis com prefixo `VITE_` são expostas ao cliente (frontend)
- ✅ Variáveis sem `VITE_` são apenas para o servidor (backend)
- ✅ Nunca commite o arquivo `.env` no Git
- ✅ Use valores diferentes para desenvolvimento e produção quando possível

---

**Última atualização:** 06/02/2026
