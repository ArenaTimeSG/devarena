-- IMPORTANTE: Execute este script em duas partes separadas
-- Parte 1: Adicionar novos valores ao enum (execute primeiro)

-- Atualizar enum de status dos agendamentos para incluir novos estados
ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'pending_payment';
ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'confirmed';
ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'expired';
ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'conflict_payment';

-- Adicionar coluna para armazenar dados do pagamento
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_data JSONB;
