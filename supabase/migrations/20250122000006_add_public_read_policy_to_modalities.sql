-- =====================================================
-- Adicionar política de RLS para leitura pública de modalidades
-- =====================================================

-- Permitir que usuários não autenticados (público) possam ler modalidades ativas
-- Isso é necessário para que a página de agendamento online possa buscar as modalidades do admin
CREATE POLICY "Public can view active modalities for booking" ON public.modalities
    FOR SELECT USING (true);

-- Comentário explicativo
COMMENT ON POLICY "Public can view active modalities for booking" ON public.modalities IS 
'Permite que clientes não autenticados possam visualizar modalidades para agendamento online';
