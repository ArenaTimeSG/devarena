-- Adicionar coluna whatsapp_templates à tabela settings
-- Esta coluna armazena os templates de mensagens WhatsApp para lembretes

-- Adicionar coluna se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'settings' 
        AND column_name = 'whatsapp_templates'
    ) THEN
        ALTER TABLE public.settings 
        ADD COLUMN whatsapp_templates JSONB DEFAULT '{
            "appointment_reminder": "Olá, {nome}!\n\nLembrete do seu agendamento:\n📅 Data: {data}\n🕐 Horário: {horario}\n🏀 Atividade: {modalidade}\n📍 Local: {local}\n\nPor favor, confirme sua presença respondendo:\n[1] Confirmo\n[2] Não poderei comparecer\n\nAgradecemos a confirmação!",
            "monthly_agenda": "Olá, {nome}!\n\nLembrete do seu agendamento:\n📅 Data: {data}\n🕐 Horário: {horario}\n🏀 Atividade: {modalidade}\n📍 Local: {local}\n\nPor favor, confirme sua presença respondendo:\n[1] Confirmo\n[2] Não poderei comparecer\n\nAgradecemos a confirmação!"
        }'::jsonb;
    END IF;
END $$;

-- Atualizar registros existentes que não têm whatsapp_templates
UPDATE public.settings
SET whatsapp_templates = '{
    "appointment_reminder": "Olá, {nome}!\n\nLembrete do seu agendamento:\n📅 Data: {data}\n🕐 Horário: {horario}\n🏀 Atividade: {modalidade}\n📍 Local: {local}\n\nPor favor, confirme sua presença respondendo:\n[1] Confirmo\n[2] Não poderei comparecer\n\nAgradecemos a confirmação!",
    "monthly_agenda": "Olá, {nome}!\n\nLembrete do seu agendamento:\n📅 Data: {data}\n🕐 Horário: {horario}\n🏀 Atividade: {modalidade}\n📍 Local: {local}\n\nPor favor, confirme sua presença respondendo:\n[1] Confirmo\n[2] Não poderei comparecer\n\nAgradecemos a confirmação!"
}'::jsonb
WHERE whatsapp_templates IS NULL;
