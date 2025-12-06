-- =====================================================
-- Adicionar campo payment_policy à tabela settings
-- =====================================================

-- Adicionar coluna payment_policy à tabela settings
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS payment_policy VARCHAR(20) NOT NULL DEFAULT 'sem_pagamento' 
CHECK (payment_policy IN ('sem_pagamento', 'obrigatorio', 'opcional'));

-- Adicionar comentário na coluna
COMMENT ON COLUMN public.settings.payment_policy IS 'Política de pagamento: sem_pagamento, obrigatorio, opcional';

-- Criar índice para melhor performance (opcional)
CREATE INDEX IF NOT EXISTS idx_settings_payment_policy ON public.settings(payment_policy);

-- Atualizar configurações existentes para ter o valor padrão
UPDATE public.settings 
SET payment_policy = 'sem_pagamento' 
WHERE payment_policy IS NULL;
