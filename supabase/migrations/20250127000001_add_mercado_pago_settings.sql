-- =====================================================
-- Adicionar configurações do Mercado Pago por usuário
-- =====================================================

-- Adicionar colunas de configuração do Mercado Pago na tabela settings
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS mercado_pago_access_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS mercado_pago_public_key VARCHAR(255),
ADD COLUMN IF NOT EXISTS mercado_pago_webhook_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS mercado_pago_enabled BOOLEAN DEFAULT false;

-- Adicionar comentários
COMMENT ON COLUMN public.settings.mercado_pago_access_token IS 'Access Token do Mercado Pago para este usuário';
COMMENT ON COLUMN public.settings.mercado_pago_public_key IS 'Public Key do Mercado Pago para este usuário';
COMMENT ON COLUMN public.settings.mercado_pago_webhook_url IS 'URL do webhook personalizada (opcional)';
COMMENT ON COLUMN public.settings.mercado_pago_enabled IS 'Se o Mercado Pago está habilitado para este usuário';

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_settings_mercado_pago_enabled ON public.settings(mercado_pago_enabled);

-- Atualizar configurações existentes
UPDATE public.settings 
SET mercado_pago_enabled = false 
WHERE mercado_pago_enabled IS NULL;
