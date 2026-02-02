# 🏀 Implementação: Sistema de Múltiplas Quadras

**Data:** 1 de Fevereiro de 2026  
**Status:** ✅ Implementado

---

## 📋 Resumo

Foi implementado suporte completo para múltiplas quadras no sistema de agendamento, mantendo total compatibilidade com o funcionamento existente. Cada quadra possui sua própria agenda totalmente isolada.

---

## ✅ Funcionalidades Implementadas

### 1. Banco de Dados

#### Tabela `courts` (Quadras)
- ✅ Criada tabela `courts` com campos:
  - `id` (UUID, PK)
  - `user_id` (UUID, FK → auth.users)
  - `name` (VARCHAR) - Nome da quadra (ex: "Quadra 1", "Quadra 2")
  - `description` (TEXT, nullable) - Descrição opcional
  - `is_active` (BOOLEAN) - Se a quadra está ativa
  - `created_at`, `updated_at` (TIMESTAMP)

- ✅ Constraints:
  - Nome único por usuário (`unique_court_name_per_user`)
  - Índices para performance (`idx_courts_user_id`, `idx_courts_is_active`)

- ✅ Row Level Security (RLS):
  - Usuários só podem ver/editar suas próprias quadras

#### Campo `court_id` em `appointments`
- ✅ Adicionado campo `court_id` (UUID, nullable, FK → courts)
- ✅ Índices criados para performance
- ✅ Migração automática cria "Quadra 1" padrão para usuários existentes
- ✅ Agendamentos existentes são vinculados à "Quadra 1" automaticamente

### 2. Hooks Customizados

#### `useCourts`
- ✅ Buscar todas as quadras do usuário
- ✅ Criar nova quadra
- ✅ Atualizar quadra existente
- ✅ Deletar quadra (soft delete - marca como inativa)
- ✅ Obter ou criar quadra padrão ("Quadra 1")

#### `useSelectedCourt`
- ✅ Gerencia a quadra selecionada no contexto da aplicação
- ✅ Persiste seleção no localStorage
- ✅ Cria automaticamente "Quadra 1" se não existir
- ✅ Seleciona automaticamente a primeira quadra disponível

#### `useAppointments` (Atualizado)
- ✅ Aceita opção `courtId` para filtrar agendamentos por quadra
- ✅ Mantém compatibilidade: se não fornecido `courtId`, retorna todos os agendamentos
- ✅ Filtra automaticamente por quadra selecionada quando usado com `useSelectedCourt`

### 3. Componentes

#### `CourtSelector`
- ✅ Componente de seleção de quadra
- ✅ Exibe todas as quadras ativas do usuário
- ✅ Mostra status visual (ativa/inativa)
- ✅ Integrado com `useSelectedCourt` para persistência

#### `CourtsManagement`
- ✅ Interface completa de gerenciamento de quadras
- ✅ Criar nova quadra
- ✅ Editar quadra existente
- ✅ Excluir quadra (com validação de agendamentos futuros)
- ✅ Lista todas as quadras em cards visuais

### 4. Páginas

#### `/courts` - Gerenciamento de Quadras
- ✅ Página dedicada para gerenciar quadras
- ✅ Acessível via `/settings` → Aba "Modalidades" → "Gerenciar Quadras"
- ✅ Interface completa com CRUD de quadras

#### Dashboard (Atualizado)
- ✅ Seletor de quadra no topo
- ✅ Filtra agendamentos automaticamente pela quadra selecionada
- ✅ Mantém compatibilidade: funciona normalmente mesmo sem seleção

#### Settings (Atualizado)
- ✅ Card para acessar gerenciamento de quadras
- ✅ Link direto para `/courts`

### 5. Tipos TypeScript

- ✅ Atualizado `Database` types para incluir tabela `courts`
- ✅ Atualizado `appointments` types para incluir `court_id`
- ✅ Interfaces criadas para `Court`, `CreateCourtData`, `UpdateCourtData`

---

## 🔄 Compatibilidade

### ✅ Compatibilidade Total com Sistema Existente

1. **Quadra Padrão Automática:**
   - Migração cria "Quadra 1" para todos os usuários existentes
   - Agendamentos existentes são vinculados à "Quadra 1"
   - Sistema funciona normalmente mesmo sem seleção explícita de quadra

2. **Comportamento Padrão:**
   - Se não houver `court_id` especificado, o sistema usa a quadra selecionada
   - Se não houver quadra selecionada, usa "Quadra 1" automaticamente
   - Se "Quadra 1" não existir, cria automaticamente

3. **Queries Retrocompatíveis:**
   - Queries antigas continuam funcionando
   - Filtro por quadra é opcional
   - Agendamentos sem `court_id` ainda funcionam (mas são vinculados à quadra padrão)

---

## 📝 Como Usar

### Para Administradores

1. **Criar Nova Quadra:**
   - Acesse `/settings` → Aba "Modalidades"
   - Clique em "Gerenciar Quadras"
   - Clique em "Nova Quadra"
   - Preencha nome e descrição (opcional)
   - Salve

2. **Selecionar Quadra no Dashboard:**
   - No Dashboard, use o seletor no topo da página
   - Selecione a quadra desejada
   - Todos os agendamentos serão filtrados automaticamente

3. **Gerenciar Quadras:**
   - Acesse `/courts` ou via Settings
   - Edite ou exclua quadras conforme necessário
   - **Nota:** Quadras com agendamentos futuros não podem ser excluídas

### Para Desenvolvedores

1. **Usar Hook de Quadras:**
```typescript
import { useCourts } from '@/hooks/useCourts';

const { courts, createCourt, updateCourt, deleteCourt } = useCourts();
```

2. **Usar Quadra Selecionada:**
```typescript
import { useSelectedCourt } from '@/hooks/useSelectedCourt';

const { selectedCourtId, selectedCourt, setSelectedCourtId } = useSelectedCourt();
```

3. **Filtrar Agendamentos por Quadra:**
```typescript
import { useAppointments } from '@/hooks/useAppointments';
import { useSelectedCourt } from '@/hooks/useSelectedCourt';

const { selectedCourtId } = useSelectedCourt();
const { appointments } = useAppointments({ courtId: selectedCourtId });
```

4. **Criar Agendamento com Quadra:**
```typescript
const { selectedCourtId } = useSelectedCourt();
const { createAppointment } = useAppointments({ courtId: selectedCourtId });

await createAppointment({
  client_id: '...',
  modality_id: '...',
  date: '...',
  end_time: '...',
  court_id: selectedCourtId || null, // Opcional, será usado automaticamente se não fornecido
});
```

---

## 🗄️ Migrações

### `20250201000000_create_courts_table.sql`
- Cria tabela `courts`
- Configura RLS policies
- Cria triggers para `updated_at`

### `20250201000001_add_court_id_to_appointments.sql`
- Adiciona campo `court_id` em `appointments`
- Cria índices para performance
- Cria função para criar quadra padrão
- Migra agendamentos existentes para "Quadra 1"

---

## ⚠️ Observações Importantes

1. **Isolamento de Agendas:**
   - Cada quadra tem sua própria agenda completamente isolada
   - Agendamentos de uma quadra não aparecem na outra
   - Bloqueios de horário são por quadra (se implementado no futuro)

2. **Validações:**
   - Não é possível excluir quadra com agendamentos futuros
   - Nome da quadra deve ser único por usuário
   - Quadras inativas não aparecem no seletor

3. **Performance:**
   - Índices criados para otimizar queries por `court_id`
   - Cache do TanStack Query mantém dados sincronizados
   - Queries filtradas por quadra são mais eficientes

---

## 🚀 Próximos Passos (Opcional)

- [ ] Bloqueios de horário por quadra (atualmente são globais)
- [ ] Relatórios financeiros por quadra
- [ ] Estatísticas por quadra no Dashboard
- [ ] Horários de funcionamento diferentes por quadra
- [ ] Modalidades específicas por quadra

---

## ✅ Checklist de Implementação

- [x] Migração para tabela `courts`
- [x] Migração para adicionar `court_id` em `appointments`
- [x] Atualizar tipos TypeScript
- [x] Criar hook `useCourts`
- [x] Criar hook `useSelectedCourt`
- [x] Atualizar `useAppointments` para filtrar por quadra
- [x] Criar componente `CourtSelector`
- [x] Criar componente `CourtsManagement`
- [x] Criar página `/courts`
- [x] Adicionar seletor no Dashboard
- [x] Atualizar `NewAppointmentModal` para incluir `court_id`
- [x] Atualizar Settings com link para quadras
- [x] Garantir compatibilidade com sistema existente

---

**Status:** ✅ **Implementação Completa e Funcional**
