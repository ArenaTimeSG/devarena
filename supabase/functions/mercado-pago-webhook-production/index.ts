export const config = { auth: false };

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

serve(async (req) => {
  console.log('🚀 WEBHOOK MERCADO PAGO - Method:', req.method);
  console.log('🚀 WEBHOOK MERCADO PAGO - URL:', req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight request handled');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Se não for POST, retornar 200 OK
    if (req.method !== 'POST') {
      console.log('⚠️ Non-POST request, returning 200');
      return new Response('ok', { status: 200, headers: corsHeaders });
    }

    // Obter o corpo da requisição
    const body = await req.json();
    console.log('🔔 Webhook recebido:', JSON.stringify(body, null, 2));

    // Verificar se é um evento de pagamento
    if (body.type !== 'payment') {
      console.log('⚠️ Evento não é de pagamento, ignorando:', body.type);
      return new Response('Evento ignorado', { status: 200, headers: corsHeaders });
    }

    // Pega o ID do pagamento enviado pelo Mercado Pago
    const paymentId = body?.data?.id;
    if (!paymentId) {
      console.error('❌ ID do pagamento não encontrado');
      return new Response("ID do pagamento não encontrado", { status: 400, headers: corsHeaders });
    }

    console.log('💳 Processando pagamento ID:', paymentId);

    // Obter variáveis de ambiente
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const mpAccessToken = Deno.env.get('MP_ACCESS_TOKEN');

    if (!supabaseUrl || !supabaseServiceKey || !mpAccessToken) {
      console.error('❌ Variáveis de ambiente não configuradas');
      return new Response("Configuração inválida", { status: 500, headers: corsHeaders });
    }

    // Criar cliente Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Consultar a API do Mercado Pago em /v1/payments/:id usando MP_ACCESS_TOKEN
    console.log('🔍 Consultando detalhes do pagamento no Mercado Pago...');
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
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
    console.log('💳 External Reference (Booking ID):', payment.external_reference);

    // Extrair booking_id do external_reference
    const bookingId = payment.external_reference;
    if (!bookingId) {
      console.error('❌ External reference (booking_id) não encontrado no pagamento');
      return new Response("Booking ID não encontrado", { status: 400, headers: corsHeaders });
    }

    // Processar status do pagamento
    if (payment.status === "approved") {
      console.log('✅ Pagamento aprovado - Criando agendamento');
      
      // Buscar dados do agendamento na tabela payments pela preferência
      const { data: paymentRecord } = await supabase
        .from('payments')
        .select('*')
        .eq('mercado_pago_preference_id', payment.preference_id)
        .single();
      
      if (paymentRecord && paymentRecord.appointment_data) {
        console.log('✅ Encontrados dados do agendamento, criando...');
        
        // Criar o agendamento com os dados armazenados
        const { data: newAppointment, error: createError } = await supabase
          .from('appointments')
          .insert({
            ...paymentRecord.appointment_data,
            status: 'agendado',
            payment_status: 'approved',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (createError || !newAppointment) {
          console.error('❌ Erro ao criar agendamento:', createError);
          return new Response("Erro ao criar agendamento", { status: 500, headers: corsHeaders });
        }
        
        console.log('✅ Agendamento criado com sucesso:', newAppointment.id);
        
        // Atualizar o registro de pagamento com o ID do agendamento e do pagamento
        await supabase
          .from('payments')
          .update({ 
            appointment_id: newAppointment.id,
            mercado_pago_payment_id: paymentId,
            status: 'approved'
          })
          .eq('mercado_pago_preference_id', payment.preference_id);
        
        return new Response("Pagamento aprovado e agendamento criado", { status: 200, headers: corsHeaders });
      } else {
        console.error('❌ Dados do agendamento não encontrados na tabela payments');
        return new Response("Dados do agendamento não encontrados", { status: 404, headers: corsHeaders });
      }

    } else if (payment.status === "rejected" || payment.status === "cancelled") {
      console.log('❌ Pagamento rejeitado/cancelado - Não criando agendamento');
      
      // Atualizar status do pagamento na tabela payments se existir
      const { data: paymentRecord } = await supabase
        .from('payments')
        .select('*')
        .eq('mercado_pago_preference_id', payment.preference_id)
        .single();
      
      if (paymentRecord) {
        await supabase
          .from('payments')
          .update({ 
            status: 'failed',
            mercado_pago_payment_id: paymentId
          })
          .eq('mercado_pago_preference_id', payment.preference_id);
      }

      return new Response("Pagamento rejeitado - agendamento não criado", { status: 200, headers: corsHeaders });

    } else {
      console.log('⚠️ Status de pagamento não aprovado:', payment.status);
      return new Response(`Status: ${payment.status}`, { status: 200, headers: corsHeaders });
    }

  } catch (error) {
    console.error('❌ Erro webhook:', error);
    return new Response("Erro interno", { status: 500, headers: corsHeaders });
  }
});
