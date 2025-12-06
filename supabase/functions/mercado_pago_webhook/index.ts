import { serve } from "https://deno.land/std/http/server.ts";

serve(async (req) => {
  console.log('🔔 MERCADO PAGO WEBHOOK - Method:', req.method);
  console.log('🔔 Headers:', Object.fromEntries(req.headers.entries()));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight request handled');
    return new Response('ok', { 
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
      }
    });
  }

  if (req.method !== "POST") {
    console.log('⚠️ Non-POST request, returning 405');
    return new Response("Only POST allowed", { status: 405 });
  }

  try {
    const body = await req.json();
    console.log('🔔 Body recebido:', body);

    if (body.type !== "payment") {
      console.log('⚠️ Tipo não é payment, ignorando');
      return new Response("Ignored", { status: 200 });
    }

    const paymentId = body?.data?.id;
    if (!paymentId) {
      console.log('❌ No payment_id encontrado');
      return new Response("No payment_id", { status: 400 });
    }

    console.log('💳 Payment ID:', paymentId);

    // Buscar detalhes no Mercado Pago
    console.log('🔍 Buscando detalhes do pagamento no Mercado Pago...');
    const resp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${Deno.env.get("MERCADOPAGO_ACCESS_TOKEN")}`,
      },
    });

    if (!resp.ok) {
      console.error('❌ Erro ao buscar pagamento no Mercado Pago:', resp.status);
      return new Response("Erro ao buscar pagamento", { status: 500 });
    }

    const payment = await resp.json();
    console.log('💳 Detalhes do pagamento:', payment);
    console.log('💳 Status:', payment.status);
    console.log('💳 External Reference:', payment.external_reference);

    // Exemplo: atualizar no banco Supabase
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")! // usar service key
    );

    // Atualizar na tabela payments se existir
    const { data: paymentUpdate, error: paymentError } = await supabase
      .from("payments")
      .update({ 
        status: payment.status,
        updated_at: new Date().toISOString()
      })
      .eq("mercado_pago_preference_id", payment.external_reference)
      .select();

    if (paymentError) {
      console.log('⚠️ Erro ao atualizar payments:', paymentError);
    } else {
      console.log('✅ Payments atualizado:', paymentUpdate);
    }

    // Atualizar na tabela appointments se existir
    const { data: appointmentUpdate, error: appointmentError } = await supabase
      .from("appointments")
      .update({ 
        payment_status: payment.status === 'approved' ? 'paid' : 'pending',
        updated_at: new Date().toISOString()
      })
      .eq("id", payment.external_reference)
      .select();

    if (appointmentError) {
      console.log('⚠️ Erro ao atualizar appointments:', appointmentError);
    } else {
      console.log('✅ Appointments atualizado:', appointmentUpdate);
    }

    console.log('✅ Webhook processado com sucesso');
    return new Response("OK", { 
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      }
    });

  } catch (err) {
    console.error('❌ Erro interno:', err);
    return new Response("Erro interno", { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      }
    });
  }
});
