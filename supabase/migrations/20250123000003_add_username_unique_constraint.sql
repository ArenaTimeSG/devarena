-- =====================================================
-- Adicionar constraint única no username dos admins
-- =====================================================

-- Adicionar constraint única no campo username
-- Isso garante que cada admin tenha um username único para o link de agendamento
ALTER TABLE public.user_profiles 
ADD CONSTRAINT user_profiles_username_unique UNIQUE (username);

-- Criar índice para melhor performance nas buscas por username
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON public.user_profiles(username);

-- Comentário explicativo
COMMENT ON CONSTRAINT user_profiles_username_unique ON public.user_profiles IS 
'Garante que cada admin tenha um username único para o link de agendamento online';
