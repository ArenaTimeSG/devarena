-- Adicionar campo username na tabela user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN username VARCHAR(50) UNIQUE;

-- Criar índice para melhor performance nas buscas por username
CREATE INDEX idx_user_profiles_username ON public.user_profiles(username);

-- Adicionar constraint para garantir que username seja único e não nulo
ALTER TABLE public.user_profiles 
ADD CONSTRAINT user_profiles_username_unique UNIQUE (username);

-- Adicionar constraint para garantir que username não seja nulo
ALTER TABLE public.user_profiles 
ALTER COLUMN username SET NOT NULL;

-- Adicionar constraint para validar formato do username (apenas letras, números e hífens)
ALTER TABLE public.user_profiles 
ADD CONSTRAINT user_profiles_username_format 
CHECK (username ~ '^[a-zA-Z0-9-]+$');

-- Adicionar constraint para garantir que username tenha pelo menos 3 caracteres
ALTER TABLE public.user_profiles 
ADD CONSTRAINT user_profiles_username_length 
CHECK (length(username) >= 3);

-- Adicionar constraint para garantir que username tenha no máximo 50 caracteres
ALTER TABLE public.user_profiles 
ADD CONSTRAINT user_profiles_username_max_length 
CHECK (length(username) <= 50);
