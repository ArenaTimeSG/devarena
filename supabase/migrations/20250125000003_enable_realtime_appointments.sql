-- =====================================================
-- Migration: Enable real-time for appointments table
-- Date: 2025-01-25
-- Description: Enables real-time subscriptions for appointments table
-- =====================================================

-- Verificar se a publicação existe e adicionar a tabela (se não estiver já adicionada)
DO $$
BEGIN
    -- Verificar se a publicação supabase_realtime existe
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        -- Verificar se a tabela appointments já está na publicação
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
            AND tablename = 'appointments'
        ) THEN
            -- Adicionar a tabela appointments à publicação
            EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments';
            RAISE NOTICE 'Tabela appointments adicionada ao real-time';
        ELSE
            RAISE NOTICE 'Tabela appointments já está habilitada para real-time';
        END IF;
    ELSE
        RAISE NOTICE 'Publicação supabase_realtime não encontrada';
    END IF;
END $$;

-- Comentário sobre o real-time
COMMENT ON TABLE public.appointments IS 'Tabela de agendamentos com real-time habilitado para atualizações em tempo real';
