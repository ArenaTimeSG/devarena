export const config = { auth: false };

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature',
};

serve(async (req) => {
  console.log('🚀 TEST WEBHOOK CHAMADO - Method:', req.method);
  console.log('🚀 TEST WEBHOOK CHAMADO - URL:', req.url);
  console.log('🚀 TEST WEBHOOK CHAMADO - Headers:', Object.fromEntries(req.headers.entries()));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight request - returning ok');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.text();
    console.log('🚀 TEST WEBHOOK - Body:', body);
    
    // Sempre responder 200 OK
    console.log('✅ TEST WEBHOOK - Retornando 200 OK');
    return new Response("ok", { 
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('❌ Erro no test webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
