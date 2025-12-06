export const config = { auth: false };

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

serve(async (req) => {
  console.log('🔍 CHECK PAYMENT STATUS SIMPLE - Method:', req.method);
  console.log('🔍 CHECK PAYMENT STATUS SIMPLE - URL:', req.url);
  
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

    const { preference_id } = body;
    console.log('🔍 Preference ID:', preference_id);

    if (!preference_id) {
      console.error('❌ Preference ID não fornecido');
      return new Response(
        JSON.stringify({ error: 'Preference ID é obrigatório' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Obter variáveis de ambiente
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Variáveis de ambiente não configuradas');
      return new Response(
        JSON.stringify({ error: 'Configuração inválida' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar cliente Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar dados do pagamento na tabela payments
    const { data: paymentRecord, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('mercado_pago_preference_id', preference_id)
      .single();

    if (paymentError) {
      console.error('❌ Erro ao buscar pagamento:', paymentError);
      return new Response(
        JSON.stringify({ error: 'Pagamento não encontrado' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!paymentRecord) {
      console.log('⚠️ Pagamento não encontrado para preference_id:', preference_id);
      return new Response(
        JSON.stringify({ error: 'Pagamento não encontrado' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ Pagamento encontrado:', {
      id: paymentRecord.id,
      status: paymentRecord.status,
      appointment_id: paymentRecord.appointment_id,
      preference_id: paymentRecord.mercado_pago_preference_id
    });

    // Se o pagamento foi aprovado e tem appointment_id, buscar dados do agendamento
    let appointmentData = null;
    if (paymentRecord.status === 'approved' && paymentRecord.appointment_id) {
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', paymentRecord.appointment_id)
        .single();

      if (!appointmentError && appointment) {
        appointmentData = {
          id: appointment.id,
          status: appointment.status,
          payment_status: appointment.payment_status,
          created_at: appointment.created_at
        };
        console.log('✅ Agendamento encontrado:', appointmentData);
      }
    }

    const response = {
      preference_id: paymentRecord.mercado_pago_preference_id,
      status: paymentRecord.status,
      appointment_id: paymentRecord.appointment_id,
      appointment: appointmentData,
      created_at: paymentRecord.created_at,
      updated_at: paymentRecord.updated_at
    };

    console.log('📤 Retornando status do pagamento:', response);

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Erro interno:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
