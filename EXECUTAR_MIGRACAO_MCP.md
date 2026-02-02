# 🚀 Executar Migração via MCP ou SQL Editor

## ⚡ Método Rápido: SQL Editor do Supabase

### Passo a Passo:

1. **Acesse o Supabase Dashboard:**
   - URL: https://supabase.com/dashboard
   - Faça login e selecione seu projeto

2. **Abra o SQL Editor:**
   - No menu lateral, clique em **"SQL Editor"**
   - Clique em **"New query"**

3. **Execute a Migração:**
   - Abra o arquivo: `supabase/migrations/COMBINED_COURTS_MIGRATION.sql`
   - **Copie TODO o conteúdo** (179 linhas)
   - **Cole** no SQL Editor
   - Clique em **"RUN"** ou pressione **Ctrl+Enter**

4. **Aguarde a execução:**
   - Você verá mensagens de sucesso no console
   - Procure por: `✅ Migration completed successfully!`

---

## ✅ Verificação Pós-Execução

Execute esta query no SQL Editor para verificar:

```sql
SELECT 
  (SELECT COUNT(*) FROM courts) as total_courts,
  (SELECT COUNT(*) FROM appointments WHERE court_id IS NOT NULL) as appointments_with_court,
  (SELECT COUNT(*) FROM courts WHERE name = 'Quadra 1') as default_courts;
```

**Resultado esperado:**
- `total_courts` > 0
- `appointments_with_court` > 0 (ou igual ao total de appointments)
- `default_courts` > 0

---

## 📋 Conteúdo da Migração

O arquivo `supabase/migrations/COMBINED_COURTS_MIGRATION.sql` contém:

1. ✅ Criação da tabela `courts`
2. ✅ Configuração de RLS (Row Level Security)
3. ✅ Criação de índices
4. ✅ Adição do campo `court_id` em `appointments`
5. ✅ Criação automática de "Quadra 1" para usuários existentes
6. ✅ Vinculação de agendamentos existentes à "Quadra 1"

---

## 🔄 Após Executar

1. **Recarregue a aplicação** (se estiver rodando)
2. **Acesse** `/settings` → Aba "Modalidades" → "Gerenciar Quadras"
3. **Verifique** se a "Quadra 1" aparece automaticamente
4. **Teste** criando uma nova quadra

---

## 📁 Arquivo da Migração

**Localização:** `supabase/migrations/COMBINED_COURTS_MIGRATION.sql`

Este arquivo contém **TODAS** as migrações necessárias em um único arquivo SQL que pode ser executado de uma vez.

---

## ⚠️ Nota sobre MCP

Se você tem acesso a uma ferramenta MCP do Supabase que permite executar SQL diretamente, você pode usar o conteúdo do arquivo `COMBINED_COURTS_MIGRATION.sql` diretamente através dessa ferramenta.

O arquivo está pronto para execução e contém todos os comandos necessários em ordem correta.
