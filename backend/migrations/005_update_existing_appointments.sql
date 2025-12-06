-- Parte 2: Atualizar agendamentos existentes (execute após a parte 1)
-- IMPORTANTE: Execute este script APÓS executar 004_update_appointments_status.sql

-- Atualizar agendamentos existentes com status 'pago' para 'confirmed'
UPDATE appointments 
SET status = 'confirmed' 
WHERE status = 'pago' AND payment_status = 'approved';

-- Atualizar agendamentos com payment_status 'pending' para status 'pending_payment'
UPDATE appointments 
SET status = 'pending_payment' 
WHERE payment_status = 'pending' AND status != 'confirmed';

-- Verificar quantos registros foram atualizados
SELECT 
  'confirmed' as status,
  COUNT(*) as count
FROM appointments 
WHERE status = 'confirmed'
UNION ALL
SELECT 
  'pending_payment' as status,
  COUNT(*) as count
FROM appointments 
WHERE status = 'pending_payment';
