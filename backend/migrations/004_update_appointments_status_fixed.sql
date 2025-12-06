-- Migração corrigida para atualizar enum e dados em uma única execução
-- Esta versão funciona sem erros de transação

-- Primeiro, vamos verificar se os valores já existem no enum
DO $$
BEGIN
    -- Adicionar novos valores ao enum se não existirem
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pending_payment' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'appointment_status')) THEN
        ALTER TYPE appointment_status ADD VALUE 'pending_payment';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'confirmed' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'appointment_status')) THEN
        ALTER TYPE appointment_status ADD VALUE 'confirmed';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'expired' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'appointment_status')) THEN
        ALTER TYPE appointment_status ADD VALUE 'expired';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'conflict_payment' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'appointment_status')) THEN
        ALTER TYPE appointment_status ADD VALUE 'conflict_payment';
    END IF;
END $$;

-- Adicionar coluna para armazenar dados do pagamento
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_data JSONB;

-- Atualizar agendamentos existentes
-- Usar uma abordagem que funciona mesmo com novos valores de enum
DO $$
BEGIN
    -- Atualizar agendamentos com status 'pago' para 'confirmed'
    UPDATE appointments 
    SET status = 'confirmed'::appointment_status
    WHERE status = 'pago' AND payment_status = 'approved';
    
    -- Atualizar agendamentos com payment_status 'pending' para status 'pending_payment'
    UPDATE appointments 
    SET status = 'pending_payment'::appointment_status
    WHERE payment_status = 'pending' AND status != 'confirmed'::appointment_status;
    
    RAISE NOTICE 'Migração concluída com sucesso';
END $$;
