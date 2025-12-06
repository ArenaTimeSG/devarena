-- =====================================================
-- MIGRAÇÃO: ADICIONAR CAMPO ONLINE_ENABLED
-- Adiciona o campo online_enabled na tabela settings
-- =====================================================

-- 1. Adicionar campo online_enabled se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'settings' 
        AND column_name = 'online_enabled'
    ) THEN
        ALTER TABLE public.settings 
        ADD COLUMN online_enabled BOOLEAN DEFAULT false;
        
        RAISE NOTICE '✅ Campo online_enabled adicionado à tabela settings';
    ELSE
        RAISE NOTICE 'ℹ️ Campo online_enabled já existe na tabela settings';
    END IF;
END $$;

-- 2. Adicionar campo online_booking se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'settings' 
        AND column_name = 'online_booking'
    ) THEN
        ALTER TABLE public.settings 
        ADD COLUMN online_booking JSONB DEFAULT jsonb_build_object(
            'auto_agendar', false,
            'tempo_minimo_antecedencia', 24,
            'duracao_padrao', 60
        );
        
        RAISE NOTICE '✅ Campo online_booking adicionado à tabela settings';
    ELSE
        RAISE NOTICE 'ℹ️ Campo online_booking já existe na tabela settings';
    END IF;
END $$;

-- 3. Adicionar campo working_hours se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'settings' 
        AND column_name = 'working_hours'
    ) THEN
        ALTER TABLE public.settings 
        ADD COLUMN working_hours JSONB DEFAULT jsonb_build_object(
            'monday', jsonb_build_object('enabled', true, 'start', '08:00', 'end', '18:00'),
            'tuesday', jsonb_build_object('enabled', true, 'start', '08:00', 'end', '18:00'),
            'wednesday', jsonb_build_object('enabled', true, 'start', '08:00', 'end', '18:00'),
            'thursday', jsonb_build_object('enabled', true, 'start', '08:00', 'end', '18:00'),
            'friday', jsonb_build_object('enabled', true, 'start', '08:00', 'end', '18:00'),
            'saturday', jsonb_build_object('enabled', true, 'start', '08:00', 'end', '18:00'),
            'sunday', jsonb_build_object('enabled', false, 'start', '08:00', 'end', '18:00')
        );
        
        RAISE NOTICE '✅ Campo working_hours adicionado à tabela settings';
    ELSE
        RAISE NOTICE 'ℹ️ Campo working_hours já existe na tabela settings';
    END IF;
END $$;

-- 4. Atualizar configurações existentes com valores padrão
UPDATE public.settings 
SET 
    online_enabled = COALESCE(online_enabled, false),
    online_booking = COALESCE(online_booking, jsonb_build_object(
        'auto_agendar', false,
        'tempo_minimo_antecedencia', 24,
        'duracao_padrao', 60
    )),
    working_hours = COALESCE(working_hours, jsonb_build_object(
        'monday', jsonb_build_object('enabled', true, 'start', '08:00', 'end', '18:00'),
        'tuesday', jsonb_build_object('enabled', true, 'start', '08:00', 'end', '18:00'),
        'wednesday', jsonb_build_object('enabled', true, 'start', '08:00', 'end', '18:00'),
        'thursday', jsonb_build_object('enabled', true, 'start', '08:00', 'end', '18:00'),
        'friday', jsonb_build_object('enabled', true, 'start', '08:00', 'end', '18:00'),
        'saturday', jsonb_build_object('enabled', true, 'start', '08:00', 'end', '18:00'),
        'sunday', jsonb_build_object('enabled', false, 'start', '08:00', 'end', '18:00')
    ))
WHERE online_enabled IS NULL 
   OR online_booking IS NULL 
   OR working_hours IS NULL;

-- 5. Verificar se os campos foram adicionados corretamente
DO $$
DECLARE
    online_enabled_exists BOOLEAN;
    online_booking_exists BOOLEAN;
    working_hours_exists BOOLEAN;
    updated_count INTEGER;
BEGIN
    -- Verificar se os campos existem
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'settings' 
        AND column_name = 'online_enabled'
    ) INTO online_enabled_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'settings' 
        AND column_name = 'online_booking'
    ) INTO online_booking_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'settings' 
        AND column_name = 'working_hours'
    ) INTO working_hours_exists;
    
    -- Contar registros atualizados
    SELECT COUNT(*) INTO updated_count FROM public.settings;
    
    -- Relatar status
    RAISE NOTICE '=== VERIFICAÇÃO DA MIGRAÇÃO ===';
    RAISE NOTICE 'Campo online_enabled existe: %', online_enabled_exists;
    RAISE NOTICE 'Campo online_booking existe: %', online_booking_exists;
    RAISE NOTICE 'Campo working_hours existe: %', working_hours_exists;
    RAISE NOTICE 'Total de configurações: %', updated_count;
    RAISE NOTICE '================================';
    
    IF NOT online_enabled_exists THEN
        RAISE EXCEPTION '❌ Campo online_enabled não foi adicionado';
    END IF;
    
    IF NOT online_booking_exists THEN
        RAISE EXCEPTION '❌ Campo online_booking não foi adicionado';
    END IF;
    
    IF NOT working_hours_exists THEN
        RAISE EXCEPTION '❌ Campo working_hours não foi adicionado';
    END IF;
    
    RAISE NOTICE '✅ Migração concluída com sucesso!';
END $$;

-- 6. Adicionar comentários nas colunas
COMMENT ON COLUMN public.settings.online_enabled IS 'Indica se o agendamento online está habilitado para este usuário';
COMMENT ON COLUMN public.settings.online_booking IS 'Configurações específicas do agendamento online (auto-confirmação, tempo mínimo, etc.)';
COMMENT ON COLUMN public.settings.working_hours IS 'Horários de funcionamento configurados pelo usuário';
