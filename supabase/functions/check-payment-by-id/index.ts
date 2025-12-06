export const config = { auth: false };

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

serve(async (req) => {
  console.log('🔍 CHECK PAYMENT BY ID - Method:', req.method);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight request handled');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      console.log('⚠️ Non-POST request, returning 405');
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    const body = await req.json();
    console.log('🔍 Dados recebidos:', body);

    const { payment_id } = body;

    if (!payment_id) {
      console.error('❌ payment_id é obrigatório');
      return new Response('payment_id é obrigatório', { status: 400, headers: corsHeaders });
    }

    // Obter variáveis de ambiente
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Variáveis de ambiente não configuradas');
      return new Response("Configuração inválida", { status: 500, headers: corsHeaders });
    }

    // Criar cliente Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar dados do administrador (precisamos do access_token)
    const { data: allSettings, error: settingsError } = await supabase
      .from('settings')
      .select('user_id, mercado_pago_access_token')
      .not('mercado_pago_access_token', 'is', null);

    if (settingsError || !allSettings || allSettings.length === 0) {
      console.error('❌ Nenhum access token do Mercado Pago encontrado');
      return new Response("Mercado Pago not configured", { status: 400, headers: corsHeaders });
    }

    const mpAccessToken = allSettings[0].mercado_pago_access_token;
    console.log('🔍 Usando access token do admin');

    // Consultar pagamento específico no Mercado Pago
    console.log('🔍 Consultando pagamento específico:', payment_id);
    
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
      headers: {
        Authorization: `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!mpRes.ok) {
      console.error('❌ Erro ao consultar pagamento no Mercado Pago:', mpRes.status);
      return new Response("Erro ao consultar pagamento", { status: 500, headers: corsHeaders });
    }

    const payment = await mpRes.json();
    console.log('💳 Detalhes do pagamento:', payment);
    console.log('💳 Status do pagamento:', payment.status);

    // Verificar se existe registro na tabela payments
    const { data: paymentRecord } = await supabase
      .from('payments')
      .select('*')
      .eq('mercado_pago_payment_id', payment_id)
      .single();

    if (paymentRecord) {
      console.log('✅ Registro de pagamento encontrado na tabela payments');
      
      // Buscar agendamento relacionado
      const { data: appointment } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', paymentRecord.appointment_id)
        .single();

      if (appointment) {
        console.log('✅ Agendamento encontrado:', appointment.id);
        
        return new Response(JSON.stringify({ 
          payment_approved: payment.status === "approved",
          payment_status: payment.status,
          appointment_exists: true,
          appointment_id: appointment.id,
          appointment_status: appointment.status
        }), { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
    }

    // Se não encontrou registro, retornar apenas status do pagamento
    return new Response(JSON.stringify({ 
      payment_approved: payment.status === "approved",
      payment_status: payment.status,
      appointment_exists: false
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('❌ Erro na verificação:', error);
    return new Response("Erro interno", { status: 500, headers: corsHeaders });
  }
});
