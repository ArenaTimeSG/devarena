# ⚡ EXECUTAR MIGRAÇÕES AGORA - Guia Rápido

## 🎯 Método Mais Rápido: SQL Editor do Supabase

### Passo 1: Abrir SQL Editor
1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Clique em **SQL Editor** no menu lateral

### Passo 2: Executar Migração Combinada
1. Abra o arquivo: `supabase/migrations/COMBINED_COURTS_MIGRATION.sql`
2. **Copie TODO o conteúdo** do arquivo
3. Cole no SQL Editor do Supabase
4. Clique em **RUN** (ou pressione Ctrl+Enter)

### Passo 3: Verificar Sucesso
Execute esta query para verificar:

```sql
-- Verificar tabela courts
SELECT COUNT(*) as total_courts FROM courts;

-- Verificar campo court_id
SELECT COUNT(*) as appointments_with_court 
FROM appointments 
WHERE court_id IS NOT NULL;

-- Verificar Quadra 1 criada
SELECT id, name, user_id, created_at 
FROM courts 
WHERE name = 'Quadra 1';
```

Se tudo estiver OK, você verá:
- ✅ `total_courts` > 0
- ✅ `appointments_with_court` > 0 (ou igual ao total de appointments)
- ✅ Pelo menos uma linha com `name = 'Quadra 1'`

---

## 🔄 Alternativa: Executar Migrações Separadas

Se preferir executar uma por vez:

### Migração 1: Criar Tabela Courts
1. Abra: `supabase/migrations/20250201000000_create_courts_table.sql`
2. Copie e execute no SQL Editor

### Migração 2: Adicionar court_id
1. Abra: `supabase/migrations/20250201000001_add_court_id_to_appointments.sql`
2. Copie e execute no SQL Editor

---

## ✅ Após Executar

1. **Recarregue a aplicação** (se estiver rodando)
2. **Acesse `/settings`** → Aba "Modalidades" → "Gerenciar Quadras"
3. **Verifique** se a "Quadra 1" aparece automaticamente
4. **Teste criando** uma nova quadra

---

## 🐛 Problemas?

### Erro: "relation courts does not exist"
- Execute a primeira migração primeiro

### Erro: "column court_id already exists"  
- Isso significa que a migração já foi executada parcialmente
- Continue com a próxima parte ou execute apenas o que falta

### Erro de permissão
- Certifique-se de estar usando uma conta com permissões de admin no Supabase

---

## 📞 Próximos Passos

Após executar as migrações:
1. ✅ Sistema está pronto para múltiplas quadras
2. ✅ "Quadra 1" foi criada automaticamente
3. ✅ Agendamentos existentes foram vinculados à "Quadra 1"
4. ✅ Você pode criar novas quadras em `/courts`
