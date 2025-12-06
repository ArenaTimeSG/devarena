# Mudanças: Agendamentos com Horários Flexíveis

## Resumo

Este documento descreve as mudanças implementadas para permitir agendamentos com horários em qualquer minuto (não apenas intervalos de 1 hora) e exibir blocos proporcionais no calendário.

## ✅ Mudanças Implementadas

### 1. Banco de Dados
- ✅ Migração criada: `20250128000000_add_end_time_to_appointments.sql`
  - Adiciona campo `end_time` à tabela `appointments`
  - Define `end_time` para agendamentos existentes como `date + 1 hora` (backward compatibility)
  - Adiciona constraint para garantir `end_time > date`
  - Cria índices para melhor performance

### 2. Tipos TypeScript
- ✅ Atualizado `src/integrations/supabase/types.ts`
  - Adicionado `end_time: string` nos tipos Row, Insert e Update da tabela appointments
- ✅ Atualizado `src/hooks/useAppointments.ts`
  - Interface `AppointmentWithModality` agora inclui `end_time`
  - Interface `CreateAppointmentData` agora inclui `end_time`
  - Interface `UpdateAppointmentData` agora inclui `end_time`
  - Hook `createAppointment` atualizado para incluir `end_time` na criação

### 3. Utilitários
- ✅ Criado `src/utils/appointmentPosition.ts`
  - `calculateAppointmentHeight()`: Calcula altura proporcional baseada na duração
  - `calculateAppointmentTopOffset()`: Calcula posição vertical dentro da célula de hora
  - `appointmentsOverlap()`: Verifica sobreposição entre agendamentos
  - `validateAppointmentTime()`: Valida horários de início e fim
  - `formatTimeRange()`: Formata intervalo para exibição "HH:mm → HH:mm"

## 🔄 Mudanças Pendentes

### 4. Modal de Criação/Edição (NewAppointmentModal)
**Status:** Parcialmente implementado

**O que precisa ser feito:**
- [ ] Adicionar campo `end_time` no formulário
- [ ] Permitir seleção de horário de início com minutos (input type="time")
- [ ] Permitir seleção de horário de fim com minutos (input type="time")
- [ ] Validar que `end_time > start_time`
- [ ] Validar que não há sobreposição com outros agendamentos
- [ ] Atualizar lógica de criação para incluir `end_time`
- [ ] Para agendamentos recorrentes, calcular `end_time` para cada ocorrência

**Código a modificar:**
- `src/components/NewAppointmentModal.tsx`
  - Adicionar campos de hora de início e fim no formData
  - Substituir input de hora única por dois inputs (início e fim)
  - Adicionar validação usando `validateAppointmentTime()` e `appointmentsOverlap()`
  - Atualizar `handleSubmit()` para criar agendamento com `end_time`
  - Atualizar `generateRecurringAppointments()` para incluir `end_time`

### 5. Calendário Responsivo (ResponsiveCalendar)
**Status:** Não implementado

**O que precisa ser feito:**
- [ ] Refatorar exibição de blocos para usar posicionamento absoluto
- [ ] Calcular altura proporcional usando `calculateAppointmentHeight()`
- [ ] Calcular posição vertical usando `calculateAppointmentTopOffset()`
- [ ] Permitir que blocos ocupem múltiplas células de hora
- [ ] Atualizar lógica `getAppointmentForSlot()` para encontrar agendamentos por intervalo, não apenas por hora

**Código a modificar:**
- `src/components/ResponsiveCalendar.tsx`
  - Refatorar renderização de células para usar posicionamento absoluto
  - Implementar cálculo de posição e altura proporcional
  - Atualizar `getAppointmentForSlot()` para buscar por intervalo de tempo

### 6. Dashboard (Visualização Semanal)
**Status:** Não implementado

**O que precisa ser feito:**
- [ ] Atualizar `getAppointmentForSlot()` para buscar agendamentos por intervalo
- [ ] Refatorar renderização de células para exibir blocos proporcionais
- [ ] Permitir que blocos ocupem múltiplas células

**Código a modificar:**
- `src/pages/Dashboard.tsx`
  - Atualizar `getAppointmentForSlot()` para usar intervalo de tempo
  - Refatorar renderização de células do calendário

### 7. Validações de Sobreposição
**Status:** Parcialmente implementado (função utilitária criada)

**O que precisa ser feito:**
- [ ] Implementar validação no backend (função SQL ou trigger)
- [ ] Implementar validação no frontend antes de criar/editar
- [ ] Mostrar mensagens de erro claras quando houver sobreposição

**Código a modificar:**
- Criar função SQL no Supabase para validar sobreposição
- Atualizar `NewAppointmentModal.tsx` para validar antes de criar
- Atualizar `AppointmentDetailsModal.tsx` para validar antes de editar

### 8. Hooks de Horários Disponíveis
**Status:** Não implementado

**O que precisa ser feito:**
- [ ] Atualizar `useAvailableHours` para trabalhar com intervalos de minutos
- [ ] Considerar agendamentos parciais ao calcular disponibilidade
- [ ] Verificar sobreposições parciais, não apenas horários exatos

**Código a modificar:**
- `src/hooks/useAvailableHours.ts`
- `src/hooks/useAvailableHoursSync.ts`
- `src/hooks/useWorkingHours.ts`

### 9. Sistema de Bloqueios
**Status:** Não implementado

**O que precisa ser feito:**
- [ ] Permitir bloquear intervalos com minutos específicos
- [ ] Atualizar validação de bloqueios para considerar intervalos
- [ ] Permitir bloqueios que cruzam múltiplas horas

**Código a modificar:**
- `src/hooks/useWorkingHours.ts` (funções de bloqueio)
- `src/components/BlockTimeModal.tsx`

### 10. AppointmentCard (Exibição)
**Status:** Não implementado

**O que precisa ser feito:**
- [ ] Atualizar para mostrar intervalo de horários: "18:15 → 19:45"
- [ ] Mostrar duração do agendamento

**Código a modificar:**
- `src/components/animated/AppointmentCard.tsx`

### 11. AppointmentDetailsModal (Edição)
**Status:** Não implementado

**O que precisa ser feito:**
- [ ] Permitir editar horário de início e fim com minutos
- [ ] Validar que não há sobreposição após edição
- [ ] Atualizar lógica de atualização para incluir `end_time`

**Código a modificar:**
- `src/components/AppointmentDetailsModal.tsx`

## 📋 Próximos Passos Recomendados

1. **Executar a migração no Supabase**
   - Aplicar `20250128000000_add_end_time_to_appointments.sql` no banco de dados

2. **Atualizar Modal de Criação**
   - Implementar seleção de horário de início e fim com minutos
   - Adicionar validações básicas

3. **Refatorar Calendário**
   - Implementar visualização proporcional dos blocos
   - Testar com diferentes durações

4. **Validações de Sobreposição**
   - Implementar no frontend e backend

5. **Testes**
   - Criar agendamentos com diferentes durações
   - Verificar sobreposições
   - Testar blocos proporcionais no calendário

## ⚠️ Notas Importantes

- A migração mantém compatibilidade com agendamentos existentes (define `end_time = date + 1 hora`)
- O campo `date` na tabela continua representando o horário de início (não foi renomeado para manter compatibilidade)
- Todas as interfaces TypeScript foram atualizadas para incluir `end_time`
- Os utilitários criados facilitam o cálculo de posições e validações

## 🔧 Funções Utilitárias Disponíveis

Ver `src/utils/appointmentPosition.ts` para funções prontas para uso:
- `calculateAppointmentHeight()` - Calcular altura proporcional
- `calculateAppointmentTopOffset()` - Calcular posição vertical
- `appointmentsOverlap()` - Verificar sobreposição
- `validateAppointmentTime()` - Validar horários
- `formatTimeRange()` - Formatar para exibição


