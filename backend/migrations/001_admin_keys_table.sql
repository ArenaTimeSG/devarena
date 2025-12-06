-- Tabela para armazenar chaves de produção do Mercado Pago por admin
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
CREATE POLICY "Admins can manage their own keys" ON admin_mercado_pago_keys
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
