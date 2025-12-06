export const config = { 
  auth: false,
  verifyJWT: false 
};

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
  payment_method_id: string;
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
  console.log('💳 Simple payment processing function started');
  
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

    // Retornar resultado do pagamento
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

  } catch (error) {
    console.error('❌ Simple payment processing error:', error)
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
