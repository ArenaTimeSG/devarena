-- =====================================================
-- Criação da tabela booking_clients para clientes autenticados
-- =====================================================

-- Criar tabela para clientes autenticados do agendamento online
CREATE TABLE IF NOT EXISTS public.booking_clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_booking_clients_email ON public.booking_clients(email);
CREATE INDEX IF NOT EXISTS idx_booking_clients_active ON public.booking_clients(is_active);

-- Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_booking_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar updated_at
CREATE TRIGGER trigger_update_booking_clients_updated_at
    BEFORE UPDATE ON public.booking_clients
    FOR EACH ROW
    EXECUTE FUNCTION update_booking_clients_updated_at();

-- Configurar RLS (Row Level Security)
ALTER TABLE public.booking_clients ENABLE ROW LEVEL SECURITY;

-- Política para clientes verem apenas seus próprios dados
CREATE POLICY "Clients can view their own data" ON public.booking_clients
    FOR SELECT USING (true);

-- Política para permitir inserção de novos clientes
CREATE POLICY "Public can insert booking clients" ON public.booking_clients
    FOR INSERT WITH CHECK (true);

-- Política para clientes atualizarem seus próprios dados
CREATE POLICY "Clients can update their own data" ON public.booking_clients
    FOR UPDATE USING (true);

-- Comentários na tabela
COMMENT ON TABLE public.booking_clients IS 'Tabela para armazenar clientes autenticados do agendamento online';
COMMENT ON COLUMN public.booking_clients.name IS 'Nome completo do cliente';
COMMENT ON COLUMN public.booking_clients.email IS 'Email único do cliente';
COMMENT ON COLUMN public.booking_clients.password_hash IS 'Hash da senha do cliente';
COMMENT ON COLUMN public.booking_clients.phone IS 'Telefone do cliente';
COMMENT ON COLUMN public.booking_clients.is_active IS 'Se o cliente está ativo';
