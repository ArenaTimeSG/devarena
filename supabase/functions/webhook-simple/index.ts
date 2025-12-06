export const config = { auth: false };

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

serve(async (req) => {
  console.log('🧪 WEBHOOK SIMPLE - Method:', req.method);
  console.log('🧪 WEBHOOK SIMPLE - URL:', req.url);
  
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

    // Simplesmente retornar OK para teste
    console.log('✅ Webhook processado com sucesso');
    return new Response("Webhook OK", { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error('❌ Erro webhook:', error);
    return new Response("Erro interno", { status: 500, headers: corsHeaders });
  }
});
