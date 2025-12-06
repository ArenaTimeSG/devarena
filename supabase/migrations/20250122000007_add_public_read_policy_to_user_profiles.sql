-- =====================================================
-- Adicionar política de RLS para leitura pública de user_profiles
-- =====================================================

-- Permitir que usuários não autenticados (público) possam ler perfis de usuários ativos
-- Isso é necessário para que a página de agendamento online possa buscar o admin pelo username
CREATE POLICY "Public can view active user profiles for booking" ON public.user_profiles
    FOR SELECT USING (is_active = true);

-- Comentário explicativo
COMMENT ON POLICY "Public can view active user profiles for booking" ON public.user_profiles IS 
'Permite que clientes não autenticados possam visualizar perfis de usuários ativos para agendamento online';
