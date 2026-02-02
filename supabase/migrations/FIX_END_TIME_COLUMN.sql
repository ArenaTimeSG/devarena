-- =====================================================
-- FIX: Adicionar coluna end_time à tabela appointments
-- Execute este script no Supabase SQL Editor se a coluna end_time não existir
-- =====================================================

-- Adicionar coluna end_time se não existir
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS end_time TIMESTAMP WITH TIME ZONE;

-- Para agendamentos existentes sem end_time, definir como 1 hora após a data
UPDATE public.appointments 
SET end_time = date + INTERVAL '1 hour'
WHERE end_time IS NULL;

-- Tornar end_time NOT NULL apenas se não houver valores NULL
DO $$
BEGIN
  -- Verificar se há valores NULL
  IF NOT EXISTS (
    SELECT 1 FROM public.appointments WHERE end_time IS NULL
  ) THEN
    -- Só então tornar NOT NULL
    ALTER TABLE public.appointments 
    ALTER COLUMN end_time SET NOT NULL;
  END IF;
END $$;

-- Adicionar constraint para garantir que end_time > date
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_end_after_start'
  ) THEN
    ALTER TABLE public.appointments 
    ADD CONSTRAINT check_end_after_start 
    CHECK (end_time > date);
  END IF;
END $$;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_appointments_end_time ON public.appointments(end_time);
CREATE INDEX IF NOT EXISTS idx_appointments_time_range ON public.appointments(date, end_time);

-- Adicionar comentários
COMMENT ON COLUMN public.appointments.date IS 'Horário de início do agendamento (timestamp)';
COMMENT ON COLUMN public.appointments.end_time IS 'Horário de término do agendamento (timestamp)';

-- Verificar se a migração foi bem-sucedida
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'appointments' 
    AND column_name = 'end_time'
  ) THEN
    RAISE EXCEPTION 'Coluna end_time não foi adicionada com sucesso';
  END IF;
  
  RAISE NOTICE '✅ Migração concluída com sucesso: coluna end_time adicionada à tabela appointments';
END $$;
