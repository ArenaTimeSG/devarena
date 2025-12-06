export const config = { auth: false };

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CheckPaymentRequest {
  preference_id: string;
  external_reference?: string;
}

serve(async (req) => {
  console.log('🔍 Payment status check function started');
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    console.log('📥 Request body:', JSON.stringify(body, null, 2));

    const { preference_id, external_reference } = body as CheckPaymentRequest;
    
    if (!preference_id) {
      return new Response(
        JSON.stringify({ error: 'preference_id is required' }),
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

    // Buscar pagamentos relacionados a esta preferência
    console.log('🔍 Buscando pagamentos para preference_id:', preference_id);
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/search?external_reference=${preference_id}`, {
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      console.error('❌ Erro ao buscar pagamentos no Mercado Pago:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to check payment status with Mercado Pago', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const searchResult = await mpResponse.json();
    console.log('💳 Resultado da busca:', searchResult);

    if (searchResult.results && searchResult.results.length > 0) {
      // Encontrou pagamentos
      const payment = searchResult.results[0]; // Pegar o primeiro pagamento
      console.log('💳 Pagamento encontrado:', payment);

      if (payment.status === 'approved') {
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
                payment_id: payment.id,
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
                payment_id: payment.id,
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
        console.log('⏳ Pagamento ainda não aprovado. Status:', payment.status);
        
        return new Response(
          JSON.stringify({
            success: false,
            payment_status: payment.status,
            message: `Pagamento ainda não aprovado. Status: ${payment.status}`
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      // Nenhum pagamento encontrado
      console.log('⏳ Nenhum pagamento encontrado ainda');
      
      return new Response(
        JSON.stringify({
          success: false,
          payment_status: 'pending',
          message: 'Nenhum pagamento encontrado ainda'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('❌ Payment status check error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Payment status check failed',
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