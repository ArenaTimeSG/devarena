export const config = { auth: false };

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ValidatePaymentRequest {
  payment_id: string;
  external_reference?: string;
  preference_id?: string;
}

serve(async (req) => {
  console.log('🔍 Payment validation function started');
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    console.log('📥 Request body:', JSON.stringify(body, null, 2));

    const { payment_id, external_reference, preference_id } = body as ValidatePaymentRequest;
    
    if (!payment_id) {
      return new Response(
        JSON.stringify({ error: 'payment_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get Mercado Pago access token
    const mpAccessToken = Deno.env.get('MP_ACCESS_TOKEN');
    if (!mpAccessToken) {
      console.error('❌ Missing Mercado Pago access token');
      return new Response(
        JSON.stringify({ error: 'Mercado Pago configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar status do pagamento na API do Mercado Pago
    console.log('🔍 Verificando pagamento no Mercado Pago:', payment_id);
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      console.error('❌ Erro ao verificar pagamento no Mercado Pago:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to validate payment with Mercado Pago', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const paymentDetails = await mpResponse.json();
    console.log('💳 Detalhes do pagamento:', paymentDetails);

    // Verificar se o pagamento foi aprovado
    if (paymentDetails.status === 'approved') {
      console.log('✅ Pagamento aprovado!');
      
      // Buscar dados do pagamento na tabela payments
      let paymentRecord = null;
      if (external_reference) {
        const { data: paymentData, error: paymentError } = await supabase
          .from('payments')
          .select('*')
          .eq('external_reference', external_reference)
          .single();
        
        if (paymentError) {
          console.error('❌ Erro ao buscar dados do pagamento:', paymentError);
        } else {
          paymentRecord = paymentData;
          console.log('✅ Dados do pagamento encontrados:', paymentRecord);
        }
      }

      // Se temos dados do agendamento, criar/atualizar o agendamento
      if (paymentRecord && paymentRecord.appointment_data) {
        console.log('📅 Criando/atualizando agendamento...');
        
        const appointmentData = paymentRecord.appointment_data;
        
        // Verificar se já existe um agendamento com esse external_reference
        const { data: existingAppointment, error: existingError } = await supabase
          .from('appointments')
          .select('*')
          .eq('id', external_reference)
          .single();

        if (existingError && existingError.code !== 'PGRST116') {
          console.error('❌ Erro ao verificar agendamento existente:', existingError);
        }

        if (existingAppointment) {
          // Atualizar agendamento existente
          console.log('🔄 Atualizando agendamento existente...');
          const { data: updatedAppointment, error: updateError } = await supabase
            .from('appointments')
            .update({
              status: 'agendado',
              payment_status: 'paid',
              payment_id: payment_id,
              updated_at: new Date().toISOString()
            })
            .eq('id', external_reference)
            .select()
            .single();

          if (updateError) {
            console.error('❌ Erro ao atualizar agendamento:', updateError);
            return new Response(
              JSON.stringify({ error: 'Failed to update appointment', details: updateError }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          console.log('✅ Agendamento atualizado:', updatedAppointment);
          
          return new Response(
            JSON.stringify({
              success: true,
              payment_status: 'approved',
              appointment: updatedAppointment,
              message: 'Pagamento aprovado e agendamento confirmado'
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } else {
          // Criar novo agendamento
          console.log('🆕 Criando novo agendamento...');
          const { data: newAppointment, error: createError } = await supabase
            .from('appointments')
            .insert({
              id: external_reference,
              user_id: appointmentData.user_id,
              client_id: appointmentData.client_id,
              date: appointmentData.date,
              time: appointmentData.time,
              modality_id: appointmentData.modality_id,
              modality_name: appointmentData.modality_name,
              valor_total: appointmentData.valor_total,
              status: 'agendado',
              payment_status: 'paid',
              payment_id: payment_id,
              booking_source: 'online',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();

          if (createError) {
            console.error('❌ Erro ao criar agendamento:', createError);
            return new Response(
              JSON.stringify({ error: 'Failed to create appointment', details: createError }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          console.log('✅ Agendamento criado:', newAppointment);
          
          return new Response(
            JSON.stringify({
              success: true,
              payment_status: 'approved',
              appointment: newAppointment,
              message: 'Pagamento aprovado e agendamento criado'
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      } else {
        // Pagamento aprovado mas sem dados de agendamento
        console.log('✅ Pagamento aprovado, mas sem dados de agendamento para processar');
        
        return new Response(
          JSON.stringify({
            success: true,
            payment_status: 'approved',
            message: 'Pagamento aprovado'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      // Pagamento não aprovado
      console.log('❌ Pagamento não aprovado. Status:', paymentDetails.status);
      
      return new Response(
        JSON.stringify({
          success: false,
          payment_status: paymentDetails.status,
          message: `Pagamento não aprovado. Status: ${paymentDetails.status}`
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('❌ Payment validation error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Payment validation failed',
        details: error.message,
        stack: error.stack
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
