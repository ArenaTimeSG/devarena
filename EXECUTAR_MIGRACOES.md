# 🚀 Executar Migrações de Múltiplas Quadras

## Opção 1: Via Supabase Dashboard (Recomendado)

### Passo 1: Acessar SQL Editor
1. Acesse o painel do Supabase: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor** no menu lateral

### Passo 2: Executar Primeira Migração
Copie e cole o conteúdo completo do arquivo:
```
supabase/migrations/20250201000000_create_courts_table.sql
```

Clique em **RUN** para executar.

### Passo 3: Executar Segunda Migração
Copie e cole o conteúdo completo do arquivo:
```
supabase/migrations/20250201000001_add_court_id_to_appointments.sql
```

Clique em **RUN** para executar.

### Passo 4: Verificar
Execute estas queries para verificar:

```sql
-- Verificar se a tabela courts foi criada
SELECT * FROM information_schema.tables 
WHERE table_name = 'courts';

-- Verificar se o campo court_id foi adicionado
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'appointments' AND column_name = 'court_id';

-- Verificar se a Quadra 1 foi criada para usuários existentes
SELECT u.id, u.email, c.id as court_id, c.name 
FROM auth.users u
LEFT JOIN public.courts c ON c.user_id = u.id
WHERE c.name = 'Quadra 1';
```

---

## Opção 2: Via Supabase CLI

Se você tem o Supabase CLI instalado:

```bash
# Navegar para a pasta do projeto
cd c:\devarena-1

# Executar migrações
supabase db push
```

---

## Opção 3: Via Script Node.js

```bash
# Instalar dependências se necessário
npm install

# Executar script
node scripts/run-courts-migrations.js
```

**Nota:** Este script requer que você tenha `SUPABASE_SERVICE_ROLE_KEY` no arquivo `.env`.

---

## ✅ Verificação Final

Após executar as migrações, verifique:

1. **Tabela courts existe:**
```sql
SELECT COUNT(*) FROM courts;
```

2. **Campo court_id existe em appointments:**
```sql
SELECT COUNT(*) FROM appointments WHERE court_id IS NOT NULL;
```

3. **Quadra padrão foi criada:**
```sql
SELECT * FROM courts WHERE name = 'Quadra 1';
```

---

## 🐛 Problemas Comuns

### Erro: "relation courts does not exist"
- Execute a primeira migração primeiro (`20250201000000_create_courts_table.sql`)

### Erro: "column court_id already exists"
- A migração já foi executada. Isso é normal, pode continuar.

### Erro de permissão RLS
- Certifique-se de estar usando a `SERVICE_ROLE_KEY` ou estar autenticado como admin

---

## 📞 Suporte

Se encontrar problemas, execute as migrações manualmente no SQL Editor do Supabase (Opção 1).
