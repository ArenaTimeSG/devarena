-- =====================================================
-- Adicionar constraint de unicidade no campo name da tabela user_profiles
-- =====================================================

-- Verificar se a constraint já existe antes de criar
DO $$
BEGIN
    -- Verificar se a constraint já existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'user_profiles' 
        AND tc.constraint_type = 'UNIQUE'
        AND kcu.column_name = 'name'
    ) THEN
        -- Adicionar constraint de unicidade no nome de usuário
        -- Isso garante que não haverá usuários duplicados com o mesmo nome
        ALTER TABLE public.user_profiles 
        ADD CONSTRAINT user_profiles_name_unique UNIQUE (name);
        
        -- Comentário explicativo
        COMMENT ON CONSTRAINT user_profiles_name_unique ON public.user_profiles IS 
        'Garante que cada nome de usuário seja único no sistema, evitando conflitos no agendamento online';
        
        RAISE NOTICE 'Constraint de unicidade adicionada ao campo name da tabela user_profiles';
    ELSE
        RAISE NOTICE 'Constraint de unicidade já existe no campo name da tabela user_profiles';
    END IF;
END $$;
