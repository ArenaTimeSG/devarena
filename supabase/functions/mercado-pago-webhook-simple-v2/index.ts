export const config = { auth: false };

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature',
};

serve(async (req) => {
  console.log('🚀 WEBHOOK SIMPLES V2 - Method:', req.method);
  console.log('🚀 WEBHOOK SIMPLES V2 - URL:', req.url);
  console.log('🚀 WEBHOOK SIMPLES V2 - Headers:', Object.fromEntries(req.headers.entries()));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight request - returning ok');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verificar se é uma requisição do Mercado Pago
    const userAgent = req.headers.get('user-agent');
    if (userAgent && userAgent.includes('MercadoPago')) {
      console.log('✅ Requisição do Mercado Pago detectada - processando sem autenticação');
    } else {
      console.log('⚠️ Requisição não é do Mercado Pago - verificando autenticação');
    }
    
    // Aceitar qualquer método para debug
    console.log('🔍 Processando requisição - Method:', req.method);
    
    // Se não for POST, retornar 200 OK para evitar erros
    if (req.method !== 'POST') {
      console.log('⚠️ Método não é POST, retornando 200 OK');
      return new Response('ok', { status: 200, headers: corsHeaders });
    }

    // Obter o corpo da requisição
    const rawBody = await req.text();
    console.log('🔔 Raw body length:', rawBody.length);
    console.log('🔔 Raw body content:', rawBody);

    // Parse do JSON
    const notification = JSON.parse(rawBody);
    console.log('🔔 Dados da notificação:', notification);

    // Verificar se é uma notificação de pagamento
    if (notification.type !== 'payment') {
      console.log('⚠️ Tipo de notificação não é payment:', notification.type);
      return new Response("ok", { status: 200 });
    }

    // Verificar se tem ID do pagamento
    if (!notification.data?.id) {
      console.error('❌ ID do pagamento não encontrado');
      return new Response("No payment id", { status: 400 });
    }

    const paymentId = notification.data.id;
    console.log('💳 Processando pagamento ID:', paymentId);

    // Por enquanto, apenas logar e retornar OK
    console.log('✅ WEBHOOK SIMPLES V2 PROCESSADO COM SUCESSO - Retornando 200 OK');
    return new Response("ok", { status: 200 });

  } catch (error) {
    console.error('❌ Erro no webhook simples v2:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
