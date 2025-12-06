-- =====================================================
-- Criação da tabela online_reservations
-- =====================================================

-- Criar tabela para reservas online
CREATE TABLE IF NOT EXISTS public.online_reservations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    modalidade_id UUID NOT NULL REFERENCES public.modalities(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    horario TIME NOT NULL,
    cliente_nome VARCHAR(255) NOT NULL,
    cliente_email VARCHAR(255) NOT NULL,
    cliente_telefone VARCHAR(20) NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'confirmada', 'cancelada', 'realizada')),
    auto_confirmada BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_online_reservations_admin_user_id ON public.online_reservations(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_online_reservations_modalidade_id ON public.online_reservations(modalidade_id);
CREATE INDEX IF NOT EXISTS idx_online_reservations_data ON public.online_reservations(data);
CREATE INDEX IF NOT EXISTS idx_online_reservations_status ON public.online_reservations(status);
CREATE INDEX IF NOT EXISTS idx_online_reservations_admin_data ON public.online_reservations(admin_user_id, data);

-- Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_online_reservations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar updated_at
CREATE TRIGGER trigger_update_online_reservations_updated_at
    BEFORE UPDATE ON public.online_reservations
    FOR EACH ROW
    EXECUTE FUNCTION update_online_reservations_updated_at();

-- Configurar RLS (Row Level Security)
ALTER TABLE public.online_reservations ENABLE ROW LEVEL SECURITY;

-- Política para administradores verem suas próprias reservas
CREATE POLICY "Admins can view their own online reservations" ON public.online_reservations
    FOR SELECT USING (
        auth.uid() = admin_user_id
    );

-- Política para administradores inserirem reservas (para testes)
CREATE POLICY "Admins can insert online reservations" ON public.online_reservations
    FOR INSERT WITH CHECK (
        auth.uid() = admin_user_id
    );

-- Política para administradores atualizarem suas reservas
CREATE POLICY "Admins can update their own online reservations" ON public.online_reservations
    FOR UPDATE USING (
        auth.uid() = admin_user_id
    );

-- Política para permitir inserção pública (para clientes fazerem reservas)
CREATE POLICY "Public can insert online reservations" ON public.online_reservations
    FOR INSERT WITH CHECK (true);

-- Comentários na tabela
COMMENT ON TABLE public.online_reservations IS 'Tabela para armazenar reservas feitas online pelos clientes';
COMMENT ON COLUMN public.online_reservations.admin_user_id IS 'ID do usuário administrador da agenda';
COMMENT ON COLUMN public.online_reservations.modalidade_id IS 'ID da modalidade selecionada';
COMMENT ON COLUMN public.online_reservations.data IS 'Data da reserva';
COMMENT ON COLUMN public.online_reservations.horario IS 'Horário da reserva';
COMMENT ON COLUMN public.online_reservations.cliente_nome IS 'Nome do cliente';
COMMENT ON COLUMN public.online_reservations.cliente_email IS 'Email do cliente';
COMMENT ON COLUMN public.online_reservations.cliente_telefone IS 'Telefone do cliente';
COMMENT ON COLUMN public.online_reservations.valor IS 'Valor da reserva';
COMMENT ON COLUMN public.online_reservations.status IS 'Status da reserva: pendente, confirmada, cancelada, realizada';
COMMENT ON COLUMN public.online_reservations.auto_confirmada IS 'Indica se a reserva foi confirmada automaticamente';
