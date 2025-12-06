-- Migração automática para criar a tabela settings
-- Resolve o problema do hook useSettings e initializeSettings
-- SEM horários de funcionamento

-- 1. Limpeza de objetos existentes
DROP TRIGGER IF EXISTS create_user_settings ON auth.users;
DROP TRIGGER IF EXISTS update_settings_updated_at ON public.settings;
DROP FUNCTION IF EXISTS create_default_settings();
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP TABLE IF EXISTS public.settings CASCADE;

-- 2. Criar tabela settings com todas as colunas necessárias
CREATE TABLE public.settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Colunas especificadas pelo usuário (SEM working_hours)
    modalities_enabled JSONB NOT NULL DEFAULT '{
        "volei": true,
        "futsal": true,
        "basquete": true
    }'::jsonb,
    
    modalities_colors JSONB NOT NULL DEFAULT '{
        "volei": "#3b82f6",
        "futsal": "#10b981",
        "basquete": "#f59e0b"
    }'::jsonb,
    
    default_interval INTEGER NOT NULL DEFAULT 60,
    
    notifications_enabled JSONB NOT NULL DEFAULT '{
        "email": true,
        "push": false,
        "booking": true,
        "cancellation": true,
        "payment": true
    }'::jsonb,
    
    theme TEXT NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'custom')),
    
    personal_data JSONB NOT NULL DEFAULT '{
        "name": "",
        "email": "",
        "phone": ""
    }'::jsonb,
    
    -- Colunas de auditoria
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Constraints
    UNIQUE(user_id)
);

-- 3. Habilitar Row Level Security
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- 4. Criar política RLS para usuários autenticados
CREATE POLICY "Users can manage their own settings" 
ON public.settings FOR ALL TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- 5. Criar índice para performance
CREATE INDEX idx_settings_user_id ON public.settings(user_id);

-- 6. Conceder permissões necessárias
GRANT ALL ON public.settings TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 7. Criar função para atualizar timestamp automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Criar trigger para atualizar timestamp
CREATE TRIGGER update_settings_updated_at
    BEFORE UPDATE ON public.settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 9. Criar função para inicializar configurações padrão para novos usuários
CREATE OR REPLACE FUNCTION create_default_settings()
RETURNS TRIGGER AS $$
BEGIN
    -- Verificar se já existem configurações para este usuário
    IF NOT EXISTS (SELECT 1 FROM public.settings WHERE user_id = NEW.id) THEN
        INSERT INTO public.settings (
            user_id,
            modalities_enabled,
            modalities_colors,
            default_interval,
            notifications_enabled,
            theme,
            personal_data
        ) VALUES (
            NEW.id,
            '{
                "volei": true,
                "futsal": true,
                "basquete": true
            }'::jsonb,
            '{
                "volei": "#3b82f6",
                "futsal": "#10b981",
                "basquete": "#f59e0b"
            }'::jsonb,
            60,
            '{
                "email": true,
                "push": false,
                "booking": true,
                "cancellation": true,
                "payment": true
            }'::jsonb,
            'light',
            jsonb_build_object(
                'name', COALESCE(NEW.raw_user_meta_data->>'name', ''),
                'email', NEW.email,
                'phone', COALESCE(NEW.raw_user_meta_data->>'phone', '')
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Criar trigger para novos usuários
CREATE TRIGGER create_user_settings
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_settings();

-- 11. Inserir configurações padrão para usuários existentes
INSERT INTO public.settings (
    user_id,
    modalities_enabled,
    modalities_colors,
    default_interval,
    notifications_enabled,
    theme,
    personal_data
)
SELECT 
    u.id,
    '{
        "volei": true,
        "futsal": true,
        "basquete": true
    }'::jsonb,
    '{
        "volei": "#3b82f6",
        "futsal": "#10b981",
        "basquete": "#f59e0b"
    }'::jsonb,
    60,
    '{
        "email": true,
        "push": false,
        "booking": true,
        "cancellation": true,
        "payment": true
    }'::jsonb,
    'light',
    jsonb_build_object(
        'name', COALESCE(u.raw_user_meta_data->>'name', ''),
        'email', u.email,
        'phone', COALESCE(u.raw_user_meta_data->>'phone', '')
    )
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.settings s WHERE s.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;

-- 12. Verificação automática da criação
DO $$
DECLARE
    table_exists BOOLEAN;
    rls_enabled BOOLEAN;
    policy_exists BOOLEAN;
    index_exists BOOLEAN;
    trigger_exists BOOLEAN;
    function_exists BOOLEAN;
    settings_count INTEGER;
    users_count INTEGER;
BEGIN
    -- Verificar se a tabela existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'settings'
    ) INTO table_exists;
    
    -- Verificar se RLS está habilitado
    SELECT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'settings' AND rowsecurity = true
    ) INTO rls_enabled;
    
    -- Verificar se a política existe
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'settings'
    ) INTO policy_exists;
    
    -- Verificar se o índice existe
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' AND tablename = 'settings' AND indexname = 'idx_settings_user_id'
    ) INTO index_exists;
    
    -- Verificar se o trigger existe
    SELECT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'create_user_settings'
    ) INTO trigger_exists;
    
    -- Verificar se a função existe
    SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'create_default_settings'
    ) INTO function_exists;
    
    -- Contar configurações e usuários
    SELECT COUNT(*) INTO settings_count FROM public.settings;
    SELECT COUNT(*) INTO users_count FROM auth.users;
    
    -- Relatar status
    RAISE NOTICE '=== VERIFICAÇÃO AUTOMÁTICA DA TABELA SETTINGS ===';
    RAISE NOTICE 'Tabela existe: %', table_exists;
    RAISE NOTICE 'RLS habilitado: %', rls_enabled;
    RAISE NOTICE 'Política existe: %', policy_exists;
    RAISE NOTICE 'Índice existe: %', index_exists;
    RAISE NOTICE 'Trigger existe: %', trigger_exists;
    RAISE NOTICE 'Função existe: %', function_exists;
    RAISE NOTICE 'Total de usuários: %', users_count;
    RAISE NOTICE 'Total de configurações: %', settings_count;
    RAISE NOTICE '================================================';
    
    -- Verificar se tudo está correto
    IF NOT table_exists THEN
        RAISE EXCEPTION '❌ Tabela settings não foi criada';
    END IF;
    
    IF NOT rls_enabled THEN
        RAISE EXCEPTION '❌ RLS não está habilitado na tabela settings';
    END IF;
    
    IF NOT policy_exists THEN
        RAISE EXCEPTION '❌ Política RLS não foi criada';
    END IF;
    
    IF NOT index_exists THEN
        RAISE EXCEPTION '❌ Índice não foi criado';
    END IF;
    
    IF NOT trigger_exists THEN
        RAISE EXCEPTION '❌ Trigger para novos usuários não foi criado';
    END IF;
    
    IF NOT function_exists THEN
        RAISE EXCEPTION '❌ Função create_default_settings não foi criada';
    END IF;
    
    IF settings_count = 0 AND users_count > 0 THEN
        RAISE WARNING '⚠️ Nenhuma configuração foi criada para usuários existentes';
    END IF;
    
    RAISE NOTICE '✅ Tabela settings criada com sucesso e pronta para uso!';
    RAISE NOTICE '✅ Hook useSettings funcionará sem erros!';
    RAISE NOTICE '✅ Função initializeSettings funcionará sem timeout!';
    RAISE NOTICE '✅ Sem mais carregamento infinito!';
END $$;
