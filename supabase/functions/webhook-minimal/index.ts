export const config = { auth: false };

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  console.log('🧪 WEBHOOK MINIMAL - Method:', req.method);
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  try {
    if (req.method !== 'POST') {
      return new Response('ok', { status: 200 });
    }

    const body = await req.json();
    console.log('🔔 Webhook recebido:', body);

    return new Response("OK", { status: 200 });

  } catch (error) {
    console.error('❌ Erro:', error);
    return new Response("Erro", { status: 500 });
  }
});
