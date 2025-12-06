export const config = { auth: false };

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

serve(async (req) => {
  console.log('🚀 WEBHOOK PAYMENT - Method:', req.method);
  console.log('🚀 WEBHOOK PAYMENT - URL:', req.url);
  console.log('🚀 WEBHOOK PAYMENT - Headers:', Object.fromEntries(req.headers.entries()));
  
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

    // Usar o primeiro token encontrado
    const mpAccessToken = allSettings[0].mercado_pago_access_token;
    const adminUserId = allSettings[0].user_id;

    console.log('🔍 Usando access token do admin:', adminUserId);

    // Consulta detalhes do pagamento no Mercado Pago
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

    console.log('🔍 Buscando agendamento com ID:', bookingId);

    // Buscar o agendamento pelo ID
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (appointmentError || !appointment) {
      console.error('❌ Agendamento não encontrado:', appointmentError);
      return new Response("Agendamento não encontrado", { status: 404, headers: corsHeaders });
    }

    console.log('✅ Agendamento encontrado:', appointment.id);

    // Processar baseado no status do pagamento
    if (payment.status === "approved") {
      console.log('✅ Pagamento aprovado - Atualizando agendamento');
      
      // Atualizar o agendamento para status "pago"
      const { data: updatedAppointment, error: updateError } = await supabase
        .from('appointments')
        .update({
          status: 'pago',
          payment_status: 'approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Erro ao atualizar agendamento:', updateError);
        return new Response("Erro ao atualizar agendamento", { status: 500, headers: corsHeaders });
      }

      console.log('✅ Agendamento atualizado com sucesso:', updatedAppointment.id);

      // Criar registro na tabela payments se não existir
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('*')
        .eq('appointment_id', bookingId)
        .single();

      if (!existingPayment) {
        console.log('💳 Criando registro de pagamento...');
        const { data: newPayment, error: paymentInsertError } = await supabase
          .from('payments')
          .insert({
            appointment_id: bookingId,
            amount: payment.transaction_amount,
            currency: 'BRL',
            status: 'approved',
            payment_method: payment.payment_method_id,
            mercado_pago_id: payment.preference_id,
            mercado_pago_status: payment.status,
            mercado_pago_payment_id: payment.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (paymentInsertError) {
          console.error('❌ Erro ao criar registro de pagamento:', paymentInsertError);
        } else {
          console.log('✅ Registro de pagamento criado:', newPayment.id);
        }
      } else {
        console.log('💳 Atualizando registro de pagamento existente...');
        const { error: paymentUpdateError } = await supabase
          .from('payments')
          .update({
            status: 'approved',
            mercado_pago_status: payment.status,
            mercado_pago_payment_id: payment.id,
            updated_at: new Date().toISOString()
          })
          .eq('appointment_id', bookingId);

        if (paymentUpdateError) {
          console.error('❌ Erro ao atualizar registro de pagamento:', paymentUpdateError);
        } else {
          console.log('✅ Registro de pagamento atualizado');
        }
      }

      return new Response("Pagamento aprovado e agendamento confirmado", { status: 200, headers: corsHeaders });

    } else if (payment.status === "pending" || payment.status === "in_process") {
      console.log('⏳ Pagamento pendente - Atualizando status');
      
      // Atualizar apenas o status do pagamento
      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          payment_status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      if (updateError) {
        console.error('❌ Erro ao atualizar status do agendamento:', updateError);
      } else {
        console.log('✅ Status do agendamento atualizado para pendente');
      }

      return new Response("Pagamento pendente", { status: 200, headers: corsHeaders });

    } else if (payment.status === "rejected" || payment.status === "cancelled") {
      console.log('❌ Pagamento rejeitado/cancelado - Atualizando status');
      
      // Atualizar status para rejeitado
      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          payment_status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      if (updateError) {
        console.error('❌ Erro ao atualizar status do agendamento:', updateError);
      } else {
        console.log('✅ Status do agendamento atualizado para falhou');
      }

      return new Response("Pagamento rejeitado", { status: 200, headers: corsHeaders });

    } else {
      console.log('⚠️ Status de pagamento não reconhecido:', payment.status);
      return new Response("Status não reconhecido", { status: 200, headers: corsHeaders });
    }

  } catch (error) {
    console.error('❌ Erro webhook:', error);
    return new Response("Erro interno", { status: 500, headers: corsHeaders });
  }
});
