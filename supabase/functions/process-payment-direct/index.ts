export const config = { 
  auth: false,
  verifyJWT: false 
};

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProcessPaymentRequest {
  user_id: string;
  amount: number;
  description: string;
  client_name: string;
  client_email: string;
  payment_method_id: string; // 'pix', 'credit_card', etc.
  appointment_data: {
    user_id: string;
    client_id: string;
    date: string;
    time: string;
    modality_id: string;
    modality_name: string;
    valor_total: number;
    status: string;
  };
}

serve(async (req) => {
  console.log('💳 Direct payment processing function started');
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    console.log('📥 Request body:', JSON.stringify(body, null, 2));

    const { 
      user_id, 
      amount, 
      description, 
      client_name, 
      client_email, 
      payment_method_id,
      appointment_data 
    } = body as ProcessPaymentRequest;
    
    if (!user_id || !amount || !description || !client_name || !client_email || !payment_method_id || !appointment_data) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
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
    
    console.log('✅ Mercado Pago access token found:', mpAccessToken.substring(0, 20) + '...');

    // Gerar ID único para o agendamento
    const appointmentId = `appointment_${Date.now()}_${appointment_data.client_id}`;
    
    // Criar pagamento diretamente no Mercado Pago
    const paymentData = {
      transaction_amount: amount,
      description: description,
      payment_method_id: payment_method_id,
      payer: {
        email: client_email,
        identification: {
          type: "CPF",
          number: "12345678901"
        }
      },
      external_reference: appointmentId,
      notification_url: `${supabaseUrl}/functions/v1/mercado-pago-webhook`,
      installments: 1,
      capture: true
    };

    console.log('💳 Creating direct payment...', JSON.stringify(paymentData, null, 2));

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentData)
    });

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      console.error('❌ Mercado Pago payment error:', errorText);
      console.error('❌ Response status:', mpResponse.status);
      console.error('❌ Response headers:', Object.fromEntries(mpResponse.headers.entries()));
      
      let errorDetails;
      try {
        errorDetails = JSON.parse(errorText);
      } catch {
        errorDetails = errorText;
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create payment', 
          details: errorDetails,
          status: mpResponse.status,
          paymentData: paymentData
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const payment = await mpResponse.json();
    console.log('✅ Payment created:', payment);

    // Se o pagamento foi aprovado imediatamente (cartão de crédito)
    if (payment.status === 'approved') {
      console.log('✅ Pagamento aprovado imediatamente!');
      
      // Criar agendamento
      const { data: newAppointment, error: createError } = await supabase
        .from('appointments')
        .insert({
          id: appointmentId,
          user_id: appointment_data.user_id,
          client_id: appointment_data.client_id,
          date: appointment_data.date,
          time: appointment_data.time,
          modality_id: appointment_data.modality_id,
          modality_name: appointment_data.modality_name,
          valor_total: appointment_data.valor_total,
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
          payment: payment,
          message: 'Pagamento aprovado e agendamento criado'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      // Pagamento pendente (Pix, boleto, etc.)
      console.log('⏳ Pagamento pendente. Status:', payment.status);
      
      // Salvar dados do pagamento para processar depois
      const { data: paymentRecord, error: paymentInsertError } = await supabase
        .from('payments')
        .insert({
          user_id: user_id,
          amount: amount,
          description: description,
          client_name: client_name,
          client_email: client_email,
          mercado_pago_payment_id: payment.id,
          external_reference: appointmentId,
          appointment_data: appointment_data,
          status: payment.status,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (paymentInsertError) {
        console.error('❌ Erro ao salvar dados do pagamento:', paymentInsertError);
      } else {
        console.log('✅ Dados do pagamento salvos:', paymentRecord.id);
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          payment_status: payment.status,
          payment: payment,
          appointment_id: appointmentId,
          message: `Pagamento criado. Status: ${payment.status}`
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('❌ Direct payment processing error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Payment processing failed',
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
