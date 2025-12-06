export const config = { auth: false };

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

serve(async (req) => {
  console.log('🧪 TEST SAVE PAYMENT - Method:', req.method);
  
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

    // Tentar salvar dados mínimos na tabela payments
    const testData = {
      user_id: body.user_id || '49014464-6ed9-4fee-af45-06105f31698b',
      amount: body.amount || 1.00,
      client_id: '288a39da-dd94-4835-ada6-f0f942533484' // Cliente existente
    };

    console.log('💾 Tentando salvar dados:', testData);

    const { data: paymentRecord, error: paymentInsertError } = await supabase
      .from('payments')
      .insert(testData)
      .select()
      .single();

    if (paymentInsertError) {
      console.error('❌ Erro ao salvar pagamento:', paymentInsertError);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao salvar pagamento', 
          details: paymentInsertError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ Pagamento salvo com sucesso:', paymentRecord);

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: paymentRecord.id,
        message: 'Pagamento salvo com sucesso'
      }),
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
