-- =====================================================
-- Adicionar políticas de RLS para INSERT e UPDATE em user_profiles
-- =====================================================

-- Permitir que usuários autenticados possam inserir seus próprios perfis
CREATE POLICY "Users can insert their own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Permitir que usuários autenticados possam atualizar seus próprios perfis
CREATE POLICY "Users can update their own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Permitir que usuários autenticados possam visualizar seus próprios perfis
CREATE POLICY "Users can view their own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = user_id);

-- Comentários explicativos
COMMENT ON POLICY "Users can insert their own profile" ON public.user_profiles IS 
'Permite que usuários autenticados possam inserir seus próprios perfis durante o cadastro';

COMMENT ON POLICY "Users can update their own profile" ON public.user_profiles IS 
'Permite que usuários autenticados possam atualizar seus próprios perfis';

COMMENT ON POLICY "Users can view their own profile" ON public.user_profiles IS 
'Permite que usuários autenticados possam visualizar seus próprios perfis';
