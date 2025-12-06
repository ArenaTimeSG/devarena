import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🚀 Create payments table function started');
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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

    // SQL para criar a tabela payments
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.payments (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
        user_id UUID NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'BRL',
        status VARCHAR(20) DEFAULT 'pending',
        payment_method VARCHAR(50) DEFAULT 'mercado_pago',
        mercado_pago_id VARCHAR(255),
        external_reference VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // Executar SQL
    const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableSQL });

    if (createError) {
      console.error('❌ Error creating table:', createError);
      return new Response(
        JSON.stringify({ error: 'Failed to create table', details: createError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Criar índices
    const createIndexesSQL = `
      CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
      CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
      CREATE INDEX IF NOT EXISTS idx_payments_mercado_pago_id ON public.payments(mercado_pago_id);
      CREATE INDEX IF NOT EXISTS idx_payments_external_reference ON public.payments(external_reference);
      CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at);
    `;

    const { error: indexError } = await supabase.rpc('exec_sql', { sql: createIndexesSQL });

    if (indexError) {
      console.error('❌ Error creating indexes:', indexError);
      // Não falhar aqui, pois a tabela já foi criada
    }

    // Habilitar RLS
    const enableRLSSQL = `ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;`;
    await supabase.rpc('exec_sql', { sql: enableRLSSQL });

    // Criar políticas
    const createPoliciesSQL = `
      DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
      DROP POLICY IF EXISTS "Users can insert their own payments" ON public.payments;
      DROP POLICY IF EXISTS "Users can update their own payments" ON public.payments;
      DROP POLICY IF EXISTS "Service role can access all payments" ON public.payments;
      
      CREATE POLICY "Users can view their own payments" ON public.payments
        FOR SELECT USING (auth.uid() = user_id);
      
      CREATE POLICY "Users can insert their own payments" ON public.payments
        FOR INSERT WITH CHECK (auth.uid() = user_id);
      
      CREATE POLICY "Users can update their own payments" ON public.payments
        FOR UPDATE USING (auth.uid() = user_id);
      
      CREATE POLICY "Service role can access all payments" ON public.payments
        FOR ALL USING (auth.role() = 'service_role');
    `;

    const { error: policyError } = await supabase.rpc('exec_sql', { sql: createPoliciesSQL });

    if (policyError) {
      console.error('❌ Error creating policies:', policyError);
      // Não falhar aqui
    }

    console.log('✅ Payments table created successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Payments table created successfully' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Function error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Function failed',
        details: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
