-- Tabela para registrar preferências de pagamento e seus status
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
CREATE POLICY "Admins can view their payment records" ON payment_records
  FOR SELECT USING (auth.uid() = owner_id);

-- Política: sistema pode inserir/atualizar registros (via service role)
CREATE POLICY "System can manage payment records" ON payment_records
  FOR ALL USING (true);

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
