// SUPABASE EDGE FUNCTION - VERIFY PAYMENT
// -----------------------------------------------------------

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface VerifyPaymentResponse {
  status: 'confirmed' | 'not_confirmed' | 'expired' | 'error'
  payment_id?: string
  booking_id?: string
  error?: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔍 [VERIFY-PAYMENT] Verificando pagamento manualmente')
    
    const url = new URL(req.url)
    const preferenceId = url.searchParams.get('preference_id')

    if (!preferenceId) {
      console.error('❌ [VERIFY-PAYMENT] Preference ID não fornecido')
      return new Response(
        JSON.stringify({
          status: 'error',
          error: 'Preference ID é obrigatório'
        } as VerifyPaymentResponse),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('🔍 [VERIFY-PAYMENT] Buscando registro de pagamento:', preferenceId)

    // Inicializar Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Buscar registro de pagamento
    const { data: record, error: recordError } = await supabase
      .from('payment_records')
      .select('*')
      .eq('preference_id', preferenceId)
      .single()

    if (recordError || !record) {
      console.error('❌ [VERIFY-PAYMENT] Registro de pagamento não encontrado')
      return new Response(
        JSON.stringify({
          status: 'error',
          error: 'Registro de pagamento não encontrado'
        } as VerifyPaymentResponse),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ [VERIFY-PAYMENT] Registro encontrado:', record.id)
    console.log('📊 [VERIFY-PAYMENT] Status atual:', record.status)

    // Se já está confirmado, retornar status
    if (record.status === 'confirmed') {
      console.log('✅ [VERIFY-PAYMENT] Pagamento já confirmado')
      return new Response(
        JSON.stringify({
          status: 'confirmed',
          payment_id: record.id,
          booking_id: record.booking_id
        } as VerifyPaymentResponse),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Se expirado, retornar status
    if (record.status === 'expired') {
      console.log('⏰ [VERIFY-PAYMENT] Pagamento expirado')
      return new Response(
        JSON.stringify({
          status: 'expired',
          payment_id: record.id,
          booking_id: record.booking_id
        } as VerifyPaymentResponse),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Se há conflito, retornar status
    if (record.status === 'conflict_payment') {
      console.log('⚠️ [VERIFY-PAYMENT] Conflito de pagamento')
      return new Response(
        JSON.stringify({
          status: 'error',
          error: 'Conflito de horário - pagamento não pode ser confirmado',
          payment_id: record.id,
          booking_id: record.booking_id
        } as VerifyPaymentResponse),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Buscar chaves do admin
    const { data: adminKeys, error: keysError } = await supabase
      .from('admin_mercado_pago_keys')
      .select('*')
      .eq('owner_id', record.owner_id)
      .single()

    if (keysError || !adminKeys) {
      console.error('❌ [VERIFY-PAYMENT] Chaves do admin não encontradas')
      return new Response(
        JSON.stringify({
          status: 'error',
          error: 'Chaves do admin não encontradas'
        } as VerifyPaymentResponse),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Buscar pagamentos aprovados via API do Mercado Pago
    console.log('🔍 [VERIFY-PAYMENT] Buscando pagamentos aprovados na API do MP...')
    
    const searchResponse = await fetch('https://api.mercadopago.com/v1/payments/search', {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${adminKeys.prod_access_token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!searchResponse.ok) {
      console.error('❌ [VERIFY-PAYMENT] Erro ao buscar pagamentos:', searchResponse.status)
      return new Response(
        JSON.stringify({
          status: 'error',
          error: 'Erro ao buscar pagamentos no Mercado Pago'
        } as VerifyPaymentResponse),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const searchData = await searchResponse.json()
    const approvedPayment = (searchData.results || []).find((payment: any) => 
      payment.external_reference === record.external_reference && payment.status === 'approved'
    )

    if (approvedPayment) {
      console.log('✅ [VERIFY-PAYMENT] Pagamento aprovado encontrado:', approvedPayment.id)
      
      // Verificar se o horário ainda está disponível
      const { data: booking } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', record.booking_id)
        .single()

      if (!booking) {
        console.error('❌ [VERIFY-PAYMENT] Agendamento não encontrado')
        return new Response(
          JSON.stringify({
            status: 'error',
            error: 'Agendamento não encontrado'
          } as VerifyPaymentResponse),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Verificar se já existe outro agendamento no mesmo horário
      const { data: conflictingBooking } = await supabase
        .from('appointments')
        .select('id')
        .eq('user_id', booking.user_id)
        .eq('date', booking.date)
        .eq('time', booking.time)
        .eq('status', 'confirmed')
        .neq('id', record.booking_id)
        .single()

      if (conflictingBooking) {
        console.warn('⚠️ [VERIFY-PAYMENT] Conflito de horário detectado')
        
        // Atualizar status para conflict_payment
        await supabase
          .from('payment_records')
          .update({ 
            status: 'conflict_payment',
            updated_at: new Date().toISOString()
          })
          .eq('booking_id', record.booking_id)

        await supabase
          .from('appointments')
          .update({ 
            status: 'conflict_payment',
            payment_data: approvedPayment,
            updated_at: new Date().toISOString()
          })
          .eq('id', record.booking_id)

        return new Response(
          JSON.stringify({
            status: 'error',
            error: 'Conflito de horário - pagamento não pode ser confirmado',
            payment_id: approvedPayment.id,
            booking_id: record.booking_id
          } as VerifyPaymentResponse),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Confirmar agendamento
      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          status: 'confirmed',
          payment_status: 'approved',
          payment_data: approvedPayment,
          updated_at: new Date().toISOString()
        })
        .eq('id', record.booking_id)

      if (updateError) {
        console.error('❌ [VERIFY-PAYMENT] Erro ao confirmar agendamento:', updateError)
        return new Response(
          JSON.stringify({
            status: 'error',
            error: 'Erro ao confirmar agendamento',
            payment_id: approvedPayment.id,
            booking_id: record.booking_id
          } as VerifyPaymentResponse),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Atualizar status do registro de pagamento
      await supabase
        .from('payment_records')
        .update({ 
          status: 'confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('booking_id', record.booking_id)

      console.log('✅ [VERIFY-PAYMENT] Agendamento confirmado com sucesso')
      return new Response(
        JSON.stringify({
          status: 'confirmed',
          payment_id: approvedPayment.id,
          booking_id: record.booking_id
        } as VerifyPaymentResponse),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    } else {
      console.log('⏳ [VERIFY-PAYMENT] Nenhum pagamento aprovado encontrado')
      return new Response(
        JSON.stringify({
          status: 'not_confirmed',
          payment_id: record.id,
          booking_id: record.booking_id
        } as VerifyPaymentResponse),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('❌ [VERIFY-PAYMENT] Erro ao verificar pagamento:', error)
    return new Response(
      JSON.stringify({
        status: 'error',
        error: 'Erro interno do servidor'
      } as VerifyPaymentResponse),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
