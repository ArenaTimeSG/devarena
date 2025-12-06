export const config = { auth: false };

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🔍 [CHECK-BOOKING-STATUS] Verificando status do agendamento...');

    // Get appointment ID from query parameters
    const url = new URL(req.url);
    const appointmentId = url.searchParams.get('id');

    if (!appointmentId) {
      console.error('❌ [CHECK-BOOKING-STATUS] ID do agendamento não fornecido');
      return new Response(
        JSON.stringify({ error: 'ID do agendamento é obrigatório' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('🔍 [CHECK-BOOKING-STATUS] ID do agendamento:', appointmentId);

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Query the appointment
    const { data: appointment, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .single();

    if (error) {
      console.error('❌ [CHECK-BOOKING-STATUS] Erro ao buscar agendamento:', error);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar agendamento' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!appointment) {
      console.log('⚠️ [CHECK-BOOKING-STATUS] Agendamento não encontrado');
      return new Response(
        JSON.stringify({ error: 'Agendamento não encontrado' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ [CHECK-BOOKING-STATUS] Agendamento encontrado:', {
      id: appointment.id,
      status: appointment.status,
      payment_status: appointment.payment_status
    });

    return new Response(
      JSON.stringify({
        id: appointment.id,
        status: appointment.status,
        payment_status: appointment.payment_status,
        created_at: appointment.created_at,
        updated_at: appointment.updated_at
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ [CHECK-BOOKING-STATUS] Erro interno:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
