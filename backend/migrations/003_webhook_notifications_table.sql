-- Tabela para registrar notificações de webhook processadas (idempotência)
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

-- Política: sistema pode gerenciar notificações (via service role)
CREATE POLICY "System can manage webhook notifications" ON webhook_notifications
  FOR ALL USING (true);
