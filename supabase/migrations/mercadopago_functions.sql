-- SUPABASE MIGRATIONS - MERCADO PAGO FUNCTIONS
-- -----------------------------------------------------------

-- 1. Tabela para armazenar chaves de produção do Mercado Pago por admin
CREATE TABLE IF NOT EXISTS admin_mercado_pago_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prod_access_token TEXT NOT NULL,
  public_key TEXT NOT NULL,
  webhook_secret TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(owner_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_admin_keys_owner_id ON admin_mercado_pago_keys(owner_id);

-- RLS (Row Level Security)
ALTER TABLE admin_mercado_pago_keys ENABLE ROW LEVEL SECURITY;

-- Política: apenas o próprio admin pode ver/editar suas chaves
CREATE POLICY IF NOT EXISTS "Admins can manage their own keys" ON admin_mercado_pago_keys
  FOR ALL USING (auth.uid() = owner_id);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_admin_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER trigger_update_admin_keys_updated_at
  BEFORE UPDATE ON admin_mercado_pago_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_keys_updated_at();

-- 2. Tabela para registrar preferências de pagamento e seus status
CREATE TABLE IF NOT EXISTS payment_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preference_id TEXT NOT NULL UNIQUE,
  init_point TEXT NOT NULL,
  external_reference TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'confirmed', 'expired', 'conflict_payment')),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'BRL',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 minutes')
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_payment_records_booking_id ON payment_records(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_owner_id ON payment_records(owner_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_preference_id ON payment_records(preference_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_external_reference ON payment_records(external_reference);
CREATE INDEX IF NOT EXISTS idx_payment_records_status ON payment_records(status);
CREATE INDEX IF NOT EXISTS idx_payment_records_expires_at ON payment_records(expires_at);

-- RLS (Row Level Security)
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;

-- Política: admins podem ver registros de seus agendamentos
CREATE POLICY IF NOT EXISTS "Admins can view their payment records" ON payment_records
  FOR SELECT USING (auth.uid() = owner_id);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_payment_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER trigger_update_payment_records_updated_at
  BEFORE UPDATE ON payment_records
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_records_updated_at();

-- 3. Tabela para registrar notificações de webhook processadas (idempotência)
CREATE TABLE IF NOT EXISTS webhook_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id TEXT NOT NULL UNIQUE,
  preference_id TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  raw_data JSONB NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_webhook_notifications_payment_id ON webhook_notifications(payment_id);
CREATE INDEX IF NOT EXISTS idx_webhook_notifications_preference_id ON webhook_notifications(preference_id);
CREATE INDEX IF NOT EXISTS idx_webhook_notifications_owner_id ON webhook_notifications(owner_id);
CREATE INDEX IF NOT EXISTS idx_webhook_notifications_booking_id ON webhook_notifications(booking_id);
CREATE INDEX IF NOT EXISTS idx_webhook_notifications_status ON webhook_notifications(status);

-- RLS (Row Level Security)
ALTER TABLE webhook_notifications ENABLE ROW LEVEL SECURITY;

-- 4. Atualizar enum de status dos agendamentos para incluir novos estados
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
