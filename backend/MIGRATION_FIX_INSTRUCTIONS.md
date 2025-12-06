# 🔧 Instruções para Corrigir Erro de Migração

## ❌ Problema Identificado

O erro `unsafe use of new value "confirmed" of enum type appointment_status` ocorre porque o PostgreSQL não permite usar novos valores de enum na mesma transação em que eles são criados.

## ✅ Soluções Disponíveis

### Opção 1: Usar a Migração Corrigida (Recomendado)

Execute a migração corrigida que resolve o problema:

```sql
-- Execute este script no Supabase SQL Editor:
-- 004_update_appointments_status_fixed.sql
```

Esta migração usa blocos `DO $$` para contornar o problema de transação.

### Opção 2: Executar em Duas Partes

Se a Opção 1 não funcionar, execute em duas partes separadas:

**Parte 1 - Adicionar valores ao enum:**
```sql
-- Execute primeiro no Supabase SQL Editor:
ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'pending_payment';
ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'confirmed';
ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'expired';
ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'conflict_payment';

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_data JSONB;
```

**Parte 2 - Atualizar dados (execute APÓS a Parte 1):**
```sql
-- Execute depois no Supabase SQL Editor:
UPDATE appointments 
SET status = 'confirmed' 
WHERE status = 'pago' AND payment_status = 'approved';

UPDATE appointments 
SET status = 'pending_payment' 
WHERE payment_status = 'pending' AND status != 'confirmed';
```

### Opção 3: Executar via Script

Use o script de migrações atualizado:

```bash
cd backend
node scripts/run-migrations.js
```

## 🚀 Passos para Resolver

### 1. No Supabase SQL Editor

1. Acesse o painel do Supabase
2. Vá em "SQL Editor"
3. Execute a migração corrigida: `004_update_appointments_status_fixed.sql`

### 2. Verificar se Funcionou

Execute esta query para verificar:

```sql
-- Verificar se os novos valores foram adicionados ao enum
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'appointment_status')
ORDER BY enumlabel;

-- Verificar se a coluna payment_data foi adicionada
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'appointments' AND column_name = 'payment_data';

-- Verificar quantos agendamentos foram atualizados
SELECT status, COUNT(*) as count
FROM appointments 
GROUP BY status
ORDER BY status;
```

### 3. Se Ainda Houver Erro

Execute manualmente no Supabase SQL Editor:

```sql
-- Verificar valores atuais do enum
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'appointment_status');

-- Adicionar valores um por vez se necessário
ALTER TYPE appointment_status ADD VALUE 'pending_payment';
-- Aguardar alguns segundos
ALTER TYPE appointment_status ADD VALUE 'confirmed';
-- Aguardar alguns segundos
ALTER TYPE appointment_status ADD VALUE 'expired';
-- Aguardar alguns segundos
ALTER TYPE appointment_status ADD VALUE 'conflict_payment';
```

## 🔍 Verificação Final

Após executar a migração, verifique se tudo está funcionando:

```sql
-- 1. Verificar enum atualizado
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'appointment_status')
ORDER BY enumlabel;

-- 2. Verificar coluna adicionada
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'appointments' 
AND column_name IN ('payment_data', 'status');

-- 3. Verificar dados atualizados
SELECT 
  status,
  payment_status,
  COUNT(*) as count
FROM appointments 
GROUP BY status, payment_status
ORDER BY status, payment_status;
```

## 📋 Resultado Esperado

Após a migração bem-sucedida, você deve ver:

1. **Enum atualizado** com os novos valores:
   - `agendado`
   - `cancelado`
   - `confirmed`
   - `conflict_payment`
   - `expired`
   - `pending_payment`
   - `pago`

2. **Coluna `payment_data`** adicionada à tabela `appointments`

3. **Dados atualizados**:
   - Agendamentos com `status = 'pago'` e `payment_status = 'approved'` → `status = 'confirmed'`
   - Agendamentos com `payment_status = 'pending'` → `status = 'pending_payment'`

## 🆘 Se Nada Funcionar

Se todas as opções falharem, execute manualmente no Supabase:

1. Vá em "Table Editor" > "appointments"
2. Adicione a coluna `payment_data` como `JSONB`
3. Atualize os registros manualmente usando a interface

---

**✅ Após resolver, o sistema estará pronto para usar os novos estados de agendamento!**
