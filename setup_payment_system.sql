-- =====================================================
-- SCRIPT COMPLETO PARA CONFIGURAR SISTEMA DE PAGAMENTOS
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- 1. CRIAR TABELA PAYMENTS (se não existir)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  payment_method VARCHAR(50),
  mercado_pago_id VARCHAR(100),
  mercado_pago_status VARCHAR(50),
  mercado_pago_payment_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ADICIONAR COMENTÁRIOS NA TABELA PAYMENTS
-- =====================================================
COMMENT ON TABLE public.payments IS 'Tabela para armazenar informações de pagamentos dos agendamentos';
COMMENT ON COLUMN public.payments.appointment_id IS 'ID do agendamento relacionado';
COMMENT ON COLUMN public.payments.amount IS 'Valor do pagamento em reais';
COMMENT ON COLUMN public.payments.currency IS 'Moeda do pagamento (padrão: BRL)';
COMMENT ON COLUMN public.payments.status IS 'Status do pagamento: pending, approved, rejected, cancelled';
COMMENT ON COLUMN public.payments.payment_method IS 'Método de pagamento usado';
COMMENT ON COLUMN public.payments.mercado_pago_id IS 'ID da preferência no Mercado Pago';
COMMENT ON COLUMN public.payments.mercado_pago_status IS 'Status retornado pelo Mercado Pago';
COMMENT ON COLUMN public.payments.mercado_pago_payment_id IS 'ID do pagamento no Mercado Pago';

-- 3. CRIAR ÍNDICES PARA A TABELA PAYMENTS
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_payments_appointment_id ON public.payments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_mercado_pago_id ON public.payments(mercado_pago_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at);

-- 4. CRIAR FUNÇÃO E TRIGGER PARA UPDATED_AT
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Remover trigger existente se houver e criar novamente
DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;
CREATE TRIGGER update_payments_updated_at 
    BEFORE UPDATE ON public.payments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 5. ADICIONAR COLUNA PAYMENT_STATUS NA TABELA APPOINTMENTS
-- =====================================================
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'not_required' 
CHECK (payment_status IN ('not_required', 'pending', 'approved', 'failed'));

-- 6. ADICIONAR COMENTÁRIO NA NOVA COLUNA
-- =====================================================
COMMENT ON COLUMN public.appointments.payment_status IS 'Status do pagamento do agendamento: not_required, pending, approved, failed. Quando pago, o status principal vira "pago"';

-- 7. CRIAR ÍNDICE PARA A NOVA COLUNA
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_appointments_payment_status ON public.appointments(payment_status);

-- 8. ADICIONAR COLUNA UPDATED_AT NA TABELA APPOINTMENTS (se não existir)
-- =====================================================
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 9. CRIAR TRIGGER PARA UPDATED_AT NA TABELA APPOINTMENTS
-- =====================================================
DROP TRIGGER IF EXISTS update_appointments_updated_at ON public.appointments;
CREATE TRIGGER update_appointments_updated_at 
    BEFORE UPDATE ON public.appointments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 10. ATUALIZAR AGENDAMENTOS EXISTENTES
-- =====================================================
UPDATE public.appointments 
SET payment_status = 'not_required' 
WHERE payment_status IS NULL;

-- 11. VERIFICAR SE TUDO FOI CRIADO CORRETAMENTE
-- =====================================================
SELECT 'Tabela payments criada com sucesso!' as status;
SELECT 'Coluna payment_status adicionada com sucesso!' as status;
SELECT 'Coluna updated_at adicionada com sucesso!' as status;
SELECT 'Triggers criados com sucesso!' as status;

-- 12. MOSTRAR ESTRUTURA DAS TABELAS
-- =====================================================
SELECT 'Estrutura da tabela appointments:' as info;
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'appointments' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'Estrutura da tabela payments:' as info;
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'payments' AND table_schema = 'public'
ORDER BY ordinal_position;
